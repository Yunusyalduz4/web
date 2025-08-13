import { t } from '../trpc/trpc';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import crypto from 'crypto';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['user', 'business']),
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
        console.error('Database connection test failed:', error);
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
        console.error('Users table test failed:', error);
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
        console.log('Registration attempt for:', input.email);
        
        // Şifre hashle
        const password_hash = await bcrypt.hash(input.password, 10);
        
        // Kullanıcıyı ekle
        const result = await pool.query(
          `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
          [
            input.name,
            input.email, 
            password_hash, 
            input.role
          ]
        );
        
        const user = result.rows[0];
        console.log('User created:', user.id);
      
        // Eğer business ise, işletme bilgileriyle birlikte oluştur
        if (input.role === 'business') {
          try {
            console.log('Creating business for user:', user.id);
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
            console.log('Business created successfully');
          } catch (businessError) {
            console.error('Business creation error:', businessError);
            // Business oluşturulamazsa bile user'ı döndür
          }
        }
      
        console.log('Registration completed successfully');
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      } catch (error) {
        console.error('Registration error:', error);
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