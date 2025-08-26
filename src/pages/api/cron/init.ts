import { NextApiRequest, NextApiResponse } from 'next';
import { initializeCronJobs } from '../../../utils/cronScheduler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Cron job sistemini başlat
    initializeCronJobs();
    
    res.status(200).json({ 
      success: true, 
      message: 'Cron jobs initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error initializing cron jobs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to initialize cron jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
