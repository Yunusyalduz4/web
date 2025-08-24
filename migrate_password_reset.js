const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migratePasswordReset() {
  try {
    console.log('🔄 Email tokens tablosu oluşturuluyor...');
    
    // UUID extension'ı aktifleştir
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    console.log('✅ UUID extension aktifleştirildi');
    
    // Email tokens tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('reset', 'verify', 'email_change')),
        new_email TEXT,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, type, token)
      );
    `);
    
    console.log('✅ email_tokens tablosu oluşturuldu');
    
    // Index'ler
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_tokens_user_id ON email_tokens(user_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_tokens_type ON email_tokens(type);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_tokens_expires_at ON email_tokens(expires_at);
    `);
    
    console.log('✅ Index\'ler oluşturuldu');
    
    console.log('🎉 Email tokens migration\'ı tamamlandı!');
    
  } catch (error) {
    console.error('❌ Migration hatası:', error);
  } finally {
    await pool.end();
  }
}

migratePasswordReset();
