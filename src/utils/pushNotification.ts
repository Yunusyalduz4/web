import webpush from 'web-push';
import { whatsappNotificationService } from '../services/whatsappNotificationService';

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
  // VAPID keys not configured, push notifications disabled
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
    // 410 hatası (expired subscription) ise subscription'ı sil
    if (error?.statusCode === 410) {
      try {
        const { pool } = await import('../server/db');
        await pool.query(
          'DELETE FROM push_subscriptions WHERE endpoint = $1',
          [subscription.endpoint]
        );
      } catch (deleteError) {
        // Expired subscription silme hatası
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
      const businessUser = await pool.query(
        'SELECT owner_user_id FROM businesses WHERE id = $1',
        [businessId]
      );
      
      if (businessUser.rows.length > 0) {
        const userId = businessUser.rows[0].owner_user_id;
        
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
          // WebSocket hatası push notification'ı etkilemesin
        }
      }
    } catch (dbError) {
      // Push notification başarılı olsa bile veritabanı hatası loglanır
    }

    return {
      success: true,
      sent: successful,
      failed,
      total: results.length
    };
  } catch (error) {
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
        // WebSocket hatası push notification'ı etkilemesin
      }
    } catch (dbError) {
      // Push notification başarılı olsa bile veritabanı hatası loglanır
    }

    return {
      success: true,
      sent: successful,
      failed,
      total: results.length
    };
  } catch (error: any) {
    // 410 hatası (expired subscription) ise subscription'ları temizle
    if (error?.statusCode === 410) {
      try {
        const { pool } = await import('../server/db');
        await pool.query(
          'DELETE FROM user_push_subscriptions WHERE user_id = $1',
          [userId]
        );
      } catch (deleteError) {
        // Expired user subscriptions silme hatası
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

    // WhatsApp bildirimi gönder (eğer onaylandıysa veya iptal edildiyse) - Hem üye hem misafir kullanıcılar için
    if (newStatus === 'confirmed' || newStatus === 'cancelled') {
      try {
        // whatsappNotificationService'i import et
        const { whatsappNotificationService } = await import('../services/whatsappNotificationService');
        
        // Hizmet isimlerini al
        const serviceRes = await pool.query(
          `SELECT s.name FROM appointment_services aps 
           JOIN services s ON aps.service_id = s.id 
           WHERE aps.appointment_id = $1`,
          [appointmentId]
        );
        const serviceNames = serviceRes.rows.map(row => row.name);

        // Misafir kullanıcı için telefon numarasını al
        let customerPhone = null;
        if (!userId) {
          // Misafir kullanıcı - randevu tablosundan telefon numarasını al
          const appointmentRes = await pool.query(
            `SELECT customer_phone FROM appointments WHERE id = $1`,
            [appointmentId]
          );
          customerPhone = appointmentRes.rows[0]?.customer_phone;
        }

        // WhatsApp bildirimi gönder
        if (userId || customerPhone) {
          if (newStatus === 'confirmed') {
            // Onay bildirimi
            await whatsappNotificationService.sendAppointmentApprovalNotification(
              appointmentId,
              businessId,
              userId || 'guest', // Misafir kullanıcı için 'guest' gönder
              appointmentDateTime,
              businessName,
              customerName || 'Müşteri',
              serviceNames
            );
          } else if (newStatus === 'cancelled') {
            // İptal bildirimi
            await whatsappNotificationService.sendAppointmentCancellationNotification(
              appointmentId,
              businessId,
              userId || 'guest', // Misafir kullanıcı için 'guest' gönder
              appointmentDateTime,
              businessName,
              customerName || 'Müşteri',
              serviceNames
            );
          }
        }
      } catch (whatsappError) {
        console.error('WhatsApp bildirimi gönderilirken hata:', whatsappError);
        // WhatsApp hatası push notification'ı etkilemesin
      }
    }

    return { success: true };
  } catch (error) {
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

      // WhatsApp bildirimi gönder
      try {
        const { whatsappNotificationService } = await import('../services/whatsappNotificationService');
        await whatsappNotificationService.sendNewAppointmentNotification(
          appointmentId,
          businessId,
          userId,
          appointmentDateTime,
          businessName,
          customerName,
          serviceNames
        );
      } catch (whatsappError) {
        console.error('WhatsApp bildirimi gönderilirken hata:', whatsappError);
        // WhatsApp hatası push notification'ı etkilemesin
      }
    }

    return { success: true };
  } catch (error) {
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
    return { success: false, error };
  }
}

// ===== RANDEVU ERTELEME BİLDİRİMLERİ =====

// Randevu erteleme isteği bildirimi
export async function sendRescheduleRequestNotification(
  appointmentId: number,
  businessId: number,
  userId: number | null,
  employeeId: number | null,
  requestedBy: 'user' | 'business' | 'employee',
  oldDateTime: string,
  newDateTime: string,
  businessName: string,
  customerName?: string,
  employeeName?: string,
  requestReason?: string
) {
  try {
    const { pool } = await import('../server/db');
    
    // Tarihleri formatla
    const oldDate = new Date(oldDateTime);
    const newDate = new Date(newDateTime);
    const formattedOldDate = oldDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const formattedNewDate = newDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Müşteri isteği yaptıysa işletme ve çalışana bildir
    if (requestedBy === 'user') {
      // İşletmeye bildirim
      await sendNotificationToBusiness(
        businessId.toString(),
        '📅 Randevu Erteleme İsteği',
        `${customerName || 'Müşteri'} adlı müşteri randevusunu ${formattedOldDate} tarihinden ${formattedNewDate} tarihine ertelemek istiyor.${requestReason ? ` Sebep: ${requestReason}` : ''}`,
        {
          type: 'reschedule_request',
          appointmentId,
          businessId,
          requestedBy,
          oldDateTime: formattedOldDate,
          newDateTime: formattedNewDate,
          requestReason
        }
      );

      // Çalışana bildirim (eğer varsa)
      if (employeeId) {
        // Çalışan için user_id bul
        const employeeRes = await pool.query(
          'SELECT user_id FROM employees WHERE id = $1',
          [employeeId]
        );
        
        if (employeeRes.rows.length > 0 && employeeRes.rows[0].user_id) {
          await sendNotificationToUser(
            employeeRes.rows[0].user_id.toString(),
            '📅 Randevu Erteleme İsteği',
            `${customerName || 'Müşteri'} adlı müşteri randevusunu ${formattedOldDate} tarihinden ${formattedNewDate} tarihine ertelemek istiyor.${requestReason ? ` Sebep: ${requestReason}` : ''}`,
            {
              type: 'reschedule_request',
              appointmentId,
              businessId,
              requestedBy,
              oldDateTime: formattedOldDate,
              newDateTime: formattedNewDate,
              requestReason
            }
          );
        }
      }
    }
    // İşletme/Çalışan isteği yaptıysa müşteriye bildir
    else {
      if (userId) {
        await sendNotificationToUser(
          userId.toString(),
          '📅 Randevu Erteleme İsteği',
          `${businessName} adlı işletme randevunuzu ${formattedOldDate} tarihinden ${formattedNewDate} tarihine ertelemek istiyor.${requestReason ? ` Sebep: ${requestReason}` : ''}`,
          {
            type: 'reschedule_request',
            appointmentId,
            businessId,
            requestedBy,
            oldDateTime: formattedOldDate,
            newDateTime: formattedNewDate,
            requestReason
          }
        );
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// Randevu erteleme onaylandı bildirimi
export async function sendRescheduleApprovedNotification(
  appointmentId: number,
  businessId: number,
  userId: number | null,
  employeeId: number | null,
  approvedBy: 'user' | 'business' | 'employee',
  oldDateTime: string,
  newDateTime: string,
  businessName: string,
  customerName?: string,
  employeeName?: string
) {
  try {
    const { pool } = await import('../server/db');
    
    // Tarihleri formatla
    const oldDate = new Date(oldDateTime);
    const newDate = new Date(newDateTime);
    const formattedOldDate = oldDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const formattedNewDate = newDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Müşteri onayladıysa işletme ve çalışana bildir
    if (approvedBy === 'user') {
      // İşletmeye bildirim
      await sendNotificationToBusiness(
        businessId.toString(),
        '✅ Randevu Erteleme Onaylandı',
        `${customerName || 'Müşteri'} adlı müşteri randevu erteleme isteğinizi onayladı. Randevu ${formattedOldDate} tarihinden ${formattedNewDate} tarihine ertelendi.`,
        {
          type: 'reschedule_approved',
          appointmentId,
          businessId,
          approvedBy,
          oldDateTime: formattedOldDate,
          newDateTime: formattedNewDate
        }
      );

      // Çalışana bildirim (eğer varsa)
      if (employeeId) {
        const employeeRes = await pool.query(
          'SELECT user_id FROM employees WHERE id = $1',
          [employeeId]
        );
        
        if (employeeRes.rows.length > 0 && employeeRes.rows[0].user_id) {
          await sendNotificationToUser(
            employeeRes.rows[0].user_id.toString(),
            '✅ Randevu Erteleme Onaylandı',
            `${customerName || 'Müşteri'} adlı müşteri randevu erteleme isteğinizi onayladı. Randevu ${formattedOldDate} tarihinden ${formattedNewDate} tarihine ertelendi.`,
            {
              type: 'reschedule_approved',
              appointmentId,
              businessId,
              approvedBy,
              oldDateTime: formattedOldDate,
              newDateTime: formattedNewDate
            }
          );
        }
      }
    }
    // İşletme/Çalışan onayladıysa müşteriye bildir
    else {
      if (userId) {
        await sendNotificationToUser(
          userId.toString(),
          '✅ Randevu Erteleme Onaylandı',
          `${businessName} adlı işletme randevu erteleme isteğinizi onayladı. Randevunuz ${formattedOldDate} tarihinden ${formattedNewDate} tarihine ertelendi.`,
          {
            type: 'reschedule_approved',
            appointmentId,
            businessId,
            approvedBy,
            oldDateTime: formattedOldDate,
            newDateTime: formattedNewDate
          }
        );
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// Randevu erteleme reddedildi bildirimi
export async function sendRescheduleRejectedNotification(
  appointmentId: number,
  businessId: number,
  userId: number | null,
  employeeId: number | null,
  rejectedBy: 'user' | 'business' | 'employee',
  oldDateTime: string,
  newDateTime: string,
  businessName: string,
  customerName?: string,
  employeeName?: string,
  rejectionReason?: string
) {
  try {
    const { pool } = await import('../server/db');
    
    // Tarihleri formatla
    const oldDate = new Date(oldDateTime);
    const newDate = new Date(newDateTime);
    const formattedOldDate = oldDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const formattedNewDate = newDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Müşteri reddettiyse işletme ve çalışana bildir
    if (rejectedBy === 'user') {
      // İşletmeye bildirim
      await sendNotificationToBusiness(
        businessId.toString(),
        '❌ Randevu Erteleme Reddedildi',
        `${customerName || 'Müşteri'} adlı müşteri randevu erteleme isteğinizi reddetti. Randevu ${formattedOldDate} tarihinde kalacak.${rejectionReason ? ` Sebep: ${rejectionReason}` : ''}`,
        {
          type: 'reschedule_rejected',
          appointmentId,
          businessId,
          rejectedBy,
          oldDateTime: formattedOldDate,
          newDateTime: formattedNewDate,
          rejectionReason
        }
      );

      // Çalışana bildirim (eğer varsa)
      if (employeeId) {
        const employeeRes = await pool.query(
          'SELECT user_id FROM employees WHERE id = $1',
          [employeeId]
        );
        
        if (employeeRes.rows.length > 0 && employeeRes.rows[0].user_id) {
          await sendNotificationToUser(
            employeeRes.rows[0].user_id.toString(),
            '❌ Randevu Erteleme Reddedildi',
            `${customerName || 'Müşteri'} adlı müşteri randevu erteleme isteğinizi reddetti. Randevu ${formattedOldDate} tarihinde kalacak.${rejectionReason ? ` Sebep: ${rejectionReason}` : ''}`,
            {
              type: 'reschedule_rejected',
              appointmentId,
              businessId,
              rejectedBy,
              oldDateTime: formattedOldDate,
              newDateTime: formattedNewDate,
              rejectionReason
            }
          );
        }
      }
    }
    // İşletme/Çalışan reddettiyse müşteriye bildir
    else {
      if (userId) {
        await sendNotificationToUser(
          userId.toString(),
          '❌ Randevu Erteleme Reddedildi',
          `${businessName} adlı işletme randevu erteleme isteğinizi reddetti. Randevunuz ${formattedOldDate} tarihinde kalacak.${rejectionReason ? ` Sebep: ${rejectionReason}` : ''}`,
          {
            type: 'reschedule_rejected',
            appointmentId,
            businessId,
            rejectedBy,
            oldDateTime: formattedOldDate,
            newDateTime: formattedNewDate,
            rejectionReason
          }
        );
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
