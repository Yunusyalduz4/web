import { NextApiRequest, NextApiResponse } from 'next';
import { getOTPService } from '../../../services/otpService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { otpId, code } = req.body;

    // Validasyon
    if (!otpId) {
      return res.status(400).json({ error: 'OTP ID gerekli' });
    }

    if (!code) {
      return res.status(400).json({ error: 'OTP kodu gerekli' });
    }

    // OTP kodu formatı kontrolü
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'OTP kodu 6 haneli olmalıdır' });
    }

    const otpService = getOTPService();
    
    // OTP doğrula - otpId ile doğrula
    const result = await otpService.verifyOTPByID(otpId, code);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'OTP kodu doğrulandı'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
        attemptsRemaining: result.attemptsRemaining
      });
    }

  } catch (error) {
    console.error('OTP doğrulama hatası:', error);
    return res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
}
