import { NextApiRequest, NextApiResponse } from 'next';
import { runManualAutoCompleteCheck } from '../../../utils/cronScheduler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece GET isteklerini kabul et (cron job'lar genellikle GET kullanır)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // API key kontrolü (güvenlik için)
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedApiKey = process.env.CRON_API_KEY;

  if (expectedApiKey && apiKey !== expectedApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 [API] Otomatik tamamlandı kontrolü başlatılıyor...');
    
    // Manuel olarak otomatik tamamlandı kontrolü çalıştır
    await runManualAutoCompleteCheck();
    
    console.log('✅ [API] Otomatik tamamlandı kontrolü tamamlandı');

    return res.status(200).json({
      success: true,
      message: 'Otomatik tamamlandı kontrolü başarıyla çalıştırıldı',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [API] Otomatik tamamlandı kontrolü başarısız:', error);
    
    return res.status(500).json({ 
      success: false,
      error: 'Otomatik tamamlandı kontrolü başarısız',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
