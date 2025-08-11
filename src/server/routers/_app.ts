import { t } from '../trpc/trpc';
import { authRouter } from './auth';
import { userRouter } from './user';
import { businessRouter } from './business';
import { appointmentRouter } from './appointment';
import { reviewRouter } from './review';
import { analyticsRouter } from './analytics';
import { favoritesRouter } from './favorites';

export const appRouter = t.router({
  auth: authRouter,
  user: userRouter,
  business: businessRouter,
  appointment: appointmentRouter,
  review: reviewRouter,
  analytics: analyticsRouter,
  favorites: favoritesRouter,
});

export type AppRouter = typeof appRouter; 