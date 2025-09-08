import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      businessId,
      mediaUrl,
      mediaType,
      mediaSize,
      mediaDuration,
      caption,
      backgroundColor,
      textColor,
      fontFamily,
      fontSize,
      textPosition,
      filterType,
      hashtags,
      mentions
    } = req.body;

    // Validasyon
    if (!businessId || !mediaUrl || !mediaType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // İşletme sahibi kontrolü
    const businessCheck = await pool.query(
      `SELECT id FROM businesses WHERE id = $1 AND owner_user_id = $2`,
      [businessId, session.user.id]
    );

    if (businessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You can only create stories for your own business' });
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
      businessId, mediaUrl, mediaType, mediaSize || null,
      mediaDuration || null, caption || null, backgroundColor || '#000000',
      textColor || '#FFFFFF', fontFamily || 'Arial', fontSize || 16,
      textPosition || 'center', filterType || 'none', expiresAt
    ]);

    const story = result.rows[0];

    // Hashtag'leri ekle
    if (hashtags && hashtags.length > 0) {
      for (const hashtag of hashtags) {
        await pool.query(`
          INSERT INTO story_hashtags (story_id, hashtag) VALUES ($1, $2)
          ON CONFLICT (story_id, hashtag) DO NOTHING
        `, [story.id, hashtag.toLowerCase()]);
      }
    }

    // Mention'ları ekle
    if (mentions && mentions.length > 0) {
      for (const mentionedUserId of mentions) {
        await pool.query(`
          INSERT INTO story_mentions (story_id, mentioned_user_id) VALUES ($1, $2)
          ON CONFLICT (story_id, mentioned_user_id) DO NOTHING
        `, [story.id, mentionedUserId]);
      }
    }

    return res.status(201).json({
      success: true,
      story: {
        id: story.id,
        business_id: story.business_id,
        media_url: story.media_url,
        media_type: story.media_type,
        caption: story.caption,
        created_at: story.created_at,
        expires_at: story.expires_at,
        view_count: story.view_count,
        like_count: story.like_count,
        comment_count: story.comment_count,
        share_count: story.share_count
      }
    });

  } catch (error) {
    console.error('Story creation error:', error);
    return res.status(500).json({ 
      error: 'Story creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
