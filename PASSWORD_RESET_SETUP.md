# 🔐 Email Tokens Kurulum Rehberi

Bu rehber, KUADO uygulamasında Resend mail servisi ile email token sistemi (şifre sıfırlama, email doğrulama, email değişikliği) özelliğinin nasıl kurulacağını açıklar.

## 📋 Gereksinimler

- Resend hesabı ve API anahtarı
- Randevuo.com domain'i
- PostgreSQL veritabanı

## 🚀 Kurulum Adımları

### 1. Resend Hesabı Oluşturma

1. [resend.com](https://resend.com) adresine gidin
2. Ücretsiz hesap oluşturun
3. API anahtarınızı alın
4. Domain'inizi doğrulayın (randevuo.com)

### 2. Environment Variables Ayarlama

`.env.local` dosyasına aşağıdaki değişkenleri ekleyin:

```env
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Randevuo Domain
RANDEVUO_DOMAIN=randevuo.com

# NextAuth URL (production için)
NEXTAUTH_URL=https://your-app.vercel.app
```

### 3. Database Migration

Email tokens tablosunu oluşturmak için:

```bash
npm run migrate:email-tokens
```

Bu komut aşağıdaki tabloyu oluşturur:
- `email_tokens` - Email token'ları (şifre sıfırlama, doğrulama, email değişikliği)
- Gerekli index'ler

### 4. Test Etme

1. Uygulamayı başlatın: `npm run dev`
2. `/test-password-reset` sayfasına gidin
3. Test email'i ile şifre sıfırlama işlemini test edin

## 📧 Email Template Özelleştirme

Email template'ini özelleştirmek için `src/pages/api/auth/forgot-password.ts` dosyasındaki HTML'i düzenleyin.

### Mevcut Özellikler:
- **Şifre Sıfırlama**: Güvenli token ile şifre sıfırlama
- **Email Doğrulama**: Yeni hesap doğrulama
- **Email Değişikliği**: Güvenli email güncelleme
- Responsive tasarım
- Randevuo branding
- Güvenlik uyarıları
- Türkçe dil desteği

## 🔒 Güvenlik Özellikleri

- **Token Süresi**: 1 saat
- **Tek Kullanım**: Her token sadece bir kez kullanılabilir
- **Otomatik Temizlik**: Süresi dolan token'lar otomatik silinir
- **Rate Limiting**: API seviyesinde rate limiting eklenebilir

## 📱 Kullanıcı Deneyimi

### Email Token Akışları:

#### Şifre Sıfırlama:
1. Kullanıcı `/forgot-password` sayfasına gider
2. Email adresini girer
3. Resend ile email gönderilir
4. Kullanıcı email'deki linke tıklar
5. `/reset-password?token=xxx` sayfasında yeni şifre belirler
6. Başarılı olursa giriş sayfasına yönlendirilir

#### Email Doğrulama:
1. Kullanıcı kayıt olduktan sonra doğrulama email'i alır
2. Email'deki linke tıklar
3. Hesap doğrulanır

#### Email Değişikliği:
1. Kullanıcı profil sayfasından email değiştirir
2. Yeni email'e doğrulama link'i gönderilir
3. Link'e tıklayınca email güncellenir

## 🐛 Sorun Giderme

### Yaygın Hatalar:

1. **"Invalid API key" hatası**
   - RESEND_API_KEY'in doğru olduğundan emin olun
   - Resend hesabınızın aktif olduğunu kontrol edin

2. **"Domain not verified" hatası**
   - Randevuo.com domain'inin Resend'de doğrulandığından emin olun

3. **Email gönderilmiyor**
   - Spam klasörünü kontrol edin
   - Resend dashboard'da email log'larını kontrol edin

### Debug İçin:
- Browser console'da hataları kontrol edin
- Network tab'da API çağrılarını inceleyin
- Resend dashboard'da email durumunu takip edin

## 📊 Monitoring

Resend dashboard'da şu metrikleri takip edebilirsiniz:
- Email gönderim oranı
- Bounce rate
- Spam şikayetleri
- Email açılma oranı

## 🔄 Güncellemeler

Şifre sıfırlama özelliğini güncellemek için:
1. API endpoint'lerini güncelleyin
2. Database şemasını güncelleyin
3. Frontend sayfalarını güncelleyin
4. Test edin

## 🔌 API Endpoint'leri

### Şifre Sıfırlama:
- `POST /api/auth/forgot-password` - Şifre sıfırlama email'i gönder
- `POST /api/auth/reset-password` - Yeni şifre belirle

### Email Doğrulama:
- `POST /api/auth/verify-email` - Email doğrula

### Email Değişikliği:
- `POST /api/auth/change-email` - Email değişikliği isteği
- `POST /api/auth/verify-email-change` - Email değişikliğini onayla

## 📞 Destek

Sorun yaşarsanız:
1. Resend dokümantasyonunu kontrol edin
2. GitHub issues'da sorun bildirin
3. Resend support ile iletişime geçin
