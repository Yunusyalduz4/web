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

    // İşletme sahibi kontrolü
    const businessCheck = await pool.query(
      `SELECT id FROM businesses WHERE owner_user_id = $1`,
      [session.user.id]
    );

    if (businessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You must be a business owner to perform cleanup' });
    }

    // Süresi dolmuş hikayeleri arşivle
    const result = await pool.query(`
      SELECT archive_expired_stories() as archived_count
    `);
    
    const archivedCount = result.rows[0].archived_count;

    return res.status(200).json({
      success: true,
      archivedCount,
      message: `${archivedCount} expired stories have been archived`
    });

  } catch (error) {
    console.error('Story cleanup error:', error);
    return res.status(500).json({ 
      error: 'Story cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
