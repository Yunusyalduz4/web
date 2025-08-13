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

    const biz = await pool.query(
      'SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1',
      [session.user.id]
    );
    if (biz.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const businessId: string = biz.rows[0].id;

    const subs = await pool.query(
      'SELECT endpoint, LENGTH(p256dh) as pLen, LENGTH(auth) as aLen FROM push_subscriptions WHERE business_id = $1',
      [businessId]
    );

    return res.status(200).json({ businessId, count: subs.rows.length, subscriptions: subs.rows });
  } catch (error) {
    console.error('Push debug error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


