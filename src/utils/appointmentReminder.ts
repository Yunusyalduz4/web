import { sendNotificationToUser } from './pushNotification';
import { whatsappNotificationService } from '../services/whatsappNotificationService';

export interface AppointmentReminder {
  id: string;
  userId: string | null;
  businessId: string;
  appointmentDatetime: Date;
  customerName?: string;
  businessName: string;
  serviceNames: string[];
}

/**
 * Randevu saatinden 2 saat önce hatırlatma gönderilecek randevuları getir
 */
export async function getUpcomingAppointmentsForReminder(): Promise<AppointmentReminder[]> {
  try {
    const { pool } = await import('../server/db');
    
    // Şu andan 2 saat sonra başlayacak randevuları bul
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const result = await pool.query(`
      SELECT 
        a.id,
        a.user_id,
        a.business_id,
        a.appointment_datetime,
        a.customer_name,
        a.reminder_sent,
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
      GROUP BY a.id, a.user_id, a.business_id, a.appointment_datetime, a.customer_name, a.reminder_sent, b.name
      ORDER BY a.appointment_datetime ASC
    `, [now.toISOString(), twoHoursFromNow.toISOString()]);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      businessId: row.business_id,
      appointmentDatetime: new Date(row.appointment_datetime),
      customerName: row.customer_name,
      businessName: row.business_name,
      serviceNames: row.service_names || []
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Randevu hatırlatma bildirimi gönder
 */
export async function sendAppointmentReminder(appointment: AppointmentReminder): Promise<boolean> {
  try {
    if (!appointment.userId) {
      return false;
    }

    // Randevu saatini Türkiye saatine çevir
    const appointmentDate = new Date(appointment.appointmentDatetime);
    const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const serviceNamesText = appointment.serviceNames.length > 0 
      ? appointment.serviceNames.join(', ')
      : 'hizmet';

    // Kullanıcıya hatırlatma bildirimi gönder
    const notificationResult = await sendNotificationToUser(
      appointment.userId,
      'Randevu Hatırlatması! ⏰',
      `${appointment.businessName} adlı işletmedeki ${formattedDate} tarihindeki randevunuz için 2 saat kaldı. Hizmet: ${serviceNamesText}`,
      {
        type: 'appointment_reminder',
        appointmentId: appointment.id,
        businessId: appointment.businessId,
        appointmentDateTime: formattedDate
      }
    );

    // WhatsApp hatırlatma bildirimi gönder
    try {
      const { whatsappNotificationService } = await import('../services/whatsappNotificationService');
      await whatsappNotificationService.sendAppointmentReminderNotification(
        appointment.id,
        appointment.businessId,
        appointment.userId,
        appointment.appointmentDatetime.toISOString(),
        appointment.businessName,
        appointment.serviceNames
      );
    } catch (whatsappError) {
      console.error('WhatsApp hatırlatma bildirimi gönderilirken hata:', whatsappError);
      // WhatsApp hatası push notification'ı etkilemesin
    }

    if (notificationResult.success) {
      // Hatırlatma gönderildi olarak işaretle
      const { pool } = await import('../server/db');
      await pool.query(
        'UPDATE appointments SET reminder_sent = true WHERE id = $1',
        [appointment.id]
      );
      
      // Reminder sent successfully
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Tüm yaklaşan randevular için hatırlatma gönder
 */
export async function sendAllUpcomingReminders(): Promise<void> {
  try {
    // Starting appointment reminder check
    
    const upcomingAppointments = await getUpcomingAppointmentsForReminder();
    
    if (upcomingAppointments.length === 0) {
      // No upcoming appointments need reminders
      return;
    }

    // Found appointments that need reminders

    let successCount = 0;
    let failCount = 0;

    for (const appointment of upcomingAppointments) {
      const success = await sendAppointmentReminder(appointment);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // Reminder sending completed
  } catch (error) {
    // Silent error handling
  }
}
