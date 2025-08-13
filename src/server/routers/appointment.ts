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

      const start = new Date(input.appointmentDatetime);
      const end = new Date(start.getTime() + totalDuration * 60000);
      const startBuffered = new Date(start.getTime() - BUFFER_MINUTES * 60000);
      const endBuffered = new Date(end.getTime() + BUFFER_MINUTES * 60000);

      // Geçmiş zamana randevu alınamaz
      const now = new Date();
      if (start.getTime() <= now.getTime()) {
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
        [input.userId, input.businessId, input.appointmentDatetime]
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
        
        const appointmentDate = new Date(input.appointmentDatetime);
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
      return result.rows;
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
      return result.rows;
    }),
  updateStatus: t.procedure.use(isBusiness)
    .input(z.object({ id: z.string().uuid(), status: z.enum(['pending','confirmed','cancelled','completed']) }))
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *`,
        [input.status, input.id]
      );
      return result.rows[0];
    }),
  checkEmployeeConflict: t.procedure.use(isUser)
    .input(z.object({
      employeeId: z.string().uuid(),
      appointmentDatetime: z.string(),
      durationMinutes: z.number(),
    }))
    .query(async ({ input }) => {
      // Çakışan randevu var mı?
      const start = new Date(input.appointmentDatetime);
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
      return result.rows[0];
    }),
  getEmployeeConflicts: t.procedure.use(isUser)
    .input(z.object({
      employeeId: z.string().uuid(),
      date: z.string(), // YYYY-MM-DD
      durationMinutes: z.number(),
    }))
    .query(async ({ input }) => {
      // O gün için tüm randevuları çek
      const startOfDay = new Date(input.date + 'T00:00:00');
      const endOfDay = new Date(input.date + 'T23:59:59');
      const result = await pool.query(
        `SELECT appointment_datetime, service_id FROM appointments WHERE employee_id = $1 AND status IN ('pending','confirmed') AND appointment_datetime >= $2 AND appointment_datetime <= $3`,
        [input.employeeId, startOfDay.toISOString(), endOfDay.toISOString()]
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
          const slotStart = new Date(input.date + 'T' + slot + ':00');
          const slotEnd = new Date(slotStart.getTime() + input.durationMinutes * 60000);
          // Çakışan randevu var mı? - Slot'un başlangıcından itibaren hizmet süresi kadar süre doldurulur
          const conflict = busySlots.some(b => slotStart < b.end && slotEnd > b.start);
          slots[slot] = conflict;
        }
      }
      return slots;
    }),

  // Yeni: Birden çok çalışan için gün boyu meşgul slotları döndür (15dk çözünürlük)
  getBusySlotsForEmployees: t.procedure.use(isUser)
    .input(z.object({
      employeeIds: z.array(z.string().uuid()).min(1),
      date: z.string(), // YYYY-MM-DD
      durationMinutes: z.number().min(1),
    }))
    .query(async ({ input }) => {
      const startOfDay = new Date(input.date + 'T00:00:00');
      const endOfDay = new Date(input.date + 'T23:59:59');
      const res = await pool.query(
        `SELECT a.id, a.appointment_datetime, SUM(aps.duration_minutes) AS total_duration
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.status IN ('pending','confirmed')
           AND aps.employee_id = ANY($1::uuid[])
           AND a.appointment_datetime >= $2 AND a.appointment_datetime <= $3
         GROUP BY a.id, a.appointment_datetime`,
        [input.employeeIds, startOfDay.toISOString(), endOfDay.toISOString()]
      );
      const busy: Record<string, boolean> = {};
      for (const row of res.rows) {
        const s = new Date(row.appointment_datetime);
        const dur = Number(row.total_duration) || input.durationMinutes;
        const e = new Date(s.getTime() + dur * 60000);
        for (let t = new Date(s); t < e; t = new Date(t.getTime() + 15 * 60000)) {
          const hh = String(t.getHours()).padStart(2, '0');
          const mm = String(t.getMinutes()).padStart(2, '0');
          busy[`${hh}:${mm}`] = true;
        }
      }
      return busy;
    }),
}); 