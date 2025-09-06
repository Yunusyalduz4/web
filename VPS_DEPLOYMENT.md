# 🚀 VPS Deployment Rehberi - KUADO

Bu rehber, KUADO uygulamasını VPS'e deploy etmek için gerekli adımları içerir.

## 📋 Gereksinimler

- Ubuntu 20.04+ VPS
- Root veya sudo erişimi
- Domain adı (opsiyonel, IP ile de çalışır)
- SSL sertifikası (Let's Encrypt ücretsiz)

## 🔧 VPS Hazırlığı

### 1. VPS'e Bağlan
```bash
ssh root@your-vps-ip
```

### 2. Sistem Güncellemesi
```bash
apt update && apt upgrade -y
```

### 3. Gerekli Paketleri Yükle
```bash
apt install -y nodejs npm nginx certbot python3-certbot-nginx git
```

### 4. Node.js Versiyonunu Kontrol Et
```bash
node --version  # 18+ olmalı
npm --version
```

## 📁 Proje Kurulumu

### 1. Proje Dizini Oluştur
```bash
mkdir -p /var/www/kuado
cd /var/www/kuado
```

### 2. Projeyi Kopyala
```bash
# Git ile
git clone https://github.com/yourusername/kuado.git .

# Veya dosyaları manuel olarak yükle
```

### 3. Dependencies Yükle
```bash
npm install
```

## ⚙️ Environment Variables

### 1. Environment Dosyası Oluştur
```bash
nano .env.local
```

### 2. Aşağıdaki değerleri güncelle:
```env
# VPS URL'iniz
NEXTAUTH_URL=https://randevuo.com
NEXT_PUBLIC_APP_URL=https://randevuo.com

# Database URL (Neon database)
DATABASE_URL=postgresql://username:password@host:port/database

# NextAuth Secret (32 karakter)
NEXTAUTH_SECRET=your_32_character_secret_key_here

# VAPID Keys for Push Notifications (ÖNEMLİ!)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BG1LYEA21rncGSSNwQGDVz2XJf55gexHy0BIeoUhpXrMwcucDVYI6eBVPqVUvT29I__O7crCYqaXEp4ghNirZeY
VAPID_PRIVATE_KEY=gUPRvAKL7-fluM6wBElhnfp9tmj_sEUomCCXamdwlEE
VAPID_EMAIL=mailto:yalduzbey@gmail.com

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Resend API Key
RESEND_API_KEY=your_resend_api_key

# Production ayarları
NODE_ENV=production
VERCEL=0
```

## 🏗️ Build ve Deploy

### 1. Production Build
```bash
npm run build
```

### 2. PM2 ile Uygulamayı Başlat
```bash
# PM2 yükle
npm install -g pm2

# Uygulamayı başlat
pm2 start npm --name "kuado" -- start

# PM2'yi kaydet
pm2 save
pm2 startup
```

## 🌐 Nginx Konfigürasyonu

### 1. Nginx Site Dosyası Oluştur
```bash
nano /etc/nginx/sites-available/kuado
```

### 2. Aşağıdaki konfigürasyonu ekle:
```nginx
server {
    listen 80;
    server_name randevuo.com www.randevuo.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io için özel ayarlar
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Site'ı Aktif Et
```bash
ln -s /etc/nginx/sites-available/kuado /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 🔒 SSL Sertifikası (HTTPS)

### 1. Let's Encrypt ile SSL
```bash
certbot --nginx -d randevuo.com -d www.randevuo.com
```

### 2. Otomatik Yenileme
```bash
crontab -e
# Aşağıdaki satırı ekle:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🐳 Docker ile Deploy (Opsiyonel)

### 1. Docker Yükle
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 2. Docker Compose ile Başlat
```bash
# Environment dosyasını oluştur
cp .env.example .env

# Değerleri güncelle
nano .env

# Uygulamayı başlat
docker-compose up -d
```

## 📊 Monitoring ve Yönetim

### PM2 Komutları
```bash
pm2 status          # Uygulama durumu
pm2 logs kuado      # Logları görüntüle
pm2 restart kuado   # Uygulamayı yeniden başlat
pm2 stop kuado      # Uygulamayı durdur
pm2 delete kuado    # Uygulamayı sil
```

### Nginx Komutları
```bash
nginx -t            # Konfigürasyonu test et
systemctl reload nginx  # Nginx'i yeniden yükle
systemctl status nginx  # Nginx durumu
```

## 🔧 Sorun Giderme

### 1. Port Kontrolü
```bash
netstat -tlnp | grep :3000
```

### 2. Firewall Ayarları
```bash
ufw allow 80
ufw allow 443
ufw allow 3000
ufw enable
```

### 3. Log Kontrolü
```bash
# PM2 logları
pm2 logs kuado

# Nginx logları
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Sistem logları
journalctl -u nginx
```

## 🚀 Otomatik Deploy Script

Deploy script'ini kullanmak için:
```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

## 📝 Önemli Notlar

1. **Domain Adı**: `randevuo.com` domain'i kullanılıyor
2. **SSL**: HTTPS kullanmanız önerilir
3. **Database**: Neon database URL'inizi doğru şekilde ayarlayın
4. **Secrets**: Güçlü secret key'ler oluşturun
5. **Monitoring**: PM2 ve Nginx loglarını düzenli kontrol edin

## 🆘 Yardım

Sorun yaşarsanız:
1. Logları kontrol edin
2. Port'ların açık olduğundan emin olun
3. Environment variables'ları kontrol edin
4. Nginx konfigürasyonunu test edin

---

**Başarılı deployment! 🎉**
Uygulamanız artık VPS'de çalışıyor: `https://randevuo.com`
