import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
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

    // Tüm bildirimleri sil
    const result = await pool.query(
      'DELETE FROM notifications WHERE user_id = $1 RETURNING id',
      [userId]
    );

    res.status(200).json({
      success: true,
      deletedCount: result.rows.length,
      message: 'All notifications deleted successfully'
    });

  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
