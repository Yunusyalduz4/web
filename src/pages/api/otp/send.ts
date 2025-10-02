import { NextApiRequest, NextApiResponse } from 'next';
import { getOTPService } from '../../../services/otpService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, businessId, userType = 'guest_appointment' } = req.body;

    // Validasyon
    if (!phone) {
      return res.status(400).json({ error: 'Telefon numarası gerekli' });
    }

    if (!businessId) {
      return res.status(400).json({ error: 'İşletme ID gerekli' });
    }

    // Telefon numarası formatı kontrolü
    const phoneRegex = /^(\+90|90|0)?[5][0-9]{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Geçersiz telefon numarası formatı' });
    }

    const otpService = getOTPService();
    
    // OTP oluştur ve gönder
    const result = await otpService.createOTP(phone, businessId, userType);

    if (result.success) {
      if (result.alreadyVerified) {
        return res.status(200).json({
          success: true,
          message: 'Telefon numarası zaten doğrulanmış',
          alreadyVerified: true
        });
      }

      return res.status(200).json({
        success: true,
        message: 'OTP kodu gönderildi',
        otpId: result.otpId
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('OTP gönderme hatası:', error);
    return res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
}
