import { t, isUser, isBusiness } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import { TRPCError } from '@trpc/server';

// Review creation schema
const createReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  serviceRating: z.number().min(1).max(5),
  employeeRating: z.number().min(1).max(5),
  comment: z.string().min(20, 'Yorum en az 20 karakter olmalıdır'),
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
      const { appointmentId, serviceRating, employeeRating, comment } = input;
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

      // Create review
      const result = await pool.query(
        `INSERT INTO reviews (appointment_id, user_id, business_id, service_rating, employee_rating, comment) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [appointmentId, userId, appointment.business_id, serviceRating, employeeRating, comment]
      );

      // Update business ratings
      await updateBusinessRatings(appointment.business_id);
      
      // Update employee ratings if employee exists
      if (firstEmployeeId) {
        await updateEmployeeRatings(firstEmployeeId);
      }

      return result.rows[0];
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
        `SELECT r.*, b.name as business_name, a.appointment_datetime,
                COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), ARRAY[]::text[]) as service_names,
                COALESCE(array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL), ARRAY[]::text[]) as employee_names
         FROM reviews r
         JOIN businesses b ON r.business_id = b.id
         JOIN appointments a ON r.appointment_id = a.id
         LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
         LEFT JOIN services s ON aps.service_id = s.id
         LEFT JOIN employees e ON aps.employee_id = e.id
         WHERE r.user_id = $1
         GROUP BY r.id, b.name, a.appointment_datetime
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
          turkey_datetime: new Date(new Date(row.appointment_datetime).getTime() + (3 * 60 * 60 * 1000)).toISOString()
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
    .use(isBusiness)
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input, ctx }) => {
      const { page, limit } = input;
      const businessId = ctx.user.businessId;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `SELECT r.*, u.name as user_name, a.appointment_datetime
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         JOIN appointments a ON r.appointment_id = a.id
         WHERE r.business_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [businessId, limit, offset]
      );

      const totalResult = await pool.query(
        'SELECT COUNT(*) as total FROM reviews WHERE business_id = $1',
        [businessId]
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

  // Get reviews by employee
  getByEmployee: t.procedure
    .input(z.object({
      employeeId: z.string().uuid(),
      ...paginationSchema.shape,
    }))
    .query(async ({ input }) => {
      const { employeeId, page, limit } = input;
      const offset = (page - 1) * limit;

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
         WHERE r.appointment_id = $1`,
        [input.appointmentId]
      );

      return result.rows[0] || null;
    }),

  // Get business rating summary
  getBusinessRating: t.procedure
    .use(isBusiness)
    .query(async ({ ctx }) => {
      const businessId = ctx.user.businessId;
      
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
    .input(z.object({ employeeId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        'SELECT * FROM employee_ratings WHERE employee_id = $1',
        [input.employeeId]
      );

      return result.rows[0] || {
        average_rating: 0,
        total_reviews: 0,
      };
    }),
});

// Helper functions to update cached ratings
async function updateBusinessRatings(businessId: string) {
  // Calculate overall ratings
  const overallResult = await pool.query(
    `SELECT 
       AVG(service_rating) as avg_service,
       AVG(employee_rating) as avg_employee,
       COUNT(*) as total_reviews
     FROM reviews 
     WHERE business_id = $1`,
    [businessId]
  );

  // Calculate last 6 months rating
  const last6MonthsResult = await pool.query(
    `SELECT AVG((service_rating + employee_rating) / 2.0) as last_6_months
     FROM reviews 
     WHERE business_id = $1 
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