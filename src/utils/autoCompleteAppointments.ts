import { pool } from '../server/db';

/**
 * Günlük olarak geçmiş randevuları otomatik tamamlandı olarak işaretle
 * Her gün 23:59'da pending ve confirmed statuslu randevuları completed yapar
 */
export async function checkAndCompleteAppointments(): Promise<void> {
  try {
    // Bugünün sonuna kadar olan tüm geçmiş randevuları al
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Bugünün 23:59:59'u

    // Bugüne kadar geçmiş pending ve confirmed randevuları bul
    const expiredAppointments = await pool.query(`
      SELECT 
        a.id,
        a.user_id,
        a.business_id,
        a.appointment_datetime,
        a.status as old_status,
        b.name as business_name,
        u.name as user_name,
        u.email as user_email
      FROM appointments a
      JOIN businesses b ON a.business_id = b.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.status IN ('pending', 'confirmed') 
        AND a.appointment_datetime <= $1
        AND a.appointment_datetime > NOW() - INTERVAL '30 days' -- Son 30 gün içindeki randevular
    `, [today.toISOString()]);

    if (expiredAppointments.rows.length === 0) {
      console.log('🔄 [Auto-Complete] Tamamlanacak randevu bulunamadı');
      return;
    }

    console.log(`🔄 [Auto-Complete] ${expiredAppointments.rows.length} randevu otomatik tamamlandı olarak işaretlenecek`);

    // Her randevuyu completed olarak güncelle
    for (const appointment of expiredAppointments.rows) {
      try {
        // Randevuyu completed olarak güncelle
        await pool.query(`
          UPDATE appointments 
          SET status = 'completed', updated_at = NOW() 
          WHERE id = $1
        `, [appointment.id]);

        console.log(`✅ [Auto-Complete] Randevu tamamlandı: ${appointment.id} (${appointment.old_status} → completed) - ${appointment.business_name}`);

        // Sistem tarafından otomatik tamamlandığında bildirim gönderme
        // Sadece manuel güncellemelerde bildirim gönderilir

      } catch (error) {
        console.error(`❌ [Auto-Complete] Randevu güncellenemedi: ${appointment.id}`, error);
      }
    }

    console.log(`🎉 [Auto-Complete] ${expiredAppointments.rows.length} randevu başarıyla tamamlandı olarak işaretlendi`);

  } catch (error) {
    console.error('❌ [Auto-Complete] Otomatik tamamlandı kontrolü başarısız:', error);
  }
}

/**
 * Manuel olarak otomatik tamamlandı kontrolü çalıştır (test için)
 */
export async function runManualAutoComplete(): Promise<void> {
  console.log('🔄 [Manual Auto-Complete] Manuel günlük randevu tamamlama kontrolü başlatılıyor...');
  await checkAndCompleteAppointments();
  console.log('✅ [Manual Auto-Complete] Manuel kontrol tamamlandı');
}
