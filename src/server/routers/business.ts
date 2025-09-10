import { t, isBusiness, isApprovedBusiness, isEmployee, isEmployeeOrBusiness } from '../trpc/trpc';
import { TRPCError } from '@trpc/server';
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
  permissions: z.object({
    can_manage_appointments: z.boolean(),
    can_view_analytics: z.boolean(),
    can_manage_services: z.boolean(),
    can_manage_employees: z.boolean(),
    can_manage_business_settings: z.boolean(),
  }).optional(),
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
  profileImageUrl: z.string().url().nullable().optional(),
  genderService: z.enum(['male', 'female', 'unisex']).optional(),
});

const businessProfileUpdateSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
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
        WHERE b.is_approved = true  -- ✅ Sadece onaylı işletmeler
      `);
      return result.rows;
    }),
  getBusinessById: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT 
          id, name, description, address, latitude, longitude, phone, email, 
          created_at, updated_at, profile_image_url, gender_preference, 
          working_hours_enabled, is_verified, average_rating, total_reviews, 
          gender_service, is_approved, profile_image_approved
        FROM businesses 
        WHERE id = $1 AND is_approved = true`, 
        [input.businessId]
      );
      return result.rows[0];
    }),
  updateBusiness: t.procedure.use(isBusiness)
    .input(businessUpdateSchema)
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `UPDATE businesses SET name = $1, description = $2, address = $3, phone = $4, email = $5, latitude = $6, longitude = $7, profile_image_url = $8, gender_service = $9, updated_at = NOW() WHERE id = $10 RETURNING *`,
        [input.name, input.description || '', input.address, input.phone || '', input.email || '', input.latitude, input.longitude, input.profileImageUrl ?? null, input.genderService || 'unisex', input.id]
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
        `UPDATE businesses SET name = $1, email = $2, phone = $3, password = $4, updated_at = NOW() WHERE id = $5 RETURNING *`,
        [input.name, input.email, input.phone || '', passwordHash, input.businessId]
      );
      
      return result.rows[0];
    }),
  getBusinessImages: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT * FROM business_images WHERE business_id = $1 AND is_active = true AND is_approved = true ORDER BY image_order ASC`,
        [input.businessId]
      );
      return result.rows;
    }),

  // İşletme sahibi için tüm görselleri getir (onay durumu ile)
  getBusinessImagesForOwner: t.procedure.use(isBusiness)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // İşletmenin bu kullanıcıya ait olduğunu kontrol et
      if (ctx.user.businessId !== input.businessId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu işletmeye erişim yetkiniz yok' });
      }

      const result = await pool.query(
        `SELECT * FROM business_images WHERE business_id = $1 ORDER BY image_order ASC`,
        [input.businessId]
      );
      return result.rows;
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
  createService: t.procedure.use(isApprovedBusiness)
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
      const result = await pool.query(
        `SELECT 
          e.*,
          COALESCE(
            array_agg(
              json_build_object(
                'day_of_week', ea.day_of_week,
                'start_time', ea.start_time,
                'end_time', ea.end_time
              )
            ) FILTER (WHERE ea.day_of_week IS NOT NULL),
            ARRAY[]::json[]
          ) as availability,
          COALESCE(
            array_agg(
              json_build_object(
                'id', s.id,
                'name', s.name,
                'description', s.description,
                'duration_minutes', s.duration_minutes,
                'price', s.price
              )
            ) FILTER (WHERE s.id IS NOT NULL),
            ARRAY[]::json[]
          ) as services
         FROM employees e
         LEFT JOIN employee_availability ea ON e.id = ea.employee_id
         LEFT JOIN employee_services es ON e.id = es.employee_id
         LEFT JOIN services s ON es.service_id = s.id
         WHERE e.business_id = $1
         GROUP BY e.id
         ORDER BY e.name`,
        [input.businessId]
      );
      return result.rows;
    }),
  createEmployee: t.procedure.use(isApprovedBusiness)
    .input(employeeSchema)
    .mutation(async ({ input }) => {
      console.log('🔍 createEmployee input:', input);
      console.log('🔍 businessId type:', typeof input.businessId, 'value:', input.businessId);
      
      // Default permissions if not provided
      const defaultPermissions = {
        can_manage_appointments: true,
        can_view_analytics: true,
        can_manage_services: false,
        can_manage_employees: false,
        can_manage_business_settings: false,
      };
      
      const permissions = input.permissions || defaultPermissions;
      
      const result = await pool.query(
        `INSERT INTO employees (business_id, name, email, phone, permissions) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [input.businessId, input.name, input.email || '', input.phone || '', JSON.stringify(permissions)]
      );
      return result.rows[0];
    }),
  updateEmployee: t.procedure.use(isBusiness)
    .input(employeeSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const permissions = input.permissions ? JSON.stringify(input.permissions) : null;
      
      let query = `UPDATE employees SET name = $1, email = $2, phone = $3`;
      let params = [input.name, input.email || '', input.phone || ''];
      
      if (permissions) {
        query += `, permissions = $4 WHERE id = $5 AND business_id = $6 RETURNING *`;
        params.push(permissions, input.id, input.businessId);
      } else {
        query += ` WHERE id = $4 AND business_id = $5 RETURNING *`;
        params.push(input.id, input.businessId);
      }
      
      const result = await pool.query(query, params);
      return result.rows[0];
    }),
  deleteEmployee: t.procedure.use(isBusiness)
    .input(z.object({ id: z.string().uuid(), businessId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Önce users tablosundaki employee_id'yi NULL yap
      await pool.query(`UPDATE users SET employee_id = NULL WHERE employee_id = $1`, [input.id]);
      
      // Sonra çalışanı sil
      await pool.query(`DELETE FROM employees WHERE id = $1 AND business_id = $2`, [input.id, input.businessId]);
      return { success: true };
    }),
  getEmployeeAvailability: t.procedure
    .input(z.object({ employeeId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(`SELECT * FROM employee_availability WHERE employee_id = $1`, [input.employeeId]);
      return result.rows;
    }),
  getAllEmployeeAvailability: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT ea.*, e.name as employee_name 
         FROM employee_availability ea
         JOIN employees e ON ea.employee_id = e.id
         WHERE e.business_id = $1
         ORDER BY e.id, ea.day_of_week`,
        [input.businessId]
      );
      return result.rows;
    }),
  createEmployeeAvailability: t.procedure.use(isBusiness)
    .input(availabilitySchema)
    .mutation(async ({ input }) => {
      // Önce aynı gün için müsaitlik var mı kontrol et
      const existingAvailability = await pool.query(
        `SELECT id FROM employee_availability WHERE employee_id = $1 AND day_of_week = $2`,
        [input.employeeId, input.day_of_week]
      );

      if (existingAvailability.rows.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Bu gün için zaten müsaitlik tanımlanmış. Mevcut kaydı güncellemek için update işlemini kullanın.'
        });
      }

      const result = await pool.query(
        `INSERT INTO employee_availability (employee_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *`,
        [input.employeeId, input.day_of_week, input.start_time, input.end_time]
      );
      return result.rows[0];
    }),
  updateEmployeeAvailability: t.procedure.use(isBusiness)
    .input(z.object({
      id: z.string().uuid(),
      employeeId: z.string().uuid(),
      day_of_week: z.number().min(0).max(6),
      start_time: z.string().regex(/^\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('🔄 Update availability input:', JSON.stringify(input, null, 2));
        
        // Aynı gün için başka bir müsaitlik var mı kontrol et (kendi kaydı hariç)
        const existingAvailability = await pool.query(
          `SELECT id FROM employee_availability WHERE employee_id = $1 AND day_of_week = $2 AND id != $3`,
          [input.employeeId, input.day_of_week, input.id]
        );

        if (existingAvailability.rows.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Bu gün için zaten başka bir müsaitlik tanımlanmış.'
          });
        }

        const result = await pool.query(
          `UPDATE employee_availability SET day_of_week = $1, start_time = $2, end_time = $3 WHERE id = $4 AND employee_id = $5 RETURNING *`,
          [input.day_of_week, input.start_time, input.end_time, input.id, input.employeeId]
        );
        
        console.log('✅ Update successful:', result.rows[0]);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Update error:', error);
        throw error;
      }
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

  // İşletme sahibi için kendi işletmesini getir
  getMyBusiness: t.procedure.use(isBusiness)
    .query(async ({ ctx }) => {
      const result = await pool.query(
        `SELECT * FROM businesses WHERE owner_user_id = $1`,
        [ctx.user.id]
      );
      return result.rows[0];
    }),

  // Business görseli ekleme (onay bekliyor)
  addBusinessImage: t.procedure.use(isBusiness)
    .input(z.object({ 
      businessId: z.string().uuid(),
      imageUrl: z.string().url(),
      imageOrder: z.number().min(0).default(0)
    }))
    .mutation(async ({ input, ctx }) => {
      // İşletmenin bu kullanıcıya ait olduğunu kontrol et
      if (ctx.user.businessId !== input.businessId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu işletmeye erişim yetkiniz yok' });
      }

      // Görsel ekle (onay bekliyor)
      const result = await pool.query(
        `INSERT INTO business_images (business_id, image_url, image_order, is_approved) 
         VALUES ($1, $2, $3, false) 
         RETURNING *`,
        [input.businessId, input.imageUrl, input.imageOrder]
      );

      return result.rows[0];
    }),

  // Çalışan bilgileri
  getEmployeeInfo: t.procedure.use(isEmployee)
    .input(z.object({
      employeeId: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      const result = await pool.query(
        `SELECT 
          e.*,
          b.name as business_name,
          COUNT(DISTINCT a.id) as total_appointments,
          AVG(r.rating) as rating,
          COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_appointments,
          COUNT(DISTINCT CASE WHEN a.appointment_datetime >= CURRENT_DATE THEN a.id END) as today_appointments
        FROM employees e
        LEFT JOIN businesses b ON e.business_id = b.id
        LEFT JOIN appointment_services aps ON e.id = aps.employee_id
        LEFT JOIN appointments a ON aps.appointment_id = a.id
        LEFT JOIN reviews r ON a.id = r.appointment_id
        WHERE e.id = $1 AND e.business_id = $2
        GROUP BY e.id, b.name`,
        [input.employeeId, ctx.employee.businessId]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Çalışan bulunamadı' });
      }

      return result.rows[0];
    }),

  // Employee endpoint'leri
  getEmployeeById: t.procedure
    .use(isEmployeeOrBusiness)
    .input(z.object({ employeeId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Employee ise sadece kendi bilgilerini görebilir
      if (ctx.user.role === 'employee' && ctx.user.employeeId !== input.employeeId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece kendi bilgilerinizi görüntüleyebilirsiniz' });
      }

      const result = await pool.query(
        `SELECT e.*, b.name as business_name, b.id as business_id
         FROM employees e
         LEFT JOIN businesses b ON e.business_id = b.id
         WHERE e.id = $1`,
        [input.employeeId]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Çalışan bulunamadı' });
      }

      return result.rows[0];
    }),

  updateEmployeeProfile: t.procedure
    .use(isEmployeeOrBusiness)
    .input(z.object({
      employeeId: z.string().uuid(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Employee ise sadece kendi bilgilerini güncelleyebilir
      if (ctx.user.role === 'employee' && ctx.user.employeeId !== input.employeeId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece kendi bilgilerinizi güncelleyebilirsiniz' });
      }

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (input.name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        values.push(input.name);
        paramCount++;
      }
      if (input.email !== undefined) {
        updateFields.push(`email = $${paramCount}`);
        values.push(input.email);
        paramCount++;
      }
      if (input.phone !== undefined) {
        updateFields.push(`phone = $${paramCount}`);
        values.push(input.phone);
        paramCount++;
      }

      if (updateFields.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Güncellenecek alan bulunamadı' });
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(input.employeeId);

      const result = await pool.query(
        `UPDATE employees SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Çalışan bulunamadı' });
      }

      return result.rows[0];
    }),
});