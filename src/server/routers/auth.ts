import { t } from '../trpc/trpc';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { pool } from '../db';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['user', 'business'])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const authRouter = t.router({
  register: t.procedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      // Şifre hashle
      const password_hash = await bcrypt.hash(input.password, 10);
      // Kullanıcıyı ekle
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
        [input.name, input.email, password_hash, input.role]
      );
      const user = result.rows[0];
      // Eğer business ise, otomatik işletme oluştur
      if (input.role === 'business') {
        await pool.query(
          `INSERT INTO businesses (owner_user_id, name, description, address, latitude, longitude, phone, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [user.id, `${user.name}'ın İşletmesi`, '', 'Adres girilmedi', 41.0, 29.0, '', user.email]
        );
      }
      return user;
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