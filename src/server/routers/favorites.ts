import { t, isUser } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';

export const favoritesRouter = t.router({
  list: t.procedure
    .use(isUser)
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const result = await pool.query(
        `SELECT 
           b.*,
           f.created_at as favorited_at,
           COALESCE(br.overall_rating, 0) AS overall_rating,
           COALESCE(br.total_reviews, 0) AS total_reviews,
           (SELECT COUNT(*)::int FROM favorites f2 WHERE f2.business_id = b.id) AS favorites_count
         FROM favorites f
         JOIN businesses b ON b.id = f.business_id
         LEFT JOIN business_ratings br ON br.business_id = b.id
         WHERE f.user_id = $1 AND b.is_approved = true
         ORDER BY f.created_at DESC`,
        [userId]
      );
      return result.rows;
    }),

  isFavorite: t.procedure
    .use(isUser)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const result = await pool.query(
        `SELECT 1 FROM favorites WHERE user_id = $1 AND business_id = $2`,
        [userId, input.businessId]
      );
      return { isFavorite: result.rows.length > 0 };
    }),

  toggle: t.procedure
    .use(isUser)
    .input(z.object({ businessId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      // Try to insert; if exists, delete
      try {
        await pool.query(
          `INSERT INTO favorites (user_id, business_id) VALUES ($1, $2)`,
          [userId, input.businessId]
        );
        return { isFavorite: true };
      } catch (e: any) {
        // unique violation -> remove
        await pool.query(
          `DELETE FROM favorites WHERE user_id = $1 AND business_id = $2`,
          [userId, input.businessId]
        );
        return { isFavorite: false };
      }
    }),
});


