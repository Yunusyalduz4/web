import { sendNotificationToUser } from './pushNotification';

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
    console.error('Get upcoming appointments for reminder error:', error);
    return [];
  }
}

/**
 * Randevu hatırlatma bildirimi gönder
 */
export async function sendAppointmentReminder(appointment: AppointmentReminder): Promise<boolean> {
  try {
    if (!appointment.userId) {
      console.log(`Appointment ${appointment.id} has no user_id, skipping reminder`);
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

    if (notificationResult.success) {
      // Hatırlatma gönderildi olarak işaretle
      const { pool } = await import('../server/db');
      await pool.query(
        'UPDATE appointments SET reminder_sent = true WHERE id = $1',
        [appointment.id]
      );
      
      console.log(`Reminder sent successfully for appointment ${appointment.id}`);
      return true;
    } else {
      console.error(`Failed to send reminder for appointment ${appointment.id}:`, notificationResult.error);
      return false;
    }
  } catch (error) {
    console.error(`Error sending reminder for appointment ${appointment.id}:`, error);
    return false;
  }
}

/**
 * Tüm yaklaşan randevular için hatırlatma gönder
 */
export async function sendAllUpcomingReminders(): Promise<void> {
  try {
    console.log('Starting appointment reminder check...');
    
    const upcomingAppointments = await getUpcomingAppointmentsForReminder();
    
    if (upcomingAppointments.length === 0) {
      console.log('No upcoming appointments need reminders');
      return;
    }

    console.log(`Found ${upcomingAppointments.length} appointments that need reminders`);

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

    console.log(`Reminder sending completed. Success: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    console.error('Error in sendAllUpcomingReminders:', error);
  }
}
