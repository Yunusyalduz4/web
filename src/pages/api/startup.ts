import { NextApiRequest, NextApiResponse } from 'next';
import { initializeCronJobs } from '../../utils/cronScheduler';

let isInitialized = false;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Sadece bir kez başlat
    if (!isInitialized) {
      console.log('🚀 Server startup - Initializing cron jobs...');
      initializeCronJobs();
      isInitialized = true;
      console.log('✅ Cron jobs initialized on server startup');
    }

    res.status(200).json({ 
      success: true, 
      message: 'Server startup completed',
      cronJobsInitialized: isInitialized,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server startup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
