import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userType, userId } = req.body;
    
    if (!userType || !userId || userId !== session.user.id) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    if (userType === 'user') {
      // Müşteri bildirimlerini okundu olarak işaretle
      const result = await pool.query(
        'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false RETURNING id',
        [userId]
      );

      res.status(200).json({
        success: true,
        updatedCount: result.rows.length
      });
    } else if (userType === 'business') {
      // İşletme bildirimleri için henüz implement edilmedi
      // Bu durumda sadece başarılı döndür
      res.status(200).json({
        success: true,
        updatedCount: 0,
        message: 'Business notifications not yet implemented'
      });
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }

  } catch (error) {
    console.error('Mark all notifications as read API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
