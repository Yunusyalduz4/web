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

    const { subscription, businessId } = req.body;

    if (!subscription || !businessId) {
      return res.status(400).json({ error: 'Missing subscription or businessId' });
    }

    // Check if user owns the business
    const business = await pool.query(
      'SELECT * FROM businesses WHERE id = $1 AND owner_user_id = $2',
      [businessId, session.user.id]
    );

    if (business.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Save or update push subscription
    await pool.query(
      `INSERT INTO push_subscriptions 
       (business_id, endpoint, p256dh, auth, created_at) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (business_id, endpoint) 
       DO UPDATE SET 
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         updated_at = NOW()`,
      [
        businessId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        new Date().toISOString()
      ]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Push registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
