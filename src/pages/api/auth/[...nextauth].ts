import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { pool } from '../../../server/db';
import bcrypt from 'bcrypt';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextAuthOptions, User } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      id?: string;
      businessId?: string; // İşletme ID'si eklendi
      employeeId?: string; // Çalışan ID'si eklendi
      permissions?: any; // Çalışan izinleri eklendi
    };
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    id?: string;
    businessId?: string; // İşletme ID'si eklendi
    employeeId?: string; // Çalışan ID'si eklendi
    permissions?: any; // Çalışan izinleri eklendi
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        try {
          
          // Önce normal users tablosundan kontrol et
          const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [credentials.email]
          );
          const user = result.rows[0];
          
          if (user) {
            const valid = await bcrypt.compare(credentials.password, user.password_hash);
            if (!valid) {
              return null;
            }

            // İşletme sahibi ise business ID'sini al
            let businessId = null;
            if (user.role === 'business') {
              const businessResult = await pool.query(
                'SELECT id FROM businesses WHERE owner_user_id = $1',
                [user.id]
              );
              if (businessResult.rows.length > 0) {
                businessId = businessResult.rows[0].id;
              }
            }

            // Çalışan ise ek bilgileri al
            let employeeId = null;
            let permissions = null;
            if (user.role === 'employee') {
              employeeId = user.employee_id;
              businessId = user.business_id;
              
              // Çalışan izinlerini al
              const employeeResult = await pool.query(
                'SELECT permissions FROM employees WHERE id = $1',
                [employeeId]
              );
              if (employeeResult.rows.length > 0) {
                permissions = employeeResult.rows[0].permissions;
              }
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              businessId: businessId?.toString(),
              employeeId: employeeId?.toString(),
              permissions: permissions,
            } as User & { role: string; businessId?: string; employeeId?: string; permissions?: any };
          }

          // Eğer users tablosunda yoksa, çalışan tablosundan kontrol et
          const employeeResult = await pool.query(
            `SELECT e.*, u.id as user_id, u.name, u.email, u.role, u.business_id, u.is_employee_active
             FROM employees e
             LEFT JOIN users u ON e.user_id = u.id
             WHERE (e.login_email = $1 OR u.email = $1) AND e.is_active = true`,
            [credentials.email]
          );
          const employee = employeeResult.rows[0];
          
          if (employee) {
            const valid = await bcrypt.compare(credentials.password, employee.password_hash);
            if (!valid) {
              return null;
            }

            // Çalışan hesabı aktif mi kontrol et
            if (!employee.is_employee_active) {
              return null;
            }

            return {
              id: employee.user_id || employee.id,
              name: employee.name,
              email: employee.login_email || employee.email,
              role: 'employee',
              businessId: employee.business_id?.toString(),
              employeeId: employee.id?.toString(),
              permissions: employee.permissions,
            } as User & { role: string; businessId?: string; employeeId?: string; permissions?: any };
          }
          

          return null;
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.businessId = (user as any).businessId; // İşletme ID'si eklendi
        token.employeeId = (user as any).employeeId; // Çalışan ID'si eklendi
        token.permissions = (user as any).permissions; // Çalışan izinleri eklendi
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.businessId = token.businessId as string; // İşletme ID'si eklendi
        session.user.employeeId = token.employeeId as string; // Çalışan ID'si eklendi
        session.user.permissions = token.permissions as any; // Çalışan izinleri eklendi
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  // Production security settings
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

export default function auth(req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, authOptions);
} 