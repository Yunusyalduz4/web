# 🗺️ Google Places Integration Guide

Bu kılavuz, Google Places API entegrasyonu ile Türkiye'deki güzellik salonları, kuaförler ve berberleri otomatik olarak veritabanına çekme sistemini açıklar.

## 📋 İçindekiler

1. [Kurulum](#kurulum)
2. [Veritabanı Migration](#veritabanı-migration)
3. [API Konfigürasyonu](#api-konfigürasyonu)
4. [Kullanım](#kullanım)
5. [Admin Paneli](#admin-paneli)
6. [Monitoring](#monitoring)
7. [Yasal Uyarılar](#yasal-uyarılar)

## 🚀 Kurulum

### 1. Environment Variables

`.env` dosyanıza aşağıdaki değişkenleri ekleyin:

```bash
# Google Places API (Zorunlu)
GOOGLE_PLACES_API_KEY="your-google-places-api-key-here"

# Redis Cache (Opsiyonel)
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# Rate Limiting
GOOGLE_PLACES_RATE_LIMIT_PER_MINUTE=60
GOOGLE_PLACES_RATE_LIMIT_PER_DAY=10000

# Data Fetching Configuration
GOOGLE_PLACES_CACHE_EXPIRY_DAYS=7
GOOGLE_PLACES_SEARCH_RADIUS_METERS=50000
GOOGLE_PLACES_MAX_RESULTS_PER_REQUEST=60
```

### 2. Google Places API Key Alma

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. "APIs & Services" > "Library" bölümüne gidin
4. "Places API" ve "Maps JavaScript API"yi etkinleştirin
5. "Credentials" bölümünden API key oluşturun
6. API key'e gerekli kısıtlamaları ekleyin:
   - HTTP referrers (web sitesi için)
   - IP addresses (server için)

## 🗄️ Veritabanı Migration

Migration scriptini çalıştırın:

```bash
# PostgreSQL'e bağlanın
psql "postgresql://postgres:Test123.@37.148.209.253:5432/kuafor"

# Migration scriptini çalıştırın
\i database_migration_google_places.sql
```

Bu script aşağıdaki tabloları oluşturur/günceller:

- `businesses` tablosuna Google Places alanları ekler
- `google_places_cache` - Geçici veri cache tablosu
- `business_verification_requests` - Doğrulama istekleri
- `google_places_search_logs` - Arama logları

## ⚙️ API Konfigürasyonu

### Google Places Service

```typescript
import { getGooglePlacesService } from '../services/googlePlacesService';

const googlePlacesService = getGooglePlacesService();

// Tek bir yerde arama
const businesses = await googlePlacesService.searchPlaces({
  location: '41.0082,28.9784', // İstanbul
  radius: 5000,
  type: 'beauty_salon',
  language: 'tr',
  region: 'tr',
});

// Detaylı bilgi alma
const placeDetails = await googlePlacesService.getPlaceDetails(placeId);
```

### Turkey Data Fetcher

```typescript
import TurkeyDataFetcher from '../services/turkeyDataFetcher';

const dataFetcher = new TurkeyDataFetcher(googlePlacesService);

// Tüm Türkiye verilerini çek
await dataFetcher.fetchAllTurkeyData();

// Belirli bir şehir için veri çek
await dataFetcher.fetchCityData(ankara);

// Cache'lenmiş verileri işle
await dataFetcher.processCachedData();
```

## 🎯 Kullanım

### 1. Test Çalıştırma

```bash
# Test scriptini çalıştırın
npm run test:google-places
```

### 2. Manuel Veri Çekme

```bash
# Admin paneli üzerinden
curl -X POST http://localhost:3000/api/admin/google-places/fetch-data \
  -H "Content-Type: application/json" \
  -d '{"action": "start_full_fetch"}'

# Belirli şehir için
curl -X POST http://localhost:3000/api/admin/google-places/fetch-data \
  -H "Content-Type: application/json" \
  -d '{"action": "fetch_city", "city": "İstanbul"}'
```

### 3. Cache İşleme

```bash
# Cache'lenmiş verileri işle
curl -X POST http://localhost:3000/api/admin/google-places/fetch-data \
  -H "Content-Type: application/json" \
  -d '{"action": "process_cache"}'
```

## 👨‍💼 Admin Paneli

### API Endpoints

#### Veri Çekme
- `POST /api/admin/google-places/fetch-data` - Veri çekme işlemleri
- `GET /api/admin/google-places/fetch-data?action=get_progress` - İlerleme durumu
- `GET /api/admin/google-places/fetch-data?action=get_stats` - İstatistikler

#### İşletme Yönetimi
- `GET /api/admin/google-places/businesses` - Google Places işletmelerini listele
- `POST /api/admin/google-places/businesses` - Yeni işletme oluştur
- `PUT /api/admin/google-places/businesses?id={id}` - İşletme güncelle
- `DELETE /api/admin/google-places/businesses?id={id}` - İşletme sil

### Örnek Kullanım

```javascript
// İlerleme durumunu kontrol et
const response = await fetch('/api/admin/google-places/fetch-data?action=get_progress');
const progress = await response.json();

console.log(`İlerleme: ${progress.progress.completedCities}/${progress.progress.totalCities}`);
console.log(`Bulunan işletmeler: ${progress.progress.totalBusinesses}`);
```

## 📊 Monitoring

### 1. Cache İstatistikleri

```sql
-- Cache istatistikleri
SELECT 
  COUNT(*) as total_cached,
  COUNT(CASE WHEN expires_at > now() THEN 1 END) as active_cached,
  COUNT(CASE WHEN expires_at < now() THEN 1 END) as expired_cached
FROM google_places_cache;

-- Şehir bazında dağılım
SELECT 
  CASE 
    WHEN raw_data->>'location' IS NOT NULL 
    THEN raw_data->>'location'
    ELSE 'Unknown'
  END as city,
  COUNT(*) as business_count
FROM google_places_cache 
WHERE expires_at > now()
GROUP BY raw_data->>'location'
ORDER BY business_count DESC;
```

### 2. İşletme İstatistikleri

```sql
-- Google Places işletmeleri
SELECT 
  COUNT(*) as total_businesses,
  COUNT(CASE WHEN is_google_verified = true THEN 1 END) as verified_businesses,
  COUNT(CASE WHEN owner_user_id IS NOT NULL THEN 1 END) as claimed_businesses,
  AVG(google_rating) as avg_rating
FROM businesses 
WHERE data_source = 'google_places';
```

### 3. Arama Logları

```sql
-- Son 24 saatteki aramalar
SELECT 
  search_query,
  place_type,
  results_count,
  search_timestamp
FROM google_places_search_logs 
WHERE search_timestamp > now() - interval '24 hours'
ORDER BY search_timestamp DESC;
```

## ⚠️ Yasal Uyarılar

### 1. Google Places API Kısıtlamaları

- **Toplu veri çekme yasaktır** - Google'ın Terms of Service'ine aykırı
- **Rate limiting** - API quota sınırlarına dikkat edin
- **Veri freshness** - Google verileri sürekli güncellenir
- **Görsel kullanımı** - Telif hakkı sorunları olabilir

### 2. Önerilen Yaklaşım

```typescript
// ✅ DOĞRU: Gerçek zamanlı arama
const businesses = await googlePlacesService.searchPlaces({
  location: userLocation,
  radius: 5000,
  type: 'beauty_salon'
});

// ❌ YANLIŞ: Toplu veri çekme ve saklama
// await fetchAllTurkeyBusinesses(); // Bu Google ToS'a aykırı
```

### 3. Alternatif Stratejiler

1. **Hibrit Yaklaşım**: Google Places + Manuel kayıt
2. **İşletme Onayı**: İşletmeler kendi bilgilerini kaydetsin
3. **Cache Stratejisi**: Sadece referans amaçlı cache
4. **Verification Flow**: İşletme sahipleri doğrulama yapsın

## 🔧 Troubleshooting

### Yaygın Sorunlar

1. **API Key Hatası**
   ```
   Error: GOOGLE_PLACES_API_KEY environment variable is required
   ```
   Çözüm: `.env` dosyasında API key'i kontrol edin

2. **Rate Limit Aşımı**
   ```
   Error: Google Places API error: OVER_QUERY_LIMIT
   ```
   Çözüm: Rate limiting ayarlarını kontrol edin

3. **Veritabanı Bağlantı Hatası**
   ```
   Error: Database connection failed
   ```
   Çözüm: `DATABASE_URL` environment variable'ını kontrol edin

### Log Kontrolü

```bash
# Server loglarını kontrol edin
tail -f server.log | grep "Google Places"

# Hata loglarını filtreleyin
tail -f server.log | grep "ERROR.*google"
```

## 📈 Performans Optimizasyonu

### 1. Cache Stratejisi

```typescript
// Cache süresini ayarlayın
const CACHE_EXPIRY_DAYS = 7; // 7 gün

// Otomatik cache temizleme
await dataFetcher.cleanExpiredCache();
```

### 2. Rate Limiting

```typescript
// API istekleri arasında gecikme
const RATE_LIMIT_DELAY = 100; // 100ms

// Günlük quota kontrolü
const DAILY_QUOTA_LIMIT = 10000;
```

### 3. Batch Processing

```typescript
// Toplu işlem için batch size
const BATCH_SIZE = 100;

// Paralel işlem sınırı
const MAX_CONCURRENT_REQUESTS = 5;
```

## 🎯 Sonraki Adımlar

1. **Redis Cache**: Performans için Redis entegrasyonu
2. **WebSocket**: Gerçek zamanlı ilerleme takibi
3. **Admin UI**: Web tabanlı yönetim paneli
4. **Monitoring**: Grafana/Prometheus entegrasyonu
5. **Alerting**: Hata durumlarında bildirim sistemi

## 📞 Destek

Sorunlar için:
- GitHub Issues: [Proje Repository]
- Email: [Destek Email]
- Dokümantasyon: [Wiki Sayfası]

---

**Not**: Bu sistem Google Places API'nin yasal kullanım sınırları içinde tasarlanmıştır. Toplu veri çekme ve saklama işlemleri Google'ın Terms of Service'ine aykırıdır.
