import webpush from 'web-push';

// VAPID keys - production'da environment variables'dan alınmalı
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'YOUR_PUBLIC_KEY',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'YOUR_PRIVATE_KEY'
};

// VAPID details'i güvenli şekilde set et
try {
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (error) {
  console.warn('VAPID keys not configured, push notifications disabled:', error);
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
  }
) {
  try {
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      data: payload.data || {}
    });

    await webpush.sendNotification(subscription, pushPayload);
    return { success: true };
  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error };
  }
}

export async function sendNotificationToBusiness(
  businessId: string,
  title: string,
  body: string,
  data?: any
) {
  try {
    // Get business subscriptions from database
    const { pool } = await import('../server/db');
    const subscriptions = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE business_id = $1',
      [businessId]
    );

    if (subscriptions.rows.length === 0) {
      return { success: false, error: 'No subscriptions found' };
    }

    const results = await Promise.allSettled(
      subscriptions.rows.map(sub => 
        sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          { title, body, data }
        )
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return {
      success: true,
      sent: successful,
      failed,
      total: results.length
    };
  } catch (error) {
    console.error('Send notification to business error:', error);
    return { success: false, error };
  }
}

// Yeni: Kullanıcıya bildirim gönderme
export async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  data?: any
) {
  try {
    // Get user subscriptions from database
    const { pool } = await import('../server/db');
    const subscriptions = await pool.query(
      'SELECT endpoint, p256dh, auth FROM user_push_subscriptions WHERE user_id = $1',
      [userId]
    );

    if (subscriptions.rows.length === 0) {
      return { success: false, error: 'No user subscriptions found' };
    }

    const results = await Promise.allSettled(
      subscriptions.rows.map(sub => 
        sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          { title, body, data }
        )
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return {
      success: true,
      sent: successful,
      failed,
      total: results.length
    };
  } catch (error) {
    console.error('Send notification to user error:', error);
    return { success: false, error };
  }
}

// Yeni: Randevu durumu güncellendiğinde bildirim gönderme
export async function sendAppointmentStatusUpdateNotification(
  appointmentId: string,
  businessId: string,
  userId: string | null,
  oldStatus: string,
  newStatus: string,
  appointmentDateTime: string,
  businessName: string,
  customerName?: string
) {
  try {
    const { pool } = await import('../server/db');
    
    // Status mesajlarını hazırla
    const statusMessages = {
      pending: '⏳ Beklemede',
      confirmed: '✅ Onaylandı',
      completed: '✅ Tamamlandı',
      cancelled: '❌ İptal Edildi'
    };

    const oldStatusText = statusMessages[oldStatus as keyof typeof statusMessages] || oldStatus;
    const newStatusText = statusMessages[newStatus as keyof typeof statusMessages] || newStatus;
    
    // Tarihi Türkiye saatine çevir
    const appointmentDate = new Date(appointmentDateTime);
    // ✅ DOĞRU - Direkt kullan
    const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // İşletmeye bildirim gönder
    if (userId) {
      const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = userRes.rows[0]?.name || customerName || 'Müşteri';
      
      await sendNotificationToBusiness(
        businessId,
        'Randevu Durumu Güncellendi 📅',
        `${userName} adlı müşterinin ${formattedDate} tarihindeki randevusu ${oldStatusText} durumundan ${newStatusText} durumuna güncellendi.`,
        {
          type: 'appointment_status_update',
          appointmentId,
          businessId,
          oldStatus,
          newStatus,
          appointmentDateTime: formattedDate
        }
      );
    }

    // Müşteriye bildirim gönder (eğer user_id varsa)
    if (userId) {
      await sendNotificationToUser(
        userId,
        'Randevu Durumu Güncellendi 📅',
        `${businessName} adlı işletmedeki ${formattedDate} tarihindeki randevunuz ${oldStatusText} durumundan ${newStatusText} durumuna güncellendi.`,
        {
          type: 'appointment_status_update',
          appointmentId,
          businessId,
          oldStatus,
          newStatus,
          appointmentDateTime: formattedDate
        }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Appointment status update notification error:', error);
    return { success: false, error };
  }
}
