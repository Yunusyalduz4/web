import { pool } from '../server/db';

/**
 * 24 saat sonra otomatik tamamlandı olarak işaretlenecek randevuları kontrol et
 */
export async function checkAndCompleteAppointments(): Promise<void> {
  try {
    // Şu anki zamandan 24 saat önceki zamanı hesapla
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // 24 saat önce geçmiş confirmed randevuları bul
    const expiredAppointments = await pool.query(`
      SELECT 
        a.id,
        a.user_id,
        a.business_id,
        a.appointment_datetime,
        b.name as business_name,
        u.name as user_name,
        u.email as user_email
      FROM appointments a
      JOIN businesses b ON a.business_id = b.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.status = 'confirmed' 
        AND a.appointment_datetime < $1
        AND a.appointment_datetime > NOW() - INTERVAL '7 days' -- Son 7 gün içindeki randevular
    `, [twentyFourHoursAgo.toISOString()]);

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

        console.log(`✅ [Auto-Complete] Randevu tamamlandı: ${appointment.id} - ${appointment.business_name}`);

        // Push notification gönder (opsiyonel)
        try {
          const { sendAppointmentStatusUpdateNotification } = await import('./pushNotification');
          await sendAppointmentStatusUpdateNotification(
            appointment.id,
            appointment.business_id,
            appointment.user_id,
            'confirmed',
            'completed',
            appointment.appointment_datetime,
            appointment.business_name
          );
        } catch (notificationError) {
          // Push notification hatası randevu güncellemeyi etkilemesin
          console.log('⚠️ [Auto-Complete] Push notification gönderilemedi:', notificationError);
        }

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
  console.log('🔄 [Manual Auto-Complete] Manuel otomatik tamamlandı kontrolü başlatılıyor...');
  await checkAndCompleteAppointments();
  console.log('✅ [Manual Auto-Complete] Manuel kontrol tamamlandı');
}
