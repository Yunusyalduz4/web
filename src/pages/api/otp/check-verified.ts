import { NextApiRequest, NextApiResponse } from 'next';
import { getOTPService } from '../../../services/otpService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, businessId } = req.query;

    // Validasyon
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Telefon numarası gerekli' });
    }

    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: 'İşletme ID gerekli' });
    }

    const otpService = getOTPService();
    
    // Telefon doğrulama durumunu kontrol et
    const status = await otpService.getPhoneVerificationStatus(phone, businessId);

    return res.status(200).json({
      success: true,
      isVerified: status.isVerified,
      verifiedAt: status.verifiedAt,
      lastUsedAt: status.lastUsedAt
    });

  } catch (error) {
    console.error('Telefon doğrulama durumu kontrol hatası:', error);
    return res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
}
