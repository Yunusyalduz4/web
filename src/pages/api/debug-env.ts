import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    return res.status(200).json({
      message: 'Environment Debug Info',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
        // Güvenlik için sadece ilk 20 karakteri göster
        DATABASE_URL_PREVIEW: process.env.DATABASE_URL?.substring(0, 20) + '...' || 'NOT SET'
      }
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return res.status(500).json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
