const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function debugReminder() {
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
    
    if (result.rows.length > 0) {
      console.log('📅 Appointments that should get reminders:');
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}`);
        console.log(`   Customer: ${row.customer_name}`);
        console.log(`   Business: ${row.business_name}`);
        console.log(`   DateTime: ${row.appointment_datetime}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Reminder Sent: ${row.reminder_sent}`);
        console.log(`   Services: ${row.service_names.join(', ')}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ No appointments found for reminders');
      
      // Tüm randevuları kontrol et
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
      
      console.log('📋 All recent appointments:');
      allAppointments.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.customer_name} - ${row.appointment_datetime} (${row.status}) - Reminder: ${row.reminder_sent}`);
      });
    }
    
    // 2. Push subscription'ları kontrol et
    const pushSubs = await pool.query(`
      SELECT COUNT(*) as count FROM push_subscriptions
    `);
    
    const userPushSubs = await pool.query(`
      SELECT COUNT(*) as count FROM user_push_subscriptions
    `);
    
    console.log('🔔 Push subscriptions:');
    console.log(`   Business: ${pushSubs.rows[0].count}`);
    console.log(`   User: ${userPushSubs.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await pool.end();
  }
}

debugReminder();
