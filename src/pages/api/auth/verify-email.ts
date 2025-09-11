import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Token'ı kontrol et
    const tokenResult = await pool.query(
      'SELECT user_id, expires_at, used_at FROM email_tokens WHERE token = $1 AND type = $2',
      [token, 'verify']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const verifyToken = tokenResult.rows[0];

    // Token kullanılmış mı kontrol et
    if (verifyToken.used_at) {
      return res.status(400).json({ error: 'Token already used' });
    }

    // Token süresi dolmuş mu kontrol et
    if (new Date() > new Date(verifyToken.expires_at)) {
      return res.status(400).json({ error: 'Token expired' });
    }

    // Kullanıcıyı doğrulanmış olarak işaretle (users tablosunda email_verified alanı varsa)
    // await pool.query(
    //   'UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1',
    //   [verifyToken.user_id]
    // );

    // Token'ı kullanıldı olarak işaretle
    await pool.query(
      'UPDATE email_tokens SET used_at = NOW() WHERE token = $1',
      [token]
    );

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
