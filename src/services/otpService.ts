import { pool } from '../server/db';
import { getTwilioWhatsAppService } from './twilioWhatsAppService';

export interface OTPVerification {
  id: string;
  phone: string;
  verificationCode: string;
  isVerified: boolean;
  expiresAt: Date;
  createdAt: Date;
  verifiedAt?: Date;
  attempts: number;
  maxAttempts: number;
  userType: string;
  businessId?: string;
}

export class OTPService {
  private twilioService = getTwilioWhatsAppService();

  /**
   * 6 haneli OTP kodu oluştur
   */
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Telefon numarasını temizle ve formatla
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
   * OTP ID ile doğrula (otpId kullanarak)
   */
  async verifyOTPByID(
    otpId: string, 
    code: string
  ): Promise<{ 
    success: boolean; 
    error?: string;
    attemptsRemaining?: number;
  }> {
    try {
      // OTP kaydını bul
      const result = await pool.query(
        `SELECT * FROM phone_verifications 
         WHERE id = $1 AND is_verified = false AND expires_at > now()`,
        [otpId]
      );

      if (result.rows.length === 0) {
        return { 
          success: false, 
          error: 'Geçersiz OTP kodu veya süresi dolmuş.' 
        };
      }

      const otpRecord = result.rows[0];

      // Maksimum deneme sayısını kontrol et
      if (otpRecord.attempts >= otpRecord.max_attempts) {
        return { 
          success: false, 
          error: 'Çok fazla deneme yapıldı. Lütfen yeni bir kod isteyin.' 
        };
      }

      // OTP kodunu kontrol et
      if (otpRecord.verification_code !== code) {
        // Deneme sayısını artır
        const newAttempts = otpRecord.attempts + 1;
        const attemptsRemaining = otpRecord.max_attempts - newAttempts;
        
        await pool.query(
          `UPDATE phone_verifications 
           SET attempts = $1 
           WHERE id = $2`,
          [newAttempts, otpId]
        );

        return { 
          success: false, 
          error: 'Yanlış OTP kodu.',
          attemptsRemaining: attemptsRemaining > 0 ? attemptsRemaining : 0
        };
      }

      // OTP'yi doğrulanmış olarak işaretle
      await pool.query(
        `UPDATE phone_verifications 
         SET is_verified = true, verified_at = now() 
         WHERE id = $1`,
        [otpRecord.id]
      );

      // Telefon numarasını doğrulanmış olarak kaydet
      await pool.query(
        `INSERT INTO verified_phones (phone, business_id, verified_at)
         VALUES ($1, $2, now())
         ON CONFLICT (phone, business_id) 
         DO UPDATE SET 
           verified_at = now(),
           is_active = true,
           last_used_at = now()`,
        [otpRecord.phone, otpRecord.business_id]
      );

      return { success: true };

    } catch (error) {
      console.error('OTP doğrulama hatası:', error);
      return { 
        success: false, 
        error: 'OTP kodu doğrulanırken bir hata oluştu.' 
      };
    }
  }

  /**
   * Telefon numarasının daha önce doğrulanıp doğrulanmadığını kontrol et
   */
  async isPhoneVerified(phone: string, businessId: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const result = await pool.query(
        `SELECT id FROM verified_phones 
         WHERE phone = $1 AND business_id = $2 AND is_active = true`,
        [formattedPhone, businessId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Telefon doğrulama kontrol hatası:', error);
      return false;
    }
  }

  /**
   * Yeni bir OTP kodu oluştur ve gönder
   */
  async createOTP(
    phone: string, 
    businessId: string, 
    userType: string = 'guest_appointment'
  ): Promise<{ 
    success: boolean; 
    otpId?: string; 
    error?: string;
    alreadyVerified?: boolean;
  }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      // Önce telefon numarasının daha önce doğrulanıp doğrulanmadığını kontrol et
      const isVerified = await this.isPhoneVerified(formattedPhone, businessId);
      if (isVerified) {
        return {
          success: true,
          alreadyVerified: true
        };
      }

      const otpCode = this.generateOTPCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika geçerli

      // Mevcut doğrulanmamış OTP'leri temizle
      await pool.query(
        `DELETE FROM phone_verifications 
         WHERE phone = $1 AND business_id = $2 AND is_verified = false AND user_type = $3`,
        [formattedPhone, businessId, userType]
      );

      // Yeni OTP kaydı oluştur
      const result = await pool.query(
        `INSERT INTO phone_verifications (
          phone, verification_code, expires_at, user_type, business_id
        ) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [formattedPhone, otpCode, expiresAt, userType, businessId]
      );

      const otpId = result.rows[0].id;

      // WhatsApp ile OTP kodu gönder
      const whatsappResult = await this.twilioService.sendOTP(
        formattedPhone,
        otpCode,
        businessId
      );

      if (!whatsappResult.success) {
        console.error('WhatsApp OTP mesajı gönderilemedi:', whatsappResult.error);
        return {
          success: false,
          error: 'OTP kodu gönderilemedi'
        };
      }

      console.log(`✅ OTP kodu gönderildi: ${formattedPhone} - ${otpCode}`);

      return {
        success: true,
        otpId
      };

    } catch (error) {
      console.error('OTP oluşturma hatası:', error);
      return {
        success: false,
        error: 'OTP kodu oluşturulurken bir hata oluştu.'
      };
    }
  }

  /**
   * OTP kodunu doğrula
   */
  async verifyOTP(
    phone: string, 
    code: string, 
    businessId: string
  ): Promise<{ 
    success: boolean; 
    error?: string;
    attemptsRemaining?: number;
  }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      // OTP kaydını bul
      const result = await pool.query(
        `SELECT id, verification_code, is_verified, expires_at, attempts, max_attempts
         FROM phone_verifications 
         WHERE phone = $1 AND business_id = $2 AND is_verified = false
         ORDER BY created_at DESC LIMIT 1`,
        [formattedPhone, businessId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Geçersiz OTP kodu veya süresi dolmuş.'
        };
      }

      const otpRecord = result.rows[0];

      // Süre kontrolü
      if (new Date() > new Date(otpRecord.expires_at)) {
        return {
          success: false,
          error: 'OTP kodu süresi dolmuş.'
        };
      }

      // Deneme sayısı kontrolü
      if (otpRecord.attempts >= otpRecord.max_attempts) {
        return {
          success: false,
          error: 'Maksimum deneme sayısına ulaşıldı.'
        };
      }

      // Kod kontrolü
      if (otpRecord.verification_code !== code) {
        // Deneme sayısını artır
        await pool.query(
          `UPDATE phone_verifications 
           SET attempts = attempts + 1 
           WHERE id = $1`,
          [otpRecord.id]
        );

        const attemptsRemaining = otpRecord.max_attempts - (otpRecord.attempts + 1);

        return {
          success: false,
          error: 'Yanlış OTP kodu.',
          attemptsRemaining: attemptsRemaining > 0 ? attemptsRemaining : 0
        };
      }

      // OTP'yi doğrulanmış olarak işaretle
      await pool.query(
        `UPDATE phone_verifications 
         SET is_verified = true, verified_at = now() 
         WHERE id = $1`,
        [otpRecord.id]
      );

      // Telefon numarasını doğrulanmış olarak kaydet
      await pool.query(
        `INSERT INTO verified_phones (phone, business_id, verified_at)
         VALUES ($1, $2, now())
         ON CONFLICT (phone, business_id) 
         DO UPDATE SET 
           is_active = true, 
           last_used_at = now(),
           verified_at = now()`,
        [formattedPhone, businessId]
      );

      console.log(`✅ OTP doğrulandı: ${formattedPhone}`);

      return {
        success: true
      };

    } catch (error) {
      console.error('OTP doğrulama hatası:', error);
      return {
        success: false,
        error: 'OTP doğrulanırken bir hata oluştu.'
      };
    }
  }

  /**
   * Süresi dolmuş OTP'leri temizle
   */
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      await pool.query(
        `DELETE FROM phone_verifications 
         WHERE expires_at < now() AND is_verified = false`
      );
      
      console.log('✅ Süresi dolmuş OTP\'ler temizlendi');
    } catch (error) {
      console.error('OTP temizleme hatası:', error);
    }
  }

  /**
   * Telefon numarasının doğrulama durumunu kontrol et
   */
  async getPhoneVerificationStatus(
    phone: string, 
    businessId: string
  ): Promise<{
    isVerified: boolean;
    verifiedAt?: Date;
    lastUsedAt?: Date;
  }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const result = await pool.query(
        `SELECT verified_at, last_used_at 
         FROM verified_phones 
         WHERE phone = $1 AND business_id = $2 AND is_active = true`,
        [formattedPhone, businessId]
      );

      if (result.rows.length === 0) {
        return { isVerified: false };
      }

      return {
        isVerified: true,
        verifiedAt: result.rows[0].verified_at,
        lastUsedAt: result.rows[0].last_used_at
      };
    } catch (error) {
      console.error('Telefon doğrulama durumu kontrol hatası:', error);
      return { isVerified: false };
    }
  }
}

// Singleton instance
let otpServiceInstance: OTPService | null = null;

export function getOTPService(): OTPService {
  if (!otpServiceInstance) {
    otpServiceInstance = new OTPService();
  }
  return otpServiceInstance;
}
