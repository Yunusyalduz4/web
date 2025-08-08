import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Database bağlantısını test et
    const result = await pool.query('SELECT NOW() as current_time');
    
    return res.status(200).json({
      message: 'POST request received!',
      body: req.body,
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: result.rows[0].current_time
      }
    });
  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
