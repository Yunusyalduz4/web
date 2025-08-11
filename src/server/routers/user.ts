import { t, isUser } from '../trpc/trpc';
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
}); 