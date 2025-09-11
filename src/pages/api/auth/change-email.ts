import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, newEmail } = req.body;

    if (!userId || !newEmail) {
      return res.status(400).json({ error: 'User ID and new email are required' });
    }

    // Yeni email'in başka kullanıcı tarafından kullanılıp kullanılmadığını kontrol et
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [newEmail, userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Eski token'ları temizle
    await pool.query(
      'DELETE FROM email_tokens WHERE user_id = $1 AND type = $2 OR expires_at < NOW()',
      [userId, 'email_change']
    );

    // Yeni token oluştur
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    // Token'ı veritabanına kaydet
    await pool.query(
      'INSERT INTO email_tokens (user_id, token, type, new_email, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, token, 'email_change', newEmail, expiresAt]
    );

    // Doğrulama link'i oluştur
    const verifyLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify-email-change?token=${token}`;

    // Email gönder
    await resend.emails.send({
      from: `${process.env.RANDEVUO_DOMAIN || 'Randevuo'} <noreply@${process.env.RANDEVUO_DOMAIN || 'randevuo.com'}>`,
      to: [newEmail],
      subject: 'Email Değişikliği Onayı',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e11d48;">Email Değişikliği Onayı</h2>
          <p>Merhaba,</p>
          <p>Email adresinizi değiştirmek için aşağıdaki bağlantıya tıklayın:</p>
          <p style="margin: 20px 0;">
            <a href="${verifyLink}" style="background: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Email Değişikliğini Onayla
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

    res.status(200).json({ message: 'Email change verification sent' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
