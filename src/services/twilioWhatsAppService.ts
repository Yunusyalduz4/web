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
  templates: {
    otp: string;
    approval: string;
    reminder: string;
    cancellation?: string;
    newAppointment?: string;
  };
}

export class TwilioWhatsAppService {
  private client: twilio.Twilio;
  private config: TwilioConfig;

  constructor() {
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      templates: {
        otp: process.env.TWILIO_OTP_TEMPLATE_ID || '',
        approval: process.env.TWILIO_APPOINTMENT_APPROVAL_TEMPLATE_ID || '',
        reminder: process.env.TWILIO_APPOINTMENT_REMINDER_TEMPLATE_ID || '',
        cancellation: process.env.TWILIO_APPOINTMENT_CANCELLED_ID || undefined,
        newAppointment: process.env.TWILIO_NEW_APPOINTMENT_TEMPLATE_ID || undefined
      }
    };

    if (!this.config.accountSid || !this.config.authToken) {
      throw new Error('Twilio credentials not configured');
    }

    if (!this.config.templates.otp || !this.config.templates.approval || !this.config.templates.reminder) {
      throw new Error('Twilio template IDs not configured');
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
   * Template ile WhatsApp mesajı gönder
   */
  async sendTemplateMessage(
    to: string,
    templateId: string,
    parameters: string[] = []
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      
      console.log(`📱 Template WhatsApp mesajı gönderiliyor: ${formattedTo}`);
      console.log(`🎯 Template ID: ${templateId}`);
      console.log(`📋 Parametreler: ${parameters.join(', ')}`);

      const message = await this.client.messages.create({
        from: this.config.whatsappNumber,
        to: formattedTo,
        contentSid: templateId,
        contentVariables: JSON.stringify(parameters.reduce((acc, param, index) => {
          acc[index + 1] = param;
          return acc;
        }, {} as Record<string, string>))
      });

      console.log(`✅ Template WhatsApp mesajı gönderildi: ${message.sid}`);

      return {
        success: true,
        messageId: message.sid
      };

    } catch (error: any) {
      console.error('❌ Template WhatsApp mesaj hatası:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * WhatsApp mesajı gönder (template'li veya manuel)
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
   * OTP mesajı gönder (Template'li)
   */
  async sendOTP(phone: string, otpCode: string, businessId?: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Template ile OTP gönder
      const result = await this.sendTemplateMessage(
        phone,
        this.config.templates.otp,
        [otpCode] // Template'deki {{1}} parametresi
      );

      if (result.success) {
        // Mesaj logunu kaydet
        await this.logMessage({
          phone: phone,
          messageType: 'otp',
          messageContent: `OTP Code: ${otpCode}`,
          businessId: businessId,
          status: 'sent',
          twilioMessageId: result.messageId
        });
      } else {
        // Hata logunu kaydet
        await this.logMessage({
          phone: phone,
          messageType: 'otp',
          messageContent: `OTP Code: ${otpCode}`,
          businessId: businessId,
          status: 'failed',
          errorMessage: result.error
        });
      }

      return result;

    } catch (error: any) {
      console.error('❌ OTP mesaj hatası:', error);
      
      // Hata logunu kaydet
      await this.logMessage({
        phone: phone,
        messageType: 'otp',
        messageContent: `OTP Code: ${otpCode}`,
        businessId: businessId,
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
   * Randevu onay mesajı gönder (Template'li)
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
    try {
      // Template parametrelerini hazırla
      const servicesText = appointmentData.services.join(', ');
      const parameters = [
        appointmentData.businessName,
        `${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`,
        servicesText
      ];

      // Template ile onay mesajı gönder
      const result = await this.sendTemplateMessage(
        phone,
        this.config.templates.approval,
        parameters
      );

      if (result.success) {
        // Mesaj logunu kaydet
        await this.logMessage({
          phone: phone,
          messageType: 'approval',
          messageContent: `Approval: ${appointmentData.businessName} - ${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`,
          businessId: businessId,
          appointmentId: appointmentId,
          status: 'sent',
          twilioMessageId: result.messageId
        });
      } else {
        // Hata logunu kaydet
        await this.logMessage({
          phone: phone,
          messageType: 'approval',
          messageContent: `Approval: ${appointmentData.businessName} - ${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`,
          businessId: businessId,
          appointmentId: appointmentId,
          status: 'failed',
          errorMessage: result.error
        });
      }

      return result;

    } catch (error: any) {
      console.error('❌ Randevu onay mesaj hatası:', error);
      
      // Hata logunu kaydet
      await this.logMessage({
        phone: phone,
        messageType: 'approval',
        messageContent: `Approval: ${appointmentData.businessName} - ${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`,
        businessId: businessId,
        appointmentId: appointmentId,
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
   * Randevu hatırlatma mesajı gönder (Template'li)
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
    try {
      // Template parametrelerini hazırla
      const servicesText = appointmentData.services.join(', ');
      const parameters = [
        appointmentData.businessName,
        `${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`,
        servicesText
      ];

      // Template ile hatırlatma mesajı gönder
      const result = await this.sendTemplateMessage(
        phone,
        this.config.templates.reminder,
        parameters
      );

      if (result.success) {
        // Mesaj logunu kaydet
        await this.logMessage({
          phone: phone,
          messageType: 'reminder',
          messageContent: `Reminder: ${appointmentData.businessName} - ${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`,
          businessId: businessId,
          appointmentId: appointmentId,
          status: 'sent',
          twilioMessageId: result.messageId
        });
      } else {
        // Hata logunu kaydet
        await this.logMessage({
          phone: phone,
          messageType: 'reminder',
          messageContent: `Reminder: ${appointmentData.businessName} - ${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`,
          businessId: businessId,
          appointmentId: appointmentId,
          status: 'failed',
          errorMessage: result.error
        });
      }

      return result;

    } catch (error: any) {
      console.error('❌ Randevu hatırlatma mesaj hatası:', error);
      
      // Hata logunu kaydet
      await this.logMessage({
        phone: phone,
        messageType: 'reminder',
        messageContent: `Reminder: ${appointmentData.businessName} - ${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`,
        businessId: businessId,
        appointmentId: appointmentId,
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
