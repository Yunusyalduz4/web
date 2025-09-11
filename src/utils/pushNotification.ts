import webpush from 'web-push';

// VAPID keys - production'da environment variables'dan alınmalı
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BDGdOcqgLlT-eIVLrha5j__3puuZVYxiVmZFIeZJ54K7Q_IfvAZL4hVOwwwos3L8LOHKkjfCwLcpCGGWFUkwBp0',
  privateKey: process.env.VAPID_PRIVATE_KEY || '42Tz8e44LLU30qnu8fw6xUSzVhjD-V0qPTmeJjN_FnA'
};

// VAPID details'i güvenli şekilde set et
try {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:yalduzbey@gmail.com',
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
  } catch (error: any) {
    console.error('Push notification error:', error);
    
    // 410 hatası (expired subscription) ise subscription'ı sil
    if (error?.statusCode === 410) {
      console.log('🗑️ Removing expired subscription...');
      try {
        const { pool } = await import('../server/db');
        await pool.query(
          'DELETE FROM push_subscriptions WHERE endpoint = $1',
          [subscription.endpoint]
        );
        console.log('✅ Expired subscription removed');
      } catch (deleteError) {
        console.error('❌ Error removing expired subscription:', deleteError);
      }
    }
    
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
      return { success: false, error: 'No business subscriptions found' };
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

    // İşletme bildirimlerini veritabanına kaydet
    try {
      // Önce business_id'ye karşılık gelen owner_user_id'yi bul
      console.log('Looking for business owner for businessId:', businessId);
      const businessUser = await pool.query(
        'SELECT owner_user_id FROM businesses WHERE id = $1',
        [businessId]
      );
      
      if (businessUser.rows.length > 0) {
        const userId = businessUser.rows[0].owner_user_id;
        console.log('Found business owner userId:', userId);
        console.log('Saving notification:', { userId, body, type: data?.type || 'system' });
        
        await pool.query(
          'INSERT INTO notifications (user_id, message, read, type) VALUES ($1, $2, false, $3)',
          [userId, body, data?.type || 'system']
        );
        console.log('Notification saved successfully');
        
        // WebSocket ile real-time bildirim gönder
        try {
          const { getSocketServer } = await import('../server/socket');
          const socketServer = getSocketServer();
          if (socketServer) {
            socketServer.emitNotificationSent({
              type: 'business',
              targetId: businessId,
              notification: {
                message: body,
                type: data?.type || 'system',
                data: data
              }
            });
          }
        } catch (wsError) {
          console.error('WebSocket business notification error:', wsError);
          // WebSocket hatası push notification'ı etkilemesin
        }
      }
    } catch (dbError) {
      console.error('Database business notification save error:', dbError);
      // Push notification başarılı olsa bile veritabanı hatası loglanır
    }

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

    // Kullanıcı bildirimlerini veritabanına kaydet
    try {
      await pool.query(
        'INSERT INTO notifications (user_id, message, read, type) VALUES ($1, $2, false, $3)',
        [userId, body, data?.type || 'system']
      );
      
      // WebSocket ile real-time bildirim gönder
      try {
        const { getSocketServer } = await import('../server/socket');
        const socketServer = getSocketServer();
        if (socketServer) {
          socketServer.emitNotificationSent({
            type: 'user',
            targetId: userId,
            notification: {
              message: body,
              type: data?.type || 'system',
              data: data
            }
          });
        }
      } catch (wsError) {
        console.error('WebSocket notification error:', wsError);
        // WebSocket hatası push notification'ı etkilemesin
      }
    } catch (dbError) {
      console.error('Database user notification save error:', dbError);
      // Push notification başarılı olsa bile veritabanı hatası loglanır
    }

    return {
      success: true,
      sent: successful,
      failed,
      total: results.length
    };
  } catch (error: any) {
    console.error('Send notification to user error:', error);
    
    // 410 hatası (expired subscription) ise subscription'ları temizle
    if (error?.statusCode === 410) {
      console.log('🗑️ Cleaning up expired user subscriptions...');
      try {
        const { pool } = await import('../server/db');
        await pool.query(
          'DELETE FROM user_push_subscriptions WHERE user_id = $1',
          [userId]
        );
        console.log('✅ Expired user subscriptions removed');
      } catch (deleteError) {
        console.error('❌ Error removing expired user subscriptions:', deleteError);
      }
    }
    
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

// Yeni: Randevu oluşturulduğunda bildirim gönderme
export async function sendNewAppointmentNotification(
  appointmentId: string,
  businessId: string,
  userId: string | null,
  appointmentDateTime: string,
  businessName: string,
  customerName?: string,
  serviceNames?: string[]
) {
  try {
    const { pool } = await import('../server/db');
    
    // Tarihi Türkiye saatine çevir
    const appointmentDate = new Date(appointmentDateTime);
    const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const serviceText = serviceNames && serviceNames.length > 0 
      ? ` (${serviceNames.join(', ')})` 
      : '';

    // İşletmeye bildirim gönder
    if (userId) {
      const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = userRes.rows[0]?.name || customerName || 'Müşteri';
      
      await sendNotificationToBusiness(
        businessId,
        'Yeni Randevu Talebi! 📅',
        `${userName} adlı müşteri ${formattedDate} tarihinde randevu talebinde bulundu${serviceText}.`,
        {
          type: 'new_appointment',
          appointmentId,
          businessId,
          appointmentDateTime: formattedDate
        }
      );
    }

    // Müşteriye bildirim gönder (eğer user_id varsa)
    if (userId) {
      await sendNotificationToUser(
        userId,
        'Randevu Talebiniz Alındı! ✅',
        `${businessName} adlı işletmeye ${formattedDate} tarihinde randevu talebiniz gönderildi${serviceText}.`,
        {
          type: 'new_appointment',
          appointmentId,
          businessId,
          appointmentDateTime: formattedDate
        }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('New appointment notification error:', error);
    return { success: false, error };
  }
}

// Yeni: Review/yorum bildirimi gönderme
export async function sendReviewNotification(
  reviewId: string,
  businessId: string,
  userId: string | null,
  rating: number,
  businessName: string,
  customerName?: string
) {
  try {
    const { pool } = await import('../server/db');
    
    const starText = '⭐'.repeat(rating);
    
    // İşletmeye bildirim gönder
    if (userId) {
      const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = userRes.rows[0]?.name || customerName || 'Müşteri';
      
      await sendNotificationToBusiness(
        businessId,
        'Yeni Yorum Aldınız! ⭐',
        `${userName} adlı müşteri işletmenize ${starText} puan verdi ve yorum yazdı.`,
        {
          type: 'new_review',
          reviewId,
          businessId,
          rating
        }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Review notification error:', error);
    return { success: false, error };
  }
}

// Yeni: İşletme onay durumu bildirimi
export async function sendBusinessApprovalNotification(
  businessId: string,
  status: 'approved' | 'rejected' | 'suspended',
  businessName: string,
  reason?: string
) {
  try {
    const { pool } = await import('../server/db');
    
    // İşletme sahibini bul
    const businessRes = await pool.query(
      'SELECT owner_user_id FROM businesses WHERE id = $1',
      [businessId]
    );
    
    if (businessRes.rows.length === 0) {
      return { success: false, error: 'Business not found' };
    }
    
    const userId = businessRes.rows[0].owner_user_id;
    
    let title = '';
    let message = '';
    
    switch (status) {
      case 'approved':
        title = 'İşletmeniz Onaylandı! 🎉';
        message = `${businessName} adlı işletmeniz başarıyla onaylandı. Artık müşteriler randevu alabilir!`;
        break;
      case 'rejected':
        title = 'İşletme Başvurunuz Reddedildi ❌';
        message = `${businessName} adlı işletme başvurunuz reddedildi.${reason ? ` Sebep: ${reason}` : ''}`;
        break;
      case 'suspended':
        title = 'İşletmeniz Askıya Alındı ⚠️';
        message = `${businessName} adlı işletmeniz geçici olarak askıya alındı.${reason ? ` Sebep: ${reason}` : ''}`;
        break;
    }
    
    await sendNotificationToUser(
      userId,
      title,
      message,
      {
        type: 'business_approval',
        businessId,
        status,
        reason
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Business approval notification error:', error);
    return { success: false, error };
  }
}

// Yeni: Çalışan randevu bildirimi
// NOT: Employees tablosunda user_id kolonu yok, bu fonksiyon şimdilik devre dışı
export async function sendEmployeeAppointmentNotification(
  employeeId: string,
  appointmentId: string,
  businessId: string,
  appointmentDateTime: string,
  customerName: string,
  serviceNames?: string[]
) {
  try {
    // Çalışanlar için ayrı user_id sistemi yok, bu yüzden sadece işletme sahibine bildirim gönder
    console.log('Employee notification skipped - no user_id in employees table');
    
    // İşletme sahibine bildirim gönder
    const { pool } = await import('../server/db');
    const businessRes = await pool.query(
      'SELECT owner_user_id FROM businesses WHERE id = $1',
      [businessId]
    );
    
    if (businessRes.rows.length > 0) {
      const businessOwnerId = businessRes.rows[0].owner_user_id;
      
      // Tarihi Türkiye saatine çevir
      const appointmentDate = new Date(appointmentDateTime);
      const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const serviceText = serviceNames && serviceNames.length > 0 
        ? ` (${serviceNames.join(', ')})` 
        : '';

      await sendNotificationToUser(
        businessOwnerId,
        'Yeni Randevu Atandı! 👤',
        `${customerName} adlı müşteriye ${formattedDate} tarihinde randevu atandı${serviceText}.`,
        {
          type: 'employee_appointment',
          appointmentId,
          businessId,
          employeeId,
          appointmentDateTime: formattedDate
        }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Employee appointment notification error:', error);
    return { success: false, error };
  }
}

// Yeni: Favori işletme bildirimi
export async function sendFavoriteBusinessNotification(
  businessId: string,
  userId: string,
  notificationType: 'new_service' | 'promotion' | 'update',
  businessName: string,
  message: string
) {
  try {
    await sendNotificationToUser(
      userId,
      `Favori İşletmenizden Haber! ❤️`,
      `${businessName}: ${message}`,
      {
        type: 'favorite_business',
        businessId,
        notificationType
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Favorite business notification error:', error);
    return { success: false, error };
  }
}

// Yeni: Sistem bildirimi
export async function sendSystemNotification(
  userId: string,
  title: string,
  message: string,
  notificationType: 'maintenance' | 'feature' | 'security' | 'general' = 'general'
) {
  try {
    await sendNotificationToUser(
      userId,
      `Sistem Bildirimi: ${title}`,
      message,
      {
        type: 'system',
        notificationType
      }
    );

    return { success: true };
  } catch (error) {
    console.error('System notification error:', error);
    return { success: false, error };
  }
}
