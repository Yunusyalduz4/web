# 🔔 Push Notification Sistemi - Randevu Güncellemeleri

## 📋 Genel Bakış

Randevuo.com'da artık randevu durumu her güncellendiğinde hem müşteriye hem işletmeye otomatik push bildirim gönderiliyor!

## ✨ Yeni Özellikler

### 🔄 Randevu Durumu Güncellemeleri
- **Beklemede** → **Onaylandı** ✅
- **Onaylandı** → **Tamamlandı** ✅  
- **Onaylandı** → **İptal Edildi** ❌
- **Beklemede** → **İptal Edildi** ❌

### 👥 Çift Yönlü Bildirimler
- **Müşteriye**: Randevu durumu değiştiğinde anında bildirim
- **İşletmeye**: Müşteri randevu iptal ettiğinde anında bildirim

## 🏗️ Teknik Altyapı

### 📊 Veritabanı Tabloları

#### `push_subscriptions` (İşletme Bildirimleri)
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, endpoint)
);
```

#### `user_push_subscriptions` (Müşteri Bildirimleri) - YENİ!
```sql
CREATE TABLE user_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);
```

### 🔌 API Endpoint'leri

#### İşletme Bildirimleri
- `POST /api/push/register` - İşletme subscription kaydı
- `POST /api/push/test_dev` - Development test bildirimi

#### Müşteri Bildirimleri - YENİ!
- `POST /api/push/register-user` - Müşteri subscription kaydı
- `POST /api/push/test-user` - Development test bildirimi

### 🛠️ Utility Fonksiyonları

#### `sendNotificationToBusiness(businessId, title, body, data)`
İşletmeye bildirim gönderir.

#### `sendNotificationToUser(userId, title, body, data)` - YENİ!
Müşteriye bildirim gönderir.

#### `sendAppointmentStatusUpdateNotification(...)` - YENİ!
Randevu durumu güncellendiğinde otomatik çift yönlü bildirim gönderir.

## 🚀 Kullanım

### 📱 Müşteri Tarafı
1. Kullanıcı profil sayfasında "Push Bildirimleri" bölümü
2. "Aç" butonuna tıklayarak izin ver
3. Artık randevu güncellemelerinde otomatik bildirim al

### 🏢 İşletme Tarafı
1. İşletme profil sayfasında "Push Bildirimleri" bölümü
2. "Aç" butonuna tıklayarak izin ver
3. Artık randevu güncellemelerinde otomatik bildirim al

## 🔧 Kurulum

### 1. Veritabanı Migration
```bash
node migrate-user-push-subscriptions.js
```

### 2. Environment Variables
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_EMAIL=your_email@domain.com
```

### 3. Service Worker
`/public/sw.js` dosyası otomatik olarak push notification'ları handle eder.

## 📱 Bildirim Örnekleri

### Müşteriye Giden Bildirim
```
📅 Randevu Durumu Güncellendi
✅ İşletme Adı adlı işletmedeki 15.01.2025 14:30 tarihindeki 
randevunuz ⏳ Beklemede durumundan ✅ Onaylandı durumuna güncellendi.
```

### İşletmeye Giden Bildirim
```
📅 Randevu Durumu Güncellendi
Müşteri Adı adlı müşterinin 15.01.2025 14:30 tarihindeki 
randevusu ⏳ Beklemede durumundan ✅ Onaylandı durumuna güncellendi.
```

## 🧪 Test Etme

### Development Ortamında
```bash
# Müşteri bildirimi test
curl -X POST http://localhost:3000/api/push/test-user \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid-here"}'

# İşletme bildirimi test  
curl -X POST http://localhost:3000/api/push/test_dev \
  -H "Content-Type: application/json" \
  -d '{"businessId": "business-uuid-here"}'
```

## 🔒 Güvenlik

- ✅ VAPID key authentication
- ✅ User session validation
- ✅ Business ownership verification
- ✅ Admin role verification
- ✅ Production environment protection

## 📊 Monitoring

### Başarılı Bildirimler
- Toplam gönderilen
- Başarılı gönderimler
- Başarısız gönderimler

### Hata Logları
- Console'da detaylı hata mesajları
- Database connection hataları
- VAPID key hataları

## 🚨 Hata Durumları

### Push Notification Hatası
- Randevu işlemi etkilenmez
- Console'da hata loglanır
- Kullanıcı deneyimi korunur

### Subscription Bulunamadı
- "No subscriptions found" mesajı
- İşlem başarısız olarak işaretlenir
- Database'de subscription kontrol edilir

## 🔮 Gelecek Özellikler

- [ ] Bildirim geçmişi
- [ ] Bildirim tercihleri
- [ ] Ses ve titreşim ayarları
- [ ] Zamanlanmış bildirimler
- [ ] Toplu bildirim gönderimi

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Console loglarını kontrol edin
2. Database bağlantısını test edin
3. VAPID key'leri doğrulayın
4. Service Worker'ın aktif olduğundan emin olun

---

**🎉 Push notification sistemi başarıyla aktif! Artık randevu güncellemelerinde herkes anında haberdar olacak!**
