import { t, isUser, isBusiness, isApprovedBusiness } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import { TRPCError } from '@trpc/server';
import { sendNotificationToBusiness } from '../../utils/pushNotification';

// ==============================================
// SCHEMA TANIMLARI
// ==============================================

const createStorySchema = z.object({
  businessId: z.string().uuid(),
  mediaUrl: z.string().url(),
  mediaType: z.enum(['image', 'video']),
  mediaSize: z.number().optional(),
  mediaDuration: z.number().optional(),
  caption: z.string().max(200).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.string().max(50).optional(),
  fontSize: z.number().min(8).max(72).optional(),
  textPosition: z.enum(['top', 'center', 'bottom']).optional(),
  filterType: z.string().max(30).optional(),
  hashtags: z.array(z.string().min(2).max(50)).optional(),
  mentions: z.array(z.string().uuid()).optional(),
});

const updateStorySchema = createStorySchema.partial().extend({
  id: z.string().uuid(),
});

const storyViewSchema = z.object({
  storyId: z.string().uuid(),
  viewDuration: z.number().optional(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
});

const storyLikeSchema = z.object({
  storyId: z.string().uuid(),
});

const storyCommentSchema = z.object({
  storyId: z.string().uuid(),
  comment: z.string().min(1).max(200),
});

const storyShareSchema = z.object({
  storyId: z.string().uuid(),
  shareType: z.enum(['internal', 'external', 'copy_link']),
  externalPlatform: z.string().optional(),
  shareMessage: z.string().optional(),
});

// ==============================================
// YARDIMCI FONKSİYONLAR
// ==============================================

// 24 saat kontrolü
const isStoryExpired = (createdAt: Date): boolean => {
  const now = new Date();
  const storyAge = now.getTime() - createdAt.getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000; // 24 saat milisaniye cinsinden
  return storyAge > twentyFourHours;
};

// Hikaye istatistiklerini güncelle
const updateStoryStats = async (storyId: string) => {
  const stats = await pool.query(`
    SELECT 
      COUNT(DISTINCT sv.user_id) as view_count,
      COUNT(DISTINCT sl.user_id) as like_count,
      COUNT(DISTINCT sc.user_id) as comment_count,
      COUNT(DISTINCT ssh.user_id) as share_count
    FROM stories s
    LEFT JOIN story_views sv ON s.id = sv.story_id
    LEFT JOIN story_likes sl ON s.id = sl.story_id
    LEFT JOIN story_comments sc ON s.id = sc.story_id
    LEFT JOIN story_shares ssh ON s.id = ssh.story_id
    WHERE s.id = $1
    GROUP BY s.id
  `, [storyId]);

  if (stats.rows.length > 0) {
    const { view_count, like_count, comment_count, share_count } = stats.rows[0];
    await pool.query(`
      UPDATE stories 
      SET view_count = $1, like_count = $2, comment_count = $3, share_count = $4
      WHERE id = $5
    `, [view_count, like_count, comment_count, share_count, storyId]);
  }
};

// ==============================================
// STORY ROUTER
// ==============================================

export const storyRouter = t.router({
  // ==============================================
  // HİKAYE CRUD İŞLEMLERİ
  // ==============================================

  // Hikaye oluştur
  create: t.procedure
    .use(isApprovedBusiness)
    .input(createStorySchema)
    .mutation(async ({ input, ctx }) => {
      const businessId = input.businessId;
      const userId = ctx.user.id;

      // İşletme sahibi kontrolü
      const businessCheck = await pool.query(
        `SELECT id FROM businesses WHERE id = $1 AND owner_user_id = $2`,
        [businessId, userId]
      );

      if (businessCheck.rows.length === 0) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Bu işletmeye hikaye ekleyemezsiniz' 
        });
      }

      // 24 saat sonra silinecek tarih
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Hikaye oluştur
      const result = await pool.query(`
        INSERT INTO stories (
          business_id, media_url, media_type, media_size, media_duration,
          caption, background_color, text_color, font_family, font_size,
          text_position, filter_type, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        businessId, input.mediaUrl, input.mediaType, input.mediaSize || null,
        input.mediaDuration || null, input.caption || null, input.backgroundColor || '#000000',
        input.textColor || '#FFFFFF', input.fontFamily || 'Arial', input.fontSize || 16,
        input.textPosition || 'center', input.filterType || 'none', expiresAt
      ]);

      const story = result.rows[0];

      // Hashtag'leri ekle
      if (input.hashtags && input.hashtags.length > 0) {
        for (const hashtag of input.hashtags) {
          await pool.query(`
            INSERT INTO story_hashtags (story_id, hashtag) VALUES ($1, $2)
            ON CONFLICT (story_id, hashtag) DO NOTHING
          `, [story.id, hashtag.toLowerCase()]);
        }
      }

      // Mention'ları ekle
      if (input.mentions && input.mentions.length > 0) {
        for (const mentionedUserId of input.mentions) {
          await pool.query(`
            INSERT INTO story_mentions (story_id, mentioned_user_id) VALUES ($1, $2)
            ON CONFLICT (story_id, mentioned_user_id) DO NOTHING
          `, [story.id, mentionedUserId]);
        }
      }

      return story;
    }),

  // İşletmenin hikayelerini getir
  getByBusiness: t.procedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(`
        SELECT 
          s.*,
          b.name as business_name,
          b.owner_user_id,
          u.name as owner_name,
          u.email as owner_email
        FROM stories s
        JOIN businesses b ON s.business_id = b.id
        JOIN users u ON b.owner_user_id = u.id
        WHERE s.business_id = $1 AND s.is_active = TRUE
        ORDER BY s.created_at DESC
      `, [input.businessId]);

      // Süresi dolmuş hikayeleri filtrele
      const activeStories = result.rows.filter(story => 
        !isStoryExpired(new Date(story.created_at))
      );

      return activeStories;
    }),

  // Kullanıcının favori işletmelerinin hikayelerini getir
  getFavoritesStories: t.procedure
    .use(isUser)
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      const result = await pool.query(`
        SELECT 
          s.*,
          b.name as business_name,
          b.owner_user_id,
          u.name as owner_name
        FROM stories s
        JOIN businesses b ON s.business_id = b.id
        JOIN users u ON b.owner_user_id = u.id
        JOIN favorites f ON b.id = f.business_id
        WHERE f.user_id = $1 AND s.is_active = TRUE
        ORDER BY s.created_at DESC
      `, [userId]);

      // Süresi dolmuş hikayeleri filtrele
      const activeStories = result.rows.filter(story => 
        !isStoryExpired(new Date(story.created_at))
      );

      return activeStories;
    }),

  // Hikaye detayını getir
  getById: t.procedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await pool.query(`
        SELECT 
          s.*,
          b.name as business_name,
          b.owner_user_id,
          u.name as owner_name
        FROM stories s
        JOIN businesses b ON s.business_id = b.id
        JOIN users u ON b.owner_user_id = u.id
        WHERE s.id = $1 AND s.is_active = TRUE
      `, [input.storyId]);

      if (result.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Hikaye bulunamadı' });
      }

      const story = result.rows[0];

      // Süresi dolmuş mu kontrol et
      if (isStoryExpired(new Date(story.created_at))) {
        throw new TRPCError({ code: 'GONE', message: 'Hikaye süresi dolmuş' });
      }

      return story;
    }),

  // Hikaye güncelle
  update: t.procedure
    .use(isBusiness)
    .input(updateStorySchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Hikaye sahibi kontrolü
      const storyCheck = await pool.query(`
        SELECT s.*, b.owner_user_id 
        FROM stories s
        JOIN businesses b ON s.business_id = b.id
        WHERE s.id = $1 AND b.owner_user_id = $2
      `, [input.id, userId]);

      if (storyCheck.rows.length === 0) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Bu hikayeyi düzenleyemezsiniz' 
        });
      }

      const story = storyCheck.rows[0];

      // Süresi dolmuş mu kontrol et
      if (isStoryExpired(new Date(story.created_at))) {
        throw new TRPCError({ code: 'GONE', message: 'Hikaye süresi dolmuş' });
      }

      // Güncelleme yap
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (input.caption !== undefined) {
        updateFields.push(`caption = $${paramCount++}`);
        updateValues.push(input.caption);
      }
      if (input.backgroundColor !== undefined) {
        updateFields.push(`background_color = $${paramCount++}`);
        updateValues.push(input.backgroundColor);
      }
      if (input.textColor !== undefined) {
        updateFields.push(`text_color = $${paramCount++}`);
        updateValues.push(input.textColor);
      }
      if (input.fontFamily !== undefined) {
        updateFields.push(`font_family = $${paramCount++}`);
        updateValues.push(input.fontFamily);
      }
      if (input.fontSize !== undefined) {
        updateFields.push(`font_size = $${paramCount++}`);
        updateValues.push(input.fontSize);
      }
      if (input.textPosition !== undefined) {
        updateFields.push(`text_position = $${paramCount++}`);
        updateValues.push(input.textPosition);
      }
      if (input.filterType !== undefined) {
        updateFields.push(`filter_type = $${paramCount++}`);
        updateValues.push(input.filterType);
      }

      if (updateFields.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Güncellenecek alan bulunamadı' });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(input.id);

      const result = await pool.query(`
        UPDATE stories 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, [...updateValues]);

      return result.rows[0];
    }),

  // Hikaye sil
  delete: t.procedure
    .use(isBusiness)
    .input(z.object({ storyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Hikaye sahibi kontrolü
      const storyCheck = await pool.query(`
        SELECT s.*, b.owner_user_id 
        FROM stories s
        JOIN businesses b ON s.business_id = b.id
        WHERE s.id = $1 AND b.owner_user_id = $2
      `, [input.storyId, userId]);

      if (storyCheck.rows.length === 0) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Bu hikayeyi silemezsiniz' 
        });
      }

      const story = storyCheck.rows[0];

      // Arşive taşı
      await pool.query(`
        INSERT INTO story_archive (
          original_story_id, business_id, media_url, media_type,
          caption, view_count, like_count, comment_count, share_count,
          created_at, archive_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'deleted')
      `, [
        story.id, story.business_id, story.media_url, story.media_type,
        story.caption, story.view_count, story.like_count, story.comment_count,
        story.share_count, story.created_at
      ]);

      // Orijinal kaydı sil
      await pool.query(`DELETE FROM stories WHERE id = $1`, [input.storyId]);

      return { success: true };
    }),

  // ==============================================
  // HİKAYE ETKİLEŞİMLERİ
  // ==============================================

  // Hikaye görüntüle
  view: t.procedure
    .input(storyViewSchema)
    .mutation(async ({ input, ctx }) => {
      // User veya business olabilir
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' });
      }
      const userId = ctx.session.user.id;

      // Hikaye var mı kontrol et
      const storyCheck = await pool.query(`
        SELECT * FROM stories WHERE id = $1 AND is_active = TRUE
      `, [input.storyId]);

      if (storyCheck.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Hikaye bulunamadı' });
      }

      const story = storyCheck.rows[0];

      // Süresi dolmuş mu kontrol et
      if (isStoryExpired(new Date(story.created_at))) {
        throw new TRPCError({ code: 'GONE', message: 'Hikaye süresi dolmuş' });
      }

      // Görüntüleme kaydı ekle (conflict durumunda güncelle)
      await pool.query(`
        INSERT INTO story_views (story_id, user_id, view_duration, device_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (story_id, user_id) 
        DO UPDATE SET 
          viewed_at = NOW(),
          view_duration = EXCLUDED.view_duration,
          device_type = EXCLUDED.device_type
      `, [input.storyId, userId, input.viewDuration || null, input.deviceType || null]);

      // İstatistikleri güncelle
      await updateStoryStats(input.storyId);

      return { success: true };
    }),

  // Hikaye beğen/beğenme
  toggleLike: t.procedure
    .input(storyLikeSchema)
    .mutation(async ({ input, ctx }) => {
      // User veya business olabilir
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' });
      }
      const userId = ctx.session.user.id;

      // Hikaye var mı kontrol et
      const storyCheck = await pool.query(`
        SELECT * FROM stories WHERE id = $1 AND is_active = TRUE
      `, [input.storyId]);

      if (storyCheck.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Hikaye bulunamadı' });
      }

      const story = storyCheck.rows[0];

      // Süresi dolmuş mu kontrol et
      if (isStoryExpired(new Date(story.created_at))) {
        throw new TRPCError({ code: 'GONE', message: 'Hikaye süresi dolmuş' });
      }

      // Mevcut beğeni var mı kontrol et
      const existingLike = await pool.query(`
        SELECT id FROM story_likes WHERE story_id = $1 AND user_id = $2
      `, [input.storyId, userId]);

      if (existingLike.rows.length > 0) {
        // Beğeniyi kaldır
        await pool.query(`
          DELETE FROM story_likes WHERE story_id = $1 AND user_id = $2
        `, [input.storyId, userId]);
        
        await updateStoryStats(input.storyId);
        return { liked: false };
      } else {
        // Beğeni ekle
        await pool.query(`
          INSERT INTO story_likes (story_id, user_id) VALUES ($1, $2)
        `, [input.storyId, userId]);
        
        await updateStoryStats(input.storyId);
        return { liked: true };
      }
    }),

  // Hikaye yorumla
  comment: t.procedure
    .input(storyCommentSchema)
    .mutation(async ({ input, ctx }) => {
      // User veya business olabilir
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' });
      }
      const userId = ctx.session.user.id;

      // Hikaye var mı kontrol et
      const storyCheck = await pool.query(`
        SELECT * FROM stories WHERE id = $1 AND is_active = TRUE
      `, [input.storyId]);

      if (storyCheck.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Hikaye bulunamadı' });
      }

      const story = storyCheck.rows[0];

      // Süresi dolmuş mu kontrol et
      if (isStoryExpired(new Date(story.created_at))) {
        throw new TRPCError({ code: 'GONE', message: 'Hikaye süresi dolmuş' });
      }

      // Yorum ekle
      const result = await pool.query(`
        INSERT INTO story_comments (story_id, user_id, comment)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [input.storyId, userId, input.comment]);

      // İstatistikleri güncelle
      await updateStoryStats(input.storyId);

      return result.rows[0];
    }),

  // Hikaye paylaş
  share: t.procedure
    .input(storyShareSchema)
    .mutation(async ({ input, ctx }) => {
      // User veya business olabilir
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' });
      }
      const userId = ctx.session.user.id;

      // Hikaye var mı kontrol et
      const storyCheck = await pool.query(`
        SELECT * FROM stories WHERE id = $1 AND is_active = TRUE
      `, [input.storyId]);

      if (storyCheck.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Hikaye bulunamadı' });
      }

      const story = storyCheck.rows[0];

      // Süresi dolmuş mu kontrol et
      if (isStoryExpired(new Date(story.created_at))) {
        throw new TRPCError({ code: 'GONE', message: 'Hikaye süresi dolmuş' });
      }

      // Paylaşım kaydı ekle
      const result = await pool.query(`
        INSERT INTO story_shares (story_id, user_id, share_type, external_platform, share_message)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [input.storyId, userId, input.shareType, input.externalPlatform || null, input.shareMessage || null]);

      // İstatistikleri güncelle
      await updateStoryStats(input.storyId);

      return result.rows[0];
    }),

  // ==============================================
  // HİKAYE İSTATİSTİKLERİ
  // ==============================================

  // İşletmenin hikaye istatistikleri
  getBusinessStats: t.procedure
    .use(isBusiness)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // İşletme sahibi kontrolü
      const businessCheck = await pool.query(`
        SELECT id FROM businesses WHERE id = $1 AND owner_user_id = $2
      `, [input.businessId, userId]);

      if (businessCheck.rows.length === 0) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Bu işletmenin istatistiklerini görüntüleyemezsiniz' 
        });
      }

      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_stories,
          SUM(view_count) as total_views,
          SUM(like_count) as total_likes,
          SUM(comment_count) as total_comments,
          SUM(share_count) as total_shares,
          AVG(view_count) as avg_views_per_story,
          AVG(like_count) as avg_likes_per_story
        FROM stories 
        WHERE business_id = $1 AND is_active = TRUE
      `, [input.businessId]);

      const dailyStats = await pool.query(`
        SELECT 
          story_date,
          total_stories,
          total_views,
          total_likes,
          total_comments,
          total_shares,
          unique_viewers
        FROM story_daily_stats 
        WHERE business_id = $1 
        ORDER BY story_date DESC 
        LIMIT 30
      `, [input.businessId]);

      return {
        overview: stats.rows[0],
        dailyStats: dailyStats.rows
      };
    }),

  // Hikaye detay istatistikleri
  getStoryStats: t.procedure
    .use(isBusiness)
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Hikaye sahibi kontrolü
      const storyCheck = await pool.query(`
        SELECT s.*, b.owner_user_id 
        FROM stories s
        JOIN businesses b ON s.business_id = b.id
        WHERE s.id = $1 AND b.owner_user_id = $2
      `, [input.storyId, userId]);

      if (storyCheck.rows.length === 0) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Bu hikayenin istatistiklerini görüntüleyemezsiniz' 
        });
      }

      const views = await pool.query(`
        SELECT 
          sv.*,
          u.name as viewer_name
        FROM story_views sv
        JOIN users u ON sv.user_id = u.id
        WHERE sv.story_id = $1
        ORDER BY sv.viewed_at DESC
      `, [input.storyId]);

      const likes = await pool.query(`
        SELECT 
          sl.*,
          u.name as liker_name
        FROM story_likes sl
        JOIN users u ON sl.user_id = u.id
        WHERE sl.story_id = $1
        ORDER BY sl.liked_at DESC
      `, [input.storyId]);

      const comments = await pool.query(`
        SELECT 
          sc.*,
          u.name as commenter_name
        FROM story_comments sc
        JOIN users u ON sc.user_id = u.id
        WHERE sc.story_id = $1
        ORDER BY sc.created_at DESC
      `, [input.storyId]);

      return {
        story: storyCheck.rows[0],
        views: views.rows,
        likes: likes.rows,
        comments: comments.rows
      };
    }),

  // ==============================================
  // HİKAYE TEMİZLİK İŞLEMLERİ
  // ==============================================

  // Süresi dolmuş hikayeleri temizle
  cleanupExpired: t.procedure
    .use(isBusiness)
    .mutation(async () => {
      const result = await pool.query(`
        SELECT archive_expired_stories() as archived_count
      `);
      
      return { 
        success: true, 
        archivedCount: result.rows[0].archived_count 
      };
    }),

  // Günlük istatistikleri güncelle
  updateDailyStats: t.procedure
    .use(isBusiness)
    .mutation(async () => {
      await pool.query(`
        SELECT update_daily_story_stats()
      `);
      
      return { success: true };
    }),

  // Kullanıcının hikayeyi beğenip beğenmediğini kontrol et
  checkLikeStatus: t.procedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        return { isLiked: false };
      }
      
      const userId = ctx.session.user.id;
      const result = await pool.query(`
        SELECT id FROM story_likes 
        WHERE story_id = $1 AND user_id = $2
      `, [input.storyId, userId]);
      
      return { isLiked: result.rows.length > 0 };
    })
});
