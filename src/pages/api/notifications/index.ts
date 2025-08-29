import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userType, userId } = req.query;
    
    if (!userType || !userId || userId !== session.user.id) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    // Bildirimleri getir
    let query = '';
    let params: any[] = [];

    if (userType === 'user') {
      // Müşteri bildirimleri
      query = `
        SELECT id, message, read, created_at, type
        FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 50
      `;
      params = [userId];
    } else if (userType === 'business') {
      // İşletme bildirimleri - notifications tablosundan getir
      query = `
        SELECT id, message, read, created_at, type
        FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 50
      `;
      params = [userId];
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    const result = await pool.query(query, params);
    const notifications = result.rows;

    // Okunmamış bildirim sayısını hesapla
    const unreadResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );
    const unreadCount = parseInt(unreadResult.rows[0].count);

    res.status(200).json({
      notifications,
      unreadCount,
      total: notifications.length
    });

  } catch (error) {
    console.error('Notifications API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
