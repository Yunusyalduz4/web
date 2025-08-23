# KUADO Veritabanı Şeması

Bu dosya, Neon PostgreSQL veritabanının tam şemasını içermektedir.

## 📊 Genel Bilgi
- **Toplam Tablo Sayısı:** 25
- **Veritabanı Türü:** PostgreSQL (Neon)
- **Şema:** public

## 🗂️ Tablolar ve Sütunlar

### 1. **appointment_notes** - Randevu Notları
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| appointment_id | uuid | NOT NULL | - | Randevu ID'si |
| note | text | NOT NULL | - | Not metni |
| created_by | uuid | NOT NULL | - | Notu oluşturan kullanıcı |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: appointment_notes_pkey (id)
- FOREIGN KEY: appointment_notes_appointment_id_fkey → appointments.id
- FOREIGN KEY: appointment_notes_created_by_fkey → users.id

**Satır Sayısı:** 0

---

### 2. **appointment_services** - Randevu Hizmetleri
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| appointment_id | uuid | NOT NULL | - | Randevu ID'si |
| service_id | uuid | NOT NULL | - | Hizmet ID'si |
| employee_id | uuid | NOT NULL | - | Çalışan ID'si |
| price | numeric(10,2) | NOT NULL | - | Fiyat |
| duration_minutes | integer | NOT NULL | - | Süre (dakika) |
| created_at | timestamp with time zone | NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: appointment_services_pkey (id)
- FOREIGN KEY: appointment_services_appointment_id_fkey → appointments.id
- FOREIGN KEY: appointment_services_employee_id_fkey → employees.id
- FOREIGN KEY: appointment_services_service_id_fkey → services.id

**Satır Sayısı:** 27

---

### 3. **appointments** - Randevular
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| user_id | uuid | NULL | - | Müşteri kullanıcı ID'si |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| appointment_datetime | timestamp with time zone | NOT NULL | - | Randevu tarihi ve saati |
| status | text | NOT NULL | - | Randevu durumu |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |
| customer_name | text | NULL | - | Müşteri adı |
| customer_phone | text | NULL | - | Müşteri telefonu |
| is_manual | boolean | NULL | false | Manuel oluşturulma |
| notes | text | NULL | - | Notlar |
| reminder_sent | boolean | NULL | false | Hatırlatma gönderildi mi |
| employee_id | uuid | NULL | - | Çalışan ID'si |

**Kısıtlamalar:**
- PRIMARY KEY: appointments_pkey (id)
- FOREIGN KEY: appointments_business_id_fkey → businesses.id
- FOREIGN KEY: appointments_employee_id_fkey → employees.id

**Satır Sayısı:** 29

---

### 4. **audit_logs** - Denetim Kayıtları
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| user_id | uuid | NULL | - | Kullanıcı ID'si |
| action | text | NOT NULL | - | Yapılan işlem |
| details | jsonb | NULL | - | İşlem detayları |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: audit_logs_pkey (id)
- FOREIGN KEY: audit_logs_user_id_fkey → users.id

**Satır Sayısı:** 0

---

### 5. **business_analytics** - İşletme Analitikleri
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| date | date | NOT NULL | - | Tarih |
| total_appointments | integer | NOT NULL | 0 | Toplam randevu sayısı |
| completed_appointments | integer | NOT NULL | 0 | Tamamlanan randevu sayısı |
| cancelled_appointments | integer | NOT NULL | 0 | İptal edilen randevu sayısı |
| total_revenue | numeric(10,2) | NOT NULL | 0 | Toplam gelir |
| total_customers | integer | NOT NULL | 0 | Toplam müşteri sayısı |
| average_rating | numeric(3,2) | NOT NULL | 0 | Ortalama puan |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: business_analytics_pkey (id)
- FOREIGN KEY: business_analytics_business_id_fkey → businesses.id
- UNIQUE: business_analytics_business_id_date_key (business_id, date)

**Satır Sayısı:** 0

---

### 6. **business_availability** - İşletme Müsaitlik Durumu
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| day_of_week | varchar(10) | NOT NULL | - | Haftanın günü |
| start_time | varchar(5) | NOT NULL | - | Başlangıç saati |
| end_time | varchar(5) | NOT NULL | - | Bitiş saati |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: business_availability_pkey (id)
- FOREIGN KEY: business_availability_business_id_fkey → businesses.id

**Satır Sayısı:** 0

---

### 7. **business_categories** - İşletme Kategorileri
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| name | text | NOT NULL | - | Kategori adı |
| description | text | NULL | - | Kategori açıklaması |
| icon | text | NULL | - | Kategori ikonu |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: business_categories_pkey (id)
- UNIQUE: business_categories_name_key (name)

**Satır Sayısı:** 0

---

### 8. **business_category_mapping** - İşletme-Kategori Eşleştirmesi
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| category_id | uuid | NOT NULL | - | Kategori ID'si |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: business_category_mapping_pkey (id)
- FOREIGN KEY: business_category_mapping_business_id_fkey → businesses.id
- FOREIGN KEY: business_category_mapping_category_id_fkey → business_categories.id
- UNIQUE: business_category_mapping_business_id_category_id_key (business_id, category_id)

**Satır Sayısı:** 0

---

### 9. **business_images** - İşletme Görselleri
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| image_url | text | NOT NULL | - | Görsel URL'i |
| image_order | integer | NOT NULL | 0 | Görsel sırası |
| is_active | boolean | NOT NULL | true | Aktif mi |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |
| is_approved | boolean | NULL | false | Onaylandı mı |
| approval_note | text | NULL | - | Onay notu |
| approved_at | timestamp | NULL | - | Onay tarihi |
| approved_by | uuid | NULL | - | Onaylayan kullanıcı |

**Kısıtlamalar:**
- PRIMARY KEY: business_images_pkey (id)
- FOREIGN KEY: business_images_business_id_fkey → businesses.id
- FOREIGN KEY: business_images_approved_by_fkey → users.id

**Satır Sayısı:** 2

---

### 10. **business_photos** - İşletme Fotoğrafları
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| url | text | NOT NULL | - | Fotoğraf URL'i |
| uploaded_at | timestamp with time zone | NULL | now() | Yüklenme tarihi |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: business_photos_pkey (id)
- FOREIGN KEY: business_photos_business_id_fkey → businesses.id

**Satır Sayısı:** 0

---

### 11. **business_ratings** - İşletme Puanları
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| average_service_rating | numeric(3,2) | NOT NULL | 0 | Ortalama hizmet puanı |
| average_employee_rating | numeric(3,2) | NOT NULL | 0 | Ortalama çalışan puanı |
| overall_rating | numeric(3,2) | NOT NULL | 0 | Genel ortalama puan |
| total_reviews | integer | NOT NULL | 0 | Toplam değerlendirme sayısı |
| last_6_months_rating | numeric(3,2) | NOT NULL | 0 | Son 6 ay puanı |
| last_updated | timestamp with time zone | NOT NULL | now() | Son güncelleme |

**Kısıtlamalar:**
- PRIMARY KEY: business_ratings_pkey (id)
- FOREIGN KEY: business_ratings_business_id_fkey → businesses.id
- UNIQUE: business_ratings_business_id_key (business_id)

**Satır Sayısı:** 1

---

### 12. **business_working_hours** - İşletme Çalışma Saatleri
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| day_of_week | integer | NOT NULL | - | Haftanın günü (0-6) |
| start_time | time | NOT NULL | - | Başlangıç saati |
| end_time | time | NOT NULL | - | Bitiş saati |
| is_working_day | boolean | NOT NULL | true | Çalışma günü mü |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: business_working_hours_pkey (id)
- FOREIGN KEY: business_working_hours_business_id_fkey → businesses.id

**Satır Sayısı:** 0

---

### 13. **businesses** - İşletmeler
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| owner_user_id | uuid | NOT NULL | - | Sahip kullanıcı ID'si |
| name | text | NOT NULL | - | İşletme adı |
| description | text | NULL | - | İşletme açıklaması |
| address | text | NOT NULL | - | Adres |
| latitude | double precision | NOT NULL | - | Enlem |
| longitude | double precision | NOT NULL | - | Boylam |
| phone | text | NULL | - | Telefon |
| email | text | NULL | - | E-posta |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |
| profile_image_url | text | NULL | - | Profil görseli URL'i |
| gender_preference | text | NOT NULL | 'both' | Cinsiyet tercihi |
| working_hours_enabled | boolean | NULL | true | Çalışma saatleri aktif mi |
| is_verified | boolean | NULL | false | Doğrulandı mı |
| average_rating | numeric(3,2) | NULL | 0 | Ortalama puan |
| total_reviews | integer | NULL | 0 | Toplam değerlendirme |
| gender_service | varchar(10) | NULL | 'unisex' | Hizmet cinsiyeti |
| is_approved | boolean | NULL | false | Onaylandı mı |
| profile_image_approved | boolean | NULL | false | Profil görseli onaylandı mı |
| approval_note | text | NULL | - | Onay notu |
| approved_at | timestamp with time zone | NULL | - | Onay tarihi |
| approved_by | uuid | NULL | - | Onaylayan kullanıcı |

**Kısıtlamalar:**
- PRIMARY KEY: businesses_pkey (id)
- FOREIGN KEY: businesses_owner_user_id_fkey → users.id
- FOREIGN KEY: businesses_approved_by_fkey → users.id

**Satır Sayısı:** 2

---

### 14. **customer_preferences** - Müşteri Tercihleri
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| user_id | uuid | NOT NULL | - | Kullanıcı ID'si |
| preferred_gender | text | NULL | - | Tercih edilen cinsiyet |
| max_distance_km | integer | NULL | 10 | Maksimum mesafe (km) |
| preferred_services | text[] | NULL | - | Tercih edilen hizmetler |
| notification_preferences | jsonb | NULL | '{}' | Bildirim tercihleri |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: customer_preferences_pkey (id)
- FOREIGN KEY: customer_preferences_user_id_fkey → users.id
- UNIQUE: customer_preferences_user_id_key (user_id)

**Satır Sayısı:** 0

---

### 15. **employee_availability** - Çalışan Müsaitlik Durumu
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| employee_id | uuid | NOT NULL | - | Çalışan ID'si |
| day_of_week | integer | NOT NULL | - | Haftanın günü (0-6) |
| start_time | time | NOT NULL | - | Başlangıç saati |
| end_time | time | NOT NULL | - | Bitiş saati |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: employee_availability_pkey (id)
- FOREIGN KEY: employee_availability_employee_id_fkey → employees.id

**Satır Sayısı:** 6

---

### 16. **employee_ratings** - Çalışan Puanları
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| employee_id | uuid | NOT NULL | - | Çalışan ID'si |
| average_rating | numeric(3,2) | NOT NULL | 0 | Ortalama puan |
| total_reviews | integer | NOT NULL | 0 | Toplam değerlendirme |
| last_updated | timestamp with time zone | NOT NULL | now() | Son güncelleme |

**Kısıtlamalar:**
- PRIMARY KEY: employee_ratings_pkey (id)
- FOREIGN KEY: employee_ratings_employee_id_fkey → employees.id
- UNIQUE: employee_ratings_employee_id_key (employee_id)

**Satır Sayısı:** 1

---

### 17. **employee_services** - Çalışan Hizmetleri
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| employee_id | uuid | NOT NULL | - | Çalışan ID'si |
| service_id | uuid | NOT NULL | - | Hizmet ID'si |
| created_at | timestamp with time zone | NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: employee_services_pkey (id)
- FOREIGN KEY: employee_services_employee_id_fkey → employees.id
- FOREIGN KEY: employee_services_service_id_fkey → services.id
- UNIQUE: employee_services_employee_id_service_id_key (employee_id, service_id)

**Satır Sayısı:** 2

---

### 18. **employees** - Çalışanlar
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| name | text | NOT NULL | - | Çalışan adı |
| email | text | NULL | - | E-posta |
| phone | text | NULL | - | Telefon |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: employees_pkey (id)
- FOREIGN KEY: employees_business_id_fkey → businesses.id

**Satır Sayısı:** 1

---

### 19. **favorites** - Favoriler
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| user_id | uuid | NOT NULL | - | Kullanıcı ID'si |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: favorites_pkey (id)
- FOREIGN KEY: favorites_user_id_fkey → users.id
- FOREIGN KEY: favorites_business_id_fkey → businesses.id
- UNIQUE: favorites_user_id_business_id_key (user_id, business_id)

**Satır Sayısı:** 4

---

### 20. **notifications** - Bildirimler
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| user_id | uuid | NOT NULL | - | Kullanıcı ID'si |
| message | text | NOT NULL | - | Bildirim mesajı |
| read | boolean | NOT NULL | false | Okundu mu |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: notifications_pkey (id)
- FOREIGN KEY: notifications_user_id_fkey → users.id

**Satır Sayısı:** 0

---

### 21. **push_subscriptions** - Push Bildirim Abonelikleri
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| endpoint | text | NOT NULL | - | Push endpoint |
| p256dh | text | NOT NULL | - | P256dh anahtarı |
| auth | text | NOT NULL | - | Auth anahtarı |
| created_at | timestamp with time zone | NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NULL | now() | Güncellenme tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: push_subscriptions_pkey (id)
- FOREIGN KEY: push_subscriptions_business_id_fkey → businesses.id

**Satır Sayısı:** 26

---

### 22. **reviews** - Değerlendirmeler
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| appointment_id | uuid | NOT NULL | - | Randevu ID'si |
| user_id | uuid | NOT NULL | - | Kullanıcı ID'si |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| service_rating | integer | NOT NULL | - | Hizmet puanı |
| employee_rating | integer | NOT NULL | - | Çalışan puanı |
| comment | text | NOT NULL | - | Yorum |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |
| photos | text[] | NOT NULL | '{}' | Fotoğraflar |
| business_reply | text | NULL | - | İşletme cevabı |
| business_reply_at | timestamp | NULL | - | İşletme cevap tarihi |
| is_approved | boolean | NULL | false | Onaylandı mı |
| business_reply_approved | boolean | NULL | false | İşletme cevabı onaylandı mı |
| approval_note | text | NULL | - | Onay notu |
| approved_at | timestamp | NULL | - | Onay tarihi |
| approved_by | uuid | NULL | - | Onaylayan kullanıcı |

**Kısıtlamalar:**
- PRIMARY KEY: reviews_pkey (id)
- FOREIGN KEY: reviews_appointment_id_fkey → appointments.id
- FOREIGN KEY: reviews_user_id_fkey → users.id
- FOREIGN KEY: reviews_business_id_fkey → businesses.id
- FOREIGN KEY: reviews_approved_by_fkey → users.id
- UNIQUE: reviews_appointment_id_key (appointment_id)

**Satır Sayısı:** 4

---

### 23. **service_categories** - Hizmet Kategorileri
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| name | text | NOT NULL | - | Kategori adı |
| description | text | NULL | - | Kategori açıklaması |
| icon | text | NULL | - | Kategori ikonu |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |

**Kısıtlamalar:**
- PRIMARY KEY: service_categories_pkey (id)
- UNIQUE: service_categories_name_key (name)

**Satır Sayısı:** 0

---

### 24. **services** - Hizmetler
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| business_id | uuid | NOT NULL | - | İşletme ID'si |
| name | text | NOT NULL | - | Hizmet adı |
| description | text | NULL | - | Hizmet açıklaması |
| duration_minutes | integer | NOT NULL | - | Süre (dakika) |
| price | numeric(10,2) | NOT NULL | - | Fiyat |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |
| category_id | uuid | NULL | - | Kategori ID'si |

**Kısıtlamalar:**
- PRIMARY KEY: services_pkey (id)
- FOREIGN KEY: services_business_id_fkey → businesses.id
- FOREIGN KEY: services_category_id_fkey → service_categories.id

**Satır Sayısı:** 2

---

### 25. **users** - Kullanıcılar
| Sütun | Tip | Nullable | Varsayılan | Açıklama |
|-------|-----|----------|------------|----------|
| id | uuid | NOT NULL | gen_random_uuid() | Birincil anahtar |
| name | text | NOT NULL | - | Kullanıcı adı |
| email | text | NOT NULL | - | E-posta |
| password_hash | text | NOT NULL | - | Şifre hash'i |
| role | text | NOT NULL | - | Kullanıcı rolü |
| created_at | timestamp with time zone | NOT NULL | now() | Oluşturulma tarihi |
| updated_at | timestamp with time zone | NOT NULL | now() | Güncellenme tarihi |
| phone | text | NULL | - | Telefon |
| address | text | NULL | - | Adres |
| latitude | double precision | NULL | - | Enlem |
| longitude | double precision | NULL | - | Boylam |

**Kısıtlamalar:**
- PRIMARY KEY: users_pkey (id)
- UNIQUE: users_email_key (email)

**Satır Sayısı:** 6

---

## 🔗 Foreign Key İlişkileri

### Ana İlişkiler:
- **users** → **businesses** (owner_user_id)
- **businesses** → **employees** (business_id)
- **businesses** → **services** (business_id)
- **businesses** → **appointments** (business_id)
- **appointments** → **appointment_services** (appointment_id)
- **appointments** → **reviews** (appointment_id)
- **employees** → **employee_services** (employee_id)
- **services** → **employee_services** (service_id)

### Detaylı İlişki Listesi:
1. appointment_notes.appointment_id → appointments.id
2. appointment_notes.created_by → users.id
3. appointment_services.appointment_id → appointments.id
4. appointment_services.employee_id → employees.id
5. appointment_services.service_id → services.id
6. appointments.business_id → businesses.id
7. appointments.employee_id → employees.id
8. audit_logs.user_id → users.id
9. business_analytics.business_id → businesses.id
10. business_availability.business_id → businesses.id
11. business_category_mapping.business_id → businesses.id
12. business_category_mapping.category_id → business_categories.id
13. business_images.approved_by → users.id
14. business_images.business_id → businesses.id
15. business_photos.business_id → businesses.id
16. business_ratings.business_id → businesses.id
17. business_working_hours.business_id → businesses.id
18. businesses.approved_by → users.id
19. businesses.owner_user_id → users.id
20. customer_preferences.user_id → users.id
21. employee_availability.employee_id → employees.id
22. employee_ratings.employee_id → employees.id
23. employee_services.employee_id → employees.id
24. employee_services.service_id → services.id
25. employees.business_id → businesses.id
26. favorites.business_id → businesses.id
27. favorites.user_id → users.id
28. notifications.user_id → users.id
29. push_subscriptions.business_id → businesses.id
30. reviews.appointment_id → appointments.id
31. reviews.approved_by → users.id
32. reviews.business_id → businesses.id
33. reviews.user_id → users.id
34. services.business_id → businesses.id
35. services.category_id → service_categories.id

## 📊 Veri İstatistikleri

### Tablo Bazında Satır Sayıları:
- **appointment_notes**: 0
- **appointment_services**: 27
- **appointments**: 29
- **audit_logs**: 0
- **business_analytics**: 0
- **business_availability**: 0
- **business_categories**: 0
- **business_category_mapping**: 0
- **business_images**: 2
- **business_photos**: 0
- **business_ratings**: 1
- **business_working_hours**: 0
- **businesses**: 2
- **customer_preferences**: 0
- **employee_availability**: 6
- **employee_ratings**: 1
- **employee_services**: 2
- **employees**: 1
- **favorites**: 4
- **notifications**: 0
- **push_subscriptions**: 26
- **reviews**: 4
- **service_categories**: 0
- **services**: 2
- **users**: 6

### Toplam Veri:
- **Toplam Tablo**: 25
- **Toplam Satır**: ~100+
- **En Aktif Tablolar**: appointments, appointment_services, push_subscriptions

## 🎯 Önemli Notlar

1. **UUID Kullanımı**: Tüm tablolarda UUID tipinde birincil anahtarlar kullanılmaktadır
2. **Zaman Damgaları**: Çoğu tabloda created_at ve updated_at alanları bulunmaktadır
3. **Soft Delete**: Bazı tablolarda is_active, is_approved gibi boolean alanlar bulunmaktadır
4. **Çok Dilli Destek**: text[] tipinde array alanlar kullanılmaktadır
5. **JSONB**: Detaylı veri için jsonb tipi kullanılmaktadır
6. **Coğrafi Veri**: latitude/longitude alanları ile konum bilgileri saklanmaktadır

Bu şema, KUADO uygulamasının randevu yönetimi, işletme yönetimi, kullanıcı yönetimi ve değerlendirme sistemlerini destekleyen kapsamlı bir yapıya sahiptir.
