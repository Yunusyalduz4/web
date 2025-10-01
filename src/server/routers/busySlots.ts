import { z } from 'zod';
import { t } from '../trpc/trpc';
import { isEmployeeOrBusiness } from '../trpc/trpc';
import { pool } from '../db';

export const busySlotsRouter = t.router({
  // Meşgule alma slotu oluştur
  createBusySlot: t.procedure.use(isEmployeeOrBusiness)
    .input(z.object({
      businessId: z.string().uuid(),
      employeeId: z.string().uuid().optional(),
      date: z.string(), // YYYY-MM-DD formatında
      startTime: z.string(), // HH:MM formatında
      duration: z.number().min(15).max(1440), // dakika cinsinden (15dk - 24saat)
      reason: z.string().min(1).max(500),
      isAllDay: z.boolean().default(false)
    }))
    .mutation(async ({ input, ctx }) => {
      const { businessId, employeeId, date, startTime, duration, reason, isAllDay } = input;
      
      // Eğer employee ise, sadece kendi businessındaki slotları meşgule alabilir
      if (ctx.user.role === 'employee' && ctx.user.businessId !== businessId) {
        throw new Error('Bu işletme için meşgule alma yetkiniz yok');
      }

      // Eğer employee ise, sadece kendi slotlarını meşgule alabilir
      if (ctx.user.role === 'employee' && employeeId && ctx.user.employeeId !== employeeId) {
        throw new Error('Sadece kendi slotlarınızı meşgule alabilirsiniz');
      }

      // Eğer employee ise ve employeeId belirtilmemişse, kendi ID sini kullan
      const finalEmployeeId = ctx.user.role === 'employee' ? ctx.user.employeeId : employeeId;

      if (!finalEmployeeId) {
        throw new Error('Çalışan ID si gerekli');
      }

      // Çalışanın bu business a ait olduğunu kontrol et
      const employeeCheck = await pool.query(
        'SELECT id FROM employees WHERE id = $1 AND business_id = $2',
        [finalEmployeeId, businessId]
      );

      if (employeeCheck.rows.length === 0) {
        throw new Error('Çalışan bu işletmeye ait değil');
      }

      // Tüm gün meşgule alma
      if (isAllDay) {
        // O gün için tüm slotları meşgul olarak işaretle
        const [year, month, day] = date.split('-');
        const startDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0);
        const endDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59);

        const result = await pool.query(
          `INSERT INTO busy_slots (business_id, employee_id, start_datetime, end_datetime, reason, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING id`,
          [businessId, finalEmployeeId, startDateTime.toISOString(), endDateTime.toISOString(), reason, ctx.user.id]
        );

        return {
          success: true,
          busySlotId: result.rows[0].id,
          message: 'Tüm gün meşgule alındı'
        };
      } else {
        // Belirli süre için meşgule alma
        // Tarih formatını düzelt: YYYY-MM-DD formatını doğru şekilde parse et
        console.log('Input values:', { date, startTime, duration });
        
        const [year, month, day] = date.split('-');
        const [hour, minute] = startTime.split(':');
        
        console.log('Parsed values:', { year, month, day, hour, minute });
        
        const startDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
          parseInt(hour), parseInt(minute), 0);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
        
        console.log('Date objects:', { 
          startDateTime: startDateTime.toISOString(), 
          endDateTime: endDateTime.toISOString() 
        });

        // Çakışan randevu var mı kontrol et
        const conflictCheck = await pool.query(
          `SELECT a.id FROM appointments a
           JOIN appointment_services aps ON a.id = aps.appointment_id
           WHERE a.business_id = $1 
           AND a.employee_id = $2
           AND a.status IN ('pending', 'confirmed')
           AND a.appointment_datetime < $3 
           AND a.appointment_datetime + INTERVAL '1 minute' * aps.duration_minutes > $4`,
          [businessId, finalEmployeeId, endDateTime.toISOString(), startDateTime.toISOString()]
        );

        if (conflictCheck.rows.length > 0) {
          throw new Error('Bu saat aralığında mevcut randevu bulunuyor');
        }

        console.log('Creating busy slot:', {
          date,
          startTime,
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString()
        });

        const result = await pool.query(
          `INSERT INTO busy_slots (business_id, employee_id, start_datetime, end_datetime, reason, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING id`,
          [businessId, finalEmployeeId, startDateTime.toISOString(), endDateTime.toISOString(), reason, ctx.user.id]
        );

        return {
          success: true,
          busySlotId: result.rows[0].id,
          message: 'Slot meşgule alındı'
        };
      }
    }),

  // Meşgule alma slotlarını getir
  getBusySlots: t.procedure.use(isEmployeeOrBusiness)
    .input(z.object({
      businessId: z.string().uuid(),
      employeeId: z.string().uuid().optional(),
      startDate: z.string(), // YYYY-MM-DD formatında
      endDate: z.string() // YYYY-MM-DD formatında
    }))
    .query(async ({ input, ctx }) => {
      const { businessId, employeeId, startDate, endDate } = input;

      // Eğer employee ise, sadece kendi businessındaki slotları görebilir
      if (ctx.user.role === 'employee' && ctx.user.businessId !== businessId) {
        throw new Error('Bu işletme için meşgule alma bilgilerini görme yetkiniz yok');
      }

      // Eğer employee ise, sadece kendi slotlarını görebilir
      const finalEmployeeId = ctx.user.role === 'employee' ? ctx.user.employeeId : employeeId;

      let query = `
        SELECT bs.id, bs.start_datetime, bs.end_datetime, bs.reason, bs.created_at,
               e.name as employee_name
        FROM busy_slots bs
        JOIN employees e ON bs.employee_id = e.id
        WHERE bs.business_id = $1
        AND bs.start_datetime >= $2
        AND bs.end_datetime <= $3
      `;

      const params = [businessId, `${startDate}T00:00:00`, `${endDate}T23:59:59`];

      if (finalEmployeeId) {
        query += ' AND bs.employee_id = $4';
        params.push(finalEmployeeId);
      }

      query += ' ORDER BY bs.start_datetime';

      const result = await pool.query(query, params);

      return result.rows.map(row => ({
        id: row.id,
        startDateTime: row.start_datetime,
        endDateTime: row.end_datetime,
        reason: row.reason,
        createdAt: row.created_at,
        employeeName: row.employee_name
      }));
    }),

  // Meşgule alma slotunu sil
  deleteBusySlot: t.procedure.use(isEmployeeOrBusiness)
    .input(z.object({
      busySlotId: z.string().uuid(),
      businessId: z.string().uuid()
    }))
    .mutation(async ({ input, ctx }) => {
      const { busySlotId, businessId } = input;

      // Eğer employee ise, sadece kendi businessındaki slotları silebilir
      if (ctx.user.role === 'employee' && ctx.user.businessId !== businessId) {
        throw new Error('Bu işletme için meşgule alma slotunu silme yetkiniz yok');
      }

      // Slotun var olduğunu ve yetki kontrolü yap
      const slotCheck = await pool.query(
        `SELECT bs.id, bs.employee_id, bs.created_by
         FROM busy_slots bs
         WHERE bs.id = $1 AND bs.business_id = $2`,
        [busySlotId, businessId]
      );

      if (slotCheck.rows.length === 0) {
        throw new Error('Meşgule alma slotu bulunamadı');
      }

      const slot = slotCheck.rows[0];

      // Employee ise sadece kendi slotlarını silebilir
      if (ctx.user.role === 'employee' && slot.employee_id !== ctx.user.employeeId) {
        throw new Error('Sadece kendi meşgule alma slotlarınızı silebilirsiniz');
      }

      // Business owner ise sadece kendi işletmesinin slotlarını silebilir
      if (ctx.user.role === 'business' && slot.created_by !== ctx.user.id) {
        throw new Error('Sadece kendi oluşturduğunuz meşgule alma slotlarını silebilirsiniz');
      }

      await pool.query(
        'DELETE FROM busy_slots WHERE id = $1',
        [busySlotId]
      );

      return {
        success: true,
        message: 'Meşgule alma slotu silindi'
      };
    })
});
