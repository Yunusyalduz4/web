# Kuaför Uygulaması - Gelişmiş Kayıt Sistemi Kurulumu

## 🚀 Yeni Özellikler

### 📝 Gelişmiş Kayıt Formu
- **2 Adımlı Kayıt Süreci**: Temel bilgiler + Rol bazlı detay bilgiler
- **İşletme Kaydı**: İşletme adı, açıklama, telefon, e-posta, konum
- **Müşteri Kaydı**: Telefon, adres, konum bilgileri
- **Harita Entegrasyonu**: Google Maps ile konum seçimi ve adres otomatik çözümleme

### 🗺️ Konum Sistemi
- Google Maps API entegrasyonu
- Haritadan tıklayarak konum seçimi
- Otomatik adres çözümleme (reverse geocoding)
- Enlem/boylam koordinatları kaydetme

## 🔧 Kurulum Adımları

### 1. Google Maps API Key Alın
1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. "APIs & Services" > "Library" bölümüne gidin
4. Aşağıdaki API'leri etkinleştirin:
   - Maps JavaScript API
   - Geocoding API
   - Places API
5. "APIs & Services" > "Credentials" bölümüne gidin
6. "Create Credentials" > "API Key" seçin
7. API key'inizi kopyalayın

### 2. Environment Variables Ayarlayın
Proje ana dizininde `.env.local` dosyası oluşturun:

```env
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# NextAuth Secret
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 3. Database Migration Çalıştırın
Mevcut database'inizi güncellemek için migration script'ini çalıştırın:

```sql
-- PostgreSQL'de migration.sql dosyasını çalıştırın
psql -d your_database_name -f migration.sql
```

Veya manuel olarak şu SQL komutlarını çalıştırın:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
```

### 4. Uygulamayı Çalıştırın
```bash
npm run dev
```

## 📋 Kayıt Süreci

### Müşteri Kaydı
1. **Adım 1**: Temel bilgiler (ad, e-posta, şifre, hesap türü)
2. **Adım 2**: Kişisel bilgiler (telefon, adres, konum)

### İşletme Kaydı
1. **Adım 1**: Temel bilgiler (ad, e-posta, şifre, hesap türü)
2. **Adım 2**: İşletme bilgileri (işletme adı, açıklama, telefon, e-posta, konum)

## 🗺️ Konum Seçimi
- Haritada istediğiniz yere tıklayın
- Sistem otomatik olarak adres bilgisini çözer
- Enlem/boylam koordinatları kaydedilir
- Adres bilgisi Türkçe olarak görüntülenir

## 🔒 Güvenlik
- Şifreler bcrypt ile hashlenir
- API key'ler environment variables'da saklanır
- Form validasyonu client ve server tarafında yapılır

## 🎨 UI/UX Özellikleri
- Modern ve responsive tasarım
- Step indicator ile ilerleme gösterimi
- Loading states ve error handling
- Smooth animations ve transitions
- Accessibility desteği

## 🐛 Sorun Giderme

### Harita Yüklenmiyor
- Google Maps API key'inizin doğru olduğundan emin olun
- API'lerin etkinleştirildiğini kontrol edin
- Billing'in açık olduğunu kontrol edin

### Konum Seçilemiyor
- Tarayıcınızın konum erişimine izin verdiğinden emin olun
- İnternet bağlantınızı kontrol edin

### Kayıt Başarısız
- Tüm zorunlu alanların doldurulduğundan emin olun
- E-posta formatının doğru olduğunu kontrol edin
- Şifrelerin eşleştiğini kontrol edin
- Database migration'ının çalıştırıldığından emin olun

### 500 Internal Server Error
- Database migration script'ini çalıştırın
- PostgreSQL bağlantısını kontrol edin
- Console'da detaylı hata mesajlarını kontrol edin

### Google Maps Performance Warning
- Bu warning normaldir ve uygulamanın çalışmasını etkilemez
- Libraries array'i static olarak tanımlandı 