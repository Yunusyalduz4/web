import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {

    // Expired subscription'ları temizle
    const result = await pool.query(`
      DELETE FROM push_subscriptions 
      WHERE created_at < NOW() - INTERVAL '30 days'
      OR endpoint LIKE '%expired%'
      OR endpoint LIKE '%unsubscribed%'
    `);

    const deletedCount = result.rowCount || 0;

    // User push subscriptions'ları da temizle
    const userResult = await pool.query(`
      DELETE FROM user_push_subscriptions 
      WHERE created_at < NOW() - INTERVAL '30 days'
      OR endpoint LIKE '%expired%'
      OR endpoint LIKE '%unsubscribed%'
    `);

    const deletedUserCount = userResult.rowCount || 0;


    res.status(200).json({
      success: true,
      message: 'Expired subscriptions cleaned up',
      deletedBusinessSubscriptions: deletedCount,
      deletedUserSubscriptions: deletedUserCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clean up expired subscriptions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
