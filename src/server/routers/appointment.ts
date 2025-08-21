import { t, isUser, isBusiness } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import { TRPCError } from '@trpc/server';
import { sendNotificationToBusiness } from '../../utils/pushNotification';

export const appointmentRouter = t.router({
  book: t.procedure.use(isUser)
    .input(z.object({
      userId: z.string().uuid(),
      businessId: z.string().uuid(),
      appointmentDatetime: z.string(), // ISO string
      services: z.array(z.object({
        serviceId: z.string().uuid(),
        employeeId: z.string().uuid(),
      })).min(1), // En az 1 hizmet olmalı
    }))
    .mutation(async ({ input }) => {
      const BUFFER_MINUTES = 10; // Randevular arasında tampon süre
      
      // Frontend'den gelen appointmentDatetime zaten UTC formatında
      const utcDateTime = new Date(input.appointmentDatetime); // UTC olarak kullan
      
      // 1. Tüm hizmetlerin süresini al ve toplam süreyi hesapla
      let totalDuration = 0;
      for (const serviceItem of input.services) {
        const serviceRes = await pool.query(
          `SELECT duration_minutes, price FROM services WHERE id = $1`,
          [serviceItem.serviceId]
        );
        if (serviceRes.rows.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Hizmet bulunamadı' });
        }
        totalDuration += serviceRes.rows[0].duration_minutes;
      }

      const start = utcDateTime; // UTC olarak kullan
      const end = new Date(start.getTime() + totalDuration * 60000);
      const startBuffered = new Date(start.getTime() - BUFFER_MINUTES * 60000);
      const endBuffered = new Date(end.getTime() + BUFFER_MINUTES * 60000);

      // Geçmiş zamana randevu alınamaz
      // Türkiye saati ile kontrol et (UTC +3 saat)
      const nowTurkey = new Date(Date.now() + (3 * 60 * 60 * 1000)); // UTC'yi Türkiye saatine çevir
      const startTurkey = new Date(start.getTime() + (3 * 60 * 60 * 1000)); // UTC'yi Türkiye saatine çevir
      
      if (startTurkey.getTime() <= nowTurkey.getTime()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Geçmiş saat için randevu alınamaz' });
      }

      // 2. Tüm çalışanlar için çakışma kontrolü
      for (const serviceItem of input.services) {
        const conflictRes = await pool.query(
          `SELECT a.id
           FROM appointments a
           JOIN appointment_services aps ON a.id = aps.appointment_id
           WHERE a.status IN ('pending','confirmed') AND aps.employee_id = $1
           GROUP BY a.id, a.appointment_datetime
           HAVING a.appointment_datetime < $3 AND (a.appointment_datetime + (SUM(aps.duration_minutes) || ' minutes')::interval) > $2`,
          [serviceItem.employeeId, startBuffered.toISOString(), endBuffered.toISOString()]
        );
        if (conflictRes.rows.length > 0) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Bu saat dolu, lütfen başka bir saat seçin.' });
        }
      }

      // Kullanıcının aynı anda başka randevusu olmasın
      const userOverlap = await pool.query(
        `SELECT a.id
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.user_id = $1 AND a.status IN ('pending','confirmed')
         GROUP BY a.id, a.appointment_datetime
         HAVING a.appointment_datetime < $3 AND (a.appointment_datetime + (SUM(aps.duration_minutes) || ' minutes')::interval) > $2`,
        [input.userId, startBuffered.toISOString(), endBuffered.toISOString()]
      );
      if (userOverlap.rows.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Bu saat için mevcut bir randevunuz var' });
      }

      // Aynı kullanıcının ardışık çok randevuyu sınırlama (ör: 2 randevu limiti)
      const CONSECUTIVE_LIMIT = 2;
      const windowStart = new Date(start.getTime() - 2 * 60 * 60000); // 2 saat önce
      const windowEnd = new Date(end.getTime() + 2 * 60 * 60000);     // 2 saat sonra
      const userWindow = await pool.query(
        `SELECT a.id
         FROM appointments a
         WHERE a.user_id = $1 AND a.status IN ('pending','confirmed')
           AND a.appointment_datetime BETWEEN $2 AND $3`,
        [input.userId, windowStart.toISOString(), windowEnd.toISOString()]
      );
      if (userWindow.rows.length >= CONSECUTIVE_LIMIT) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Aynı zaman diliminde çok fazla randevu talebi' });
      }

      // 3. Ana randevuyu oluştur
      const appointmentResult = await pool.query(
        `INSERT INTO appointments (user_id, business_id, appointment_datetime, status) VALUES ($1, $2, $3, 'pending') RETURNING *`,
        [input.userId, input.businessId, utcDateTime.toISOString()] // UTC olarak kaydet
      );
      const appointmentId = appointmentResult.rows[0].id;

      // 4. Her hizmet için appointment_services kaydı oluştur
      for (const serviceItem of input.services) {
        const serviceRes = await pool.query(
          `SELECT duration_minutes, price FROM services WHERE id = $1`,
          [serviceItem.serviceId]
        );
        const service = serviceRes.rows[0];

        await pool.query(
          `INSERT INTO appointment_services (appointment_id, service_id, employee_id, price, duration_minutes) VALUES ($1, $2, $3, $4, $5)`,
          [appointmentId, serviceItem.serviceId, serviceItem.employeeId, service.price, service.duration_minutes]
        );
      }

      // 5. İşletmeye push notification gönder
      try {
        const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [input.userId]);
        const userName = userRes.rows[0]?.name || 'Müşteri';
        
        const servicesRes = await pool.query(
          `SELECT s.name FROM services s 
           WHERE s.id = ANY($1::uuid[])`,
          [input.services.map(s => s.serviceId)]
        );
        const serviceNames = servicesRes.rows.map(r => r.name).join(', ');
        
        const appointmentDate = new Date(appointmentResult.rows[0].appointment_datetime.getTime() + (3 * 60 * 60 * 1000)); // UTC'yi Türkiye saatine çevir
        const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        await sendNotificationToBusiness(
          input.businessId,
          'Yeni Randevu! 📅',
          `${userName} adlı müşteri ${formattedDate} tarihinde randevu aldı. Hizmetler: ${serviceNames}`,
          {
            type: 'new_appointment',
            appointmentId,
            businessId: input.businessId
          }
        );
      } catch (error) {
        console.error('Push notification error:', error);
        // Push notification hatası randevu oluşturmayı etkilemesin
      }

      return appointmentResult.rows[0];
    }),
  getByUser: t.procedure.use(isUser)
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT 
          a.*,
          b.name as business_name,
          COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), ARRAY[]::text[]) as service_names,
          COALESCE(array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL), ARRAY[]::text[]) as employee_names,
          COALESCE(array_agg(aps.price) FILTER (WHERE aps.price IS NOT NULL), ARRAY[]::numeric[]) as prices,
          COALESCE(array_agg(aps.duration_minutes) FILTER (WHERE aps.duration_minutes IS NOT NULL), ARRAY[]::integer[]) as durations
        FROM appointments a
        LEFT JOIN businesses b ON a.business_id = b.id
        LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
        LEFT JOIN services s ON aps.service_id = s.id
        LEFT JOIN employees e ON aps.employee_id = e.id
        WHERE a.user_id = $1 
        GROUP BY a.id, b.name
        ORDER BY a.appointment_datetime DESC`,
        [input.userId]
      );
      
      // UTC'den Türkiye saatine çevir
      const rows = result.rows.map(row => ({
        ...row,
        appointment_datetime: new Date(row.appointment_datetime).toISOString(),
        turkey_datetime: new Date(new Date(row.appointment_datetime).getTime() + (3 * 60 * 60 * 1000)).toISOString()
      }));
      
      return rows;
    }),
  getByBusiness: t.procedure.use(isBusiness)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT 
          a.*,
          u.name as user_name,
          COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), ARRAY[]::text[]) as service_names,
          COALESCE(array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL), ARRAY[]::text[]) as employee_names,
          COALESCE(array_agg(aps.price) FILTER (WHERE aps.price IS NOT NULL), ARRAY[]::numeric[]) as prices,
          COALESCE(array_agg(aps.duration_minutes) FILTER (WHERE aps.duration_minutes IS NOT NULL), ARRAY[]::integer[]) as durations
        FROM appointments a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
        LEFT JOIN services s ON aps.service_id = s.id
        LEFT JOIN employees e ON aps.employee_id = e.id
        WHERE a.business_id = $1 
        GROUP BY a.id, u.name
        ORDER BY a.appointment_datetime DESC`,
        [input.businessId]
      );
      
      // UTC'den Türkiye saatine çevir
      const rows = result.rows.map(row => ({
        ...row,
        appointment_datetime: new Date(row.appointment_datetime).toISOString(),
        turkey_datetime: new Date(new Date(row.appointment_datetime).getTime() + (3 * 60 * 60 * 1000)).toISOString()
      }));
      
      return rows;
    }),
  updateStatus: t.procedure.use(isBusiness)
    .input(z.object({ id: z.string().uuid(), status: z.enum(['pending','confirmed','cancelled','completed']) }))
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *`,
        [input.status, input.id]
      );
      
      // UTC'den Türkiye saatine çevir
      if (result.rows[0]) {
        const row = result.rows[0];
        return {
          ...row,
          appointment_datetime: new Date(row.appointment_datetime).toISOString(),
          turkey_datetime: new Date(new Date(row.appointment_datetime).getTime() + (3 * 60 * 60 * 1000)).toISOString()
        };
      }
      
      return result.rows[0];
    }),
  checkEmployeeConflict: t.procedure.use(isUser)
    .input(z.object({
      employeeId: z.string().uuid(),
      appointmentDatetime: z.string(), // Türkiye saati olarak geliyor
      durationMinutes: z.number(),
    }))
    .query(async ({ input }) => {
      // Frontend'den gelen appointmentDatetime'i Türkiye saati olarak kabul et ve UTC'ye çevir
      const turkeyDateTime = new Date(input.appointmentDatetime);
      const utcDateTime = new Date(turkeyDateTime.getTime() - (3 * 60 * 60 * 1000)); // UTC'ye çevir
      
      // Çakışan randevu var mı?
      const start = utcDateTime;
      const end = new Date(start.getTime() + input.durationMinutes * 60000);
      const result = await pool.query(
        `SELECT * FROM appointments WHERE employee_id = $1 AND status IN ('pending','confirmed')
         AND appointment_datetime < $3 AND (appointment_datetime + (services.duration_minutes || ' minutes')::interval) > $2
         AND service_id = services.id`,
        [input.employeeId, start.toISOString(), end.toISOString()]
      );
      return { conflict: result.rows.length > 0 };
    }),
  cancelAppointment: t.procedure.use(isUser)
    .input(z.object({ id: z.string().uuid(), userId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `UPDATE appointments SET status = 'cancelled' WHERE id = $1 AND user_id = $2 RETURNING *`,
        [input.id, input.userId]
      );
      
      // UTC'den Türkiye saatine çevir
      if (result.rows[0]) {
        const row = result.rows[0];
        return {
          ...row,
          appointment_datetime: new Date(row.appointment_datetime).toISOString(),
          turkey_datetime: new Date(new Date(row.appointment_datetime).getTime() + (3 * 60 * 60 * 1000)).toISOString()
        };
      }
      
      return result.rows[0];
    }),
  getEmployeeConflicts: t.procedure.use(isUser)
    .input(z.object({
      employeeId: z.string().uuid(),
      date: z.string(), // YYYY-MM-DD (Türkiye saati olarak kabul edilecek)
      durationMinutes: z.number(),
    }))
    .query(async ({ input }) => {
      // Gelen tarihi Türkiye saati olarak kabul et ve UTC'ye çevir
      const turkeyDate = new Date(input.date + 'T00:00:00');
      const utcStartOfDay = new Date(turkeyDate.getTime() - (3 * 60 * 60 * 1000)); // UTC'ye çevir
      const utcEndOfDay = new Date(turkeyDate.getTime() + (21 * 60 * 60 * 1000) - 1000); // 23:59:59 UTC'ye çevir
      
      const result = await pool.query(
        `SELECT appointment_datetime, service_id FROM appointments WHERE employee_id = $1 AND status IN ('pending','confirmed') AND appointment_datetime >= $2 AND appointment_datetime <= $3`,
        [input.employeeId, utcStartOfDay.toISOString(), utcEndOfDay.toISOString()]
      );
      // Her randevunun başlangıç ve bitişini hesapla
      const busySlots: Array<{ start: Date; end: Date }> = [];
      for (const row of result.rows) {
        // Hizmet süresini bul
        const serviceRes = await pool.query(`SELECT duration_minutes FROM services WHERE id = $1`, [row.service_id]);
        const dur = serviceRes.rows[0]?.duration_minutes || input.durationMinutes;
        const start = new Date(row.appointment_datetime);
        const end = new Date(start.getTime() + dur * 60000);
        busySlots.push({ start, end });
      }
      // 00:00-23:59 arası 15dk slotları üret (Türkiye saati olarak)
      const slots: Record<string, boolean> = {};
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
          const slot = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          // Türkiye saati olarak slot oluştur
          const turkeySlotStart = new Date(input.date + 'T' + slot + ':00');
          const utcSlotStart = new Date(turkeySlotStart.getTime() - (3 * 60 * 60 * 1000)); // UTC'ye çevir
          const utcSlotEnd = new Date(utcSlotStart.getTime() + input.durationMinutes * 60000);
          // Çakışan randevu var mı? - Slot'un başlangıcından itibaren hizmet süresi kadar süre doldurulur
          const conflict = busySlots.some(b => utcSlotStart < b.end && utcSlotEnd > b.start);
          slots[slot] = conflict;
        }
      }
      return slots;
    }),

  // Yeni: Birden çok çalışan için gün boyu meşgul slotları döndür (15dk çözünürlük)
  getBusySlotsForEmployees: t.procedure.use(isUser)
    .input(z.object({
      employeeIds: z.array(z.string().uuid()).min(1),
      date: z.string(), // YYYY-MM-DD (Türkiye saati olarak kabul edilecek)
      durationMinutes: z.number().min(1),
    }))
    .query(async ({ input }) => {
      // Gelen tarihi Türkiye saati olarak kabul et ve UTC'ye çevir
      const turkeyDate = new Date(input.date + 'T00:00:00');
      const utcStartOfDay = new Date(turkeyDate.getTime() - (3 * 60 * 60 * 1000)); // UTC'ye çevir
      const utcEndOfDay = new Date(turkeyDate.getTime() + (21 * 60 * 60 * 1000) - 1000); // 23:59:59 UTC'ye çevir
      
      const res = await pool.query(
        `SELECT a.id, a.appointment_datetime, SUM(aps.duration_minutes) AS total_duration
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.status IN ('pending','confirmed')
           AND aps.employee_id = ANY($1::uuid[])
           AND a.appointment_datetime >= $2 AND a.appointment_datetime <= $3
         GROUP BY a.id, a.appointment_datetime`,
        [input.employeeIds, utcStartOfDay.toISOString(), utcEndOfDay.toISOString()]
      );
      
      const busy: Record<string, boolean> = {};
      for (const row of res.rows) {
        const utcStart = new Date(row.appointment_datetime);
        const dur = Number(row.total_duration) || input.durationMinutes;
        const utcEnd = new Date(utcStart.getTime() + dur * 60000);
        
        // UTC slot'ları Türkiye saatine çevir ve 15dk'lık slot'lara böl
        // DÜZELTME: Slot başlangıç kontrolü - "Bu slot'tan başlayarak randevu alınabilir mi?"
        for (let t = new Date(utcStart); t < utcEnd; t = new Date(t.getTime() + 15 * 60000)) {
          // UTC'yi Türkiye saatine çevir (+3 saat)
          const turkeyTime = new Date(t.getTime() + (3 * 60 * 60 * 1000));
          const hh = String(turkeyTime.getHours()).padStart(2, '0');
          const mm = String(turkeyTime.getMinutes()).padStart(2, '0');
          
          // Slot başlangıç kontrolü: Bu slot'tan başlayarak randevu alınabilir mi?
          // Eğer slot, mevcut randevunun bitiş zamanından sonra başlıyorsa müsait
          const slotStartTime = new Date(t.getTime());
          const isSlotAvailable = slotStartTime >= utcEnd;
          
          if (!isSlotAvailable) {
            busy[`${hh}:${mm}`] = true;
          }
        }
      }
      return busy;
    }),

  // Yeni: 7 günlük slot görünümü için endpoint
  getWeeklySlots: t.procedure.use(isBusiness)
    .input(z.object({
      businessId: z.string().uuid(),
      startDate: z.string(), // YYYY-MM-DD (Türkiye saati olarak kabul edilecek)
    }))
    .query(async ({ input }) => {
      // 7 günlük tarih aralığını hesapla
      const startDate = new Date(input.startDate + 'T00:00:00');
      const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000); // +6 gün
      
      // UTC'ye çevir
      const utcStartDate = new Date(startDate.getTime() - (3 * 60 * 60 * 1000));
      const utcEndDate = new Date(endDate.getTime() - (3 * 60 * 60 * 1000));
      
      // İşletmenin çalışanlarını al
      const employeesRes = await pool.query(
        `SELECT id, name FROM employees WHERE business_id = $1`,
        [input.businessId]
      );
      const employeeIds = employeesRes.rows.map(e => e.id);
      
      if (employeeIds.length === 0) {
        return [];
      }
      
      // 7 günlük slot verilerini hesapla
      const weeklyData = [];
      
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // UTC'ye çevir
        const utcCurrentDate = new Date(currentDate.getTime() - (3 * 60 * 60 * 1000));
        const utcNextDate = new Date(utcCurrentDate.getTime() + 24 * 60 * 60 * 1000);
        
        // O gün için randevuları al
        const appointmentsRes = await pool.query(
          `SELECT 
            a.appointment_datetime,
            a.status,
            SUM(aps.duration_minutes) AS total_duration
           FROM appointments a
           JOIN appointment_services aps ON a.id = aps.appointment_id
           WHERE a.business_id = $1 
             AND a.status IN ('pending', 'confirmed')
             AND aps.employee_id = ANY($2::uuid[])
             AND a.appointment_datetime >= $3 
             AND a.appointment_datetime < $4
           GROUP BY a.id, a.appointment_datetime, a.status`,
          [input.businessId, employeeIds, utcCurrentDate.toISOString(), utcNextDate.toISOString()]
        );
        
        // 15dk'lık slot'ları oluştur (08:00-20:00 arası)
        const slots = {};
        const busySlots = {};
        
        // Meşgul slot'ları hesapla
        for (const apt of appointmentsRes.rows) {
          const aptStart = new Date(apt.appointment_datetime);
          const aptEnd = new Date(aptStart.getTime() + Number(apt.total_duration) * 60000);
          
          // Her 15dk'lık slot için kontrol et
          for (let time = new Date(aptStart); time < aptEnd; time = new Date(time.getTime() + 15 * 60000)) {
            const turkeyTime = new Date(time.getTime() + (3 * 60 * 60 * 1000));
            const hh = String(turkeyTime.getHours()).padStart(2, '0');
            const mm = String(turkeyTime.getMinutes()).padStart(2, '0');
            const slotKey = `${hh}:${mm}`;
            
            // Sadece 08:00-20:00 arası slot'ları kaydet
            if (turkeyTime.getHours() >= 8 && turkeyTime.getHours() < 20) {
              busySlots[slotKey] = true;
            }
          }
        }
        
        // Tüm slot'ları oluştur (08:00-20:00)
        for (let h = 8; h < 20; h++) {
          for (let m = 0; m < 60; m += 15) {
            const slotKey = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            slots[slotKey] = {
              time: slotKey,
              isBusy: !!busySlots[slotKey],
              status: busySlots[slotKey] ? 'busy' : 'available'
            };
          }
        }
        
        // Günlük özet hesapla
        const totalSlots = Object.keys(slots).length;
        const busySlotsCount = Object.values(slots).filter(slot => slot.isBusy).length;
        const availableSlotsCount = totalSlots - busySlotsCount;
        
        weeklyData.push({
          date: dateStr,
          dayName: currentDate.toLocaleDateString('tr-TR', { weekday: 'long' }),
          dayShort: currentDate.toLocaleDateString('tr-TR', { weekday: 'short' }),
          totalSlots,
          busySlots: busySlotsCount,
          availableSlots: availableSlotsCount,
          slots: Object.values(slots),
          isToday: dateStr === new Date().toISOString().split('T')[0]
        });
      }
      
      return weeklyData;
    }),

  // Yeni: Manuel randevu oluşturma endpoint'i
  createManualAppointment: t.procedure.use(isBusiness)
    .input(z.object({
      businessId: z.string().uuid(),
      customerName: z.string().min(2),
      customerPhone: z.string().optional(),
      serviceId: z.string().uuid(),
      employeeId: z.string().uuid(),
      appointmentDatetime: z.string(), // YYYY-MM-DDTHH:mm:ss formatında
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // UTC'ye çevir (Türkiye saati -3 saat)
      const turkeyDateTime = new Date(input.appointmentDatetime);
      const utcDateTime = new Date(turkeyDateTime.getTime() - (3 * 60 * 60 * 1000));
      
      // Geçmiş zamana randevu alınamaz
      const nowTurkey = new Date(Date.now() + (3 * 60 * 60 * 1000));
      if (turkeyDateTime.getTime() <= nowTurkey.getTime()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Geçmiş saat için randevu alınamaz' });
      }

      // Hizmet bilgilerini al
      const serviceRes = await pool.query(
        `SELECT duration_minutes, price FROM services WHERE id = $1 AND business_id = $2`,
        [input.serviceId, input.businessId]
      );
      if (serviceRes.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Hizmet bulunamadı' });
      }
      const service = serviceRes.rows[0];

      // Çalışan bilgilerini al
      const employeeRes = await pool.query(
        `SELECT id, name FROM employees WHERE id = $1 AND business_id = $2`,
        [input.employeeId, input.businessId]
      );
      if (employeeRes.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Çalışan bulunamadı' });
      }

      // Çakışma kontrolü
      const start = utcDateTime;
      const end = new Date(start.getTime() + service.duration_minutes * 60000);
      const conflictRes = await pool.query(
        `SELECT a.id
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.status IN ('pending','confirmed') AND aps.employee_id = $1
         GROUP BY a.id, a.appointment_datetime
         HAVING a.appointment_datetime < $3 AND (a.appointment_datetime + (SUM(aps.duration_minutes) || ' minutes')::interval) > $2`,
        [input.employeeId, start.toISOString(), end.toISOString()]
      );
      if (conflictRes.rows.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Bu saat dolu, lütfen başka bir saat seçin.' });
      }

      // Manuel randevu oluştur
      const appointmentResult = await pool.query(
        `INSERT INTO appointments (user_id, business_id, appointment_datetime, status, customer_name, customer_phone, notes, is_manual) 
         VALUES (NULL, $1, $2, 'confirmed', $3, $4, $5, true) RETURNING *`,
        [input.businessId, utcDateTime.toISOString(), input.customerName, input.customerPhone || null, input.notes || null]
      );
      const appointmentId = appointmentResult.rows[0].id;

      // Appointment services kaydı oluştur
      await pool.query(
        `INSERT INTO appointment_services (appointment_id, service_id, employee_id, price, duration_minutes) 
         VALUES ($1, $2, $3, $4, $5)`,
        [appointmentId, input.serviceId, input.employeeId, service.price, service.duration_minutes]
      );

      return appointmentResult.rows[0];
    }),

  // Yeni: Randevu durumunu güncelleme endpoint'i
  updateStatus: t.procedure.use(isBusiness)
    .input(z.object({
      appointmentId: z.string().uuid(),
      businessId: z.string().uuid(),
      status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
    }))
    .mutation(async ({ input }) => {
      // Randevunun bu işletmeye ait olduğunu kontrol et
      const appointmentCheck = await pool.query(
        `SELECT id FROM appointments WHERE id = $1 AND business_id = $2`,
        [input.appointmentId, input.businessId]
      );
      
      if (appointmentCheck.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Randevu bulunamadı' });
      }

      // Durumu güncelle
      const result = await pool.query(
        `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [input.status, input.appointmentId]
      );

      return result.rows[0];
    }),
}); 