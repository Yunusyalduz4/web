import { t, isAdmin } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import { TRPCError } from '@trpc/server';

export const adminRouter = t.router({
  // Overview Stats
  getStats: t.procedure.use(isAdmin).query(async () => {
    const [usersRes, businessesRes, appointmentsRes, reviewsRes, pendingBusinessesRes, pendingImagesRes, pendingReviewsRes, pendingRepliesRes, pendingSliderImagesRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM businesses'),
      pool.query('SELECT COUNT(*) as count FROM appointments'),
      pool.query('SELECT COUNT(*) as count FROM reviews'),
      pool.query('SELECT COUNT(*) as count FROM businesses WHERE is_approved = false'),
      pool.query('SELECT COUNT(*) as count FROM businesses WHERE profile_image_url IS NOT NULL AND profile_image_approved = false'),
      pool.query('SELECT COUNT(*) as count FROM reviews WHERE is_approved = false'),
      pool.query('SELECT COUNT(*) as count FROM reviews WHERE business_reply IS NOT NULL AND business_reply_approved = false'),
      pool.query('SELECT COUNT(*) as count FROM business_images WHERE is_approved = false')
    ]);
    
    return {
      totalUsers: parseInt(usersRes.rows[0].count),
      totalBusinesses: parseInt(businessesRes.rows[0].count),
      totalAppointments: parseInt(appointmentsRes.rows[0].count),
      totalReviews: parseInt(reviewsRes.rows[0].count),
      pendingBusinesses: parseInt(pendingBusinessesRes.rows[0].count),
      pendingImages: parseInt(pendingImagesRes.rows[0].count),
      pendingReviews: parseInt(pendingReviewsRes.rows[0].count),
      pendingReplies: parseInt(pendingRepliesRes.rows[0].count),
      pendingSliderImages: parseInt(pendingSliderImagesRes.rows[0].count)
    };
  }),

  // Users CRUD
  listUsers: t.procedure.use(isAdmin)
    .input(z.object({ q: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const q = input?.q?.trim();
      if (q) {
        const res = await pool.query(
          `SELECT id, name, email, role, phone, address, created_at FROM users 
           WHERE name ILIKE $1 OR email ILIKE $1 
           ORDER BY created_at DESC LIMIT 200`,
          [`%${q}%`]
        );
        return res.rows;
      }
      const res = await pool.query(`SELECT id, name, email, role, phone, address, created_at FROM users ORDER BY created_at DESC LIMIT 200`);
      return res.rows;
    }),
  getUser: t.procedure.use(isAdmin)
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const res = await pool.query(`SELECT id, name, email, role, phone, address, latitude, longitude, created_at FROM users WHERE id = $1`, [input.userId]);
      return res.rows[0] || null;
    }),
  updateUser: t.procedure.use(isAdmin)
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(['user','business','admin']),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      latitude: z.number().optional().nullable(),
      longitude: z.number().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `UPDATE users SET name=$1,email=$2,role=$3,phone=$4,address=$5,latitude=$6,longitude=$7,updated_at=NOW() WHERE id=$8 RETURNING id,name,email,role,phone,address,latitude,longitude,created_at,updated_at`,
        [input.name, input.email, input.role, input.phone ?? null, input.address ?? null, input.latitude ?? null, input.longitude ?? null, input.id]
      );
      return res.rows[0];
    }),
  deleteUser: t.procedure.use(isAdmin)
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await pool.query(`DELETE FROM users WHERE id = $1`, [input.userId]);
      return { success: true };
    }),

  // Businesses CRUD
  listBusinesses: t.procedure.use(isAdmin)
    .input(z.object({ q: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const q = input?.q?.trim();
      if (q) {
        const res = await pool.query(
          `SELECT * FROM businesses WHERE name ILIKE $1 OR email ILIKE $1 OR address ILIKE $1 ORDER BY created_at DESC LIMIT 200`,
          [`%${q}%`]
        );
        return res.rows;
      }
      const res = await pool.query(`SELECT * FROM businesses ORDER BY created_at DESC LIMIT 200`);
      return res.rows;
    }),
  getBusiness: t.procedure.use(isAdmin)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const res = await pool.query(`SELECT * FROM businesses WHERE id = $1`, [input.businessId]);
      return res.rows[0] || null;
    }),
  updateBusiness: t.procedure.use(isAdmin)
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional().nullable(),
      address: z.string().min(1),
      phone: z.string().optional().nullable(),
      email: z.string().email().optional().nullable(),
      latitude: z.number(),
      longitude: z.number(),
      profileImageUrl: z.string().url().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `UPDATE businesses SET name=$1,description=$2,address=$3,phone=$4,email=$5,latitude=$6,longitude=$7,profile_image_url=$8,updated_at=NOW() WHERE id=$9 RETURNING *`,
        [input.name, input.description ?? null, input.address, input.phone ?? null, input.email ?? null, input.latitude, input.longitude, input.profileImageUrl ?? null, input.id]
      );
      return res.rows[0];
    }),

  // WhatsApp Settings Management
  updateBusinessWhatsAppSettings: t.procedure.use(isAdmin)
    .input(z.object({
      businessId: z.string().uuid(),
      whatsappOtpEnabled: z.boolean(),
      whatsappNotificationsEnabled: z.boolean(),
      whatsappPhone: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `UPDATE businesses SET 
         whatsapp_otp_enabled=$1, 
         whatsapp_notifications_enabled=$2, 
         whatsapp_phone=$3, 
         updated_at=NOW() 
         WHERE id=$4 RETURNING *`,
        [input.whatsappOtpEnabled, input.whatsappNotificationsEnabled, input.whatsappPhone ?? null, input.businessId]
      );
      return res.rows[0];
    }),

  getBusinessWhatsAppSettings: t.procedure.use(isAdmin)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const res = await pool.query(
        `SELECT id, name, whatsapp_otp_enabled, whatsapp_notifications_enabled, whatsapp_phone 
         FROM businesses WHERE id = $1`,
        [input.businessId]
      );
      return res.rows[0] || null;
    }),
  deleteBusiness: t.procedure.use(isAdmin)
    .input(z.object({ businessId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await pool.query(`DELETE FROM businesses WHERE id = $1`, [input.businessId]);
      return { success: true };
    }),

  // Appointments moderation
  listAppointments: t.procedure.use(isAdmin)
    .input(z.object({ limit: z.number().min(1).max(500).optional(), offset: z.number().min(0).optional() }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;
      const res = await pool.query(
        `SELECT a.*, u.name as user_name, b.name as business_name 
         FROM appointments a 
         LEFT JOIN users u ON a.user_id = u.id
         LEFT JOIN businesses b ON a.business_id = b.id
         ORDER BY a.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return res.rows;
    }),
  updateAppointmentStatus: t.procedure.use(isAdmin)
    .input(z.object({ id: z.string().uuid(), status: z.enum(['pending','confirmed','cancelled','completed']) }))
    .mutation(async ({ input }) => {
      // Mevcut durumu ve randevu bilgilerini al
      const appointmentRes = await pool.query(
        `SELECT a.status, a.user_id, a.business_id, a.appointment_datetime, b.name as business_name 
         FROM appointments a 
         JOIN businesses b ON a.business_id = b.id 
         WHERE a.id = $1`,
        [input.id]
      );
      
      if (appointmentRes.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Randevu bulunamadı' });
      }

      const oldStatus = appointmentRes.rows[0].status;
      const userId = appointmentRes.rows[0].user_id;
      const businessId = appointmentRes.rows[0].business_id;
      const appointmentDateTime = appointmentRes.rows[0].appointment_datetime;
      const businessName = appointmentRes.rows[0].business_name;

      // Durumu güncelle
      const res = await pool.query(`UPDATE appointments SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`, [input.status, input.id]);

      // Push notification gönder
      try {
        const { sendAppointmentStatusUpdateNotification } = await import('../../utils/pushNotification');
        await sendAppointmentStatusUpdateNotification(
          input.id,
          businessId,
          userId,
          oldStatus,
          input.status,
          appointmentDateTime,
          businessName
        );
      } catch (error) {
        // Push notification hatası randevu güncellemeyi etkilemesin
      }

      return res.rows[0];
    }),

  // Services CRUD
  listServices: t.procedure.use(isAdmin).query(async () => {
    const res = await pool.query(`
      SELECT s.*, b.name as business_name, sc.name as category_name
      FROM services s
      LEFT JOIN businesses b ON s.business_id = b.id
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      ORDER BY s.created_at DESC
    `);
    return res.rows;
  }),

  createService: t.procedure.use(isAdmin)
    .input(z.object({
      businessId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional(),
      durationMinutes: z.number().min(1),
      price: z.number().min(0),
      categoryId: z.string().uuid().optional()
    }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `INSERT INTO services (business_id, name, description, duration_minutes, price, category_id) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [input.businessId, input.name, input.description, input.durationMinutes, input.price, input.categoryId]
      );
      return res.rows[0];
    }),

  updateService: t.procedure.use(isAdmin)
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional(),
      durationMinutes: z.number().min(1),
      price: z.number().min(0),
      categoryId: z.string().uuid().optional()
    }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `UPDATE services SET name=$1, description=$2, duration_minutes=$3, price=$4, category_id=$5, updated_at=NOW() 
         WHERE id=$6 RETURNING *`,
        [input.name, input.description, input.durationMinutes, input.price, input.categoryId, input.id]
      );
      return res.rows[0];
    }),

  deleteService: t.procedure.use(isAdmin)
    .input(z.object({ serviceId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await pool.query(`DELETE FROM services WHERE id = $1`, [input.serviceId]);
      return { success: true };
    }),

  // Employees CRUD
  listEmployees: t.procedure.use(isAdmin).query(async () => {
    const res = await pool.query(`
      SELECT e.*, b.name as business_name
      FROM employees e
      LEFT JOIN businesses b ON e.business_id = b.id
      ORDER BY e.created_at DESC
    `);
    return res.rows;
  }),

  createEmployee: t.procedure.use(isAdmin)
    .input(z.object({
      businessId: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `INSERT INTO employees (business_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *`,
        [input.businessId, input.name, input.email, input.phone]
      );
      return res.rows[0];
    }),

  updateEmployee: t.procedure.use(isAdmin)
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `UPDATE employees SET name=$1, email=$2, phone=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
        [input.name, input.email, input.phone, input.id]
      );
      return res.rows[0];
    }),

  deleteEmployee: t.procedure.use(isAdmin)
    .input(z.object({ employeeId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await pool.query(`DELETE FROM employees WHERE id = $1`, [input.employeeId]);
      return { success: true };
    }),

  // Reviews CRUD
  listReviews: t.procedure.use(isAdmin).query(async () => {
    const res = await pool.query(`
      SELECT r.*, u.name as user_name, b.name as business_name, a.appointment_datetime, r.photos
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN businesses b ON r.business_id = b.id
      LEFT JOIN appointments a ON r.appointment_id = a.id
      ORDER BY r.created_at DESC
    `);
    return res.rows;
  }),

  updateReview: t.procedure.use(isAdmin)
    .input(z.object({
      id: z.string().uuid(),
      serviceRating: z.number().min(1).max(5),
      employeeRating: z.number().min(1).max(5),
      comment: z.string().min(20),
      businessReply: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `UPDATE reviews SET service_rating=$1, employee_rating=$2, comment=$3, business_reply=$4, updated_at=NOW() 
         WHERE id=$5 RETURNING *`,
        [input.serviceRating, input.employeeRating, input.comment, input.businessReply, input.id]
      );
      return res.rows[0];
    }),

  deleteReview: t.procedure.use(isAdmin)
    .input(z.object({ reviewId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await pool.query(`DELETE FROM reviews WHERE id = $1`, [input.reviewId]);
      return { success: true };
    }),

  // Employee Availability CRUD
  listEmployeeAvailability: t.procedure.use(isAdmin).query(async () => {
    const res = await pool.query(`
      SELECT ea.*, e.name as employee_name, b.name as business_name
      FROM employee_availability ea
      LEFT JOIN employees e ON ea.employee_id = e.id
      LEFT JOIN businesses b ON e.business_id = b.id
      ORDER BY ea.day_of_week, ea.start_time
    `);
    return res.rows;
  }),

  createEmployeeAvailability: t.procedure.use(isAdmin)
    .input(z.object({
      employeeId: z.string().uuid(),
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string(),
      endTime: z.string()
    }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `INSERT INTO employee_availability (employee_id, day_of_week, start_time, end_time) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [input.employeeId, input.dayOfWeek, input.startTime, input.endTime]
      );
      return res.rows[0];
    }),

  updateEmployeeAvailability: t.procedure.use(isAdmin)
    .input(z.object({
      id: z.string().uuid(),
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string(),
      endTime: z.string()
    }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `UPDATE employee_availability SET day_of_week=$1, start_time=$2, end_time=$3, updated_at=NOW() 
         WHERE id=$4 RETURNING *`,
        [input.dayOfWeek, input.startTime, input.endTime, input.id]
      );
      return res.rows[0];
    }),

  deleteEmployeeAvailability: t.procedure.use(isAdmin)
    .input(z.object({ availabilityId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await pool.query(`DELETE FROM employee_availability WHERE id = $1`, [input.availabilityId]);
      return { success: true };
    }),

  // Business Approval System
  approveBusiness: t.procedure.use(isAdmin)
    .input(z.object({ 
      businessId: z.string().uuid(), 
      approve: z.boolean(),
      note: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { businessId, approve, note } = input;
      const adminId = ctx.session?.user?.id;

      // İşletme bilgilerini al
      const businessRes = await pool.query(
        'SELECT name FROM businesses WHERE id = $1',
        [businessId]
      );
      
      if (businessRes.rows.length === 0) {
        throw new Error('İşletme bulunamadı');
      }
      
      const businessName = businessRes.rows[0].name;

      if (approve) {
        await pool.query(
          `UPDATE businesses SET 
           is_approved = true, 
           approval_note = $1, 
           approved_at = NOW(), 
           approved_by = $2 
           WHERE id = $3`,
          [note || 'Onaylandı', adminId, businessId]
        );
      } else {
        await pool.query(
          `UPDATE businesses SET 
           is_approved = false, 
           approval_note = $1, 
           approved_at = NOW(), 
           approved_by = $2 
           WHERE id = $3`,
          [note || 'Reddedildi', adminId, businessId]
        );
      }

      // Push notification gönder
      try {
        const { sendBusinessApprovalNotification } = await import('../../utils/pushNotification');
        await sendBusinessApprovalNotification(
          businessId,
          approve ? 'approved' : 'rejected',
          businessName,
          note
        );
      } catch (error) {
        // Push notification hatası onay işlemini etkilemesin
      }

      return { success: true };
    }),

  approveBusinessProfileImage: t.procedure.use(isAdmin)
    .input(z.object({ 
      businessId: z.string().uuid(), 
      approve: z.boolean(),
      note: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { businessId, approve, note } = input;
      const adminId = ctx.session?.user?.id;

      await pool.query(
        `UPDATE businesses SET 
         profile_image_approved = $1, 
         approval_note = $2, 
         approved_at = NOW(), 
         approved_by = $3 
         WHERE id = $4`,
        [approve, note || (approve ? 'Görsel onaylandı' : 'Görsel reddedildi'), adminId, businessId]
      );

      return { success: true };
    }),

  getPendingApprovals: t.procedure.use(isAdmin).query(async () => {
    const res = await pool.query(`
      SELECT b.*, u.name as owner_name, u.email as owner_email
      FROM businesses b
      LEFT JOIN users u ON b.owner_user_id = u.id
      WHERE b.is_approved = false OR b.profile_image_approved = false
      ORDER BY b.created_at DESC
    `);
    return res.rows;
  }),

  // Review Approval System
  approveReview: t.procedure.use(isAdmin)
    .input(z.object({ 
      reviewId: z.string().uuid(), 
      approve: z.boolean(),
      note: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { reviewId, approve, note } = input;
      const adminId = ctx.session?.user?.id;

      if (approve) {
        await pool.query(
          `UPDATE reviews SET 
           is_approved = true, 
           approval_note = $1, 
           approved_at = NOW(), 
           approved_by = $2 
           WHERE id = $3`,
          [note || 'Yorum onaylandı', adminId, reviewId]
        );
      } else {
        // Reddedilen yorumu sil
        await pool.query(`DELETE FROM reviews WHERE id = $1`, [reviewId]);
      }

      return { success: true };
    }),

  approveBusinessReply: t.procedure.use(isAdmin)
    .input(z.object({ 
      reviewId: z.string().uuid(), 
      approve: z.boolean(),
      note: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { reviewId, approve, note } = input;
      const adminId = ctx.session?.user?.id;

      if (approve) {
        await pool.query(
          `UPDATE reviews SET 
           business_reply_approved = true, 
           approval_note = $1, 
           approved_at = NOW(), 
           approved_by = $2 
           WHERE id = $3`,
          [note || 'İşletme yanıtı onaylandı', adminId, reviewId]
        );
      } else {
        // Reddedilen yanıtı sil
        await pool.query(
          `UPDATE reviews SET 
           business_reply = NULL, 
           business_reply_at = NULL, 
           business_reply_approved = false 
           WHERE id = $1`,
          [reviewId]
        );
      }

      return { success: true };
    }),

  getPendingReviews: t.procedure.use(isAdmin).query(async () => {
    const res = await pool.query(`
      SELECT r.*, u.name as user_name, b.name as business_name, a.appointment_datetime
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN businesses b ON r.business_id = b.id
      JOIN appointments a ON r.appointment_id = a.id
      WHERE r.is_approved = false
      ORDER BY r.created_at DESC
    `);
    return res.rows;
  }),

  getPendingReplies: t.procedure.use(isAdmin).query(async () => {
    const res = await pool.query(`
      SELECT r.*, u.name as user_name, b.name as business_name, a.appointment_datetime
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN businesses b ON r.business_id = b.id
      JOIN appointments a ON r.appointment_id = a.id
      WHERE r.business_reply IS NOT NULL AND r.business_reply_approved = false
      ORDER BY r.business_reply_at DESC
    `);
    return res.rows;
  }),

  // Business Slider Images Approval System
  approveBusinessSliderImage: t.procedure.use(isAdmin)
    .input(z.object({ 
      imageId: z.string().uuid(), 
      approve: z.boolean(),
      note: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { imageId, approve, note } = input;
      const adminId = ctx.session?.user?.id;

      if (approve) {
        await pool.query(
          `UPDATE business_images SET 
           is_approved = true, 
           is_active = true,
           approval_note = $1, 
           approved_at = NOW(), 
           approved_by = $2 
           WHERE id = $3`,
          [note || 'Slider görseli onaylandı', adminId, imageId]
        );
      } else {
        // Reddedilen görseli deaktif et
        await pool.query(
          `UPDATE business_images SET 
           is_active = false, 
           is_approved = false 
           WHERE id = $1`,
          [imageId]
        );
      }

      return { success: true };
    }),

  getPendingBusinessImages: t.procedure.use(isAdmin).query(async () => {
    const res = await pool.query(`
      SELECT bi.*, b.name as business_name, u.name as owner_name, u.email as owner_email
      FROM business_images bi
      JOIN businesses b ON bi.business_id = b.id
      LEFT JOIN users u ON b.owner_user_id = u.id
      WHERE bi.is_approved = false
      ORDER BY bi.created_at DESC
    `);
    return res.rows;
  }),

  // Recalculate all business ratings
  recalculateBusinessRatings: t.procedure.use(isAdmin)
    .mutation(async () => {
      // Get all businesses
      const businessesRes = await pool.query('SELECT id FROM businesses');
      const businesses = businessesRes.rows;

      // Recalculate ratings for each business
      for (const business of businesses) {
        try {
          // Calculate overall ratings - only approved reviews
          const overallResult = await pool.query(
            `SELECT 
               AVG(service_rating) as avg_service,
               AVG(employee_rating) as avg_employee,
               COUNT(*) as total_reviews
             FROM reviews 
             WHERE business_id = $1 AND is_approved = true`,
            [business.id]
          );

          // Calculate last 6 months rating - only approved reviews
          const last6MonthsResult = await pool.query(
            `SELECT AVG((service_rating + employee_rating) / 2.0) as last_6_months
             FROM reviews 
             WHERE business_id = $1 
             AND is_approved = true
             AND created_at >= NOW() - INTERVAL '6 months'`,
            [business.id]
          );

          const overall = overallResult.rows[0];
          const last6Months = last6MonthsResult.rows[0];

          // Upsert business ratings
          await pool.query(
            `INSERT INTO business_ratings (business_id, average_service_rating, average_employee_rating, overall_rating, total_reviews, last_6_months_rating)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (business_id) 
             DO UPDATE SET 
               average_service_rating = EXCLUDED.average_service_rating,
               average_employee_rating = EXCLUDED.average_employee_rating,
               overall_rating = EXCLUDED.overall_rating,
               total_reviews = EXCLUDED.total_reviews,
               last_6_months_rating = EXCLUDED.last_6_months_rating,
               last_updated = NOW()`,
            [
              business.id,
              parseFloat(overall.avg_service || 0),
              parseFloat(overall.avg_employee || 0),
              parseFloat(((parseFloat(overall.avg_service || 0) + parseFloat(overall.avg_employee || 0)) / 2).toFixed(2)),
              parseInt(overall.total_reviews || 0),
              parseFloat(last6Months.last_6_months || 0),
            ]
          );
        } catch (error) {
          console.error(`Error updating ratings for business ${business.id}:`, error);
        }
      }

      return { success: true, message: `Ratings recalculated for ${businesses.length} businesses` };
    }),
});


