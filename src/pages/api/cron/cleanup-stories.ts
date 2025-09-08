import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece GET isteklerini kabul et (cron job'lar genellikle GET kullanır)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // API key kontrolü (güvenlik için)
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedApiKey = process.env.CRON_API_KEY;

  if (expectedApiKey && apiKey !== expectedApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting story cleanup cron job...');

    // Süresi dolmuş hikayeleri arşivle
    const archiveResult = await pool.query(`
      SELECT archive_expired_stories() as archived_count
    `);
    
    const archivedCount = archiveResult.rows[0].archived_count;

    // Günlük istatistikleri güncelle
    await pool.query(`
      SELECT update_daily_story_stats()
    `);

    // Eski arşiv kayıtlarını temizle (30 günden eski)
    const cleanupResult = await pool.query(`
      DELETE FROM story_archive 
      WHERE archived_at < NOW() - INTERVAL '30 days'
      RETURNING id
    `);

    const deletedArchiveCount = cleanupResult.rows.length;

    console.log(`Story cleanup completed: ${archivedCount} stories archived, ${deletedArchiveCount} old archive records deleted`);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        archivedStories: archivedCount,
        deletedArchiveRecords: deletedArchiveCount,
        dailyStatsUpdated: true
      }
    });

  } catch (error) {
    console.error('Story cleanup cron job error:', error);
    return res.status(500).json({ 
      error: 'Story cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
