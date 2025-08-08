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

const businessUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().min(5),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  latitude: z.number(),
  longitude: z.number(),
});

const businessProfileUpdateSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
});

const businessImageSchema = z.object({
  businessId: z.string().uuid(),
  imageUrl: z.string().url(),
  imageOrder: z.number().min(0).optional(),
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
  updateBusiness: t.procedure.use(isBusiness)
    .input(businessUpdateSchema)
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `UPDATE businesses SET name = $1, description = $2, address = $3, phone = $4, email = $5, latitude = $6, longitude = $7, updated_at = NOW() WHERE id = $8 RETURNING *`,
        [input.name, input.description || '', input.address, input.phone || '', input.email || '', input.latitude, input.longitude, input.id]
      );
      return result.rows[0];
    }),
  updateBusinessProfile: t.procedure.use(isBusiness)
    .input(businessProfileUpdateSchema)
    .mutation(async ({ input }) => {
      // Önce business'i bul
      const businessResult = await pool.query(
        `SELECT * FROM businesses WHERE id = $1`,
        [input.businessId]
      );
      
      if (businessResult.rows.length === 0) {
        throw new Error('İşletme bulunamadı');
      }

      const business = businessResult.rows[0];

      // Şifre güncellenecekse hash'le
      let passwordHash = business.password;
      if (input.password) {
        const bcrypt = require('bcrypt');
        passwordHash = await bcrypt.hash(input.password, 10);
      }

      // Business'i güncelle
      const result = await pool.query(
        `UPDATE businesses SET name = $1, email = $2, password = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
        [input.name, input.email, passwordHash, input.businessId]
      );
      
      return result.rows[0];
    }),
  getBusinessImages: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT * FROM business_images WHERE business_id = $1 AND is_active = true ORDER BY image_order ASC`,
        [input.businessId]
      );
      return result.rows;
    }),
  addBusinessImage: t.procedure.use(isBusiness)
    .input(businessImageSchema)
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `INSERT INTO business_images (business_id, image_url, image_order) VALUES ($1, $2, $3) RETURNING *`,
        [input.businessId, input.imageUrl, input.imageOrder || 0]
      );
      return result.rows[0];
    }),
  updateBusinessImage: t.procedure.use(isBusiness)
    .input(z.object({
      id: z.string().uuid(),
      businessId: z.string().uuid(),
      imageUrl: z.string().url().optional(),
      imageOrder: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (input.imageUrl !== undefined) {
        updates.push(`image_url = $${paramCount}`);
        values.push(input.imageUrl);
        paramCount++;
      }
      if (input.imageOrder !== undefined) {
        updates.push(`image_order = $${paramCount}`);
        values.push(input.imageOrder);
        paramCount++;
      }
      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramCount}`);
        values.push(input.isActive);
        paramCount++;
      }

      updates.push(`updated_at = NOW()`);
      values.push(input.id, input.businessId);

      const result = await pool.query(
        `UPDATE business_images SET ${updates.join(', ')} WHERE id = $${paramCount} AND business_id = $${paramCount + 1} RETURNING *`,
        values
      );
      return result.rows[0];
    }),
  deleteBusinessImage: t.procedure.use(isBusiness)
    .input(z.object({ id: z.string().uuid(), businessId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await pool.query(`DELETE FROM business_images WHERE id = $1 AND business_id = $2`, [input.id, input.businessId]);
      return { success: true };
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

  // YENİ: Çalışan hizmetleri yönetimi
  getEmployeeServices: t.procedure
    .input(z.object({ employeeId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT s.* FROM services s
         JOIN employee_services es ON s.id = es.service_id
         WHERE es.employee_id = $1`,
        [input.employeeId]
      );
      return result.rows;
    }),

  assignServiceToEmployee: t.procedure.use(isBusiness)
    .input(z.object({ 
      employeeId: z.string().uuid(), 
      serviceId: z.string().uuid(),
      businessId: z.string().uuid()
    }))
    .mutation(async ({ input }) => {
      // Önce service'in bu business'e ait olduğunu kontrol et
      const serviceCheck = await pool.query(
        `SELECT id FROM services WHERE id = $1 AND business_id = $2`,
        [input.serviceId, input.businessId]
      );
      if (serviceCheck.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Hizmet bulunamadı' });
      }

      // Önce employee'in bu business'e ait olduğunu kontrol et
      const employeeCheck = await pool.query(
        `SELECT id FROM employees WHERE id = $1 AND business_id = $2`,
        [input.employeeId, input.businessId]
      );
      if (employeeCheck.rows.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Çalışan bulunamadı' });
      }

      const result = await pool.query(
        `INSERT INTO employee_services (employee_id, service_id) VALUES ($1, $2) RETURNING *`,
        [input.employeeId, input.serviceId]
      );
      return result.rows[0];
    }),

  removeServiceFromEmployee: t.procedure.use(isBusiness)
    .input(z.object({ 
      employeeId: z.string().uuid(), 
      serviceId: z.string().uuid(),
      businessId: z.string().uuid()
    }))
    .mutation(async ({ input }) => {
      await pool.query(
        `DELETE FROM employee_services WHERE employee_id = $1 AND service_id = $2`,
        [input.employeeId, input.serviceId]
      );
      return { success: true };
    }),

  getEmployeesByService: t.procedure
    .input(z.object({ serviceId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT e.* FROM employees e
         JOIN employee_services es ON e.id = es.employee_id
         WHERE es.service_id = $1`,
        [input.serviceId]
      );
      return result.rows;
    }),

  getBusinessByUserId: t.procedure.use(isBusiness)
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT * FROM businesses WHERE owner_user_id = $1`,
        [input.userId]
      );
      return result.rows[0];
    }),
}); 