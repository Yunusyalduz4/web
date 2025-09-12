import { t, isUser, isEmployee } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import bcrypt from 'bcrypt';

export const userRouter = t.router({
  getProfile: t.procedure.use(isUser)
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT id, name, email, role, phone, address, created_at FROM users WHERE id = $1`,
        [input.userId]
      );
      return result.rows[0];
    }),

  // Yeni: Cinsiyet filtresi ile işletme listeleme
  getBusinessesWithGenderFilter: t.procedure
    .input(z.object({ 
      genderFilter: z.enum(['male', 'female', 'all']).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      radius: z.number().optional() // km cinsinden
    }))
    .query(async ({ input }) => {
      let whereClause = '';
      const values: any[] = [];
      let param = 1;

      // Cinsiyet filtresi
      if (input.genderFilter && input.genderFilter !== 'all') {
        if (input.genderFilter === 'male') {
          whereClause += ` AND (b.gender_service = 'male' OR b.gender_service = 'unisex')`;
        } else if (input.genderFilter === 'female') {
          whereClause += ` AND (b.gender_service = 'female' OR b.gender_service = 'unisex')`;
        }
      }

      // Konum filtresi (opsiyonel)
      if (input.latitude && input.longitude && input.radius) {
        // Haversine formülü ile mesafe hesaplama
        whereClause += ` AND (
          6371 * acos(
            cos(radians($${param++})) * 
            cos(radians(b.latitude)) * 
            cos(radians(b.longitude) - radians($${param++})) + 
            sin(radians($${param++})) * 
            sin(radians(b.latitude))
          )
        ) <= $${param++}`;
        values.push(input.latitude, input.longitude, input.latitude, input.radius);
      }

      const result = await pool.query(`
        SELECT 
          b.*,
          COALESCE(br.overall_rating, 0) AS overall_rating,
          COALESCE(br.total_reviews, 0) AS total_reviews,
          (
            SELECT COUNT(*)::int 
            FROM favorites f 
            WHERE f.business_id = b.id
          ) AS favorites_count
        FROM businesses b
        LEFT JOIN business_ratings br ON br.business_id = b.id
        WHERE b.is_approved = true ${whereClause}
        ORDER BY b.name ASC
      `, values);

      return result.rows;
    }),

  appointmentHistory: t.procedure.use(isUser)
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT 
          a.*,
          b.name as business_name,
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
  updateProfile: t.procedure.use(isUser)
    .input(z.object({
      userId: z.string().uuid(),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6).optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: string[] = [];
      const values: any[] = [];
      let param = 1;

      updates.push(`name = $${param++}`);
      values.push(input.name);
      updates.push(`email = $${param++}`);
      values.push(input.email);

      if (input.password) {
        const passwordHash = await bcrypt.hash(input.password, 10);
        updates.push(`password_hash = $${param++}`);
        values.push(passwordHash);
      }
      if (input.phone !== undefined) {
        updates.push(`phone = $${param++}`);
        values.push(input.phone);
      }
      if (input.address !== undefined) {
        updates.push(`address = $${param++}`);
        values.push(input.address);
      }

      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${param} RETURNING id, name, email, role, phone, address, created_at`,
        [...values, input.userId]
      );
      return result.rows[0];
    }),

  // Profil güncelleme (çalışanlar için)
  updateProfile: t.procedure.use(isEmployee)
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      address: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const updates = [];
      const values = [];
      let param = 1;

      if (input.name) {
        updates.push(`name = $${param++}`);
        values.push(input.name);
      }
      if (input.email) {
        updates.push(`email = $${param++}`);
        values.push(input.email);
      }
      if (input.phone !== undefined) {
        updates.push(`phone = $${param++}`);
        values.push(input.phone);
      }
      if (input.address !== undefined) {
        updates.push(`address = $${param++}`);
        values.push(input.address);
      }

      if (updates.length === 0) {
        throw new Error('Güncellenecek alan bulunamadı');
      }

      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${param} RETURNING id, name, email, role, phone, address, created_at`,
        [...values, ctx.user.id]
      );
      return result.rows[0];
    }),
}); 