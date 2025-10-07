import { t, isUser, isBusiness, isApprovedBusiness, isEmployee, isEmployeeOrBusiness } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import { TRPCError } from '@trpc/server';
import { sendNotificationToBusiness } from '../../utils/pushNotification';
import { getSocketServer } from '../socket';

export const appointmentRouter = t.router({
  book: t.procedure.use(isUser)
    .input(z.object({
      userId: z.string().uuid(),
      businessId: z.string().uuid(),
      appointmentDatetime: z.string(), // ISO string (Türkiye saati olarak geliyor)
      services: z.array(z.object({
        serviceId: z.string().uuid(),
        employeeId: z.string().uuid(),
      })).min(1), // En az 1 hizmet olmalı
    }))
    .mutation(async ({ input }) => {
      const BUFFER_MINUTES = 10; // Randevular arasında tampon süre
      
      // Frontend'den gelen appointmentDatetime direkt kullan (database UTC olarak kaydedecek)
      const utcDateTime = new Date(input.appointmentDatetime);
      
      // 0. İşletme onay durumunu kontrol et
      const businessCheck = await pool.query(
        `SELECT is_approved FROM businesses WHERE id = $1`,
        [input.businessId]
      );
      
      if (businessCheck.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'İşletme bulunamadı' });
      }
      
      if (!businessCheck.rows[0].is_approved) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu işletme henüz admin onayından geçmemiş. Randevu alamazsınız.' });
      }

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
      // Buffer sadece çakışma kontrolü için kullanılacak, slot hesaplaması için değil
      const startBuffered = new Date(start.getTime() - BUFFER_MINUTES * 60000);
      const endBuffered = new Date(end.getTime() + BUFFER_MINUTES * 60000);

      // Geçmiş zamana randevu alınamaz
      // Şu anki zamanı UTC olarak al
      const nowUTC = new Date();
      
      if (start.getTime() <= nowUTC.getTime()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Geçmiş saat için randevu alınamaz' });
      }

      // 2. Tüm çalışanlar için çakışma kontrolü (sadece gerçek randevu süreleri, buffer yok)
      for (const serviceItem of input.services) {
        const conflictRes = await pool.query(
          `SELECT a.id
           FROM appointments a
           JOIN appointment_services aps ON a.id = aps.appointment_id
           WHERE a.status IN ('pending','confirmed') AND aps.employee_id = $1
           GROUP BY a.id, a.appointment_datetime
           HAVING a.appointment_datetime < $3 AND (a.appointment_datetime + (SUM(aps.duration_minutes) || ' minutes')::interval) > $2`,
          [serviceItem.employeeId, start.toISOString(), end.toISOString()]
        );
        if (conflictRes.rows.length > 0) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Bu saat dolu, lütfen başka bir saat seçin.' });
        }
      }

      // Kullanıcının aynı anda başka randevusu olmasın (sadece gerçek randevu süreleri, buffer yok)
      const userOverlap = await pool.query(
        `SELECT a.id
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.user_id = $1 AND a.status IN ('pending','confirmed')
         GROUP BY a.id, a.appointment_datetime
         HAVING a.appointment_datetime < $3 AND (a.appointment_datetime + (SUM(aps.duration_minutes) || ' minutes')::interval) > $2`,
        [input.userId, start.toISOString(), end.toISOString()]
      );
      if (userOverlap.rows.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Bu saat için mevcut bir randevunuz var' });
      }

      // Aynı kullanıcının ardışık çok randevuyu sınırlama (ör: 10 randevu limiti)
      const CONSECUTIVE_LIMIT = 10;
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
        `INSERT INTO appointments (user_id, business_id, appointment_datetime, status, reminder_sent) VALUES ($1, $2, $3, 'confirmed', false) RETURNING *`,
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
        
        const businessRes = await pool.query('SELECT name FROM businesses WHERE id = $1', [input.businessId]);
        const businessName = businessRes.rows[0]?.name || 'İşletme';
        
        const servicesRes = await pool.query(
          `SELECT s.name FROM services s 
           WHERE s.id = ANY($1::uuid[])`,
          [input.services.map(s => s.serviceId)]
        );
        const serviceNames = servicesRes.rows.map(r => r.name).join(', ');
        
        const appointmentDate = new Date(appointmentResult.rows[0].appointment_datetime); // UTC'yi Türkiye saatine çevir
        const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Yeni bildirim sistemi kullan
        const { sendNewAppointmentNotification } = await import('../../utils/pushNotification');
        await sendNewAppointmentNotification(
          appointmentId,
          input.businessId,
          input.userId,
          utcDateTime.toISOString(),
          businessName,
          userName,
          serviceNames.split(', ')
        );

        // 6. Socket.io event gönder
        try {
          const socketServer = getSocketServer();
          if (socketServer) {
            socketServer.emitAppointmentCreated({
              appointmentId,
              businessId: input.businessId,
              userId: input.userId,
              appointmentDateTime: utcDateTime.toISOString(),
              services: serviceNames.split(', '),
              employeeId: input.services[0]?.employeeId,
              status: 'confirmed',
              createdAt: new Date(),
              totalDuration,
              customerName: userName
            });
          }
        } catch (error) {
          // Socket.io hatası randevu oluşturmayı etkilemesin
        }
      } catch (error) {
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
        turkey_datetime: new Date(row.appointment_datetime).toISOString()
      }));
      
      return rows;
    }),
  getByBusiness: t.procedure.use(isEmployeeOrBusiness)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      let query = `SELECT 
        a.*,
        u.name as user_name,
        u.profile_image_url as user_profile_image_url,
        u.phone as user_phone,
        COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), ARRAY[]::text[]) as service_names,
        COALESCE(array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL), ARRAY[]::text[]) as employee_names,
        COALESCE(array_agg(aps.price) FILTER (WHERE aps.price IS NOT NULL), ARRAY[]::numeric[]) as prices,
        COALESCE(array_agg(aps.duration_minutes) FILTER (WHERE aps.duration_minutes IS NOT NULL), ARRAY[]::integer[]) as durations,
        COALESCE(array_agg(
          json_build_object(
            'service_id', s.id,
            'service_name', s.name,
            'duration_minutes', aps.duration_minutes,
            'price', aps.price,
            'employee_id', aps.employee_id
          )
        ) FILTER (WHERE s.id IS NOT NULL), ARRAY[]::json[]) as services
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
      LEFT JOIN services s ON aps.service_id = s.id
      LEFT JOIN employees e ON aps.employee_id = e.id
      WHERE a.business_id = $1`;
      
      let params = [input.businessId];
      
      // Employee ise sadece kendi randevularını getir
      if (ctx.user.role === 'employee') {
        query += ` AND EXISTS (
          SELECT 1 FROM appointment_services aps2 
          WHERE aps2.appointment_id = a.id 
          AND aps2.employee_id = $2
        )`;
        params.push(ctx.user.employeeId!);
      }
      
      query += ` GROUP BY a.id, u.name, u.profile_image_url, u.phone
        ORDER BY a.appointment_datetime DESC`;
      
      const result = await pool.query(query, params);
      
      // UTC'den Türkiye saatine çevir
      const rows = result.rows.map(row => ({
        ...row,
        appointment_datetime: new Date(row.appointment_datetime).toISOString(),
        turkey_datetime: new Date(row.appointment_datetime).toISOString()
      }));
      
      return rows;
    }),

  checkEmployeeConflict: t.procedure.use(isUser)
    .input(z.object({
      employeeId: z.string().uuid(),
      appointmentDatetime: z.string(), // Türkiye saati olarak geliyor
      durationMinutes: z.number(),
    }))
    .query(async ({ input }) => {
      // Frontend'den gelen appointmentDatetime direkt kullan
      const utcDateTime = new Date(input.appointmentDatetime);
      
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
      // Mevcut durumu ve randevu bilgilerini al
      const appointmentRes = await pool.query(
        `SELECT a.status, a.business_id, a.appointment_datetime, b.name as business_name 
         FROM appointments a 
         JOIN businesses b ON a.business_id = b.id 
         WHERE a.id = $1 AND a.user_id = $2`,
        [input.id, input.userId]
      );
      
      if (appointmentRes.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Randevu bulunamadı' });
      }

      const oldStatus = appointmentRes.rows[0].status;
      const businessId = appointmentRes.rows[0].business_id;
      const appointmentDateTime = appointmentRes.rows[0].appointment_datetime;
      const businessName = appointmentRes.rows[0].business_name;

      const result = await pool.query(
        `UPDATE appointments SET status = 'cancelled' WHERE id = $1 AND user_id = $2 RETURNING *`,
        [input.id, input.userId]
      );
      
      // Push notification gönder
      try {
        const { sendAppointmentStatusUpdateNotification } = await import('../../utils/pushNotification');
        await sendAppointmentStatusUpdateNotification(
          input.id,
          businessId,
          input.userId,
          oldStatus,
          'cancelled',
          appointmentDateTime,
          businessName
        );
      } catch (error) {
        // Push notification hatası randevu iptalını etkilemesin
      }
      
      // UTC'den Türkiye saatine çevir
      if (result.rows[0]) {
        const row = result.rows[0];
        return {
          ...row,
          appointment_datetime: new Date(row.appointment_datetime).toISOString(),
          turkey_datetime: new Date(row.appointment_datetime).toISOString()
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
      // Gelen tarihi direkt kullan
      const utcStartOfDay = new Date(input.date + 'T00:00:00');
      const utcEndOfDay = new Date(input.date + 'T23:59:59');
      
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
      // 00:00-23:59 arası 15dk slotları üret
      const slots: Record<string, boolean> = {};
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
          const slot = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          // Slot oluştur
          const slotStart = new Date(input.date + 'T' + slot + ':00');
          const slotEnd = new Date(slotStart.getTime() + input.durationMinutes * 60000);
          // Çakışan randevu var mı?
          const conflict = busySlots.some(b => slotStart < b.end && slotEnd > b.start);
          slots[slot] = conflict;
        }
      }
      return slots;
    }),

  // Yeni: Birden çok çalışan için gün boyu meşgul slotları döndür (15dk çözünürlük)
  // Guest kullanıcılar için de erişilebilir
  getBusySlotsForEmployees: t.procedure
    .input(z.object({
      employeeIds: z.array(z.string().uuid()).min(1),
      date: z.string(), // YYYY-MM-DD (Türkiye saati olarak kabul edilecek)
      durationMinutes: z.number().min(1),
    }))
    .query(async ({ input }) => {
      // Gelen tarihi direkt kullan
      const utcStartOfDay = new Date(input.date + 'T00:00:00');
      const utcEndOfDay = new Date(input.date + 'T23:59:59');
      
      const res = await pool.query(
        `SELECT a.id, a.appointment_datetime, SUM(s.duration_minutes) AS total_duration
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         JOIN services s ON aps.service_id = s.id
         WHERE a.status IN ('pending','confirmed')
           AND aps.employee_id = ANY($1::uuid[])
           AND a.appointment_datetime >= $2 AND a.appointment_datetime <= $3
         GROUP BY a.id, a.appointment_datetime`,
        [input.employeeIds, utcStartOfDay.toISOString(), utcEndOfDay.toISOString()]
      );
      
      const busy: Record<string, boolean> = {};
      
      // Randevulardan gelen meşgul slot'lar
      for (const row of res.rows) {
        const utcStart = new Date(row.appointment_datetime);
        const dur = Number(row.total_duration) || input.durationMinutes;
        const utcEnd = new Date(utcStart.getTime() + dur * 60000);
        
        // 15dk'lık slot'lara böl
        // Sadece gerçek randevu süresi içindeki slot'ları meşgul olarak işaretle
        for (let t = new Date(utcStart); t < utcEnd; t = new Date(t.getTime() + 15 * 60000)) {
          const hh = String(t.getHours()).padStart(2, '0');
          const mm = String(t.getMinutes()).padStart(2, '0');
          const slotKey = `${hh}:${mm}`;
          
          // Slot meşgul olarak işaretle (çünkü bu slot mevcut randevunun süresi içinde)
          busy[slotKey] = true;
        }
      }

      // Meşgule alınan slot'ları da ekle
      const busySlotsRes = await pool.query(
        `SELECT start_datetime, end_datetime FROM busy_slots 
         WHERE employee_id = ANY($1::uuid[])
         AND DATE(start_datetime) = $2`,
        [input.employeeIds, input.date]
      );

      for (const busySlot of busySlotsRes.rows) {
        const busyStart = new Date(busySlot.start_datetime);
        const busyEnd = new Date(busySlot.end_datetime);
        
        // 15dk'lık slot'lara böl
        for (let t = new Date(busyStart); t < busyEnd; t = new Date(t.getTime() + 15 * 60000)) {
          const hh = String(t.getHours()).padStart(2, '0');
          const mm = String(t.getMinutes()).padStart(2, '0');
          const slotKey = `${hh}:${mm}`;
          
          // Slot meşgul olarak işaretle
          busy[slotKey] = true;
        }
      }
      
      return busy;
    }),

  // getWeeklySlots endpoint'i kaldırıldı - yeni sistem gelecek

  // Üyeliksiz kullanıcılar için randevu oluşturma
  bookAsGuest: t.procedure
    .input(z.object({
      businessId: z.string().uuid(),
      customerName: z.string().min(2),
      customerSurname: z.string().min(2),
      customerPhone: z.string().min(10),
      appointmentDate: z.string(), // YYYY-MM-DD formatında
      appointmentTime: z.string(), // HH:mm formatında
      serviceIds: z.array(z.string().uuid()), // Birden fazla hizmet
      employeeId: z.string().uuid(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('bookAsGuest called with input:', input);
        
        let appointmentDatetime: Date;
      
      try {
        // Tarih ve saat birleştir
        appointmentDatetime = new Date(`${input.appointmentDate}T${input.appointmentTime}:00`);
        
        // Geçmiş zamana randevu alınamaz
        const nowUTC = new Date();
        if (appointmentDatetime.getTime() <= nowUTC.getTime()) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Geçmiş saat için randevu alınamaz' });
        }
      } catch (error) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: `Tarih formatı hatası: ${input.appointmentDate} ${input.appointmentTime}` 
        });
      }

      // İşletme onay durumunu kontrol et
      const businessCheck = await pool.query(
        `SELECT is_approved FROM businesses WHERE id = $1`,
        [input.businessId]
      );
      
      if (businessCheck.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'İşletme bulunamadı' });
      }
      
      if (!businessCheck.rows[0].is_approved) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu işletme henüz admin onayından geçmemiş. Randevu alamazsınız.' });
      }

      // Hizmet bilgilerini al
      const servicesRes = await pool.query(
        `SELECT id, duration_minutes, price FROM services WHERE id = ANY($1) AND business_id = $2`,
        [input.serviceIds, input.businessId]
      );
      if (servicesRes.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Hizmet bulunamadı' });
      }

      // Çalışan bilgilerini al
      const employeeRes = await pool.query(
        `SELECT id, name FROM employees WHERE id = $1 AND business_id = $2`,
        [input.employeeId, input.businessId]
      );
      if (employeeRes.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Çalışan bulunamadı' });
      }

      // Toplam süre hesapla
      const totalDuration = servicesRes.rows.reduce((sum, service) => sum + service.duration_minutes, 0);
      
      // Randevu bitiş zamanı
      const endTime = new Date(appointmentDatetime.getTime() + totalDuration * 60000);

      // Çakışma kontrolü - appointments tablosunda duration_minutes yok, bu yüzden basit kontrol
      const conflictCheck = await pool.query(`
        SELECT COUNT(*) as conflict_count
        FROM appointments a
        JOIN appointment_services ap ON a.id = ap.appointment_id
        WHERE a.business_id = $1 
        AND ap.employee_id = $2
        AND a.status IN ('pending', 'confirmed')
        AND a.appointment_datetime < $3 AND a.appointment_datetime > $4
      `, [input.businessId, input.employeeId, endTime, appointmentDatetime]);

      if (parseInt(conflictCheck.rows[0].conflict_count) > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Seçilen saatte çakışan randevu var' });
      }

      // Üyeliksiz kullanıcı için geçici user oluştur - UUID formatında
      const guestUserId = crypto.randomUUID();
      
      // Geçici kullanıcı oluştur - e-posta adresini unique yapmak için timestamp ekle
      const uniqueEmail = `guest_${Date.now()}_${input.customerPhone}`;
      await pool.query(`
        INSERT INTO users (id, name, email, phone, role, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'user', 'guest_user_no_password', NOW(), NOW())
      `, [guestUserId, `Guest: ${input.customerName} ${input.customerSurname}`, uniqueEmail, input.customerPhone]);

      // Randevu oluştur
      const appointmentRes = await pool.query(`
        INSERT INTO appointments (
          id, user_id, business_id, appointment_datetime, 
          status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'confirmed', $5, NOW(), NOW())
        RETURNING id
      `, [
        crypto.randomUUID(),
        guestUserId,
        input.businessId,
        appointmentDatetime,
        input.notes || null
      ]);

      const appointmentId = appointmentRes.rows[0].id;

      // Hizmetleri randevuya ekle
      for (const serviceId of input.serviceIds) {
        // Hizmet fiyatını ve süresini al
        const service = servicesRes.rows.find(s => s.id === serviceId);
        const servicePrice = service?.price || 0;
        const serviceDuration = service?.duration_minutes || 0;
        
        await pool.query(`
          INSERT INTO appointment_services (appointment_id, service_id, employee_id, price, duration_minutes)
          VALUES ($1, $2, $3, $4, $5)
        `, [appointmentId, serviceId, input.employeeId, servicePrice, serviceDuration]);
      }

      // İşletmeye bildirim gönder
      try {
        await sendNotificationToBusiness(
          input.businessId,
          'Yeni Randevu Talebi',
          `${input.customerName} ${input.customerSurname} adlı müşteri randevu talebinde bulundu.`,
          { appointmentId, type: 'new_appointment' }
        );
      } catch (notificationError) {
        console.error('Bildirim gönderme hatası:', notificationError);
      }

      // WebSocket ile real-time güncelleme
      try {
        const socketServer = getSocketServer();
        if (socketServer) {
          socketServer.emitAppointmentCreated({
            appointmentId,
            businessId: input.businessId,
            userId: guestUserId,
            appointmentDatetime: appointmentDatetime.toISOString(),
            services: servicesRes.rows.map(s => s.id)
          });
        }
      } catch (socketError) {
        console.error('WebSocket güncelleme hatası:', socketError);
      }

        return {
          success: true,
          appointmentId,
          message: 'Randevu başarıyla oluşturuldu'
        };
      } catch (error) {
        console.error('Error in bookAsGuest:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Randevu oluşturma hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        });
      }
    }),

  // Yeni: Manuel randevu oluşturma endpoint'i - Güncellenmiş
  createManualAppointment: t.procedure.use(isEmployeeOrBusiness)
    .input(z.object({
      businessId: z.string().uuid(),
      customerId: z.string(), // Manuel müşteri ID'si
      customerName: z.string().min(2).optional(),
      customerSurname: z.string().min(2).optional(),
      customerPhone: z.string().nullable().optional(),
      appointmentDate: z.string(), // YYYY-MM-DD formatında
      appointmentTime: z.string(), // HH:mm formatında
      serviceIds: z.array(z.string().uuid()), // Birden fazla hizmet
      employeeId: z.string().uuid(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      
      // Employee ise sadece kendi business'ına randevu oluşturabilir
      if (ctx.user.role === 'employee' && ctx.user.businessId !== input.businessId) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Sadece kendi işletmenize randevu oluşturabilirsiniz' 
        });
      }
      
      let appointmentDatetime: Date;
      
      try {
        // Tarih ve saat birleştir
        appointmentDatetime = new Date(`${input.appointmentDate}T${input.appointmentTime}:00`);
        
        // Geçmiş zamana randevu alınamaz
        const nowUTC = new Date();
        if (appointmentDatetime.getTime() <= nowUTC.getTime()) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Geçmiş saat için randevu alınamaz' });
        }
      } catch (error) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: `Tarih formatı hatası: ${input.appointmentDate} ${input.appointmentTime}` 
        });
      }

      // Hizmet bilgilerini al
      const servicesRes = await pool.query(
        `SELECT id, duration_minutes, price FROM services WHERE id = ANY($1) AND business_id = $2`,
        [input.serviceIds, input.businessId]
      );
      if (servicesRes.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Hizmet bulunamadı' });
      }

      // Çalışan bilgilerini al
      const employeeRes = await pool.query(
        `SELECT id, name FROM employees WHERE id = $1 AND business_id = $2`,
        [input.employeeId, input.businessId]
      );
      if (employeeRes.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Çalışan bulunamadı' });
      }

      // Employee ise sadece kendi ID'sini seçebilir
      if (ctx.user.role === 'employee' && ctx.user.employeeId !== input.employeeId) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Sadece kendi randevularınızı oluşturabilirsiniz' 
        });
      }

      // Toplam süreyi hesapla
      const totalDuration = servicesRes.rows.reduce((sum, service) => sum + service.duration_minutes, 0);

      // Çakışma kontrolü
      const start = appointmentDatetime;
      const end = new Date(start.getTime() + totalDuration * 60000);
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
        `INSERT INTO appointments (user_id, business_id, appointment_datetime, status, customer_name, customer_phone, notes, is_manual, reminder_sent) 
         VALUES (NULL, $1, $2, 'confirmed', $3, $4, $5, true, false) RETURNING *`,
        [
          input.businessId, 
          appointmentDatetime.toISOString(), 
          `${input.customerName} ${input.customerSurname}`, 
          input.customerPhone || null, 
          input.notes || null
        ]
      );
      const appointmentId = appointmentResult.rows[0].id;

      // Her hizmet için appointment_services kaydı oluştur
      for (const service of servicesRes.rows) {
        await pool.query(
          `INSERT INTO appointment_services (appointment_id, service_id, employee_id, price, duration_minutes) 
           VALUES ($1, $2, $3, $4, $5)`,
          [appointmentId, service.id, input.employeeId, service.price, service.duration_minutes]
        );
      }

      // Slot'ları güncelle - hizmet süresine göre tüm slot'ları doldur

      // Socket.io event gönder
      try {
        const socketServer = getSocketServer();
        if (socketServer) {
          // Hizmet adlarını al
          const serviceNames = servicesRes.rows.map(s => s.name);
          
          socketServer.emitManualAppointmentCreated({
            appointmentId,
            businessId: input.businessId,
            customerName: `${input.customerName} ${input.customerSurname}`,
            customerPhone: input.customerPhone,
            appointmentDateTime: appointmentDatetime.toISOString(),
            services: serviceNames,
            employeeId: input.employeeId,
            notes: input.notes,
            isManual: true,
            createdAt: new Date(),
            totalDuration
          });
        }
        } catch (error) {
          // Socket.io hatası randevu oluşturmayı etkilemesin
        }

      return appointmentResult.rows[0];
    }),

  // Yeni: Direkt randevu erteleme endpoint'i (manuel randevular için)
  rescheduleAppointment: t.procedure.use(isEmployeeOrBusiness)
    .input(z.object({
      appointmentId: z.string().uuid(),
      newAppointmentDatetime: z.string().datetime(),
      newEmployeeId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Randevuyu kontrol et
      const appointmentCheck = await pool.query(
        `SELECT a.id, a.business_id, a.is_manual, a.appointment_datetime, aps.employee_id
         FROM appointments a
         LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.id = $1`,
        [input.appointmentId]
      );
      
      if (appointmentCheck.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Randevu bulunamadı' });
      }

      const appointment = appointmentCheck.rows[0];
      
      // Employee ise sadece kendi business'ındaki randevuları erteleyebilir
      if (ctx.user.role === 'employee' && ctx.user.businessId !== appointment.business_id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece kendi işletmenizin randevularını erteleyebilirsiniz' });
      }

      // Manuel veya guest randevu kontrolü (opsiyonel - sadece bu tür randevular için kullanılması önerilir)
      const isGuestAppointment = appointment.user_name?.startsWith('Guest:') || false;
      if (appointment.is_manual === false && !isGuestAppointment) {
        console.warn('Bu endpoint manuel veya guest olmayan randevular için kullanılıyor. Normal erteleme isteği sistemi kullanılmalı.');
      }

      const newDate = new Date(input.newAppointmentDatetime);
      const currentEmployeeId = appointment.employee_id;
      const targetEmployeeId = input.newEmployeeId || currentEmployeeId;

      // Müsaitlik kontrolü
      const dayOfWeek = newDate.getDay();
      const availabilityRes = await pool.query(
        `SELECT start_time, end_time FROM employee_availability 
         WHERE employee_id = $1 AND day_of_week = $2`,
        [targetEmployeeId, dayOfWeek]
      );

      if (availabilityRes.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Çalışan bu gün müsait değil' });
      }

      // Randevu süresini hesapla
      const durationRes = await pool.query(
        `SELECT COALESCE(SUM(aps.duration_minutes), 0) AS total_duration
         FROM appointment_services aps
         WHERE aps.appointment_id = $1`,
        [input.appointmentId]
      );
      const totalDuration = Number(durationRes.rows[0]?.total_duration || 0);

      // Çakışma kontrolü
      const appointmentStartTimeStr = newDate.toTimeString().slice(0, 5);
      const appointmentEnd = new Date(newDate.getTime() + totalDuration * 60000);
      const appointmentEndTimeStr = appointmentEnd.toTimeString().slice(0, 5);

      const conflictRes = await pool.query(
        `SELECT a.id
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.status IN ('pending','confirmed') 
         AND aps.employee_id = $1
         AND a.id != $2
         GROUP BY a.id, a.appointment_datetime
         HAVING a.appointment_datetime < $4 AND (a.appointment_datetime + (SUM(aps.duration_minutes) || ' minutes')::interval) > $3`,
        [targetEmployeeId, input.appointmentId, newDate.toISOString(), appointmentEnd.toISOString()]
      );

      if (conflictRes.rows.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Seçilen saatte başka bir randevu var' });
      }

      // Randevuyu güncelle
      const updateResult = await pool.query(
        `UPDATE appointments 
         SET appointment_datetime = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [input.newAppointmentDatetime, input.appointmentId]
      );

      // Çalışan değiştiyse appointment_services'i güncelle
      if (input.newEmployeeId && input.newEmployeeId !== currentEmployeeId) {
        await pool.query(
          `UPDATE appointment_services 
           SET employee_id = $1, updated_at = NOW()
           WHERE appointment_id = $2`,
          [input.newEmployeeId, input.appointmentId]
        );
      }

      // WebSocket bildirimi gönder
      const socketServer = getSocketServer();
      if (socketServer) {
        socketServer.emitAppointmentStatusUpdated({
          appointmentId: input.appointmentId,
          businessId: appointment.business_id,
          newStatus: 'rescheduled',
          newDateTime: input.newAppointmentDatetime
        });
      }

      return updateResult.rows[0];
    }),

  // Yeni: Randevu durumunu güncelleme endpoint'i
  updateStatus: t.procedure.use(isEmployeeOrBusiness)
    .input(z.object({
      appointmentId: z.string().uuid(),
      businessId: z.string().uuid(),
      status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
    }))
    .mutation(async ({ input, ctx }) => {
      // Randevunun bu işletmeye ait olduğunu kontrol et ve mevcut durumu al
      const appointmentCheck = await pool.query(
        `SELECT a.id, a.status, a.user_id, a.appointment_datetime, aps.employee_id
         FROM appointments a
         LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.id = $1 AND a.business_id = $2`,
        [input.appointmentId, input.businessId]
      );
      
      if (appointmentCheck.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Randevu bulunamadı' });
      }

      // Employee ise sadece kendi randevularını güncelleyebilir
      if (ctx.user.role === 'employee') {
        const employeeIds = appointmentCheck.rows.map(row => row.employee_id);
        if (!employeeIds.includes(ctx.user.employeeId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece kendi randevularınızı güncelleyebilirsiniz' });
        }
      }

      const oldStatus = appointmentCheck.rows[0].status;
      const userId = appointmentCheck.rows[0].user_id;
      const appointmentDateTime = appointmentCheck.rows[0].appointment_datetime;

      // Durumu güncelle
      const result = await pool.query(
        `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [input.status, input.appointmentId]
      );

      // İşletme adını al
      const businessRes = await pool.query(
        'SELECT name FROM businesses WHERE id = $1',
        [input.businessId]
      );
      const businessName = businessRes.rows[0]?.name || 'İşletme';

      // Push notification gönder
      try {
        const { sendAppointmentStatusUpdateNotification } = await import('../../utils/pushNotification');
        await sendAppointmentStatusUpdateNotification(
          input.appointmentId,
          input.businessId,
          userId,
          oldStatus,
          input.status,
          appointmentDateTime,
          businessName
        );
      } catch (error) {
        // Push notification hatası randevu güncellemeyi etkilemesin
      }

      // Socket.io event gönder
      try {
        const socketServer = getSocketServer();
        if (socketServer) {
          socketServer.emitAppointmentStatusUpdated({
            appointmentId: input.appointmentId,
            businessId: input.businessId,
            userId,
            oldStatus,
            newStatus: input.status,
            appointmentDateTime,
            businessName,
            updatedAt: new Date()
          });
        }
        } catch (error) {
          // Socket.io hatası randevu güncellemeyi etkilemesin
        }

      return result.rows[0];
    }),

  // Çalışan endpoint'leri
  getEmployeeAppointments: t.procedure.use(isEmployee)
    .input(z.object({
      employeeId: z.string().uuid(),
      date: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      // Çalışanın kendi randevularını al
      let query = `
        SELECT 
          a.*,
          u.name as customer_name,
          u.phone as customer_phone,
          b.name as business_name,
          array_agg(
            json_build_object(
              'service_id', s.id,
              'service_name', s.name,
              'duration_minutes', s.duration_minutes,
              'price', s.price,
              'employee_id', aps.employee_id
            )
          ) as services
        FROM appointments a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN businesses b ON a.business_id = b.id
        LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
        LEFT JOIN services s ON aps.service_id = s.id
        WHERE aps.employee_id = $1
      `;
      
      const params = [input.employeeId];
      let paramCount = 1;

      if (input.date) {
        paramCount++;
        query += ` AND DATE(a.appointment_datetime) = $${paramCount}`;
        params.push(input.date);
      } else if (input.startDate && input.endDate) {
        paramCount++;
        query += ` AND DATE(a.appointment_datetime) BETWEEN $${paramCount}`;
        params.push(input.startDate);
        paramCount++;
        query += ` AND $${paramCount}`;
        params.push(input.endDate);
      }

      query += `
        GROUP BY a.id, u.name, u.phone, b.name
        ORDER BY a.appointment_datetime DESC
      `;

      const result = await pool.query(query, params);
      return result.rows;
    }),

  updateEmployeeAppointmentStatus: t.procedure.use(isEmployee)
    .input(z.object({
      appointmentId: z.string().uuid(),
      status: z.enum(['pending', 'confirmed', 'cancelled', 'completed'])
    }))
    .mutation(async ({ input, ctx }) => {
      // Çalışanın kendi randevusunu güncelle
      const result = await pool.query(
        `UPDATE appointments 
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND id IN (
           SELECT a.id FROM appointments a
           JOIN appointment_services aps ON a.id = aps.appointment_id
           WHERE aps.employee_id = $3
         )
         RETURNING *`,
        [input.status, input.appointmentId, ctx.employee.id]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Randevu bulunamadı veya yetkiniz yok' });
      }

      return result.rows[0];
    }),
}); 