import { NextRequest, NextResponse } from 'next/server';
import { pool } from '../../../server/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging reminder system...');
    
    // 1. Mevcut randevuları kontrol et
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    console.log('⏰ Current time:', now.toISOString());
    console.log('⏰ Two hours from now:', twoHoursFromNow.toISOString());
    
    const result = await pool.query(`
      SELECT 
        a.id,
        a.user_id,
        a.business_id,
        a.appointment_datetime,
        a.customer_name,
        a.reminder_sent,
        a.status,
        b.name as business_name,
        COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), ARRAY[]::text[]) as service_names
      FROM appointments a
      LEFT JOIN businesses b ON a.business_id = b.id
      LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
      LEFT JOIN services s ON aps.service_id = s.id
      WHERE a.status IN ('pending', 'confirmed')
        AND a.appointment_datetime BETWEEN $1 AND $2
        AND a.reminder_sent = false
        AND a.user_id IS NOT NULL
      GROUP BY a.id, a.user_id, a.business_id, a.appointment_datetime, a.customer_name, a.reminder_sent, b.name, a.status
      ORDER BY a.appointment_datetime ASC
    `, [now.toISOString(), twoHoursFromNow.toISOString()]);

    console.log('📋 Found appointments:', result.rows.length);
    
    // 2. Tüm randevuları kontrol et
    const allAppointments = await pool.query(`
      SELECT 
        a.id,
        a.customer_name,
        a.appointment_datetime,
        a.status,
        a.reminder_sent,
        b.name as business_name
      FROM appointments a
      LEFT JOIN businesses b ON a.business_id = b.id
      WHERE a.user_id IS NOT NULL
      ORDER BY a.appointment_datetime DESC
      LIMIT 10
    `);
    
    // 3. Push subscription'ları kontrol et
    const pushSubs = await pool.query(`
      SELECT COUNT(*) as count FROM push_subscriptions
    `);
    
    const userPushSubs = await pool.query(`
      SELECT COUNT(*) as count FROM user_push_subscriptions
    `);
    
    return NextResponse.json({
      success: true,
      debug: {
        currentTime: now.toISOString(),
        twoHoursFromNow: twoHoursFromNow.toISOString(),
        appointmentsForReminder: result.rows.length,
        appointments: result.rows,
        allRecentAppointments: allAppointments.rows,
        pushSubscriptions: {
          business: pushSubs.rows[0].count,
          user: userPushSubs.rows[0].count
        }
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
