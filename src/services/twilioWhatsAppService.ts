import twilio from 'twilio';

export interface WhatsAppMessage {
  to: string;
  message: string;
  messageType: 'otp' | 'approval' | 'reminder' | 'cancellation' | 'new_appointment';
  businessId?: string;
  appointmentId?: string;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

export class TwilioWhatsAppService {
  private client: twilio.Twilio;
  private config: TwilioConfig;

  constructor() {
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
    };

    if (!this.config.accountSid || !this.config.authToken) {
      throw new Error('Twilio credentials not configured');
    }

    this.client = twilio(this.config.accountSid, this.config.authToken);
  }

  /**
   * Telefon numarasını WhatsApp formatına çevir
   */
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, ''); // Sadece rakamları al
    
    // Türkiye numarası formatı
    if (cleaned.startsWith('0')) {
      cleaned = '90' + cleaned.substring(1); // 0'ı kaldır, 90 ekle
    } else if (!cleaned.startsWith('90')) {
      cleaned = '90' + cleaned; // 90 ekle
    }
    
    return `whatsapp:+${cleaned}`;
  }

  /**
   * WhatsApp mesajı gönder
   */
  async sendMessage(messageData: WhatsAppMessage): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const formattedTo = this.formatPhoneNumber(messageData.to);
      
      console.log(`📱 WhatsApp mesajı gönderiliyor: ${formattedTo}`);
      console.log(`💬 Mesaj: ${messageData.message}`);

      const message = await this.client.messages.create({
        from: this.config.whatsappNumber,
        to: formattedTo,
        body: messageData.message
      });

      console.log(`✅ WhatsApp mesajı gönderildi: ${message.sid}`);

      // Mesaj logunu kaydet
      await this.logMessage({
        phone: messageData.to,
        messageType: messageData.messageType,
        messageContent: messageData.message,
        businessId: messageData.businessId,
        appointmentId: messageData.appointmentId,
        twilioMessageId: message.sid,
        status: 'sent'
      });

      return {
        success: true,
        messageId: message.sid
      };

    } catch (error: any) {
      console.error('❌ WhatsApp mesaj hatası:', error);
      
      // Hata logunu kaydet
      await this.logMessage({
        phone: messageData.to,
        messageType: messageData.messageType,
        messageContent: messageData.message,
        businessId: messageData.businessId,
        appointmentId: messageData.appointmentId,
        status: 'failed',
        errorMessage: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * OTP mesajı gönder
   */
  async sendOTP(phone: string, otpCode: string, businessId?: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const message = `🔐 RANDEVUO Doğrulama Kodu

Merhaba! RANDEVUO randevu sisteminiz için doğrulama kodunuz:

**${otpCode}**

Bu kod 10 dakika geçerlidir. Lütfen kimseyle paylaşmayın.

RANDEVUO Ekibi`;

    return this.sendMessage({
      to: phone,
      message,
      messageType: 'otp',
      businessId
    });
  }

  /**
   * Randevu onay mesajı gönder
   */
  async sendAppointmentApproval(
    phone: string, 
    appointmentData: {
      businessName: string;
      appointmentDate: string;
      appointmentTime: string;
      services: string[];
      employeeName?: string;
    },
    businessId?: string,
    appointmentId?: string
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const servicesText = appointmentData.services.join(', ');
    const employeeText = appointmentData.employeeName ? `\n👤 Personel: ${appointmentData.employeeName}` : '';
    
    const message = `✅ Randevunuz Onaylandı!

🏢 İşletme: ${appointmentData.businessName}
📅 Tarih: ${appointmentData.appointmentDate}
🕐 Saat: ${appointmentData.appointmentTime}${employeeText}
💼 Hizmetler: ${servicesText}

Randevunuz başarıyla onaylanmıştır. Randevu saatinden 15 dakika önce işletmede bulunmanızı rica ederiz.

RANDEVUO Ekibi`;

    return this.sendMessage({
      to: phone,
      message,
      messageType: 'approval',
      businessId,
      appointmentId
    });
  }

  /**
   * Randevu hatırlatma mesajı gönder
   */
  async sendAppointmentReminder(
    phone: string,
    appointmentData: {
      businessName: string;
      appointmentDate: string;
      appointmentTime: string;
      services: string[];
      employeeName?: string;
    },
    businessId?: string,
    appointmentId?: string
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const servicesText = appointmentData.services.join(', ');
    const employeeText = appointmentData.employeeName ? `\n👤 Personel: ${appointmentData.employeeName}` : '';
    
    const message = `⏰ Randevu Hatırlatması

Merhaba! Yarınki randevunuzu hatırlatmak istiyoruz:

🏢 İşletme: ${appointmentData.businessName}
📅 Tarih: ${appointmentData.appointmentDate}
🕐 Saat: ${appointmentData.appointmentTime}${employeeText}
💼 Hizmetler: ${servicesText}

Randevu saatinden 15 dakika önce işletmede bulunmanızı rica ederiz.

RANDEVUO Ekibi`;

    return this.sendMessage({
      to: phone,
      message,
      messageType: 'reminder',
      businessId,
      appointmentId
    });
  }

  /**
   * Mesaj logunu veritabanına kaydet
   */
  private async logMessage(logData: {
    phone: string;
    messageType: string;
    messageContent: string;
    businessId?: string;
    appointmentId?: string;
    twilioMessageId?: string;
    status: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const { pool } = await import('../server/db');
      
      await pool.query(`
        INSERT INTO whatsapp_message_logs (
          phone, message_type, message_content, business_id, 
          appointment_id, twilio_message_id, status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        logData.phone,
        logData.messageType,
        logData.messageContent,
        logData.businessId || null,
        logData.appointmentId || null,
        logData.twilioMessageId || null,
        logData.status,
        logData.errorMessage || null
      ]);
    } catch (error) {
      console.error('Mesaj logu kaydetme hatası:', error);
    }
  }

  /**
   * Twilio hesap durumunu kontrol et
   */
  async checkAccountStatus(): Promise<{
    success: boolean;
    accountStatus?: string;
    error?: string;
  }> {
    try {
      const account = await this.client.api.accounts(this.config.accountSid).fetch();
      
      return {
        success: true,
        accountStatus: account.status
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Randevu onay mesajı oluştur
   */
  createApprovalMessage(customerName: string, businessName: string, appointmentDateTime: Date): string {
    const formattedDate = appointmentDateTime.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Merhaba ${customerName},\n\n${businessName} randevunuz ${formattedDate} tarihinde onaylanmıştır.`;
  }

  /**
   * Randevu hatırlatma mesajı oluştur
   */
  createReminderMessage(customerName: string, businessName: string, appointmentDateTime: Date): string {
    const formattedDate = appointmentDateTime.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Merhaba ${customerName},\n\n${businessName} randevunuz ${formattedDate} tarihinde. Randevunuza 2 saat kaldı.`;
  }
}

// Singleton instance
let twilioWhatsAppServiceInstance: TwilioWhatsAppService | null = null;

export function getTwilioWhatsAppService(): TwilioWhatsAppService {
  if (!twilioWhatsAppServiceInstance) {
    twilioWhatsAppServiceInstance = new TwilioWhatsAppService();
  }
  return twilioWhatsAppServiceInstance;
}
