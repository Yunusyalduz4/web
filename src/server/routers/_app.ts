import { t } from '../trpc/trpc';
import { authRouter } from './auth';
import { userRouter } from './user';
import { businessRouter } from './business';
import { appointmentRouter } from './appointment';

export const appRouter = t.router({
  auth: authRouter,
  user: userRouter,
  business: businessRouter,
  appointment: appointmentRouter,
});

export type AppRouter = typeof appRouter; 