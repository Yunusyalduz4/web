const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateUserPushSubscriptions() {
  try {
    console.log('🔄 Kullanıcı push subscription tablosu oluşturuluyor...');
    
    // user_push_subscriptions tablosunu oluştur
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_push_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, endpoint)
      );
    `);

    // İndeks oluştur
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_user_id 
      ON user_push_subscriptions (user_id);
    `);

    console.log('✅ user_push_subscriptions tablosu başarıyla oluşturuldu!');
    
    // Mevcut kayıtları kontrol et
    const result = await pool.query('SELECT COUNT(*) FROM user_push_subscriptions');
    console.log(`📊 Toplam kullanıcı subscription sayısı: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration hatası:', error);
  } finally {
    await pool.end();
  }
}

migrateUserPushSubscriptions();
