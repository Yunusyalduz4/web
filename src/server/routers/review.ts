import { t, isUser } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';

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
        `SELECT a.*, b.id as business_id, e.id as employee_id 
         FROM appointments a 
         JOIN businesses b ON a.business_id = b.id 
         JOIN employees e ON a.employee_id = e.id 
         WHERE a.id = $1 AND a.user_id = $2 AND a.status = 'completed'`,
        [appointmentId, userId]
      );

      if (appointmentCheck.rows.length === 0) {
        throw new Error('Randevu bulunamadı veya tamamlanmamış');
      }

      const appointment = appointmentCheck.rows[0];

      // Check if review already exists
      const existingReview = await pool.query(
        'SELECT id FROM reviews WHERE appointment_id = $1',
        [appointmentId]
      );

      if (existingReview.rows.length > 0) {
        throw new Error('Bu randevu için zaten yorum yapılmış');
      }

      // Check if appointment is within 24 hours
      const appointmentTime = new Date(appointment.appointment_datetime);
      const now = new Date();
      const hoursDiff = (now.getTime() - appointmentTime.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        throw new Error('Randevudan 24 saat geçtikten sonra yorum yapılamaz');
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
      
      // Update employee ratings
      await updateEmployeeRatings(appointment.employee_id);

      return result.rows[0];
    }),

  // Get reviews by business with pagination
  getByBusiness: t.procedure
    .input(z.object({
      businessId: z.string().uuid(),
      ...paginationSchema.shape,
    }))
    .query(async ({ input }) => {
      const { businessId, page, limit } = input;
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
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        'SELECT * FROM business_ratings WHERE business_id = $1',
        [input.businessId]
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