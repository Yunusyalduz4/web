import { t } from '../trpc/trpc';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import crypto from 'crypto';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['user', 'business', 'employee']),
  // İşletme bilgileri (sadece business rolü için)
  businessName: z.string().optional(),
  businessDescription: z.string().optional(),
  businessAddress: z.string().optional(),
  businessLatitude: z.number().optional(),
  businessLongitude: z.number().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal('')),
  // Müşteri bilgileri (sadece user rolü için)
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string()
  }).optional(),
  // Çalışan bilgileri (sadece employee rolü için)
  businessId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const authRouter = t.router({
  testConnection: t.procedure
    .query(async () => {
      try {
        const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
        return {
          success: true,
          currentTime: result.rows[0].current_time,
          postgresVersion: result.rows[0].postgres_version
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }),
  testUsersTable: t.procedure
    .query(async () => {
      try {
        const result = await pool.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          ORDER BY ordinal_position
        `);
        return {
          success: true,
          columns: result.rows
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }),
  register: t.procedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      try {
        // Role güvenlik kontrolü - admin rolüne izin verme
        if (input.role === 'admin') {
          throw new Error('Admin rolü ile kayıt oluşturulamaz');
        }
        
        // Şifre hashle
        const password_hash = await bcrypt.hash(input.password, 10);
        
        // Kullanıcıyı ekle
        const result = await pool.query(
          `INSERT INTO users (name, email, password_hash, role, phone, address, latitude, longitude, business_id, employee_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, email, role`,
          [
            input.name,
            input.email, 
            password_hash, 
            input.role,
            input.customerPhone || '',
            input.customerAddress || '',
            input.customerLocation?.latitude || null,
            input.customerLocation?.longitude || null,
            input.businessId || null,
            input.employeeId || null
          ]
        );
        
        const user = result.rows[0];
      
        // Eğer business ise, işletme bilgileriyle birlikte oluştur
        if (input.role === 'business') {
          try {
            await pool.query(
              `INSERT INTO businesses (owner_user_id, name, description, address, latitude, longitude, phone, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                user.id, 
                input.businessName || `${input.name}'ın İşletmesi`, 
                input.businessDescription || '',
                input.businessAddress || 'Adres belirtilmedi',
                input.businessLatitude || 40.9695,
                input.businessLongitude || 29.2725,
                input.businessPhone || '',
                input.businessEmail || input.email
              ]
            );
          } catch (businessError) {
            // Business oluşturulamazsa bile user'ı döndür
          }
        }
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('duplicate key')) {
            throw new Error('Bu e-posta adresi zaten kullanılıyor.');
          }
          if (error.message.includes('violates')) {
            throw new Error('Geçersiz veri formatı. Lütfen tüm alanları doğru şekilde doldurun.');
          }
        }
        throw new Error('Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.');
      }
    }),
  login: t.procedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      // Kullanıcıyı bul
      const result = await pool.query(
        `SELECT * FROM users WHERE email = $1`,
        [input.email]
      );
      const user = result.rows[0];
      if (!user) throw new Error('Geçersiz e-posta veya şifre');
      // Şifreyi kontrol et
      const valid = await bcrypt.compare(input.password, user.password_hash);
      if (!valid) throw new Error('Geçersiz e-posta veya şifre');
      // TODO: Session/token yönetimi eklenecek
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }),

  // Çalışan giriş sistemi
  employeeLogin: t.procedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      // Çalışan hesabını bul (employee tablosundan)
      const result = await pool.query(
        `SELECT e.*, u.id as user_id, u.name, u.email, u.role, u.business_id, u.is_employee_active
         FROM employees e
         LEFT JOIN users u ON e.user_id = u.id
         WHERE e.login_email = $1 AND e.is_active = true`,
        [input.email]
      );
      const employee = result.rows[0];
      if (!employee) throw new Error('Geçersiz e-posta veya şifre');
      
      // Şifreyi kontrol et
      const valid = await bcrypt.compare(input.password, employee.password_hash);
      if (!valid) throw new Error('Geçersiz e-posta veya şifre');
      
      // Çalışan hesabı aktif mi kontrol et
      if (!employee.is_employee_active) {
        throw new Error('Hesabınız deaktif edilmiş. Lütfen işletme sahibi ile iletişime geçin.');
      }

      // Giriş logunu kaydet
      try {
        await pool.query(
          `INSERT INTO employee_login_logs (employee_id, login_at, login_successful) VALUES ($1, NOW(), true)`,
          [employee.id]
        );
      } catch (logError) {
        // Log hatası girişi engellemez
      }

      return { 
        id: employee.user_id || employee.id, 
        name: employee.name, 
        email: employee.login_email, 
        role: 'employee',
        businessId: employee.business_id,
        employeeId: employee.id,
        permissions: employee.permissions
      };
    }),

  // Çalışan hesabı kontrol etme
  checkEmployeeAccount: t.procedure
    .input(z.object({
      businessId: z.string().uuid(),
      employeeId: z.string().uuid(),
      email: z.string().email()
    }))
    .mutation(async ({ input }) => {
      try {
        // İşletme sahibi kontrolü
        const businessCheck = await pool.query(
          'SELECT owner_user_id FROM businesses WHERE id = $1',
          [input.businessId]
        );
        
        if (businessCheck.rows.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'İşletme bulunamadı' });
        }

        // Çalışan kontrolü
        const employeeCheck = await pool.query(
          'SELECT id, name, user_id FROM employees WHERE id = $1 AND business_id = $2',
          [input.employeeId, input.businessId]
        );
        
        if (employeeCheck.rows.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Çalışan bulunamadı' });
        }

        // E-posta ile kullanıcı kontrolü
        const userCheck = await pool.query(
          'SELECT id, email, role FROM users WHERE email = $1',
          [input.email]
        );

        return {
          hasAccount: userCheck.rows.length > 0,
          userId: userCheck.rows.length > 0 ? userCheck.rows[0].id : null,
          userRole: userCheck.rows.length > 0 ? userCheck.rows[0].role : null,
          employeeName: employeeCheck.rows[0].name,
          isLinked: userCheck.rows.length > 0 && userCheck.rows[0].id === employeeCheck.rows[0].user_id
        };
      } catch (error) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Hesap kontrolü başarısız: ' + (error as Error).message 
        });
      }
    }),

  // Çalışan hesabı oluşturma (işletme sahibi tarafından)
  createEmployeeAccount: t.procedure
    .input(z.object({
      businessId: z.string().uuid(),
      employeeId: z.string().uuid(),
      email: z.string().email(),
      password: z.string().min(6),
      permissions: z.object({
        can_manage_appointments: z.boolean(),
        can_view_analytics: z.boolean(),
        can_manage_services: z.boolean(),
        can_manage_employees: z.boolean(),
        can_manage_business_settings: z.boolean()
      }).optional()
    }))
    .mutation(async ({ input }) => {
      try {
        // İşletme sahibi kontrolü (bu endpoint sadece işletme sahipleri tarafından kullanılacak)
        const businessCheck = await pool.query(
          `SELECT owner_user_id FROM businesses WHERE id = $1`,
          [input.businessId]
        );
        if (businessCheck.rows.length === 0) {
          throw new Error('İşletme bulunamadı');
        }

        // Çalışan var mı kontrol et
        const employeeCheck = await pool.query(
          `SELECT id, name FROM employees WHERE id = $1 AND business_id = $2`,
          [input.employeeId, input.businessId]
        );
        if (employeeCheck.rows.length === 0) {
          throw new Error('Çalışan bulunamadı');
        }

        const employee = employeeCheck.rows[0];

        // Email zaten kullanılıyor mu kontrol et
        const emailCheck = await pool.query(
          `SELECT id FROM users WHERE email = $1 OR id IN (SELECT user_id FROM employees WHERE login_email = $1)`,
          [input.email]
        );
        if (emailCheck.rows.length > 0) {
          throw new Error('Bu e-posta adresi zaten kullanılıyor');
        }

        // Şifre hashle
        const password_hash = await bcrypt.hash(input.password, 10);

        // Varsayılan izinler
        const defaultPermissions = {
          can_manage_appointments: true,
          can_view_analytics: true,
          can_manage_services: false,
          can_manage_employees: false,
          can_manage_business_settings: false,
          ...input.permissions
        };

        // User hesabı oluştur
        const userResult = await pool.query(
          `INSERT INTO users (name, email, password_hash, role, business_id, employee_id, is_employee_active) 
           VALUES ($1, $2, $3, 'employee', $4, $5, true) 
           RETURNING id`,
          [employee.name, input.email, password_hash, input.businessId, input.employeeId]
        );
        const userId = userResult.rows[0].id;

        // Employee kaydını güncelle
        await pool.query(
          `UPDATE employees 
           SET user_id = $1, login_email = $2, password_hash = $3, is_active = true, 
               permissions = $4, created_by_user_id = $5
           WHERE id = $6`,
          [userId, input.email, password_hash, JSON.stringify(defaultPermissions), businessCheck.rows[0].owner_user_id, input.employeeId]
        );

        // User'ın employee_id'sini güncelle
        await pool.query(
          `UPDATE users SET employee_id = $1 WHERE id = $2`,
          [input.employeeId, userId]
        );

        // İzinleri ayrı tabloya kaydet
        for (const [permission, granted] of Object.entries(defaultPermissions)) {
          await pool.query(
            `INSERT INTO employee_permissions (employee_id, permission_name, is_granted) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (employee_id, permission_name) 
             DO UPDATE SET is_granted = $3, updated_at = NOW()`,
            [input.employeeId, permission, granted]
          );
        }

        return { 
          success: true, 
          userId, 
          employeeId: input.employeeId,
          message: 'Çalışan hesabı başarıyla oluşturuldu' 
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Çalışan hesabı oluşturulamadı');
      }
    }),
  // Request email verification (on register or change email)
  requestEmailVerification: t.procedure
    .input(z.object({ userId: z.string().uuid(), email: z.string().email() }))
    .mutation(async ({ input }) => {
      const token = crypto.randomBytes(24).toString('hex');
      const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 dk
      await pool.query(
        `INSERT INTO email_tokens (user_id, token, type, new_email, expires_at) VALUES ($1,$2,'verify',$3,$4)`,
        [input.userId, token, input.email, expires]
      );
      return { token }; // Email gönderim servisine verilecek payload
    }),

  // Çalışan şifre sıfırlama (işletme sahibi tarafından)
  resetEmployeePassword: t.procedure
    .input(z.object({
      businessId: z.string().uuid(),
      employeeId: z.string().uuid(),
      email: z.string().email(),
      newPassword: z.string().min(6)
    }))
    .mutation(async ({ input }) => {
      try {
        // İşletme sahibi kontrolü
        const businessCheck = await pool.query(
          'SELECT owner_user_id FROM businesses WHERE id = $1',
          [input.businessId]
        );
        
        if (businessCheck.rows.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'İşletme bulunamadı' });
        }

        // Çalışan kontrolü
        const employeeCheck = await pool.query(
          'SELECT id, name, user_id FROM employees WHERE id = $1 AND business_id = $2',
          [input.employeeId, input.businessId]
        );
        
        if (employeeCheck.rows.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Çalışan bulunamadı' });
        }

        // Kullanıcı kontrolü
        const userCheck = await pool.query(
          'SELECT id, email, role FROM users WHERE email = $1',
          [input.email]
        );
        
        if (userCheck.rows.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Bu e-posta adresine kayıtlı hesap bulunamadı' });
        }

        // Şifre hashle
        const password_hash = await bcrypt.hash(input.newPassword, 10);

        // Kullanıcı şifresini güncelle
        await pool.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [password_hash, userCheck.rows[0].id]
        );

        // Employee kaydındaki şifreyi de güncelle
        await pool.query(
          'UPDATE employees SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [password_hash, input.employeeId]
        );

        return { 
          success: true, 
          message: 'Çalışan şifresi başarıyla sıfırlandı',
          employeeName: employeeCheck.rows[0].name
        };
      } catch (error) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Şifre sıfırlama başarısız: ' + (error as Error).message 
        });
      }
    }),
  verifyEmail: t.procedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `SELECT * FROM email_tokens WHERE token=$1 AND type IN ('verify','email_change') AND used_at IS NULL AND expires_at>NOW()`,
        [input.token]
      );
      const row = res.rows[0];
      if (!row) throw new Error('Token geçersiz veya süresi dolmuş');
      await pool.query('BEGIN');
      try {
        await pool.query(`UPDATE users SET email = COALESCE($1, email), email_verified = TRUE WHERE id = $2`, [row.new_email, row.user_id]);
        await pool.query(`UPDATE email_tokens SET used_at = NOW() WHERE id = $1`, [row.id]);
        await pool.query('COMMIT');
      } catch (e) {
        await pool.query('ROLLBACK');
        throw e;
      }
      return { success: true };
    }),
  // Password reset: request token
  requestPasswordReset: t.procedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await pool.query(`SELECT id FROM users WHERE email=$1`, [input.email]);
      if (user.rows.length === 0) return { success: true }; // leak engelle
      const token = crypto.randomBytes(24).toString('hex');
      const expires = new Date(Date.now() + 1000 * 60 * 30);
      await pool.query(
        `INSERT INTO email_tokens (user_id, token, type, expires_at) VALUES ($1,$2,'reset',$3)`,
        [user.rows[0].id, token, expires]
      );
      return { token };
    }),
  resetPassword: t.procedure
    .input(z.object({ token: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const res = await pool.query(
        `SELECT * FROM email_tokens WHERE token=$1 AND type='reset' AND used_at IS NULL AND expires_at>NOW()`,
        [input.token]
      );
      const row = res.rows[0];
      if (!row) throw new Error('Token geçersiz veya süresi dolmuş');
      const hash = await bcrypt.hash(input.newPassword, 10);
      await pool.query('BEGIN');
      try {
        await pool.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hash, row.user_id]);
        await pool.query(`UPDATE email_tokens SET used_at=NOW() WHERE id=$1`, [row.id]);
        await pool.query('COMMIT');
      } catch (e) {
        await pool.query('ROLLBACK');
        throw e;
      }
      return { success: true };
    }),
}); 