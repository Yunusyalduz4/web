import { t, isUser, isEmployee, isAuthed } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import bcrypt from 'bcrypt';

export const userRouter = t.router({
  getProfile: t.procedure.use(isUser)
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT id, name, email, role, phone, address, profile_image_url, created_at FROM users WHERE id = $1`,
        [input.userId]
      );
      return result.rows[0];
    }),

  // Sadece telefon numarası güncelleme
  updatePhone: t.procedure.use(isAuthed)
    .input(z.object({
      phone: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await pool.query(
        `UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role, phone, address, created_at`,
        [input.phone, ctx.user.id]
      );
      return result.rows[0];
    }),

  // Kullanıcılar için profil güncelleme (hem normal kullanıcılar hem çalışanlar)
  updateProfile: t.procedure.use(isAuthed)
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

  // Yeni: Cinsiyet filtresi ile işletme listeleme
  getBusinessesWithGenderFilter: t.procedure
    .input(z.object({ 
      genderFilter: z.enum(['male', 'female', 'all']).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      radius: z.number().optional(), // km cinsinden
      category: z.string().optional(), // category name
      membersOnly: z.boolean().optional(), // only our members (exclude google_places)
      bookable: z.enum(['all', 'bookable', 'non_bookable']).optional(),
      approvedOnly: z.boolean().optional()
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

      // Kategori filtresi (kategori adı ile)
      let categoryJoin = '';
      if (input.category && input.category.trim().length > 0) {
        categoryJoin = ' JOIN business_category_mapping bcm ON bcm.business_id = b.id JOIN business_categories bc ON bc.id = bcm.category_id ';
        whereClause += ` AND bc.name = $${param++}`;
        values.push(input.category.trim());
      }

      // Üyelerimiz filtresi (sadece kendi üyelerimiz)
      if (input.membersOnly) {
        whereClause += ` AND (b.data_source IS NULL OR b.data_source <> 'google_places')`;
      }

      // Randevu alınabilir/alınamaz filtresi
      if (input.bookable && input.bookable !== 'all') {
        if (input.bookable === 'bookable') {
          whereClause += ` AND (b.data_source IS NULL OR b.data_source <> 'google_places') AND EXISTS (SELECT 1 FROM services s WHERE s.business_id = b.id)`;
        } else if (input.bookable === 'non_bookable') {
          whereClause += ` AND ((b.data_source = 'google_places') OR NOT EXISTS (SELECT 1 FROM services s WHERE s.business_id = b.id))`;
        }
      }

      // Sadece onaylı işletmeler
      if (input.approvedOnly) {
        whereClause += ` AND b.is_approved = true AND (b.data_source IS NULL OR b.data_source <> 'google_places')`;
      }

      const result = await pool.query(`
        SELECT 
          b.*,
          COALESCE(br.overall_rating, b.google_rating, 0) AS overall_rating,
          COALESCE(br.total_reviews, b.google_reviews_count, 0) AS total_reviews,
          (
            SELECT COUNT(*)::int 
            FROM favorites f 
            WHERE f.business_id = b.id
          ) AS favorites_count,
          CASE 
            WHEN b.data_source = 'google_places' THEN true
            ELSE false
          END as is_google_places
        FROM businesses b
        ${categoryJoin}
        LEFT JOIN business_ratings br ON br.business_id = b.id
        WHERE (b.is_approved = true OR b.data_source = 'google_places') ${whereClause}
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

  // Profil fotoğrafı güncelleme
  updateProfileImage: t.procedure.use(isUser)
    .input(z.object({
      userId: z.string().uuid(),
      profileImageUrl: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `UPDATE users SET profile_image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role, phone, address, profile_image_url, created_at`,
        [input.profileImageUrl, input.userId]
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