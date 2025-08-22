# Local Storage Özellikleri

Bu proje, kullanıcı deneyimini iyileştirmek için local storage kullanarak giriş bilgilerini hatırlama özelliği eklenmiştir.

## 🚀 Eklenen Özellikler

### 1. "Beni Hatırla" Sistemi
- **Login Sayfası**: Kullanıcılar "Beni Hatırla" checkbox'ını işaretleyerek giriş bilgilerini kaydedebilir
- **Register Sayfası**: Yeni kayıt olan kullanıcılar da "Beni Hatırla" seçeneğini kullanabilir
- **Otomatik Doldurma**: Bir sonraki girişte email ve şifre otomatik olarak doldurulur

### 2. Güvenli Logout
- **Otomatik Temizleme**: Logout yapıldığında local storage'dan tüm bilgiler otomatik olarak temizlenir
- **Güvenlik**: Kullanıcı bilgileri güvenli bir şekilde saklanır ve yönetilir

### 3. Hem Müşteri Hem İşletme Desteği
- **Müşteri Profili**: `/dashboard/user/profile` sayfasında logout butonu
- **İşletme Profili**: `/dashboard/business/profile` sayfasında logout butonu
- **Tutarlı Deneyim**: Her iki kullanıcı türü için aynı local storage sistemi

## 🔧 Teknik Detaylar

### Kullanılan Hook'lar
- `useLocalStorage`: Genel local storage yönetimi
- `useUserCredentials`: Kullanıcı bilgileri için özel hook

### Dosya Yapısı
```
src/
├── hooks/
│   └── useLocalStorage.ts          # Local storage hook'ları
├── utils/
│   └── authUtils.ts                # Logout ve auth utility'leri
├── app/
│   ├── login/
│   │   └── page.tsx                # Güncellenmiş login sayfası
│   └── register/
│       └── page.tsx                # Güncellenmiş register sayfası
└── dashboard/
    ├── user/
    │   └── profile/
    │       └── page.tsx            # Güncellenmiş user profile
    └── business/
        └── profile/
            └── page.tsx            # Güncellenmiş business profile
```

## 📱 Kullanım

### Giriş Yaparken
1. Email ve şifre girin
2. "Beni Hatırla" checkbox'ını işaretleyin
3. Giriş yapın
4. Bilgileriniz local storage'a kaydedilir

### Sonraki Girişlerde
1. Login sayfasına gidin
2. Email ve şifre otomatik olarak doldurulur
3. Direkt giriş yapabilirsiniz

### Bilgileri Temizlemek
- Login sayfasında "Bilgileri Temizle" butonuna tıklayın
- Veya logout yapın (otomatik temizlenir)

## 🛡️ Güvenlik

- **Şifreleme**: Local storage'da şifreler plain text olarak saklanır (güvenlik için ek şifreleme eklenebilir)
- **Otomatik Temizleme**: Logout sırasında tüm bilgiler otomatik olarak silinir
- **Hata Yönetimi**: Local storage işlemlerinde hata durumları güvenli şekilde yönetilir

## 🔄 Gelecek Geliştirmeler

- [ ] Şifre şifreleme (encryption)
- [ ] Otomatik logout (belirli süre sonra)
- [ ] Çoklu hesap desteği
- [ ] Biyometrik kimlik doğrulama entegrasyonu

## 📝 Notlar

- Local storage sadece aynı domain'de çalışır
- Tarayıcı verilerini temizlemek bilgileri silebilir
- Private/incognito modda local storage çalışmayabilir
