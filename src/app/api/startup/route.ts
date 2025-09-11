import { NextRequest, NextResponse } from 'next/server';
import { initializeCronJobs } from '../../../utils/cronScheduler';

let isInitialized = false;

export async function GET(request: NextRequest) {
  try {
    // Sadece bir kez başlat
    if (!isInitialized) {
      initializeCronJobs();
      isInitialized = true;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Server startup completed',
      cronJobsInitialized: isInitialized,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Server startup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
