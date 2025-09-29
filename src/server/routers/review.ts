import { t, isUser, isBusiness, isEmployeeOrBusiness } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import { TRPCError } from '@trpc/server';

// Review creation schema
const createReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  serviceRating: z.number().min(1).max(5),
  employeeRating: z.number().min(1).max(5),
  comment: z.string().min(20, 'Yorum en az 20 karakter olmalıdır'),
  photos: z.array(z.string()).optional().default([]),
});

// Review reply schema
const createReplySchema = z.object({
  reviewId: z.string().uuid(),
  reply: z.string().min(10, 'Yanıt en az 10 karakter olmalıdır'),
});

// Pagination schema
const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
});

export const reviewRouter = t.router({
  // Create a new review
  create: t.procedure
    .use(isUser)
    .input(createReviewSchema)
    .mutation(async ({ input, ctx }) => {
      try {
      const { appointmentId, serviceRating, employeeRating, comment, photos } = input;
      const userId = ctx.user.id;

      // Check if appointment exists and belongs to user
      const appointmentCheck = await pool.query(
        `SELECT a.*, b.id as business_id, 
                COALESCE(array_agg(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL), ARRAY[]::uuid[]) as employee_ids,
                COALESCE(array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL), ARRAY[]::text[]) as employee_names
         FROM appointments a 
         JOIN businesses b ON a.business_id = b.id 
         LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
         LEFT JOIN employees e ON aps.employee_id = e.id 
         WHERE a.id = $1 AND a.user_id = $2 AND a.status = 'completed'
         GROUP BY a.id, b.id`,
        [appointmentId, userId]
      );

      if (appointmentCheck.rows.length === 0) {
        throw new Error('Randevu bulunamadı veya tamamlanmamış');
      }

      const appointment = appointmentCheck.rows[0];

      // Get first employee for rating (since we can't rate multiple employees separately yet)
      const firstEmployeeId = appointment.employee_ids?.[0] || null;

      // Check if review already exists
      const existingReview = await pool.query(
        'SELECT id FROM reviews WHERE appointment_id = $1',
        [appointmentId]
      );

      if (existingReview.rows.length > 0) {
        throw new Error('Bu randevu için zaten yorum yapılmış');
      }

      // Check if appointment is within 30 days (daha uzun süre)
      const appointmentTime = new Date(appointment.appointment_datetime);
      const now = new Date();
      const daysDiff = (now.getTime() - appointmentTime.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 30) {
        throw new Error('Randevudan 30 gün geçtikten sonra yorum yapılamaz');
      }

      // Simple spam filter
      const spamKeywords = ['spam', 'küfür', 'hakaret', 'reklam'];
      const lowerComment = comment.toLowerCase();
      if (spamKeywords.some(keyword => lowerComment.includes(keyword))) {
        throw new Error('Yorumunuz uygun değil');
      }

      // Create review (onay bekliyor)
      // PostgreSQL array formatına çevir: [1,2,3] -> {1,2,3}
      const photosArray = photos && photos.length > 0 ? `{${photos.map(p => `"${p}"`).join(',')}}` : '{}';
      
      const result = await pool.query(
        `INSERT INTO reviews (appointment_id, user_id, business_id, service_rating, employee_rating, comment, photos, is_approved) 
         VALUES ($1, $2, $3, $4, $5, $6, $7::text[], false) 
         RETURNING *`,
        [appointmentId, userId, appointment.business_id, serviceRating, employeeRating, comment, photosArray]
      );

      // Update business ratings
      await updateBusinessRatings(appointment.business_id);
      
      // Update employee ratings if employee exists
      if (firstEmployeeId) {
        await updateEmployeeRatings(firstEmployeeId);
      }

      // Push notification gönder
      try {
        // İşletme ve kullanıcı bilgilerini al
        const businessRes = await pool.query('SELECT name FROM businesses WHERE id = $1', [appointment.business_id]);
        const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
        
        const businessName = businessRes.rows[0]?.name || 'İşletme';
        const userName = userRes.rows[0]?.name || null;
        
        const { sendReviewNotification } = await import('../../utils/pushNotification');
        await sendReviewNotification(
          result.rows[0].id,
          appointment.business_id,
          userId || null,
          serviceRating,
          businessName,
          userName
        );
      } catch (error) {
        // Push notification hatası review oluşturmayı etkilemesin
      }

      return result.rows[0];
      } catch (error) {
        throw error;
      }
    }),

  // Yeni: Tamamlanan randevular için yorum yapılmamış olanları getir
  getCompletedAppointmentsForReview: t.procedure
    .use(isUser)
    .input(z.object({
      userId: z.string().uuid(),
      businessId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      const { userId, businessId } = input;
      
      let query = `
        SELECT 
          a.id as appointment_id,
          a.appointment_datetime,
          a.status,
          a.customer_name,
          b.id as business_id,
          b.name as business_name,
          COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), ARRAY[]::text[]) as service_names,
          COALESCE(array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL), ARRAY[]::text[]) as employee_names,
          COALESCE(array_agg(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL), ARRAY[]::uuid[]) as employee_ids,
          r.id as review_id
        FROM appointments a
        JOIN businesses b ON a.business_id = b.id
        LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
        LEFT JOIN services s ON aps.service_id = s.id
        LEFT JOIN employees e ON aps.employee_id = e.id
        LEFT JOIN reviews r ON a.id = r.appointment_id
        WHERE a.user_id = $1 AND a.status = 'completed'
      `;
      
      const params = [userId];
      let paramIndex = 1;
      
      if (businessId) {
        query += ` AND b.id = $${++paramIndex}`;
        params.push(businessId);
      }
      
      query += `
        GROUP BY a.id, b.id, r.id
        HAVING r.id IS NULL
        ORDER BY a.appointment_datetime DESC
      `;
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        ...row,
        appointment_datetime: new Date(row.appointment_datetime).toISOString(),
        turkey_datetime: new Date(new Date(row.appointment_datetime).getTime() + (3 * 60 * 60 * 1000)).toISOString()
      }));
    }),

  // Yeni: Kullanıcının yorumlarını getir
  getByUser: t.procedure
    .use(isUser)
    .input(z.object({
      userId: z.string().uuid(),
      ...paginationSchema.shape,
    }))
    .query(async ({ input }) => {
      const { userId, page, limit } = input;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `SELECT r.*, b.name as business_name, a.appointment_datetime, r.photos,
                COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), ARRAY[]::text[]) as service_names,
                COALESCE(array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL), ARRAY[]::text[]) as employee_names
         FROM reviews r
         JOIN businesses b ON r.business_id = b.id
         JOIN appointments a ON r.appointment_id = a.id
         LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
         LEFT JOIN services s ON aps.service_id = s.id
         LEFT JOIN employees e ON aps.employee_id = e.id
         WHERE r.user_id = $1
         GROUP BY r.id, b.name, a.appointment_datetime, r.photos
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const totalResult = await pool.query(
        'SELECT COUNT(*) as total FROM reviews WHERE user_id = $1',
        [userId]
      );

      return {
        reviews: result.rows.map(row => ({
          ...row,
          appointment_datetime: new Date(row.appointment_datetime).toISOString(),
          turkey_datetime: new Date(new Date(row.appointment_datetime).getTime() + (3 * 60 * 60 * 1000)).toISOString(),
          photos: row.photos || []
        })),
        pagination: {
          page,
          limit,
          total: parseInt(totalResult.rows[0].total),
          totalPages: Math.ceil(parseInt(totalResult.rows[0].total) / limit),
        },
      };
    }),

  // Get reviews by business with pagination
  getByBusiness: t.procedure
    .input(z.object({
      businessId: z.string().uuid(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      const { businessId, page, limit } = input;
      const offset = (page - 1) * limit;

      // Herkes işletme yorumlarını görebilir
      const reviewsQuery = `SELECT r.*, u.name as user_name, a.appointment_datetime,
              b.name as business_name, r.business_reply, r.business_reply_at, r.photos
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN appointments a ON r.appointment_id = a.id
       JOIN businesses b ON r.business_id = b.id
       WHERE r.business_id = $1 AND b.is_approved = true AND r.is_approved = true
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`;

      const totalQuery = 'SELECT COUNT(*) as total FROM reviews WHERE business_id = $1';

      const result = await pool.query(reviewsQuery, [businessId, limit, offset]);
      const totalResult = await pool.query(totalQuery, [businessId]);

      return {
        reviews: result.rows.map(row => ({
          ...row,
          photos: row.photos || []
        })),
        pagination: {
          page,
          limit,
          total: parseInt(totalResult.rows[0].total),
          totalPages: Math.ceil(parseInt(totalResult.rows[0].total) / limit),
        },
      };
    }),

  // Get reviews by employee
  getByEmployee: t.procedure
    .use(isEmployeeOrBusiness)
    .input(z.object({
      employeeId: z.string().uuid(),
      ...paginationSchema.shape,
    }))
    .query(async ({ input, ctx }) => {
      const { employeeId, page, limit } = input;
      const offset = (page - 1) * limit;

      // Employee ise sadece kendi yorumlarını görebilir
      if (ctx.user.role === 'employee' && ctx.user.employeeId !== employeeId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece kendi yorumlarınızı görüntüleyebilirsiniz' });
      }

      const result = await pool.query(
        `SELECT r.*, u.name as user_name, a.appointment_datetime
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         JOIN appointments a ON r.appointment_id = a.id
         WHERE a.employee_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [employeeId, limit, offset]
      );

      const totalResult = await pool.query(
        `SELECT COUNT(*) as total 
         FROM reviews r
         JOIN appointments a ON r.appointment_id = a.id
         WHERE a.employee_id = $1`,
        [employeeId]
      );

      return {
        reviews: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(totalResult.rows[0].total),
          totalPages: Math.ceil(parseInt(totalResult.rows[0].total) / limit),
        },
      };
    }),

  // Get review by appointment
  getByAppointment: t.procedure
    .input(z.object({ appointmentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT r.*, u.name as user_name
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.appointment_id = $1 AND r.is_approved = true`,
        [input.appointmentId]
      );

      return result.rows[0] || null;
    }),

  // Get business rating summary
  getBusinessRating: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { businessId } = input;
      
      const result = await pool.query(
        'SELECT * FROM business_ratings WHERE business_id = $1',
        [businessId]
      );

      return result.rows[0] || {
        average_service_rating: 0,
        average_employee_rating: 0,
        overall_rating: 0,
        total_reviews: 0,
        last_6_months_rating: 0,
      };
    }),

  // Get employee rating summary
  getEmployeeRating: t.procedure
    .use(isEmployeeOrBusiness)
    .input(z.object({ employeeId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Employee ise sadece kendi puanlarını görebilir
      if (ctx.user.role === 'employee' && ctx.user.employeeId !== input.employeeId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece kendi puanlarınızı görüntüleyebilirsiniz' });
      }

      const result = await pool.query(
        'SELECT * FROM employee_ratings WHERE employee_id = $1',
        [input.employeeId]
      );

      return result.rows[0] || {
        average_rating: 0,
        total_reviews: 0,
      };
    }),

  // İşletme yanıtı ekle
  addBusinessReply: t.procedure
    .use(isBusiness)
    .input(createReplySchema)
    .mutation(async ({ input, ctx }) => {
      const { reviewId, reply } = input;
      const businessId = ctx.user.businessId;

      // Yorumun bu işletmeye ait olduğunu kontrol et
      const reviewCheck = await pool.query(
        'SELECT id FROM reviews WHERE id = $1 AND business_id = $2',
        [reviewId, businessId]
      );

      if (reviewCheck.rows.length === 0) {
        throw new Error('Yorum bulunamadı veya bu işletmeye ait değil');
      }

      // Yanıt ekle (onay bekliyor)
      const result = await pool.query(
        `UPDATE reviews SET business_reply = $1, business_reply_at = NOW(), business_reply_approved = false WHERE id = $2 RETURNING *`,
        [reply, reviewId]
      );

      return result.rows[0];
    }),

  // Yanıtı güncelle
  updateBusinessReply: t.procedure
    .use(isBusiness)
    .input(z.object({
      reviewId: z.string().uuid(),
      reply: z.string().min(10, 'Yanıt en az 10 karakter olmalıdır'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { reviewId, reply } = input;
      const businessId = ctx.user.businessId;

      // Yorumun bu işletmeye ait olduğunu kontrol et
      const reviewCheck = await pool.query(
        'SELECT id FROM reviews WHERE id = $1 AND business_id = $2',
        [reviewId, businessId]
      );

      if (reviewCheck.rows.length === 0) {
        throw new Error('Yorum bulunamadı veya bu işletmeye ait değil');
      }

      // Yanıtı güncelle
      const result = await pool.query(
        `UPDATE reviews SET business_reply = $1, business_reply_at = NOW() WHERE id = $2 RETURNING *`,
        [reply, reviewId]
      );

      return result.rows[0];
    }),

  // Yanıtı sil
  deleteBusinessReply: t.procedure
    .use(isBusiness)
    .input(z.object({ reviewId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { reviewId } = input;
      const businessId = ctx.user.businessId;

      // Yorumun bu işletmeye ait olduğunu kontrol et
      const reviewCheck = await pool.query(
        'SELECT id FROM reviews WHERE id = $1 AND business_id = $2',
        [reviewId, businessId]
      );

      if (reviewCheck.rows.length === 0) {
        throw new Error('Yorum bulunamadı veya bu işletmeye ait değil');
      }

      // Yanıtı sil
      const result = await pool.query(
        `UPDATE reviews SET business_reply = NULL, business_reply_at = NULL WHERE id = $1 RETURNING *`,
        [reviewId]
      );

      return result.rows[0];
    }),

  // Kullanıcının kendi yorumunu silme
  deleteUserReview: t.procedure
    .use(isUser)
    .input(z.object({ reviewId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { reviewId } = input;
      const userId = ctx.user.id;

      // Yorumun bu kullanıcıya ait olduğunu kontrol et
      const reviewCheck = await pool.query(
        'SELECT id FROM reviews WHERE id = $1 AND user_id = $2',
        [reviewId, userId]
      );

      if (reviewCheck.rows.length === 0) {
        throw new Error('Yorum bulunamadı veya size ait değil');
      }

      // Yorumu sil
      const result = await pool.query(
        'DELETE FROM reviews WHERE id = $1 RETURNING *',
        [reviewId]
      );

      // İşletme rating'lerini güncelle
      if (result.rows.length > 0) {
        const review = result.rows[0];
        await updateBusinessRatings(review.business_id);
      }

      return result.rows[0];
    }),
});

// Helper functions to update cached ratings
async function updateBusinessRatings(businessId: string) {
  // Calculate overall ratings - only approved reviews
  const overallResult = await pool.query(
    `SELECT 
       AVG(service_rating) as avg_service,
       AVG(employee_rating) as avg_employee,
       COUNT(*) as total_reviews
     FROM reviews 
     WHERE business_id = $1 AND is_approved = true`,
    [businessId]
  );

  // Calculate last 6 months rating - only approved reviews
  const last6MonthsResult = await pool.query(
    `SELECT AVG((service_rating + employee_rating) / 2.0) as last_6_months
     FROM reviews 
     WHERE business_id = $1 
     AND is_approved = true
     AND created_at >= NOW() - INTERVAL '6 months'`,
    [businessId]
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
      businessId,
      parseFloat(overall.avg_service || 0),
      parseFloat(overall.avg_employee || 0),
      parseFloat(((parseFloat(overall.avg_service || 0) + parseFloat(overall.avg_employee || 0)) / 2).toFixed(2)),
      parseInt(overall.total_reviews || 0),
      parseFloat(last6Months.last_6_months || 0),
    ]
  );
}

async function updateEmployeeRatings(employeeId: string) {
  const result = await pool.query(
    `SELECT AVG(employee_rating) as avg_rating, COUNT(*) as total_reviews
     FROM reviews r
     JOIN appointments a ON r.appointment_id = a.id
     WHERE a.employee_id = $1`,
    [employeeId]
  );

  const rating = result.rows[0];

  // Upsert employee ratings
  await pool.query(
    `INSERT INTO employee_ratings (employee_id, average_rating, total_reviews)
     VALUES ($1, $2, $3)
     ON CONFLICT (employee_id) 
     DO UPDATE SET 
       average_rating = EXCLUDED.average_rating,
       total_reviews = EXCLUDED.total_reviews,
       last_updated = NOW()`,
    [
      employeeId,
      parseFloat(rating.avg_rating || 0),
      parseInt(rating.total_reviews || 0),
    ]
  );
} 