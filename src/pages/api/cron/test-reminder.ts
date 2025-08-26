import { NextApiRequest, NextApiResponse } from 'next';
import { runManualReminderCheck } from '../../../utils/cronScheduler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Manuel olarak randevu hatırlatma kontrolü çalıştır
    await runManualReminderCheck();
    
    res.status(200).json({ 
      success: true, 
      message: 'Manual reminder check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in manual reminder check:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to run manual reminder check',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
