import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import bcrypt from 'bcrypt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Token'ı kontrol et
    const tokenResult = await pool.query(
      'SELECT user_id, expires_at, used_at FROM email_tokens WHERE token = $1 AND type = $2',
      [token, 'reset']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const resetToken = tokenResult.rows[0];

    // Token kullanılmış mı kontrol et
    if (resetToken.used_at) {
      return res.status(400).json({ error: 'Token already used' });
    }

    // Token süresi dolmuş mu kontrol et
    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({ error: 'Token expired' });
    }

    // Yeni şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 12);

    // Şifreyi güncelle
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );

    // Token'ı kullanıldı olarak işaretle
    await pool.query(
      'UPDATE email_tokens SET used_at = NOW() WHERE token = $1',
      [token]
    );

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
