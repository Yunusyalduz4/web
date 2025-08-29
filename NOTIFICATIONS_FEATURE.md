# 🔔 Bildirimler Sistemi - KUADO

## 📋 Genel Bakış

KUADO uygulamasında hem müşteri hem de işletme kullanıcıları için kapsamlı bir bildirim sistemi oluşturuldu. Kullanıcılar sağ üst köşedeki bildirim ikonuna tıklayarak tüm bildirimlerini görüntüleyebilir.

## ✨ Özellikler

### 🔔 Bildirimler Butonu
- **Konum**: Sağ üst köşe (header'da)
- **Görünüm**: Zil ikonu + okunmamış bildirim sayısı badge'i
- **Animasyon**: Okunmamış bildirimler için pulse animasyonu
- **Hover**: Beyaz arka plan efekti

### 📱 Bildirimler Modal
- **Tasarım**: Modern, minimal tasarım
- **İçerik**: Bildirim listesi, okundu işaretleme, tümünü okundu işaretleme
- **Tip**: Randevu, değerlendirme, sistem, hatırlatma
- **Durum**: Okundu/okunmadı göstergesi
- **Zaman**: Göreceli zaman gösterimi (az önce, 2 saat önce, dün)

### 👥 Çift Kullanıcı Desteği
- **Müşteri**: Randevu güncellemeleri, sistem bildirimleri
- **İşletme**: Yeni randevu talepleri, randevu durumu güncellemeleri

## 🏗️ Teknik Altyapı

### 📊 Veritabanı
```sql
-- notifications tablosu
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    type TEXT -- 'appointment', 'review', 'system', 'reminder'
);
```

### 🔌 API Endpoint'leri
- `GET /api/notifications` - Bildirimleri getir
- `PUT /api/notifications/[id]/read` - Bildirimi okundu işaretle
- `PUT /api/notifications/mark-all-read` - Tümünü okundu işaretle
- `POST /api/notifications/test` - Test bildirimi ekle

### 🧩 Bileşenler
- `NotificationsButton.tsx` - Bildirimler butonu
- `NotificationsModal.tsx` - Bildirimler modal'ı
- Layout'larda header olarak entegre edildi

## 🚀 Kullanım

### 📱 Müşteri Tarafı
1. Dashboard'da sağ üst köşede bildirim ikonu
2. Tıklayınca bildirimler modal'ı açılır
3. Okunmamış bildirimler mavi arka planla gösterilir
4. Bildirime tıklayarak okundu işaretleyebilir
5. "Tümünü okundu işaretle" ile toplu işlem

### 🏢 İşletme Tarafı
1. İşletme dashboard'ında sağ üst köşede bildirim ikonu
2. Aynı modal yapısı, işletme bildirimleri
3. Randevu talepleri, durum güncellemeleri

### 🧪 Test Etme
1. `/test-notifications` sayfasına git
2. Kullanıcı tipini seç (müşteri/işletme)
3. Test mesajı yaz
4. Bildirim tipini seç
5. "Test Bildirimi Ekle" butonuna tıkla
6. Dashboard'da bildirimler butonuna tıkla
7. Yeni bildirimi gör

## 🎨 Tasarım Özellikleri

### 🎯 Minimal Tasarım
- Soft renkler ve gölgeler
- Temiz tipografi
- Responsive layout
- Smooth animasyonlar

### 🌈 Renk Paleti
- **Primary**: Mavi tonları (#3B82F6)
- **Success**: Yeşil (#10B981)
- **Warning**: Turuncu (#F59E0B)
- **Error**: Kırmızı (#EF4444)
- **Neutral**: Gri tonları

### 📱 Responsive
- Mobile-first tasarım
- Tablet ve desktop uyumlu
- Touch-friendly butonlar

## 🔧 Kurulum

### 1. Gerekli Paketler
```bash
npm install lucide-react
```

### 2. Veritabanı
```bash
# notifications tablosu otomatik oluşturulur
# Mevcut schema'da zaten var
```

### 3. Bileşen Entegrasyonu
```tsx
// Layout'larda otomatik olarak eklenir
import NotificationsButton from '../../../components/NotificationsButton';

// Kullanım
<NotificationsButton userType="user" />
```

## 📊 Bildirim Tipleri

### 🕐 Randevu Bildirimleri
- **Icon**: 🕐 Clock
- **Renk**: Mavi (#3B82F6)
- **Örnek**: "Randevunuz onaylandı"

### ✅ Değerlendirme Bildirimleri
- **Icon**: ✅ Check
- **Renk**: Yeşil (#10B981)
- **Örnek**: "Yeni değerlendirme alındı"

### ⚠️ Hatırlatma Bildirimleri
- **Icon**: ⚠️ AlertCircle
- **Renk**: Turuncu (#F59E0B)
- **Örnek**: "Yarın randevunuz var"

### 🔔 Sistem Bildirimleri
- **Icon**: 🔔 Bell
- **Renk**: Gri (#6B7280)
- **Örnek**: "Hoş geldiniz"

## 🔄 Otomatik Entegrasyon

### 📅 Randevu Sistemi
- Randevu durumu güncellendiğinde otomatik bildirim
- Hem push notification hem veritabanı kaydı
- Gerçek zamanlı güncelleme

### 🔔 Push Notifications
- Mevcut push notification sistemi ile entegre
- Bildirimler veritabanına da kaydedilir
- Çift yönlü bildirim desteği

## 🚨 Hata Yönetimi

### 📝 Loglama
- Console'da detaylı hata mesajları
- API hataları loglanır
- Veritabanı hataları yakalanır

### 🛡️ Güvenlik
- Session kontrolü
- User ID doğrulama
- CSRF koruması

## 🔮 Gelecek Özellikler

- [ ] Bildirim tercihleri
- [ ] Ses ve titreşim ayarları
- [ ] Zamanlanmış bildirimler
- [ ] Toplu bildirim gönderimi
- [ ] Bildirim geçmişi filtreleme
- [ ] Export/import bildirimler

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Console loglarını kontrol edin
2. Network tab'ında API çağrılarını inceleyin
3. Veritabanı bağlantısını test edin
4. Test sayfasını kullanarak debug edin

---

**🎉 Bildirimler sistemi başarıyla aktif! Artık kullanıcılar tüm bildirimlerini tek yerden yönetebilir!**
