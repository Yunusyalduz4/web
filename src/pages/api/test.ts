import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Basit veritabanı bağlantı testi
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    
    return res.status(200).json({
      message: 'Database connection test successful!',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].postgres_version
      }
    });
  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
