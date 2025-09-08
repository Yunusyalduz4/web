import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const vapidKeys = {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY ? 'SET' : 'NOT_SET',
      email: process.env.VAPID_EMAIL,
    };

    return res.status(200).json({
      message: 'VAPID Keys Debug',
      vapidKeys,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('VAPID debug error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
