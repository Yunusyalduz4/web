#!/bin/bash

# Cron job test script'i
echo "🧪 Cron job test script'i başlatılıyor..."

# Server durumunu kontrol et
echo "📊 PM2 durumu:"
pm2 status

# Cron job'ları manuel başlat
echo "⏰ Cron job'ları manuel başlatılıyor..."
curl -X GET http://localhost:3000/api/startup

# Test hatırlatma gönder
echo "📧 Test hatırlatma gönderiliyor..."
curl -X POST http://localhost:3000/api/cron/test-reminder

# Log'ları kontrol et
echo "📝 Son log'lar:"
pm2 logs randevuo --lines 20

echo "✅ Test tamamlandı!"
