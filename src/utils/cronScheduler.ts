import cron from 'node-cron';
import { sendAllUpcomingReminders } from './appointmentReminder';

let isInitialized = false;

/**
 * Cron job sistemini başlat
 */
export function initializeCronJobs(): void {
  if (isInitialized) {
    console.log('Cron jobs already initialized');
    return;
  }

  console.log('Initializing cron jobs...');

  // Her 15 dakikada bir randevu hatırlatma kontrolü yap
  // Bu şekilde randevu saatinden 2 saat önce ±15 dakika içinde hatırlatma gönderilir
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running appointment reminder check...');
    try {
      await sendAllUpcomingReminders();
    } catch (error) {
      console.error('Error in appointment reminder cron job:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Europe/Istanbul' // Türkiye saati
  });

  // Her gün gece yarısı eski hatırlatma kayıtlarını temizle (opsiyonel)
  cron.schedule('0 0 * * *', async () => {
    console.log('Cleaning up old reminder records...');
    try {
      const { pool } = await import('../server/db');
      
      // 7 günden eski tamamlanmış/iptal edilmiş randevuların reminder_sent'ini false yap
      // Bu sayede aynı kullanıcı tekrar randevu alırsa hatırlatma alabilir
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      await pool.query(`
        UPDATE appointments 
        SET reminder_sent = false 
        WHERE status IN ('completed', 'cancelled') 
          AND appointment_datetime < $1
          AND reminder_sent = true
      `, [sevenDaysAgo.toISOString()]);
      
      console.log('Old reminder records cleaned up');
    } catch (error) {
      console.error('Error cleaning up old reminder records:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Europe/Istanbul'
  });

  isInitialized = true;
  console.log('Cron jobs initialized successfully');
}

/**
 * Cron job sistemini durdur
 */
export function stopCronJobs(): void {
  if (!isInitialized) {
    console.log('Cron jobs not initialized');
    return;
  }

  console.log('Stopping cron jobs...');
  cron.getTasks().forEach(task => task.stop());
  isInitialized = false;
  console.log('Cron jobs stopped');
}

/**
 * Manuel olarak randevu hatırlatma kontrolü çalıştır (test için)
 */
export async function runManualReminderCheck(): Promise<void> {
  console.log('Running manual reminder check...');
  try {
    await sendAllUpcomingReminders();
    console.log('Manual reminder check completed');
  } catch (error) {
    console.error('Error in manual reminder check:', error);
  }
}
