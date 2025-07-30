import { t, isBusiness } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';

const serviceSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional(),
  duration_minutes: z.number().min(1),
  price: z.number().min(0),
});

const employeeSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const availabilitySchema = z.object({
  employeeId: z.string().uuid(),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
});

export const businessRouter = t.router({
  getBusinesses: t.procedure
    .query(async () => {
      const result = await pool.query(`SELECT * FROM businesses`);
      return result.rows;
    }),
  getBusinessById: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(`SELECT * FROM businesses WHERE id = $1`, [input.businessId]);
      return result.rows[0];
    }),
  getServices: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(`SELECT * FROM services WHERE business_id = $1`, [input.businessId]);
      return result.rows;
    }),
  createService: t.procedure.use(isBusiness)
    .input(serviceSchema)
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `INSERT INTO services (business_id, name, description, duration_minutes, price) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [input.businessId, input.name, input.description || '', input.duration_minutes, input.price]
      );
      return result.rows[0];
    }),
  updateService: t.procedure.use(isBusiness)
    .input(serviceSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `UPDATE services SET name = $1, description = $2, duration_minutes = $3, price = $4 WHERE id = $5 AND business_id = $6 RETURNING *`,
        [input.name, input.description || '', input.duration_minutes, input.price, input.id, input.businessId]
      );
      return result.rows[0];
    }),
  deleteService: t.procedure.use(isBusiness)
    .input(z.object({ id: z.string().uuid(), businessId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await pool.query(`DELETE FROM services WHERE id = $1 AND business_id = $2`, [input.id, input.businessId]);
      return { success: true };
    }),
  getEmployees: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(`SELECT * FROM employees WHERE business_id = $1`, [input.businessId]);
      return result.rows;
    }),
  createEmployee: t.procedure.use(isBusiness)
    .input(employeeSchema)
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `INSERT INTO employees (business_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *`,
        [input.businessId, input.name, input.email || '', input.phone || '']
      );
      return result.rows[0];
    }),
  updateEmployee: t.procedure.use(isBusiness)
    .input(employeeSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `UPDATE employees SET name = $1, email = $2, phone = $3 WHERE id = $4 AND business_id = $5 RETURNING *`,
        [input.name, input.email || '', input.phone || '', input.id, input.businessId]
      );
      return result.rows[0];
    }),
  deleteEmployee: t.procedure.use(isBusiness)
    .input(z.object({ id: z.string().uuid(), businessId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await pool.query(`DELETE FROM employees WHERE id = $1 AND business_id = $2`, [input.id, input.businessId]);
      return { success: true };
    }),
  getEmployeeAvailability: t.procedure
    .input(z.object({ employeeId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(`SELECT * FROM employee_availability WHERE employee_id = $1`, [input.employeeId]);
      return result.rows;
    }),
  createEmployeeAvailability: t.procedure.use(isBusiness)
    .input(availabilitySchema)
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `INSERT INTO employee_availability (employee_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *`,
        [input.employeeId, input.day_of_week, input.start_time, input.end_time]
      );
      return result.rows[0];
    }),
  updateEmployeeAvailability: t.procedure.use(isBusiness)
    .input(availabilitySchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `UPDATE employee_availability SET day_of_week = $1, start_time = $2, end_time = $3 WHERE id = $4 AND employee_id = $5 RETURNING *`,
        [input.day_of_week, input.start_time, input.end_time, input.id, input.employeeId]
      );
      return result.rows[0];
    }),
  deleteEmployeeAvailability: t.procedure.use(isBusiness)
    .input(z.object({ id: z.string().uuid(), employeeId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await pool.query(`DELETE FROM employee_availability WHERE id = $1 AND employee_id = $2`, [input.id, input.employeeId]);
      return { success: true };
    }),
}); 