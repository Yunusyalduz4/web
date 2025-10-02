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
  instagram: z.string().url().optional().or(z.literal('')),
  profileImageUrl: z.string().url().optional(),
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
  instagramUrl: z.string().url().optional().or(z.literal('')),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  tiktokUrl: z.string().url().optional().or(z.literal('')),
  xUrl: z.string().url().optional().or(z.literal('')),
});

const businessProfileUpdateSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email().optional(),
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
    .input(z.object({ 
      userLatitude: z.number().optional(),
      userLongitude: z.number().optional(),
      maxDistanceKm: z.number().optional()
    }).optional())
    .query(async ({ input }) => {
      try {
        let distanceCalculation = '';
        let whereClause = 'WHERE b.is_approved = true';
        const params: any[] = [];
        let paramCount = 0;

        // Add distance calculation if user location is provided
        if (input?.userLatitude && input?.userLongitude && input.userLatitude !== null && input.userLongitude !== null) {
          paramCount += 2;
          distanceCalculation = `, (
            6371 * acos(
              cos(radians($${paramCount - 1})) * 
              cos(radians(b.latitude)) * 
              cos(radians(b.longitude) - radians($${paramCount})) + 
              sin(radians($${paramCount - 1})) * 
              sin(radians(b.latitude))
            )
          ) AS distance`;
          params.push(input.userLatitude, input.userLongitude);

          // Add distance filter if maxDistanceKm is provided
          if (input.maxDistanceKm) {
            paramCount += 1;
            whereClause += ` AND (
              6371 * acos(
                cos(radians($${paramCount - 2})) * 
                cos(radians(b.latitude)) * 
                cos(radians(b.longitude) - radians($${paramCount - 1})) + 
                sin(radians($${paramCount - 2})) * 
                sin(radians(b.latitude))
              )
            ) <= $${paramCount}`;
            params.push(input.maxDistanceKm);
          }
        }

        const query = `
          SELECT 
            b.*,
            CASE 
              WHEN br.overall_rating IS NOT NULL AND br.overall_rating > 0 THEN br.overall_rating
              ELSE NULL
            END AS overall_rating,
            COALESCE(br.total_reviews, 0) AS total_reviews,
            (
              SELECT COUNT(*)::int 
              FROM favorites f 
              WHERE f.business_id = b.id
            ) AS favorites_count${distanceCalculation}
          FROM businesses b
          LEFT JOIN business_ratings br ON br.business_id = b.id
          ${whereClause}
          ${input?.userLatitude && input?.userLongitude ? 'ORDER BY distance ASC' : ''}
        `;
        
        const result = await pool.query(query, params);
        return result.rows;
      } catch (error) {
        console.error('Error in getBusinesses:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
  getBusinessById: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT 
          id, name, description, address, latitude, longitude, phone, email, 
          created_at, updated_at, profile_image_url, gender_preference, 
          working_hours_enabled, is_verified, average_rating, total_reviews, 
          gender_service, is_approved, profile_image_approved,
          instagram_url, facebook_url, tiktok_url, x_url,
          whatsapp_otp_enabled, whatsapp_notifications_enabled, whatsapp_phone
        FROM businesses 
        WHERE id = $1 AND is_approved = true`, 
        [input.businessId]
      );
      return result.rows[0];
    }),

  // WhatsApp ayarlarını getir (misafir kullanıcılar için)
  getBusinessWhatsAppSettings: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT 
          id, name, whatsapp_otp_enabled, whatsapp_notifications_enabled, whatsapp_phone
        FROM businesses 
        WHERE id = $1 AND is_approved = true`, 
        [input.businessId]
      );
      return result.rows[0] || null;
    }),
  updateBusiness: t.procedure.use(isBusiness)
    .input(businessUpdateSchema)
    .mutation(async ({ input }) => {
      const result = await pool.query(
        `UPDATE businesses SET name = $1, description = $2, address = $3, phone = $4, email = $5, latitude = $6, longitude = $7, profile_image_url = $8, gender_service = $9, instagram_url = $10, facebook_url = $11, tiktok_url = $12, x_url = $13, updated_at = NOW() WHERE id = $14 RETURNING *`,
        [input.name, input.description || '', input.address, input.phone || '', input.email || '', input.latitude, input.longitude, input.profileImageUrl ?? null, input.genderService || 'unisex', input.instagramUrl || null, input.facebookUrl || null, input.tiktokUrl || null, input.xUrl || null, input.id]
      );
      return result.rows[0];
    }),
  updateBusinessProfile: t.procedure.use(isBusiness)
    .input(businessProfileUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      // Önce business'i bul
      const businessResult = await pool.query(
        `SELECT * FROM businesses WHERE id = $1`,
        [input.businessId]
      );
      
      if (businessResult.rows.length === 0) {
        throw new Error('İşletme bulunamadı');
      }

      const business = businessResult.rows[0];

      // Business'i güncelle (şifre olmadan)
      const result = await pool.query(
        `UPDATE businesses SET name = $1, email = $2, phone = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
        [input.name, input.email || business.email, input.phone || business.phone, input.businessId]
      );

      // Şifre güncellenecekse users tablosunda güncelle
      if (input.password) {
        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash(input.password, 10);
        
        await pool.query(
          `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
          [passwordHash, ctx.user.id]
        );
      }
      
      return result.rows[0];
    }),

  changePassword: t.procedure.use(isBusiness)
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6)
    }))
    .mutation(async ({ input, ctx }) => {
      // Mevcut şifreyi kontrol et
      const userResult = await pool.query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [ctx.user.id]
      );
      
      if (userResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' });
      }

      const user = userResult.rows[0];
      const bcrypt = require('bcrypt');
      
      // Mevcut şifreyi doğrula
      const isValidPassword = await bcrypt.compare(input.currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Mevcut şifre yanlış' });
      }

      // Yeni şifreyi hash'le ve güncelle
      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
      
      await pool.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [newPasswordHash, ctx.user.id]
      );

      return { success: true };
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
        `INSERT INTO employees (business_id, name, email, phone, instagram, profile_image_url, permissions) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [input.businessId, input.name, input.email || '', input.phone || '', input.instagram || null, input.profileImageUrl || null, JSON.stringify(permissions)]
      );
      return result.rows[0];
    }),
  updateEmployee: t.procedure.use(isBusiness)
    .input(employeeSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const permissions = input.permissions ? JSON.stringify(input.permissions) : null;
      
      let query = `UPDATE employees SET name = $1, email = $2, phone = $3, instagram = $4, profile_image_url = $5`;
      let params = [input.name, input.email || '', input.phone || '', input.instagram || null, input.profileImageUrl || null];
      
      if (permissions) {
        query += `, permissions = $6 WHERE id = $7 AND business_id = $8 RETURNING *`;
        params.push(permissions, input.id, input.businessId);
      } else {
        query += ` WHERE id = $6 AND business_id = $7 RETURNING *`;
        params.push(input.id, input.businessId);
      }
      
      const result = await pool.query(query, params);
      return result.rows[0];
    }),

  // Employee profil fotoğrafı güncelleme
  updateEmployeeProfileImage: t.procedure.use(isBusiness)
    .input(z.object({
      employeeId: z.string().uuid(),
      businessId: z.string().uuid(),
      profileImageUrl: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      // İşletmenin bu kullanıcıya ait olduğunu kontrol et
      if (input.businessId !== ctx.user.businessId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu işletmeye erişim yetkiniz yok' });
      }

      const result = await pool.query(
        `UPDATE employees SET profile_image_url = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING id, name, email, phone, profile_image_url, created_at`,
        [input.profileImageUrl, input.employeeId, input.businessId]
      );
      
      if (result.rows.length === 0) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Çalışan bulunamadı' 
        });
      }
      
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
        
        return result.rows[0];
      } catch (error) {
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

  getServicesByEmployee: t.procedure
    .input(z.object({ 
      employeeId: z.string().uuid(),
      businessId: z.string().uuid()
    }))
    .query(async ({ input }) => {
      const result = await pool.query(
        `SELECT s.* FROM services s
         JOIN employee_services es ON s.id = es.service_id
         WHERE es.employee_id = $1 AND s.business_id = $2`,
        [input.employeeId, input.businessId]
      );
      return result.rows;
    }),

  getBusinessByUserId: t.procedure.use(isBusiness)
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        // Sadece kendi işletmesini getirebilir
        if (ctx.user.id !== input.userId) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Sadece kendi işletmenizi görüntüleyebilirsiniz' 
          });
        }

        const result = await pool.query(
          `SELECT * FROM businesses WHERE owner_user_id = $1`,
          [input.userId]
        );
        
        if (result.rows.length === 0) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'İşletme bulunamadı' 
          });
        }
        
        return result.rows[0];
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'İşletme bilgileri alınırken hata oluştu' 
        });
      }
    }),

  // İşletme sahibi için kendi işletmesini getir
  getMyBusiness: t.procedure.use(isBusiness)
    .query(async ({ ctx }) => {
      try {
        const result = await pool.query(
          `SELECT * FROM businesses WHERE owner_user_id = $1`,
          [ctx.user.id]
        );
        
        if (result.rows.length === 0) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'İşletme bulunamadı' 
          });
        }
        
        return result.rows[0];
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'İşletme bilgileri alınırken hata oluştu' 
        });
      }
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
        [input.employeeId, ctx.user.businessId]
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

  // Çalışan için meşgul slotları getir
  getBusySlots: t.procedure.use(isEmployeeOrBusiness)
    .input(z.object({
      employeeId: z.string().uuid(),
      businessId: z.string().uuid(),
      startDate: z.string(), // YYYY-MM-DD formatında
      endDate: z.string(), // YYYY-MM-DD formatında
    }))
    .query(async ({ input }) => {
      const startDateTime = new Date(input.startDate + 'T00:00:00');
      const endDateTime = new Date(input.endDate + 'T23:59:59');

      const result = await pool.query(
        `SELECT 
          a.id as appointmentId,
          a.appointment_datetime,
          SUM(aps.duration_minutes) as total_duration
        FROM appointments a
        JOIN appointment_services aps ON a.id = aps.appointment_id
        WHERE a.status IN ('pending', 'confirmed')
          AND aps.employee_id = $1
          AND a.business_id = $2
          AND a.appointment_datetime >= $3
          AND a.appointment_datetime <= $4
        GROUP BY a.id, a.appointment_datetime
        ORDER BY a.appointment_datetime`,
        [input.employeeId, input.businessId, startDateTime.toISOString(), endDateTime.toISOString()]
      );

      const busySlots = result.rows.map(row => {
        const startTime = new Date(row.appointment_datetime);
        const endTime = new Date(startTime.getTime() + (row.total_duration * 60000));
        
        return {
          appointmentId: row.appointmentId,
          startTime: startTime.toTimeString().slice(0, 5), // HH:MM formatında
          endTime: endTime.toTimeString().slice(0, 5), // HH:MM formatında
          date: startTime.toISOString().split('T')[0] // YYYY-MM-DD formatında
        };
      });

      return busySlots;
    }),

  // Multi-service APIs
  getEmployeesForMultipleServices: t.procedure
    .input(z.object({
      serviceIds: z.array(z.string().uuid()),
      businessId: z.string().uuid()
    }))
    .query(async ({ input }) => {
      try {
        const { serviceIds, businessId } = input;
        
        // Tüm hizmetleri verebilen çalışanları bul
        const result = await pool.query(
          `SELECT e.*, COUNT(es.service_id) as service_count
           FROM employees e
           JOIN employee_services es ON e.id = es.employee_id
           WHERE es.service_id = ANY($1) AND e.business_id = $2
           GROUP BY e.id
           HAVING COUNT(es.service_id) = $3`,
          [serviceIds, businessId, serviceIds.length]
        );
        
        return {
          canProvideAllServices: result.rows.length > 0,
          employees: result.rows
        };
      } catch (error) {
        console.error('Error in getEmployeesForMultipleServices:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Çalışanlar getirilemedi'
        });
      }
    }),

  getEmployeesByServices: t.procedure
    .input(z.object({
      serviceIds: z.array(z.string().uuid()),
      businessId: z.string().uuid()
    }))
    .query(async ({ input }) => {
      try {
        const { serviceIds, businessId } = input;
        const serviceEmployees: {[key: string]: any[]} = {};
        
        // Her hizmet için çalışanları getir
        for (const serviceId of serviceIds) {
          const result = await pool.query(
            `SELECT e.* FROM employees e
             JOIN employee_services es ON e.id = es.employee_id
             WHERE es.service_id = $1 AND e.business_id = $2`,
            [serviceId, businessId]
          );
          serviceEmployees[serviceId] = result.rows;
        }
        
        return serviceEmployees;
      } catch (error) {
        console.error('Error in getEmployeesByServices:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Çalışanlar getirilemedi'
        });
      }
    }),

  getCommonWeekdaysForEmployees: t.procedure
    .input(z.object({
      employeeIds: z.array(z.string().uuid()),
      businessId: z.string().uuid()
    }))
    .query(async ({ input }) => {
      try {
        const { employeeIds, businessId } = input;
        console.log('getCommonWeekdaysForEmployees input:', { employeeIds, businessId });
        
        if (employeeIds.length === 0) return [];
        
        // Tüm çalışanların ortak müsait günlerini bul
        const result = await pool.query(
          `SELECT day_of_week FROM employee_availability ea
           JOIN employees e ON ea.employee_id = e.id
           WHERE ea.employee_id = ANY($1) AND e.business_id = $2
           GROUP BY day_of_week
           HAVING COUNT(DISTINCT ea.employee_id) = $3`,
          [employeeIds, businessId, employeeIds.length]
        );
        
        console.log('getCommonWeekdaysForEmployees result:', result.rows);
        return result.rows.map(row => row.day_of_week);
      } catch (error) {
        console.error('Error in getCommonWeekdaysForEmployees:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Müsait günler getirilemedi'
        });
      }
    }),

  getCommonAvailabilityForEmployees: t.procedure
    .input(z.object({
      employeeIds: z.array(z.string().uuid()),
      date: z.string(),
      businessId: z.string().uuid(),
      totalDuration: z.number().min(15).default(60)
    }))
    .query(async ({ input }) => {
      try {
        const { employeeIds, date, businessId, totalDuration } = input;
        
        if (employeeIds.length === 0) return { commonSlots: [], employeeSlots: {}, busySlots: {}, hasCommonAvailability: false };
        
        // Her çalışan için müsait slotları bul
        const employeeSlots: {[key: string]: string[]} = {};
        const busySlots: {[key: string]: boolean} = {};
        
        for (const employeeId of employeeIds) {
          // Çalışanın müsaitlik saatlerini al
          const availabilityResult = await pool.query(
            `SELECT day_of_week, start_time, end_time FROM employee_availability ea
             JOIN employees e ON ea.employee_id = e.id
             WHERE ea.employee_id = $1 AND e.business_id = $2`,
            [employeeId, businessId]
          );
          
          const dayOfWeek = new Date(date).getDay();
          const daySlots = availabilityResult.rows.filter((a: any) => a.day_of_week === dayOfWeek);
          
          const slots: string[] = [];
          daySlots.forEach((slot: any) => {
            let [h, m] = slot.start_time.split(":").map(Number);
            const [eh, em] = slot.end_time.split(":").map(Number);
            while (h < eh || (h === eh && m < em)) {
              const token = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              const slotDate = new Date(`${date}T${token}:00`);
              const isPast = slotDate.getTime() <= Date.now();
              if (!isPast) {
                slots.push(token);
              }
              m += 15;
              if (m >= 60) { h++; m = 0; }
            }
          });
          
          employeeSlots[employeeId] = slots;
          
          // Meşgul slotları kontrol et
          const busyResult = await pool.query(
            `SELECT appointment_datetime FROM appointments 
             WHERE employee_id = $1 AND DATE(appointment_datetime) = $2
             AND status != 'cancelled'`,
            [employeeId, date]
          );
          
          busyResult.rows.forEach((row: any) => {
            const appointmentTime = new Date(row.appointment_datetime);
            const timeSlot = appointmentTime.toTimeString().slice(0, 5);
            busySlots[timeSlot] = true;
          });
        }
        
        // Ortak müsait slotları bul
        const allSlots = new Set<string>();
        Object.values(employeeSlots).forEach(slots => {
          slots.forEach(slot => allSlots.add(slot));
        });
        
        const commonSlots = Array.from(allSlots).filter(slot => {
          // Tüm çalışanlar bu saatte müsait mi?
          const allAvailable = employeeIds.every(empId => 
            employeeSlots[empId]?.includes(slot)
          );
          
          // Meşgul değil mi?
          const notBusy = !busySlots[slot];
          
          return allAvailable && notBusy;
        });
        
        return {
          commonSlots,
          employeeSlots,
          busySlots,
          hasCommonAvailability: commonSlots.length > 0
        };
      } catch (error) {
        console.error('Error in getCommonAvailabilityForEmployees:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Müsaitlik bilgisi getirilemedi'
        });
      }
    }),

  getSequentialAvailability: t.procedure
    .input(z.object({
      services: z.array(z.object({
        serviceId: z.string().uuid(),
        employeeId: z.string().uuid(),
        duration: z.number()
      })),
      date: z.string(),
      businessId: z.string().uuid()
    }))
    .query(async ({ input }) => {
      try {
        const { services, date, businessId } = input;
        
        if (services.length === 0) return { availableSlots: [], hasAvailability: false };
        
        // Hizmetleri seçim sırasına göre sırala (zaten doğru sırada geliyor)
        const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
        
        // Ardışık slotları bul
        const slots = await findSequentialSlots(services, date, businessId, totalDuration);
        
        return {
          availableSlots: slots,
          hasAvailability: slots.length > 0,
          totalDuration: totalDuration
        };
        
      } catch (error) {
        console.error('Error in getSequentialAvailability:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Sıralı müsaitlik bilgisi getirilemedi'
        });
      }
    }),
});

// Yardımcı fonksiyonlar
function getPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = getPermutations(remaining);
    
    for (const perm of perms) {
      result.push([current, ...perm]);
    }
  }
  
  return result;
}

async function findSequentialSlots(services: any[], date: string, businessId: string, totalDuration: number) {
  const slots: any[] = [];
  const dayOfWeek = new Date(date).getDay();
  
  // Her çalışan için müsaitlik saatlerini al
  const employeeSlots: {[key: string]: string[]} = {};
  const busySlots: {[key: string]: boolean} = {};
  
  for (const service of services) {
    const employeeId = service.employeeId;
    
    if (employeeSlots[employeeId]) continue; // Zaten aldık
    
    // Çalışanın müsaitlik saatlerini al
    const availabilityResult = await pool.query(
      `SELECT day_of_week, start_time, end_time FROM employee_availability ea
       JOIN employees e ON ea.employee_id = e.id
       WHERE ea.employee_id = $1 AND e.business_id = $2`,
      [employeeId, businessId]
    );
    
    const daySlots = availabilityResult.rows.filter((a: any) => a.day_of_week === dayOfWeek);
    const slots: string[] = [];
    
    daySlots.forEach((slot: any) => {
      let [h, m] = slot.start_time.split(":").map(Number);
      const [eh, em] = slot.end_time.split(":").map(Number);
      
      while (h < eh || (h === eh && m < em)) {
        const token = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const slotDate = new Date(`${date}T${token}:00`);
        const isPast = slotDate.getTime() <= Date.now();
        
        if (!isPast) {
          slots.push(token);
        }
        
        m += 15;
        if (m >= 60) { h++; m = 0; }
      }
    });
    
    employeeSlots[employeeId] = slots;
    
    // Meşgul saatleri al
    const busyResult = await pool.query(
      `SELECT appointment_datetime FROM appointments 
       WHERE employee_id = $1 AND DATE(appointment_datetime) = $2
       AND status != 'cancelled'`,
      [employeeId, date]
    );
    
    busyResult.rows.forEach((row: any) => {
      const appointmentTime = new Date(row.appointment_datetime);
      const timeSlot = appointmentTime.toTimeString().slice(0, 5);
      busySlots[timeSlot] = true;
    });
  }
  
  // Tüm müsait saatleri topla ve sırala
  const allSlots = new Set<string>();
  Object.values(employeeSlots).forEach(slots => {
    slots.forEach(slot => allSlots.add(slot));
  });
  
  const sortedSlots = Array.from(allSlots).sort();
  
  // Her başlangıç saati için ardışık slotları kontrol et
  for (let i = 0; i < sortedSlots.length; i++) {
    const startTime = sortedSlots[i];
    let canFit = true;
    let currentTime = startTime;
    const serviceSchedule: any[] = [];
    
    // Her hizmet için sırayla kontrol et
    for (const service of services) {
      const employeeId = service.employeeId;
      const duration = service.duration;
      
      // Bu çalışan bu saatte müsait mi?
      if (!employeeSlots[employeeId]?.includes(currentTime)) {
        canFit = false;
        break;
      }
      
      // Meşgul değil mi?
      if (busySlots[currentTime]) {
        canFit = false;
        break;
      }
      
      // Hizmet zamanlamasını kaydet
      serviceSchedule.push({
        service: service,
        startTime: currentTime,
        endTime: addMinutes(currentTime, duration)
      });
      
      // Süre kadar ilerle
      currentTime = addMinutes(currentTime, duration);
    }
    
    if (canFit) {
      slots.push({
        startTime: startTime,
        endTime: addMinutes(startTime, totalDuration),
        services: serviceSchedule,
        totalDuration: totalDuration
      });
    }
  }
  
  return slots;
}

function addMinutes(timeString: string, minutes: number): string {
  const [h, m] = timeString.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

async function findAvailableSlotsForCombination(services: any[], date: string, businessId: string) {
  const slots: any[] = [];
  const dayOfWeek = new Date(date).getDay();
  
  // Her hizmet için müsaitlik saatlerini al
  const employeeSlots: {[key: string]: string[]} = {};
  const busySlots: {[key: string]: boolean} = {};
  
  for (const service of services) {
    const employeeId = service.employeeId;
    
    // Çalışanın müsaitlik saatlerini al
    const availabilityResult = await pool.query(
      `SELECT day_of_week, start_time, end_time FROM employee_availability ea
       JOIN employees e ON ea.employee_id = e.id
       WHERE ea.employee_id = $1 AND e.business_id = $2`,
      [employeeId, businessId]
    );
    
    const daySlots = availabilityResult.rows.filter((a: any) => a.day_of_week === dayOfWeek);
    const slots: string[] = [];
    
    daySlots.forEach((slot: any) => {
      let [h, m] = slot.start_time.split(":").map(Number);
      const [eh, em] = slot.end_time.split(":").map(Number);
      
      while (h < eh || (h === eh && m < em)) {
        const token = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const slotDate = new Date(`${date}T${token}:00`);
        const isPast = slotDate.getTime() <= Date.now();
        
        if (!isPast) {
          slots.push(token);
        }
        
        m += 15;
        if (m >= 60) { h++; m = 0; }
      }
    });
    
    employeeSlots[employeeId] = slots;
    
    // Meşgul saatleri al
    const busyResult = await pool.query(
      `SELECT appointment_datetime FROM appointments 
       WHERE employee_id = $1 AND DATE(appointment_datetime) = $2
       AND status != 'cancelled'`,
      [employeeId, date]
    );
    
    busyResult.rows.forEach((row: any) => {
      const appointmentTime = new Date(row.appointment_datetime);
      const timeSlot = appointmentTime.toTimeString().slice(0, 5);
      busySlots[timeSlot] = true;
    });
  }
  
  // Sıralı slotları bul
  const allSlots = new Set<string>();
  Object.values(employeeSlots).forEach(slots => {
    slots.forEach(slot => allSlots.add(slot));
  });
  
  const sortedSlots = Array.from(allSlots).sort();
  
  for (let i = 0; i < sortedSlots.length; i++) {
    const startTime = sortedSlots[i];
    let canFit = true;
    let currentTime = startTime;
    
    // Her hizmet için sırayla kontrol et
    for (const service of services) {
      const employeeId = service.employeeId;
      const duration = service.duration;
      
      // Bu çalışan bu saatte müsait mi?
      if (!employeeSlots[employeeId]?.includes(currentTime)) {
        canFit = false;
        break;
      }
      
      // Meşgul değil mi?
      if (busySlots[currentTime]) {
        canFit = false;
        break;
      }
      
      // Süre kadar ilerle
      const [h, m] = currentTime.split(":").map(Number);
      const totalMinutes = h * 60 + m + duration;
      const nextH = Math.floor(totalMinutes / 60);
      const nextM = totalMinutes % 60;
      currentTime = `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
    }
    
    if (canFit) {
      slots.push({
        startTime: startTime,
        services: services,
        totalDuration: services.reduce((sum, s) => sum + s.duration, 0)
      });
    }
  }
  
  return slots;
}

function calculateCombinationScore(slots: any[]): number {
  if (slots.length === 0) return 0;
  
  // En erken başlangıç saati (daha yüksek skor)
  const earliestStart = Math.min(...slots.map(s => {
    const [h, m] = s.startTime.split(":").map(Number);
    return h * 60 + m;
  }));
  
  // Daha erken başlangıç = daha yüksek skor
  return 1000 - earliestStart;
}