import { t } from '../trpc/trpc';
import { authRouter } from './auth';
import { userRouter } from './user';
import { businessRouter } from './business';
import { appointmentRouter } from './appointment';
import { reviewRouter } from './review';
import { analyticsRouter } from './analytics';
import { favoritesRouter } from './favorites';
import { adminRouter } from './admin';
import { slotsRouter } from './slots';
import { storyRouter } from './story';

export const appRouter = t.router({
  auth: authRouter,
  user: userRouter,
  business: businessRouter,
  appointment: appointmentRouter,
  review: reviewRouter,
  analytics: analyticsRouter,
  favorites: favoritesRouter,
  admin: adminRouter,
  slots: slotsRouter,
  story: storyRouter,
});

export type AppRouter = typeof appRouter; 