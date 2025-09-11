import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../db';

export const createContext = async (opts?: { req: NextApiRequest, res: NextApiResponse }) => {
  let session = null;
  if (opts?.req && opts?.res) {
    session = await getServerSession(opts.req, opts.res, authOptions);
  }
  return { session };
};

export const t = initTRPC.context<typeof createContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

// Role-based access helpers
export const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmalısınız' });
  }
  return next({ ctx: { user: ctx.session.user } });
});

export const isBusiness = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || ctx.session.user.role !== 'business') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece işletme sahipleri erişebilir' });
  }
  
  return next({ ctx: { user: ctx.session.user } });
});

export const isApprovedBusiness = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || ctx.session.user.role !== 'business') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece işletme sahipleri erişebilir' });
  }
  
  // businessId kontrolü ekle
  if (!ctx.session.user.businessId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'İşletme ID bulunamadı' });
  }

  // İşletme onay durumunu kontrol et
  const businessId: string = ctx.session.user.businessId as string;
  const businessResult = await pool.query(
    'SELECT is_approved FROM businesses WHERE id = $1',
    [businessId]
  );
  
  if (businessResult.rows.length === 0) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'İşletme bulunamadı' });
  }

  if (!businessResult.rows[0].is_approved) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'İşletme hesabınız henüz admin onayından geçmemiş. Lütfen onay bekleyin.' });
  }
  
  return next({ ctx: { user: ctx.session.user } });
});

export const isUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || ctx.session.user.role !== 'user') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece müşteriler erişebilir' });
  }
  return next({ ctx: { user: ctx.session.user } });
}); 

export const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece yöneticiler erişebilir' });
  }
  return next({ ctx: { user: ctx.session.user } });
});

export const isEmployee = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || ctx.session.user.role !== 'employee') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece çalışanlar erişebilir' });
  }
  
  // Çalışan hesabı aktif mi kontrol et
  if (!ctx.session.user.businessId || !ctx.session.user.employeeId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Çalışan hesap bilgileri eksik' });
  }

  // Çalışan hesabının aktif olduğunu kontrol et
  const employeeResult = await pool.query(
    'SELECT is_active FROM employees WHERE id = $1 AND business_id = $2',
    [ctx.session.user.employeeId as string, ctx.session.user.businessId as string]
  );
  
  if (employeeResult.rows.length === 0) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Çalışan bulunamadı' });
  }

  if (!employeeResult.rows[0].is_active) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Hesabınız deaktif edilmiş' });
  }
  
  return next({ 
    ctx: { 
      user: ctx.session.user,
      employee: {
        id: ctx.session.user.employeeId,
        businessId: ctx.session.user.businessId,
        permissions: ctx.session.user.permissions || {}
      }
    } 
  });
});

export const isEmployeeOrBusiness = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || !['employee', 'business'].includes(ctx.session.user.role as string)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Sadece çalışanlar ve işletme sahipleri erişebilir' });
  }
  
  // Business ID kontrolü
  if (!ctx.session.user.businessId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'İşletme ID bulunamadı' });
  }

  // İşletme onay durumunu kontrol et
  const businessId: string = ctx.session.user.businessId as string;
  const businessResult = await pool.query(
    'SELECT is_approved FROM businesses WHERE id = $1',
    [businessId]
  );
  
  if (businessResult.rows.length === 0) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'İşletme bulunamadı' });
  }

  if (!businessResult.rows[0].is_approved) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'İşletme hesabınız henüz admin onayından geçmemiş. Lütfen onay bekleyin.' });
  }
  
  // Eğer çalışan ise, hesap aktif mi kontrol et
  if (ctx.session.user.role === 'employee') {
    if (!ctx.session.user.employeeId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Çalışan hesap bilgileri eksik' });
    }

    const employeeResult = await pool.query(
      'SELECT is_active FROM employees WHERE id = $1 AND business_id = $2',
      [ctx.session.user.employeeId as string, businessId]
    );
    
    if (employeeResult.rows.length === 0 || !employeeResult.rows[0].is_active) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Çalışan hesabı deaktif' });
    }
  }
  
  return next({ 
    ctx: { 
      user: ctx.session.user,
      employee: ctx.session.user.role === 'employee' ? {
        id: ctx.session.user.employeeId,
        businessId: ctx.session.user.businessId,
        permissions: ctx.session.user.permissions || {}
      } : null
    } 
  });
});