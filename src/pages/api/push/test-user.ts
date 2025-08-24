import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { sendNotificationToUser } from '../../../utils/pushNotification';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Forbidden in production' });
  }

  try {
    const { userId } = req.body as { userId?: string };

    let targetUserId = userId;
    if (!targetUserId) {
      const row = await pool.query('SELECT user_id FROM user_push_subscriptions LIMIT 1');
      if (row.rows.length === 0) {
        return res.status(400).json({ error: 'No user subscriptions in DB' });
      }
      targetUserId = row.rows[0].user_id as string;
    }

    const result = await sendNotificationToUser(
      targetUserId!,
      'Test Bildirimi 🔔',
      'Bu bir test bildirimidir. Randevu güncelleme sistemi çalışıyor!',
      { type: 'test_user' }
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('User push test error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
