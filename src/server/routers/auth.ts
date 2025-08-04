import { t } from '../trpc/trpc';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { pool } from '../db';

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
  businessEmail: z.string().email().optional(),
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
          console.error('Business creation error:', businessError);
          // Business oluşturulamazsa bile user'ı döndür
        }
      }
      
            return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch (error) {
        console.error('Registration error:', error);
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
  // logout ve session endpointleri ileride eklenecek
}); 