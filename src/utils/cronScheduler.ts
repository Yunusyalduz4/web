import * as cron from 'node-cron';
import { sendAllUpcomingReminders } from './appointmentReminder';
import { checkAndCompleteAppointments } from './autoCompleteAppointments';

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

  // Her gün 23:59'da otomatik tamamlandı kontrolü yap
  // Geçmiş pending ve confirmed randevuları completed olarak işaretle
  const autoCompleteJob = cron.schedule('59 23 * * *', async () => {
    try {
      console.log('🕐 [Cron] Günlük randevu tamamlama kontrolü başlatılıyor...');
      await checkAndCompleteAppointments();
      console.log('✅ [Cron] Günlük randevu tamamlama kontrolü tamamlandı');
    } catch (error) {
      // Otomatik tamamlandı kontrolü hatası
      console.error('❌ [Cron] Günlük otomatik tamamlandı kontrolü başarısız:', error);
    }
  }, {
    timezone: 'Europe/Istanbul' // Türkiye saati
  });
  
  cronJobs.push(autoCompleteJob);

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

/**
 * Manuel olarak günlük randevu tamamlama kontrolü çalıştır (test için)
 */
export async function runManualAutoCompleteCheck(): Promise<void> {
  try {
    console.log('🔄 [Manual] Manuel günlük randevu tamamlama kontrolü başlatılıyor...');
    await checkAndCompleteAppointments();
    console.log('✅ [Manual] Manuel günlük randevu tamamlama kontrolü tamamlandı');
  } catch (error) {
    // Manuel otomatik tamamlandı kontrolü hatası
    console.error('❌ [Manual] Manuel günlük randevu tamamlama kontrolü başarısız:', error);
  }
}
