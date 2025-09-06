#!/bin/bash

# VPS Deployment Script for KUADO
# Bu script'i VPS'inizde çalıştırın

echo "🚀 KUADO VPS Deployment başlatılıyor..."

# Gerekli paketleri yükle
echo "📦 Gerekli paketler yükleniyor..."
sudo apt update
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx

# Node.js versiyonunu kontrol et
echo "🔍 Node.js versiyonu: $(node --version)"
echo "🔍 NPM versiyonu: $(npm --version)"

# Proje dizinine git
cd /var/www/kuado || { echo "❌ Proje dizini bulunamadı!"; exit 1; }

# Dependencies yükle
echo "📦 Dependencies yükleniyor..."
npm install

# Environment variables ayarla
echo "⚙️ Environment variables ayarlanıyor..."
cat > .env.local << EOF
# VPS Environment Variables - Randevuo.com
NEXTAUTH_URL=https://randevuo.com
NEXT_PUBLIC_APP_URL=https://randevuo.com
DATABASE_URL=your_database_url_here
NEXTAUTH_SECRET=your_nextauth_secret_here

# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BG1LYEA21rncGSSNwQGDVz2XJf55gexHy0BIeoUhpXrMwcucDVYI6eBVPqVUvT29I__O7crCYqaXEp4ghNirZeY
VAPID_PRIVATE_KEY=gUPRvAKL7-fluM6wBElhnfp9tmj_sEUomCCXamdwlEE
VAPID_EMAIL=mailto:yalduzbey@gmail.com

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
RESEND_API_KEY=your_resend_api_key
VERCEL=0
EOF

echo "⚠️  Lütfen .env.local dosyasındaki değerleri güncelleyin!"

# Production build
echo "🏗️ Production build oluşturuluyor..."
npm run build

# PM2 ile uygulamayı başlat
echo "🔄 PM2 ile uygulama başlatılıyor..."
npm install -g pm2
pm2 start npm --name "kuado" -- start
pm2 save
pm2 startup

# Nginx konfigürasyonu
echo "🌐 Nginx konfigürasyonu oluşturuluyor..."
sudo tee /etc/nginx/sites-available/kuado << EOF
server {
    listen 80;
    server_name randevuo.com www.randevuo.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Socket.io için özel ayarlar
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Nginx site'ı aktif et
sudo ln -s /etc/nginx/sites-available/kuado /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL sertifikası (Let's Encrypt)
echo "🔒 SSL sertifikası oluşturuluyor..."
echo "⚠️  SSL sertifikası oluşturmak için şu komutu çalıştırın:"
echo "sudo certbot --nginx -d randevuo.com -d www.randevuo.com"

echo "✅ VPS deployment tamamlandı!"
echo "🌐 Uygulamanız: https://randevuo.com"
echo "📊 PM2 durumu: pm2 status"
echo "📝 Loglar: pm2 logs kuado"
