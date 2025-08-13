import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { pool } from '../../../server/db';
import { sendNotificationToBusiness } from '../../../utils/pushNotification';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Current user's business (owner)
    const biz = await pool.query(
      'SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1',
      [session.user.id]
    );
    if (biz.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const businessId: string = biz.rows[0].id;

    const result = await sendNotificationToBusiness(
      businessId,
      'Test Bildirim 🔔',
      'Bu bir test bildirimidir. Her şey çalışıyor gibi görünüyor.',
      { type: 'test' }
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Push test error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


