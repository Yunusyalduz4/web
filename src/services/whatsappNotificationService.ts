import { getTwilioWhatsAppService } from './twilioWhatsAppService';
import { pool } from '../server/db';

export class WhatsAppNotificationService {
  /**
   * Telefon numarasını formatla
   */
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, ''); // Sadece rakamları al
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1); // Baştaki 0'ı kaldır
    }
    if (!cleaned.startsWith('90')) {
      cleaned = '90' + cleaned; // 90 ekle
    }
    return cleaned;
  }

  /**
   * İşletme WhatsApp ayarlarını kontrol et
   */
  private async getBusinessWhatsAppSettings(businessId: string): Promise<{
    whatsappNotificationsEnabled: boolean;
    whatsappPhone: string | null;
  }> {
    try {
      const result = await pool.query(
        `SELECT whatsapp_notifications_enabled, whatsapp_phone FROM businesses WHERE id = $1`,
        [businessId]
      );
      
      if (result.rows.length === 0) {
        return { whatsappNotificationsEnabled: false, whatsappPhone: null };
      }
      
      return {
        whatsappNotificationsEnabled: result.rows[0].whatsapp_notifications_enabled || false,
        whatsappPhone: result.rows[0].whatsapp_phone
      };
    } catch (error) {
      console.error('İşletme WhatsApp ayarları alınırken hata:', error);
      return { whatsappNotificationsEnabled: false, whatsappPhone: null };
    }
  }

  /**
   * Kullanıcı telefon numarasını al (üye kullanıcılar için)
   */
  private async getUserPhone(userId: string): Promise<string | null> {
    try {
      const result = await pool.query(
        `SELECT phone FROM users WHERE id = $1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].phone;
    } catch (error) {
      console.error('Kullanıcı telefon numarası alınırken hata:', error);
      return null;
    }
  }

  /**
   * Misafir kullanıcı telefon numarasını al
   */
  private async getGuestPhone(appointmentId: string): Promise<string | null> {
    try {
      const result = await pool.query(
        `SELECT customer_phone FROM appointments WHERE id = $1`,
        [appointmentId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].customer_phone;
    } catch (error) {
      console.error('Misafir kullanıcı telefon numarası alınırken hata:', error);
      return null;
    }
  }

  /**
   * WhatsApp mesajı gönder ve logla
   */
  private async sendWhatsAppMessage(
    phone: string,
    message: string,
    messageType: 'approval' | 'reminder' | 'new_appointment' | 'cancellation',
    businessId: string,
    appointmentId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const twilioService = getTwilioWhatsAppService();
      const result = await twilioService.sendMessage({
        to: formattedPhone,
        message: message,
        messageType: messageType,
        businessId: businessId,
        appointmentId: appointmentId
      });
      
      // Mesajı logla
      await pool.query(
        `INSERT INTO whatsapp_message_logs (phone, message_type, message_content, business_id, appointment_id, status, twilio_message_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          formattedPhone,
          messageType,
          message,
          businessId,
          appointmentId || null,
          result.success ? 'sent' : 'failed',
          result.messageId || null
        ]
      );
      
      return result;
    } catch (error) {
      console.error('WhatsApp mesajı gönderilirken hata:', error);
      
      // Hata durumunu logla
      await pool.query(
        `INSERT INTO whatsapp_message_logs (phone, message_type, message_content, business_id, appointment_id, status, error_message) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          this.formatPhoneNumber(phone),
          messageType,
          message,
          businessId,
          appointmentId || null,
          'failed',
          error instanceof Error ? error.message : 'Bilinmeyen hata'
        ]
      );
      
      return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
    }
  }

  /**
   * Randevu onay bildirimi gönder
   */
  async sendAppointmentApprovalNotification(
    appointmentId: string,
    businessId: string,
    userId: string | null,
    appointmentDateTime: string,
    businessName: string,
    customerName?: string,
    serviceNames?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // İşletme WhatsApp ayarlarını kontrol et
      const businessSettings = await this.getBusinessWhatsAppSettings(businessId);
      if (!businessSettings.whatsappNotificationsEnabled) {
        return { success: true }; // WhatsApp bildirimleri kapalı, başarılı say
      }

      // Telefon numarasını al - üye kullanıcı veya misafir kullanıcı
      let userPhone = null;
      if (userId && userId !== 'guest') {
        // Üye kullanıcı
        userPhone = await this.getUserPhone(userId);
      } else {
        // Misafir kullanıcı
        userPhone = await this.getGuestPhone(appointmentId);
      }
      
      if (!userPhone) {
        return { success: false, error: 'Telefon numarası bulunamadı' };
      }

      // Tarihi formatla
      const appointmentDate = new Date(appointmentDateTime);
      const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const serviceText = serviceNames && serviceNames.length > 0 
        ? `\n\nHizmetler: ${serviceNames.join(', ')}` 
        : '';

      // WhatsApp mesajı oluştur
      const message = `🎉 *Randevunuz Onaylandı!*\n\n` +
        `📅 *Tarih:* ${formattedDate}\n` +
        `🏢 *İşletme:* ${businessName}\n` +
        `👤 *Müşteri:* ${customerName || 'Müşteri'}${serviceText}\n\n` +
        `Randevunuz başarıyla onaylanmıştır. Belirtilen tarih ve saatte işletmeye gelebilirsiniz.`;

      // WhatsApp mesajı gönder
      return await this.sendWhatsAppMessage(
        userPhone,
        message,
        'approval',
        businessId,
        appointmentId
      );
    } catch (error) {
      console.error('Randevu onay bildirimi gönderilirken hata:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
    }
  }

  /**
   * Randevu iptal bildirimi gönder
   */
  async sendAppointmentCancellationNotification(
    appointmentId: string,
    businessId: string,
    userId: string | null,
    appointmentDateTime: string,
    businessName: string,
    customerName?: string,
    serviceNames?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // İşletme WhatsApp ayarlarını kontrol et
      const businessSettings = await this.getBusinessWhatsAppSettings(businessId);
      if (!businessSettings.whatsappNotificationsEnabled) {
        return { success: true }; // WhatsApp bildirimleri kapalı, başarılı say
      }

      // Telefon numarasını al - üye kullanıcı veya misafir kullanıcı
      let userPhone = null;
      if (userId && userId !== 'guest') {
        // Üye kullanıcı
        userPhone = await this.getUserPhone(userId);
      } else {
        // Misafir kullanıcı
        userPhone = await this.getGuestPhone(appointmentId);
      }
      
      if (!userPhone) {
        return { success: false, error: 'Telefon numarası bulunamadı' };
      }

      // Tarihi formatla
      const appointmentDate = new Date(appointmentDateTime);
      const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const serviceText = serviceNames && serviceNames.length > 0 
        ? `\n\nHizmetler: ${serviceNames.join(', ')}` 
        : '';

      // WhatsApp mesajı oluştur
      const message = `❌ *Randevunuz İptal Edildi*\n\n` +
        `📅 *Tarih:* ${formattedDate}\n` +
        `🏢 *İşletme:* ${businessName}\n` +
        `👤 *Müşteri:* ${customerName || 'Müşteri'}${serviceText}\n\n` +
        `Maalesef randevunuz iptal edilmiştir. Yeni bir randevu oluşturmak için tekrar başvurabilirsiniz.`;

      // WhatsApp mesajı gönder
      return await this.sendWhatsAppMessage(
        userPhone,
        message,
        'cancellation',
        businessId,
        appointmentId
      );
    } catch (error) {
      console.error('Randevu iptal bildirimi gönderilirken hata:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
    }
  }

  /**
   * Randevu hatırlatma bildirimi gönder
   */
  async sendAppointmentReminderNotification(
    appointmentId: string,
    businessId: string,
    userId: string | null,
    appointmentDateTime: string,
    businessName: string,
    serviceNames?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // İşletme WhatsApp ayarlarını kontrol et
      const businessSettings = await this.getBusinessWhatsAppSettings(businessId);
      if (!businessSettings.whatsappNotificationsEnabled) {
        return { success: true }; // WhatsApp bildirimleri kapalı, başarılı say
      }

      // Kullanıcı telefon numarasını al
      if (!userId) {
        return { success: false, error: 'Kullanıcı ID bulunamadı' };
      }

      const userPhone = await this.getUserPhone(userId);
      if (!userPhone) {
        return { success: false, error: 'Kullanıcı telefon numarası bulunamadı' };
      }

      // Tarihi formatla
      const appointmentDate = new Date(appointmentDateTime);
      const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const serviceText = serviceNames && serviceNames.length > 0 
        ? `\n\nHizmetler: ${serviceNames.join(', ')}` 
        : '';

      // WhatsApp mesajı oluştur
      const message = `⏰ *Randevu Hatırlatması*\n\n` +
        `📅 *Tarih:* ${formattedDate}\n` +
        `🏢 *İşletme:* ${businessName}${serviceText}\n\n` +
        `Randevunuza 2 saat kaldı! Lütfen belirtilen tarih ve saatte işletmeye gelebilirsiniz.`;

      // WhatsApp mesajı gönder
      return await this.sendWhatsAppMessage(
        userPhone,
        message,
        'reminder',
        businessId,
        appointmentId
      );
    } catch (error) {
      console.error('Randevu hatırlatma bildirimi gönderilirken hata:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
    }
  }

  /**
   * Yeni randevu bildirimi gönder
   */
  async sendNewAppointmentNotification(
    appointmentId: string,
    businessId: string,
    userId: string | null,
    appointmentDateTime: string,
    businessName: string,
    customerName?: string,
    serviceNames?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // İşletme WhatsApp ayarlarını kontrol et
      const businessSettings = await this.getBusinessWhatsAppSettings(businessId);
      if (!businessSettings.whatsappNotificationsEnabled) {
        return { success: true }; // WhatsApp bildirimleri kapalı, başarılı say
      }

      // Telefon numarasını al - üye kullanıcı veya misafir kullanıcı
      let userPhone = null;
      if (userId && userId !== 'guest') {
        // Üye kullanıcı
        userPhone = await this.getUserPhone(userId);
      } else {
        // Misafir kullanıcı
        userPhone = await this.getGuestPhone(appointmentId);
      }
      
      if (!userPhone) {
        return { success: false, error: 'Telefon numarası bulunamadı' };
      }

      // Tarihi formatla
      const appointmentDate = new Date(appointmentDateTime);
      const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const serviceText = serviceNames && serviceNames.length > 0 
        ? `\n\nHizmetler: ${serviceNames.join(', ')}` 
        : '';

      // WhatsApp mesajı oluştur
      const message = `✅ *Randevu Talebiniz Alındı*\n\n` +
        `📅 *Tarih:* ${formattedDate}\n` +
        `🏢 *İşletme:* ${businessName}${serviceText}\n\n` +
        `Randevu talebiniz başarıyla alınmıştır. İşletme onayı beklenmektedir.`;

      // WhatsApp mesajı gönder
      return await this.sendWhatsAppMessage(
        userPhone,
        message,
        'new_appointment',
        businessId,
        appointmentId
      );
    } catch (error) {
      console.error('Yeni randevu bildirimi gönderilirken hata:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
    }
  }
}

export const whatsappNotificationService = new WhatsAppNotificationService();
