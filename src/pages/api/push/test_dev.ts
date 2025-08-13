import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { sendNotificationToBusiness } from '../../../utils/pushNotification';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { businessId } = req.body as { businessId?: string };

    let targetId = businessId;
    if (!targetId) {
      const row = await pool.query('SELECT business_id FROM push_subscriptions LIMIT 1');
      if (row.rows.length === 0) {
        return res.status(400).json({ error: 'No subscriptions in DB' });
      }
      targetId = row.rows[0].business_id as string;
    }

    const result = await sendNotificationToBusiness(
      targetId!,
      'Dev Test 🔔',
      'Bu bir development test bildirimidir.',
      { type: 'test_dev' }
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Push test_dev error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


