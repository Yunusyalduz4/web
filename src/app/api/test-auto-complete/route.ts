import { NextRequest, NextResponse } from 'next/server';
import { runManualAutoCompleteCheck } from '../../../utils/cronScheduler';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [Test API] Manuel günlük randevu tamamlama testi başlatılıyor...');
    
    // Manuel olarak günlük randevu tamamlama kontrolünü çalıştır
    await runManualAutoCompleteCheck();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Günlük randevu tamamlama testi başarıyla tamamlandı',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [Test API] Manuel günlük randevu tamamlama testi başarısız:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Günlük randevu tamamlama testi başarısız',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Günlük randevu tamamlama test endpoint\'i',
    usage: 'POST isteği göndererek manuel test yapabilirsiniz',
    endpoint: '/api/test-auto-complete',
    method: 'POST'
  });
}
