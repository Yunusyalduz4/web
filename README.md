# 🏢 Kuafor App - Modern Berber Randevu Sistemi

Modern, kullanıcı dostu berber randevu yönetim sistemi. İşletme sahipleri ve müşteriler için kapsamlı bir platform.

## ✨ Özellikler

### 🏪 İşletme Sahipleri İçin
- 📊 **Kapsamlı Analytics Dashboard** - Gelir, randevu, performans analizi
- 👥 **Çalışan Yönetimi** - Çalışan ekleme, düzenleme, performans takibi
- 💇‍♂️ **Hizmet Yönetimi** - Hizmet ekleme, fiyatlandırma, süre ayarlama
- 📅 **Randevu Yönetimi** - Randevu onaylama, iptal etme, durum takibi
- ⭐ **Değerlendirme Sistemi** - Müşteri yorumları ve puanlama
- 🏢 **İşletme Profili** - Detay sayfası düzenleme, fotoğraf yükleme
- 🔔 **Push Bildirimleri** - Yeni randevular için anlık bildirimler

### 👤 Müşteriler İçin
- 🔍 **İşletme Keşfi** - Yakındaki berberleri bulma
- 📅 **Kolay Randevu** - Hızlı ve basit randevu alma
- 📱 **Randevu Takibi** - Randevu geçmişi ve durumu
- ⭐ **Değerlendirme** - Tamamlanan hizmetleri değerlendirme
- 👤 **Profil Yönetimi** - Kişisel bilgi güncelleme
- 🔐 **Şifre Sıfırlama** - Güvenli email ile şifre sıfırlama

## 🛠️ Teknolojiler

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: tRPC, PostgreSQL
- **Authentication**: NextAuth.js
- **Email Service**: Resend
- **Database**: PostgreSQL (Neon)
- **Deployment**: VPS (PM2)
- **UI Components**: Custom components with modern design
- **Push Notifications**: Web Push API, Service Workers

## 🚀 Deployment

### VPS'e Deploy Etme

1. **VPS Kurulumu:**
```bash
# VPS'de gerekli paketleri yükle
sudo apt update
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx
```

2. **Projeyi VPS'e Yükleme:**
```bash
# Proje dosyalarını VPS'e kopyala
git clone <repository-url> /var/www/kuado
cd /var/www/kuado
npm install
```

3. **Environment Variables Ayarlama:**
`.env.local` dosyası oluşturun:

```env
DATABASE_URL=your-postgresql-connection-string
NEXTAUTH_URL=https://randevuo.com
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_APP_URL=https://randevuo.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=your-email@example.com
RESEND_API_KEY=your-resend-api-key
```

4. **PM2 ile Çalıştırma:**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Database Setup

1. **Neon PostgreSQL** (Ücretsiz):
   - [neon.tech](https://neon.tech) üzerinden hesap oluşturun
   - Yeni database oluşturun
   - Connection string'i kopyalayın

2. **Schema Migration:**
```sql
-- src/server/db/schema.sql dosyasındaki SQL'i çalıştırın
```

3. **Email Tokens Tablosu:**
```bash
npm run migrate:email-tokens
```

## 📦 Kurulum

```bash
# Dependencies kurulumu
npm install

# Email tokens tablosu oluşturma
npm run migrate:email-tokens

# Development server başlatma
npm run dev

# Production build
npm run build

# Production server başlatma
npm start
```

## 🔔 Push Notification Kurulumu

### 1. VAPID Anahtarları Oluşturma
```bash
npx web-push generate-vapid-keys
```

### 2. Environment Variables Ayarlama
Oluşturulan anahtarları `.env.local` dosyasına ekleyin:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-key"
VAPID_PRIVATE_KEY="your-private-key"
VAPID_EMAIL="your-email@example.com"
```

### 3. Veritabanı Tablosu
Push notification subscription'ları için gerekli tablo otomatik olarak oluşturulur.

### 4. Kullanım
- İşletme sahipleri profil sayfasından push bildirimlerini aktifleştirebilir
- Yeni randevu alındığında otomatik bildirim gönderilir
- PWA yüklü cihazlarda anlık bildirimler alınır

## 🔧 Environment Variables

`.env.local` dosyası oluşturun:

```env
DATABASE_URL="postgresql://username:password@host:port/database"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-key"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_EMAIL="your-email@example.com"
```

## 📱 Kullanım

### İşletme Sahibi Girişi
1. `/register` sayfasından işletme hesabı oluşturun
2. `/dashboard/business` panelinden işletmenizi yönetin
3. Hizmetler, çalışanlar ve randevuları yönetin

### Müşteri Girişi
1. `/register` sayfasından müşteri hesabı oluşturun
2. `/dashboard/user/businesses` sayfasından berber arayın
3. İstediğiniz hizmet için randevu alın

## 🎨 UI/UX Özellikleri

- **Modern Design**: Glassmorphism, gradient renkler
- **Responsive**: Mobil ve desktop uyumlu
- **Animations**: Smooth geçişler ve hover efektleri
- **Accessibility**: Erişilebilirlik standartlarına uygun
- **Performance**: Optimized loading ve caching

## 📊 Analytics Dashboard

İşletme sahipleri için kapsamlı analitik paneli:
- 📈 Gelir analizi ve trendler
- 👥 Çalışan performans takibi
- 💇‍♂️ Hizmet popülerlik analizi
- 📅 Randevu durumu dağılımı
- 🗓️ Haftalık/aylık grafikler

## 🔒 Güvenlik

- **Authentication**: NextAuth.js ile güvenli giriş
- **Authorization**: Role-based access control
- **SQL Injection**: Parametrik sorgular
- **XSS Protection**: Input validation ve sanitization
- **CSRF Protection**: Built-in CSRF koruması

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

Proje hakkında sorularınız için issue açabilirsiniz.

---

**Kuafor App** - Modern berber randevu sistemi 🏢✂️
