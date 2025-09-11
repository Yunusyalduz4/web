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
      'SELECT user_id, new_email, expires_at, used_at FROM email_tokens WHERE token = $1 AND type = $2',
      [token, 'email_change']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const changeToken = tokenResult.rows[0];

    // Token kullanılmış mı kontrol et
    if (changeToken.used_at) {
      return res.status(400).json({ error: 'Token already used' });
    }

    // Token süresi dolmuş mu kontrol et
    if (new Date() > new Date(changeToken.expires_at)) {
      return res.status(400).json({ error: 'Token expired' });
    }

    // Email'i güncelle
    await pool.query(
      'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
      [changeToken.new_email, changeToken.user_id]
    );

    // Token'ı kullanıldı olarak işaretle
    await pool.query(
      'UPDATE email_tokens SET used_at = NOW() WHERE token = $1',
      [token]
    );

    res.status(200).json({ message: 'Email changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
