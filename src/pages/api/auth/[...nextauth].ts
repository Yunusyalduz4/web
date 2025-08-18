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
    };
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    id?: string;
    businessId?: string; // İşletme ID'si eklendi
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
          const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [credentials.email]
          );
          const user = result.rows[0];
          if (!user) return null;
          
          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!valid) return null;

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

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            businessId: businessId, // İşletme ID'si eklendi
          } as User & { role: string; businessId?: string };
        } catch (error) {
          console.error('Auth error:', error);
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.businessId = token.businessId as string; // İşletme ID'si eklendi
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