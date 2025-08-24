# 📧 Email Tokens Sistemi - Özet

## 🎯 Genel Bakış

KUADO uygulamasında kullanılan email token sistemi, kullanıcı güvenliği ve hesap yönetimi için tasarlanmıştır. Bu sistem üç ana işlevi destekler:

1. **Şifre Sıfırlama** (`reset`)
2. **Email Doğrulama** (`verify`) 
3. **Email Değişikliği** (`email_change`)

## 🗄️ Veritabanı Yapısı

### `email_tokens` Tablosu

```sql
CREATE TABLE email_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('reset', 'verify', 'email_change')),
    new_email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, type, token)
);
```

### Özellikler:
- **UUID**: Benzersiz tanımlayıcı
- **user_id**: Kullanıcı referansı
- **token**: Güvenlik token'ı (32 karakter hex)
- **type**: Token türü (reset/verify/email_change)
- **new_email**: Email değişikliği için yeni adres
- **expires_at**: Token son kullanma tarihi (1 saat)
- **used_at**: Kullanım tarihi (NULL = kullanılmamış)
- **created_at**: Oluşturulma tarihi

## 🔐 Güvenlik Özellikleri

- **Token Süresi**: 1 saat
- **Tek Kullanım**: Her token sadece bir kez kullanılabilir
- **Tip Bazlı**: Her token türü ayrı ayrı yönetilir
- **Otomatik Temizlik**: Süresi dolan token'lar otomatik silinir
- **Benzersizlik**: user_id + type + token kombinasyonu benzersiz

## 📱 API Endpoint'leri

### 1. Şifre Sıfırlama
```
POST /api/auth/forgot-password
Body: { "email": "user@example.com" }
```

```
POST /api/auth/reset-password  
Body: { "token": "abc123...", "password": "newpass" }
```

### 2. Email Doğrulama
```
POST /api/auth/verify-email
Body: { "token": "abc123..." }
```

### 3. Email Değişikliği
```
POST /api/auth/change-email
Body: { "userId": "uuid", "newEmail": "new@example.com" }
```

```
POST /api/auth/verify-email-change
Body: { "token": "abc123..." }
```

## 🔄 İş Akışları

### Şifre Sıfırlama:
1. Kullanıcı email girer
2. Sistem kullanıcıyı kontrol eder
3. Eski token'lar temizlenir
4. Yeni token oluşturulur ve kaydedilir
5. Resend ile email gönderilir
6. Kullanıcı link'e tıklar
7. Yeni şifre belirlenir
8. Token kullanıldı olarak işaretlenir

### Email Değişikliği:
1. Kullanıcı yeni email girer
2. Sistem email benzersizliğini kontrol eder
3. Token oluşturulur ve new_email ile kaydedilir
4. Yeni email'e doğrulama link'i gönderilir
5. Kullanıcı link'e tıklar
6. Email güncellenir
7. Token kullanıldı olarak işaretlenir

## 📧 Email Template'leri

### Ortak Özellikler:
- Responsive tasarım
- Randevuo branding
- Güvenlik uyarıları
- Türkçe dil desteği
- 1 saat süre uyarısı

### Özelleştirme:
- `RANDEVUO_DOMAIN` environment variable
- Dinamik kullanıcı adı
- Özelleştirilebilir buton metinleri
- Marka renkleri (rose-600)

## 🛠️ Kurulum

### 1. Dependencies
```bash
npm install resend
```

### 2. Environment Variables
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RANDEVUO_DOMAIN=randevuo.com
NEXTAUTH_URL=https://your-app.vercel.app
```

### 3. Database Migration
```bash
npm run migrate:email-tokens
```

## 📊 Monitoring ve Debug

### Resend Dashboard:
- Email gönderim oranı
- Bounce rate
- Spam şikayetleri
- Email açılma oranı

### Log'lar:
- API çağrıları
- Database işlemleri
- Email gönderim durumu
- Hata mesajları

## 🔮 Gelecek Geliştirmeler

- Rate limiting
- IP bazlı kısıtlamalar
- Daha gelişmiş email template'leri
- SMS entegrasyonu
- 2FA desteği
- Audit logging

## 📚 Faydalı Linkler

- [Resend Dokümantasyonu](https://resend.com/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [PostgreSQL UUID](https://www.postgresql.org/docs/current/datatype-uuid.html)
- [KUADO Projesi](https://github.com/your-repo/kuado)
