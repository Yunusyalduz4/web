import { t, isUser, isBusiness, isAuthed } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import { TRPCError } from '@trpc/server';

export const appointmentRouter = t.router({
  book: t.procedure.use(isUser)
    .input(z.object({
      userId: z.string().uuid(),
      businessId: z.string().uuid(),
      serviceId: z.string().uuid(),
      employeeId: z.string().uuid(),
      appointmentDatetime: z.string(), // ISO string
    }))
    .mutation(async ({ input }) => {
      // 1. Hizmetin süresini al
      const serviceRes = await pool.query(
        `SELECT duration_minutes FROM services WHERE id = $1`,
        [input.serviceId]
      );
      if (serviceRes.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Hizmet bulunamadı' });
      }
      const durationMinutes = serviceRes.rows[0].duration_minutes;
      const start = new Date(input.appointmentDatetime);
      const end = new Date(start.getTime() + durationMinutes * 60000);
      // 2. Çakışan randevu var mı kontrol et
      const conflictRes = await pool.query(
        `SELECT * FROM appointments WHERE employee_id = $1 AND status IN ('pending','confirmed')
         AND appointment_datetime < $3 AND (appointment_datetime + (SELECT duration_minutes || ' minutes' FROM services WHERE id = service_id)::interval) > $2`,
        [input.employeeId, start.toISOString(), end.toISOString()]
      );
      if (conflictRes.rows.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Bu saat dolu, lütfen başka bir saat seçin.' });
      }
      // 3. Randevuyu oluştur
      const result = await pool.query(
        `INSERT INTO appointments (user_id, business_id, service_id, employee_id, appointment_datetime, status) VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
        [input.userId, input.businessId, input.serviceId, input.employeeId, input.appointmentDatetime]
      );
      return result.rows[0];
    }),
  getByUser: t.procedure.use(isUser)
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT * FROM appointments WHERE user_id = $1 ORDER BY appointment_datetime DESC`,
        [input.userId]
      );
      return result.rows;
    }),
  getByBusiness: t.procedure.use(isBusiness)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT * FROM appointments WHERE business_id = $1 ORDER BY appointment_datetime DESC`,
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
  checkEmployeeConflict: t.procedure.use(isAuthed)
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
  getEmployeeConflicts: t.procedure.use(isAuthed)
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
        for (let m = 0; m < 60; m += 15) {
          const slot = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          const slotStart = new Date(input.date + 'T' + slot + ':00');
          const slotEnd = new Date(slotStart.getTime() + input.durationMinutes * 60000);
          // Çakışan randevu var mı?
          const conflict = busySlots.some(b => slotStart < b.end && slotEnd > b.start);
          slots[slot] = conflict;
        }
      }
      return slots;
    }),
}); 