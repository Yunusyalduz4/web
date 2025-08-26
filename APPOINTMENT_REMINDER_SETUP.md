# Randevu Hatırlatma Sistemi Kurulum Kılavuzu

Bu sistem, randevu oluşturulduğunda otomatik olarak randevu saatinden 2 saat önce push notification hatırlatması gönderir.

## 🚀 Nasıl Çalışır?

1. **Randevu Oluşturma**: Kullanıcı randevu aldığında, `reminder_sent` alanı `false` olarak ayarlanır
2. **Otomatik Kontrol**: Her 15 dakikada bir sistem, 2 saat sonra başlayacak randevuları kontrol eder
3. **Hatırlatma Gönderimi**: Randevu saatinden 2 saat önce kullanıcıya push notification gönderilir
4. **Kayıt Güncelleme**: Hatırlatma gönderildikten sonra `reminder_sent` alanı `true` yapılır

## 📋 Gereksinimler

- `node-cron` paketi (zaten yüklendi)
- PostgreSQL veritabanında `reminder_sent` sütunu (zaten mevcut)
- Push notification sistemi (zaten kurulu)

## ⚙️ Kurulum

### 1. Cron Job Sistemini Başlat

Uygulama başladığında cron job sistemini başlatmak için:

```bash
# API endpoint'i çağır
curl -X POST http://localhost:3000/api/cron/init
```

### 2. Otomatik Başlatma (Önerilen)

Production'da otomatik başlatmak için `src/app/layout.tsx` veya ana component'te:

```typescript
// Client-side'da useEffect ile
useEffect(() => {
  fetch('/api/cron/init', { method: 'POST' });
}, []);
```

## 🧪 Test Etme

### Manuel Test

```bash
# Manuel hatırlatma kontrolü çalıştır
curl -X POST http://localhost:3000/api/cron/test-reminder
```

### Test Senaryoları

1. **Randevu Oluştur**: 2 saat sonrası için randevu al
2. **Bekle**: 2 saat geçmesini bekle
3. **Kontrol Et**: Console'da log'ları kontrol et
4. **Bildirim**: Push notification geldi mi kontrol et

## 📊 Cron Job Zamanlaması

- **Randevu Hatırlatma**: Her 15 dakikada bir (`*/15 * * * *`)
- **Temizlik**: Her gün gece yarısı (`0 0 * * *`)

## 🔧 Konfigürasyon

### Zaman Ayarı

`src/utils/appointmentReminder.ts` dosyasında:

```typescript
// Şu andan 2 saat sonra başlayacak randevuları bul
const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
```

### Bildirim Metni

```typescript
'Randevu Hatırlatması! ⏰',
`${appointment.businessName} adlı işletmedeki ${formattedDate} tarihindeki randevunuz için 2 saat kaldı. Hizmet: ${serviceNamesText}`
```

## 📝 Log'lar

Sistem çalışırken console'da şu log'ları göreceksiniz:

```
Initializing cron jobs...
Cron jobs initialized successfully
Running appointment reminder check...
Found X appointments that need reminders
Reminder sent successfully for appointment [ID]
Reminder sending completed. Success: X, Failed: 0
```

## 🚨 Hata Durumları

### Yaygın Hatalar

1. **Push Notification Hatası**: Kullanıcının push subscription'ı yok
2. **Database Bağlantı Hatası**: Veritabanı bağlantısı kesildi
3. **Cron Job Çakışması**: Birden fazla cron job başlatıldı

### Hata Çözümleri

1. **Push Notification**: Kullanıcının push notification'ı kabul ettiğinden emin ol
2. **Database**: Veritabanı bağlantısını kontrol et
3. **Cron Job**: `stopCronJobs()` çağırıp tekrar başlat

## 🔄 Güncelleme ve Bakım

### Günlük Temizlik

Sistem otomatik olarak 7 günden eski tamamlanmış/iptal edilmiş randevuların `reminder_sent` alanını `false` yapar.

### Manuel Temizlik

```sql
-- Eski hatırlatma kayıtlarını temizle
UPDATE appointments 
SET reminder_sent = false 
WHERE status IN ('completed', 'cancelled') 
  AND appointment_datetime < NOW() - INTERVAL '7 days'
  AND reminder_sent = true;
```

## 📱 Push Notification Formatı

```json
{
  "title": "Randevu Hatırlatması! ⏰",
  "body": "[İşletme Adı] adlı işletmedeki [Tarih] tarihindeki randevunuz için 2 saat kaldı. Hizmet: [Hizmet Adları]",
  "data": {
    "type": "appointment_reminder",
    "appointmentId": "[UUID]",
    "businessId": "[UUID]",
    "appointmentDateTime": "[Formatlanmış Tarih]"
  }
}
```

## ✅ Sistem Durumu Kontrolü

Sistemin çalışıp çalışmadığını kontrol etmek için:

1. Console log'larını kontrol et
2. Database'de `reminder_sent` alanlarını kontrol et
3. Test endpoint'ini çağır
4. Push notification'ları test et

## 🎯 Sonraki Adımlar

- [ ] Email hatırlatması ekle
- [ ] SMS hatırlatması ekle
- [ ] Hatırlatma zamanını kullanıcı tercihine göre ayarla
- [ ] Hatırlatma geçmişi ekle
- [ ] Hatırlatma istatistikleri ekle
