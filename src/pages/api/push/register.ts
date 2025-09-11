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

    // Ensure table exists (dev safety)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        business_id UUID NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_business_endpoint_idx 
      ON push_subscriptions (business_id, endpoint);
    `);

    // Save or update push subscription
    // Note: Avoid ON CONFLICT to not depend on a unique index existing in all envs.
    // Try UPDATE first; if no row affected, INSERT.
    const updateResult = await pool.query(
      `UPDATE push_subscriptions 
       SET p256dh = $3, auth = $4 
       WHERE business_id = $1 AND endpoint = $2`,
      [businessId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );

    if (updateResult.rowCount === 0) {
      await pool.query(
        `INSERT INTO push_subscriptions (business_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)`,
        [businessId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
