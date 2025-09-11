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

    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ error: 'Missing subscription' });
    }

    // Ensure user_push_subscriptions table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_push_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, endpoint)
      );
    `);

    // Save or update user push subscription
    const updateResult = await pool.query(
      `UPDATE user_push_subscriptions 
       SET p256dh = $2, auth = $3, updated_at = NOW()
       WHERE user_id = $1 AND endpoint = $4`,
      [session.user.id, subscription.keys.p256dh, subscription.keys.auth, subscription.endpoint]
    );

    if (updateResult.rowCount === 0) {
      await pool.query(
        `INSERT INTO user_push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)`,
        [session.user.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
