import { t, isUser } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import bcrypt from 'bcrypt';

export const userRouter = t.router({
  getProfile: t.procedure.use(isUser)
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
        [input.userId]
      );
      return result.rows[0];
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
          COALESCE(array_agg(aps.duration_minutes) FILTER (WHERE aps.duration_minutes IS NOT NULL), ARRAY[]::integer[]) as durations
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
    }))
    .mutation(async ({ input }) => {
      let passwordHash;
      if (input.password) {
        passwordHash = await bcrypt.hash(input.password, 10);
      }
      const result = await pool.query(
        `UPDATE users SET name = $1, email = $2${input.password ? ', password_hash = $3' : ''} WHERE id = $4 RETURNING id, name, email, role, created_at`,
        input.password
          ? [input.name, input.email, passwordHash, input.userId]
          : [input.name, input.email, input.userId]
      );
      return result.rows[0];
    }),
}); 