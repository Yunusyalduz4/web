import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY || 're_test123');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Kullanıcıyı kontrol et
    const userResult = await pool.query(
      'SELECT id, name FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Güvenlik için kullanıcı bulunamadı mesajı verme
      return res.status(200).json({ message: 'Şifre sıfırlama bağlantısı gönderildi' });
    }

    const user = userResult.rows[0];

    // Eski token'ları temizle
    await pool.query(
      'DELETE FROM email_tokens WHERE user_id = $1 AND type = $2 OR expires_at < NOW()',
      [user.id, 'reset']
    );

    // Yeni token oluştur
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    // Token'ı veritabanına kaydet
    await pool.query(
      'INSERT INTO email_tokens (user_id, token, type, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, token, 'reset', expiresAt]
    );

    // Reset link'i oluştur
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // Email gönder
    await resend.emails.send({
      from: `${process.env.RANDEVUO_DOMAIN || 'Randevuo'} <noreply@${process.env.RANDEVUO_DOMAIN || 'randevuo.com'}>`,
      to: [email],
      subject: 'Şifre Sıfırlama',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e11d48;">Şifre Sıfırlama</h2>
          <p>Merhaba ${user.name},</p>
          <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
          <p style="margin: 20px 0;">
            <a href="${resetLink}" style="background: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Şifremi Sıfırla
            </a>
          </p>
          <p>Bu bağlantı 1 saat sonra geçersiz olacaktır.</p>
          <p>Eğer bu isteği siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Bu email ${process.env.RANDEVUO_DOMAIN || 'Randevuo'} uygulamasından gönderilmiştir.
          </p>
        </div>
      `
    });

    res.status(200).json({ message: 'Şifre sıfırlama bağlantısı gönderildi' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
