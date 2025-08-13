import { t, isAdmin } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';

export const adminRouter = t.router({
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
      const res = await pool.query(`UPDATE appointments SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`, [input.status, input.id]);
      return res.rows[0];
    }),
});


