import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId } = req.body;
    
    if (!businessId) {
      return res.status(400).json({ error: 'businessId required' });
    }

    // Database bağlantısını test et
    const result = await pool.query('SELECT NOW() as current_time');
    
    // Yorumları kontrol et
    const reviewsResult = await pool.query(
      'SELECT COUNT(*) as total FROM reviews WHERE business_id = $1',
      [businessId]
    );
    
    // İşletme rating'ini kontrol et
    const ratingResult = await pool.query(
      'SELECT * FROM business_ratings WHERE business_id = $1',
      [businessId]
    );
    
    // Son 5 yorumu getir
    const recentReviewsResult = await pool.query(
      `SELECT r.*, u.name as user_name, a.appointment_datetime
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN appointments a ON r.appointment_id = a.id
       WHERE r.business_id = $1
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [businessId]
    );
    
    return res.status(200).json({
      message: 'Reviews check completed!',
      businessId,
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: result.rows[0].current_time
      },
      reviews: {
        total: parseInt(reviewsResult.rows[0].total),
        recent: recentReviewsResult.rows
      },
      rating: ratingResult.rows[0] || null
    });
  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
