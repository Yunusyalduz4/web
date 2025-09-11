import { t, isUser, isBusiness, isEmployee, isEmployeeOrBusiness, isAuthed } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import { getSocketServer } from '../socket';
import { 
  sendRescheduleRequestNotification, 
  sendRescheduleApprovedNotification, 
  sendRescheduleRejectedNotification 
} from '../../utils/pushNotification';

// Randevu erteleme isteği şeması
const rescheduleRequestSchema = z.object({
  appointmentId: z.string().uuid(),
  newAppointmentDatetime: z.string().datetime(),
  newEmployeeId: z.string().uuid().optional(),
  requestReason: z.string().min(10).max(500).optional(),
});

// Onay/Red şeması
const approvalSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().max(500).optional(),
});

export const rescheduleRouter = t.router({
  // Test endpoint
  testConnection: t.procedure
    .query(async () => {
      try {
        const result = await pool.query('SELECT COUNT(*) FROM appointment_reschedule_requests');
        return { success: true, count: result.rows[0].count };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }),

  // Randevu erteleme isteği oluştur
  createRescheduleRequest: t.procedure
    .use(isAuthed)
    .input(rescheduleRequestSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('Kullanıcı bilgileri bulunamadı');
      }
      
      const { appointmentId, newAppointmentDatetime, newEmployeeId, requestReason } = input;
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Randevu bilgilerini al
      const appointmentResult = await pool.query(`
        SELECT a.*, b.owner_user_id, b.name as business_name, e.name as employee_name
        FROM appointments a
        LEFT JOIN businesses b ON a.business_id = b.id
        LEFT JOIN employees e ON a.employee_id = e.id
        WHERE a.id = $1
      `, [appointmentId]);

      if (appointmentResult.rows.length === 0) {
        throw new Error('Randevu bulunamadı');
      }

      const appointment = appointmentResult.rows[0];

      // Yetki kontrolü
      if (userRole === 'user' && appointment.user_id !== userId) {
        throw new Error('Bu randevuyu erteleyemezsiniz');
      }

      if (userRole === 'business' && appointment.owner_user_id !== userId) {
        throw new Error('Bu randevuyu erteleyemezsiniz');
      }

      if (userRole === 'employee' && appointment.employee_id !== ctx.user.employeeId) {
        throw new Error('Bu randevuyu erteleyemezsiniz');
      }

      // Yeni tarih geçmişte mi kontrol et
      const newDate = new Date(newAppointmentDatetime);
      if (newDate <= new Date()) {
        throw new Error('Yeni randevu tarihi geçmişte olamaz');
      }

      // Mevcut aktif erteleme isteği var mı kontrol et
      const existingRequest = await pool.query(`
        SELECT id FROM appointment_reschedule_requests 
        WHERE appointment_id = $1 AND status = 'pending'
      `, [appointmentId]);

      if (existingRequest.rows.length > 0) {
        throw new Error('Bu randevu için zaten bekleyen bir erteleme isteği var');
      }

      // Erteleme isteği oluştur
      const insertData = [
        appointmentId,
        userId,
        userRole,
        appointment.appointment_datetime,
        appointment.employee_id,
        newAppointmentDatetime,
        newEmployeeId || appointment.employee_id,
        requestReason || null
      ];
      
      const result = await pool.query(`
        INSERT INTO appointment_reschedule_requests (
          appointment_id, requested_by_user_id, requested_by_role,
          old_appointment_datetime, old_employee_id,
          new_appointment_datetime, new_employee_id,
          request_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, insertData);
      
      const rescheduleRequest = result.rows[0];

      // Randevu durumunu güncelle
      await pool.query(`
        UPDATE appointments 
        SET reschedule_status = 'pending', updated_at = NOW()
        WHERE id = $1
      `, [appointmentId]);

      // Push notification gönder
      try {
        await sendRescheduleRequestNotification(
          parseInt(appointmentId),
          appointment.business_id,
          appointment.user_id,
          appointment.employee_id,
          userRole as 'user' | 'business' | 'employee',
          appointment.appointment_datetime,
          newAppointmentDatetime,
          appointment.business_name,
          appointment.customer_name,
          appointment.employee_name,
          requestReason || undefined
        );
      } catch (pushError) {
        // Push notification hatası işlemi durdurmasın
      }

      // WebSocket bildirimi gönder
      const socketServer = getSocketServer();
      if (socketServer) {
        const notificationData = {
          type: 'reschedule_request',
          appointmentId,
          businessId: appointment.business_id,
          userId: appointment.user_id,
          employeeId: appointment.employee_id,
          requestedBy: userRole,
          newDateTime: newAppointmentDatetime,
          businessName: appointment.business_name,
          employeeName: appointment.employee_name
        };

        // Müşteri isteği yaptıysa işletme ve çalışana bildir
        if (userRole === 'user') {
          socketServer.emitToBusiness(appointment.business_id, 'socket:reschedule:requested', notificationData);
          if (appointment.employee_id) {
            socketServer.emitToEmployee(appointment.employee_id, 'socket:reschedule:requested', notificationData);
          }
        }
        // İşletme/Çalışan isteği yaptıysa müşteriye bildir
        else {
          socketServer.emitToUser(appointment.user_id, 'socket:reschedule:requested', notificationData);
        }
      }

      return rescheduleRequest;
    }),

  // Randevu erteleme isteğini onayla/reddet
  approveRescheduleRequest: t.procedure
    .use(isAuthed)
    .input(approvalSchema)
    .mutation(async ({ input, ctx }) => {
      const { requestId, action, rejectionReason } = input;
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // İstek bilgilerini al
      const requestResult = await pool.query(`
        SELECT r.*, a.user_id, a.business_id, a.employee_id, b.owner_user_id
        FROM appointment_reschedule_requests r
        LEFT JOIN appointments a ON r.appointment_id = a.id
        LEFT JOIN businesses b ON a.business_id = b.id
        WHERE r.id = $1
      `, [requestId]);

      if (requestResult.rows.length === 0) {
        throw new Error('Erteleme isteği bulunamadı');
      }

      const request = requestResult.rows[0];

      // Yetki kontrolü
      const canApprove = 
        (userRole === 'user' && request.user_id === userId) ||
        (userRole === 'business' && request.owner_user_id === userId) ||
        (userRole === 'employee' && request.employee_id === ctx.user.employeeId);

      if (!canApprove) {
        throw new Error('Bu isteği onaylayamazsınız');
      }

      if (request.status !== 'pending') {
        throw new Error('Bu istek zaten işlenmiş');
      }

      // Onay/Red işlemi
      if (action === 'approve') {
        // Randevuyu güncelle
        await pool.query(`
          UPDATE appointments 
          SET appointment_datetime = $1, employee_id = $2, reschedule_status = 'approved', updated_at = NOW()
          WHERE id = $3
        `, [request.new_appointment_datetime, request.new_employee_id, request.appointment_id]);

        // İsteği onayla
        await pool.query(`
          UPDATE appointment_reschedule_requests 
          SET status = 'approved', approved_by_user_id = $1, approved_at = NOW(), updated_at = NOW()
          WHERE id = $2
        `, [userId, requestId]);

        // Push notification gönder
        try {
          // İşletme ve müşteri bilgilerini al
          const businessInfo = await pool.query(
            'SELECT name FROM businesses WHERE id = $1',
            [request.business_id]
          );
          const customerInfo = await pool.query(
            'SELECT name FROM users WHERE id = $1',
            [request.user_id]
          );
          const employeeInfo = request.employee_id ? await pool.query(
            'SELECT name FROM employees WHERE id = $1',
            [request.employee_id]
          ) : { rows: [] };

          await sendRescheduleApprovedNotification(
            request.appointment_id,
            request.business_id,
            request.user_id,
            request.employee_id,
            userRole as 'user' | 'business' | 'employee',
            request.old_appointment_datetime,
            request.new_appointment_datetime,
            businessInfo.rows[0]?.name || 'İşletme',
            customerInfo.rows[0]?.name,
            employeeInfo.rows[0]?.name
          );
        } catch (pushError) {
          // Push notification hatası işlemi durdurmasın
        }

        // WebSocket bildirimi gönder
        const socketServer = getSocketServer();
        if (socketServer) {
          const notificationData = {
            type: 'reschedule_approved',
            appointmentId: request.appointment_id,
            businessId: request.business_id,
            userId: request.user_id,
            employeeId: request.employee_id,
            newDateTime: request.new_appointment_datetime
          };

          // Tüm ilgili taraflara bildir
          socketServer.emitToUser(request.user_id, 'socket:reschedule:approved', notificationData);
          socketServer.emitToBusiness(request.business_id, 'socket:reschedule:approved', notificationData);
          if (request.employee_id) {
            socketServer.emitToEmployee(request.employee_id, 'socket:reschedule:approved', notificationData);
          }
        }
      } else {
        // İsteği reddet
        await pool.query(`
          UPDATE appointment_reschedule_requests 
          SET status = 'rejected', approved_by_user_id = $1, approved_at = NOW(), 
              rejection_reason = $2, updated_at = NOW()
          WHERE id = $3
        `, [userId, rejectionReason || null, requestId]);

        // Randevu durumunu sıfırla
        await pool.query(`
          UPDATE appointments 
          SET reschedule_status = 'rejected', updated_at = NOW()
          WHERE id = $1
        `, [request.appointment_id]);

        // Push notification gönder
        try {
          // İşletme ve müşteri bilgilerini al
          const businessInfo = await pool.query(
            'SELECT name FROM businesses WHERE id = $1',
            [request.business_id]
          );
          const customerInfo = await pool.query(
            'SELECT name FROM users WHERE id = $1',
            [request.user_id]
          );
          const employeeInfo = request.employee_id ? await pool.query(
            'SELECT name FROM employees WHERE id = $1',
            [request.employee_id]
          ) : { rows: [] };

          await sendRescheduleRejectedNotification(
            request.appointment_id,
            request.business_id,
            request.user_id,
            request.employee_id,
            userRole as 'user' | 'business' | 'employee',
            request.old_appointment_datetime,
            request.new_appointment_datetime,
            businessInfo.rows[0]?.name || 'İşletme',
            customerInfo.rows[0]?.name,
            employeeInfo.rows[0]?.name,
            rejectionReason || undefined
          );
        } catch (pushError) {
          // Push notification hatası işlemi durdurmasın
        }

        // WebSocket bildirimi gönder
        const socketServer = getSocketServer();
        if (socketServer) {
          const notificationData = {
            type: 'reschedule_rejected',
            appointmentId: request.appointment_id,
            businessId: request.business_id,
            userId: request.user_id,
            employeeId: request.employee_id,
            rejectionReason: rejectionReason
          };

          // Tüm ilgili taraflara bildir
          socketServer.emitToUser(request.user_id, 'socket:reschedule:rejected', notificationData);
          socketServer.emitToBusiness(request.business_id, 'socket:reschedule:rejected', notificationData);
          if (request.employee_id) {
            socketServer.emitToEmployee(request.employee_id, 'socket:reschedule:rejected', notificationData);
          }
        }
      }

      return { success: true, action };
    }),

  // Bekleyen erteleme isteklerini getir (müşteriler için)
  getPendingRescheduleRequests: t.procedure
    .use(isAuthed)
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Sadece müşteriler erişebilir
      if (userRole !== 'user') {
        throw new Error('Sadece müşteriler erişebilir');
      }

      const query = `
        SELECT r.*, a.appointment_datetime as current_datetime, a.user_id, a.business_id, a.employee_id,
               b.name as business_name, e.name as employee_name, u.name as requested_by_name
        FROM appointment_reschedule_requests r
        LEFT JOIN appointments a ON r.appointment_id = a.id
        LEFT JOIN businesses b ON a.business_id = b.id
        LEFT JOIN employees e ON a.employee_id = e.id
        LEFT JOIN users u ON r.requested_by_user_id = u.id
        WHERE r.status = 'pending' 
        AND a.user_id = $1
        AND r.requested_by_role IN ('business', 'employee')
        ORDER BY r.created_at DESC
      `;

      const result = await pool.query(query, [userId]);
      return result.rows;
    }),

  // İşletme için bekleyen erteleme isteklerini getir
  getBusinessPendingRescheduleRequests: t.procedure
    .use(isEmployeeOrBusiness)
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      let query = `
        SELECT r.*, a.appointment_datetime as current_datetime, a.user_id, a.business_id, a.employee_id,
               b.name as business_name, e.name as employee_name, u.name as user_name
        FROM appointment_reschedule_requests r
        LEFT JOIN appointments a ON r.appointment_id = a.id
        LEFT JOIN businesses b ON a.business_id = b.id
        LEFT JOIN employees e ON a.employee_id = e.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE r.status = 'pending'
        AND r.requested_by_role = 'user'
      `;

      const params: any[] = [];

      if (userRole === 'business') {
        query += ' AND b.owner_user_id = $1';
        params.push(userId);
      } else if (userRole === 'employee') {
        // Employee'ler için business owner'ın ID'sini bul
        const businessResult = await pool.query(
          'SELECT owner_user_id FROM businesses WHERE id = $1',
          [ctx.user.businessId]
        );
        
        if (businessResult.rows.length === 0) {
          throw new Error('İşletme bulunamadı');
        }
        
        const businessOwnerId = businessResult.rows[0].owner_user_id;
        query += ' AND b.owner_user_id = $1';
        params.push(businessOwnerId);
      }

      query += ' ORDER BY r.created_at DESC';

      const result = await pool.query(query, params);
      return result.rows;
    }),

  // Randevu erteleme geçmişini getir
  getRescheduleHistory: t.procedure
    .use(isUser)
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { appointmentId } = input;
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Randevu sahipliği kontrolü
      const appointmentResult = await pool.query(`
        SELECT a.*, b.owner_user_id
        FROM appointments a
        LEFT JOIN businesses b ON a.business_id = b.id
        WHERE a.id = $1
      `, [appointmentId]);

      if (appointmentResult.rows.length === 0) {
        throw new Error('Randevu bulunamadı');
      }

      const appointment = appointmentResult.rows[0];
      const canView = 
        appointment.user_id === userId ||
        appointment.owner_user_id === userId ||
        (userRole === 'employee' && appointment.employee_id === ctx.user.employeeId);

      if (!canView) {
        throw new Error('Bu randevunun geçmişini görüntüleyemezsiniz');
      }

      const result = await pool.query(`
        SELECT r.*, u.name as requested_by_name, approver.name as approved_by_name
        FROM appointment_reschedule_requests r
        LEFT JOIN users u ON r.requested_by_user_id = u.id
        LEFT JOIN users approver ON r.approved_by_user_id = approver.id
        WHERE r.appointment_id = $1
        ORDER BY r.created_at DESC
      `, [appointmentId]);

      return result.rows;
    }),

  // Erteleme isteğini iptal et
  cancelRescheduleRequest: t.procedure
    .use(isUser)
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { requestId } = input;
      const userId = ctx.user.id;

      // İstek bilgilerini al
      const requestResult = await pool.query(`
        SELECT r.*, a.user_id, b.owner_user_id
        FROM appointment_reschedule_requests r
        LEFT JOIN appointments a ON r.appointment_id = a.id
        LEFT JOIN businesses b ON a.business_id = b.id
        WHERE r.id = $1
      `, [requestId]);

      if (requestResult.rows.length === 0) {
        throw new Error('Erteleme isteği bulunamadı');
      }

      const request = requestResult.rows[0];

      // Yetki kontrolü - sadece isteği yapan iptal edebilir
      if (request.requested_by_user_id !== userId) {
        throw new Error('Bu isteği iptal edemezsiniz');
      }

      if (request.status !== 'pending') {
        throw new Error('Bu istek zaten işlenmiş');
      }

      // İsteği iptal et
      await pool.query(`
        UPDATE appointment_reschedule_requests 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
      `, [requestId]);

      // Randevu durumunu sıfırla
      await pool.query(`
        UPDATE appointments 
        SET reschedule_status = 'none', updated_at = NOW()
        WHERE id = $1
      `, [request.appointment_id]);

      return { success: true };
    })
});
