import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';

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