import * as cron from 'node-cron';
import { sendAllUpcomingReminders } from './appointmentReminder';

let isInitialized = false;
let cronJobs: any[] = [];

/**
 * Cron job sistemini başlat
 */
export function initializeCronJobs(): void {
  if (isInitialized) {
    return;
  }

  // Her 15 dakikada bir randevu hatırlatma kontrolü yap
  // Bu şekilde randevu saatinden 2 saat önce ±15 dakika içinde hatırlatma gönderilir
  const reminderJob = cron.schedule('*/15 * * * *', async () => {
    try {
      await sendAllUpcomingReminders();
    } catch (error) {
      // Randevu hatırlatma hatası
    }
  }, {
    timezone: 'Europe/Istanbul' // Türkiye saati
  });
  
  cronJobs.push(reminderJob);

  // Her gün gece yarısı eski hatırlatma kayıtlarını temizle (opsiyonel)
  const cleanupJob = cron.schedule('0 0 * * *', async () => {
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
    } catch (error) {
      // Eski hatırlatma kayıtları temizleme hatası
    }
  }, {
    timezone: 'Europe/Istanbul'
  });
  
  cronJobs.push(cleanupJob);

  isInitialized = true;
}

/**
 * Cron job sistemini durdur
 */
export function stopCronJobs(): void {
  if (!isInitialized) {
    return;
  }
  
  // Kayıtlı job'ları durdur
  cronJobs.forEach(job => {
    if (job) {
      job.stop();
    }
  });
  
  // Tüm cron job'ları durdur
  cron.getTasks().forEach(task => task.stop());
  
  cronJobs = [];
  isInitialized = false;
}

/**
 * Manuel olarak randevu hatırlatma kontrolü çalıştır (test için)
 */
export async function runManualReminderCheck(): Promise<void> {
  try {
    await sendAllUpcomingReminders();
  } catch (error) {
    // Manuel hatırlatma kontrolü hatası
  }
}
