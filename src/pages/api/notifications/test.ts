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

    const { userType, message, type } = req.body;
    
    if (!userType || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (userType === 'user') {
      // Müşteri için test bildirimi ekle
      const result = await pool.query(
        'INSERT INTO notifications (user_id, message, read, type) VALUES ($1, $2, false, $3) RETURNING *',
        [session.user.id, message, type || 'system']
      );

      res.status(200).json({
        success: true,
        notification: result.rows[0]
      });
    } else if (userType === 'business') {
      // İşletme için test bildirimi ekle (henüz implement edilmedi)
      res.status(200).json({
        success: true,
        message: 'Business notifications not yet implemented',
        note: 'Business notifications are generated from appointments table'
      });
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }

  } catch (error) {
    console.error('Test notification API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
