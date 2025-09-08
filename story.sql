-- ==============================================
-- HİKAYE PAYLAŞIMI SİSTEMİ - VERİTABANI YAPISI
-- ==============================================

-- 1. ANA HİKAYELER TABLOSU
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    media_size INTEGER, -- bytes cinsinden dosya boyutu
    media_duration INTEGER, -- video için saniye cinsinden süre
    caption TEXT, -- hikaye açıklaması (max 200 karakter)
    background_color VARCHAR(7) DEFAULT '#000000', -- hex renk kodu
    text_color VARCHAR(7) DEFAULT '#FFFFFF', -- metin rengi
    font_family VARCHAR(50) DEFAULT 'Arial', -- font ailesi
    font_size INTEGER DEFAULT 16, -- font boyutu
    text_position VARCHAR(20) DEFAULT 'center', -- metin pozisyonu (top, center, bottom)
    filter_type VARCHAR(30) DEFAULT 'none', -- uygulanan filtre (none, vintage, black_white, sepia, etc.)
    is_highlighted BOOLEAN DEFAULT FALSE, -- öne çıkarılmış hikaye
    is_pinned BOOLEAN DEFAULT FALSE, -- sabitlenmiş hikaye
    view_count INTEGER DEFAULT 0, -- toplam görüntülenme sayısı
    like_count INTEGER DEFAULT 0, -- toplam beğeni sayısı
    comment_count INTEGER DEFAULT 0, -- toplam yorum sayısı
    share_count INTEGER DEFAULT 0, -- toplam paylaşım sayısı
    is_active BOOLEAN DEFAULT TRUE, -- aktif hikaye
    is_archived BOOLEAN DEFAULT FALSE, -- arşivlenmiş hikaye
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 24 saat sonra otomatik silinecek
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. HİKAYE GÖRÜNTÜLEME GEÇMİŞİ
CREATE TABLE IF NOT EXISTS story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_duration INTEGER, -- saniye cinsinden görüntülenme süresi
    device_type VARCHAR(20), -- mobile, tablet, desktop
    ip_address INET, -- güvenlik için IP adresi
    user_agent TEXT, -- tarayıcı bilgisi
    UNIQUE(story_id, user_id) -- aynı kullanıcı aynı hikayeyi birden fazla kez görüntüleyemez
);

-- 3. HİKAYE BEĞENİLERİ
CREATE TABLE IF NOT EXISTS story_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, user_id) -- aynı kullanıcı aynı hikayeyi birden fazla kez beğenemez
);

-- 4. HİKAYE YORUMLARI
CREATE TABLE IF NOT EXISTS story_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL CHECK (LENGTH(comment) <= 200), -- max 200 karakter
    is_approved BOOLEAN DEFAULT TRUE, -- yorum onay durumu
    is_edited BOOLEAN DEFAULT FALSE, -- düzenlenmiş yorum
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. HİKAYE PAYLAŞIMLARI
CREATE TABLE IF NOT EXISTS story_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('internal', 'external', 'copy_link')),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    external_platform VARCHAR(30), -- whatsapp, instagram, facebook, etc.
    share_message TEXT -- paylaşım mesajı
);

-- 6. HİKAYE ETİKETLERİ (HASHTAG SİSTEMİ)
CREATE TABLE IF NOT EXISTS story_hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    hashtag VARCHAR(50) NOT NULL CHECK (LENGTH(hashtag) >= 2 AND LENGTH(hashtag) <= 50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, hashtag) -- aynı hikayede aynı hashtag birden fazla kez kullanılamaz
);

-- 7. HİKAYE MENTION'LARI (@kullanıcı_adı)
CREATE TABLE IF NOT EXISTS story_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, mentioned_user_id) -- aynı hikayede aynı kullanıcı birden fazla kez mention edilemez
);

-- 8. HİKAYE İSTATİSTİKLERİ (GÜNLÜK ÖZET)
CREATE TABLE IF NOT EXISTS story_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    story_date DATE NOT NULL,
    total_stories INTEGER DEFAULT 0, -- o gün paylaşılan toplam hikaye sayısı
    total_views INTEGER DEFAULT 0, -- o gün toplam görüntülenme
    total_likes INTEGER DEFAULT 0, -- o gün toplam beğeni
    total_comments INTEGER DEFAULT 0, -- o gün toplam yorum
    total_shares INTEGER DEFAULT 0, -- o gün toplam paylaşım
    unique_viewers INTEGER DEFAULT 0, -- o gün benzersiz görüntüleyici sayısı
    avg_view_duration DECIMAL(5,2) DEFAULT 0, -- ortalama görüntülenme süresi (saniye)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, story_date) -- aynı işletme için aynı gün sadece bir kayıt
);

-- 9. HİKAYE RAPORLARI (ŞİKAYET SİSTEMİ)
CREATE TABLE IF NOT EXISTS story_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_reason VARCHAR(50) NOT NULL CHECK (report_reason IN ('spam', 'inappropriate', 'harassment', 'violence', 'fake', 'other')),
    report_description TEXT, -- detaylı açıklama
    is_resolved BOOLEAN DEFAULT FALSE, -- çözüldü mü
    resolved_by UUID REFERENCES users(id), -- çözen admin
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, reporter_user_id) -- aynı kullanıcı aynı hikayeyi birden fazla kez rapor edemez
);

-- 10. HİKAYE ARŞİVİ (SİLİNEN HİKAYELER)
CREATE TABLE IF NOT EXISTS story_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_story_id UUID NOT NULL, -- orijinal hikaye ID'si
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(10) NOT NULL,
    caption TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE, -- orijinal oluşturulma tarihi
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- arşivlenme tarihi
    archive_reason VARCHAR(50) NOT NULL CHECK (archive_reason IN ('expired', 'deleted', 'reported', 'admin_removed'))
);

-- ==============================================
-- İNDEXLER (PERFORMANS İÇİN)
-- ==============================================

-- Stories tablosu için indexler
CREATE INDEX IF NOT EXISTS idx_stories_business_id ON stories(business_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_is_active ON stories(is_active);
CREATE INDEX IF NOT EXISTS idx_stories_is_highlighted ON stories(is_highlighted);
CREATE INDEX IF NOT EXISTS idx_stories_media_type ON stories(media_type);
CREATE INDEX IF NOT EXISTS idx_stories_business_active ON stories(business_id, is_active);

-- Story views tablosu için indexler
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_user_id ON story_views(user_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewed_at ON story_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_views_story_user ON story_views(story_id, user_id);

-- Story likes tablosu için indexler
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user_id ON story_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_story_user ON story_likes(story_id, user_id);

-- Story comments tablosu için indexler
CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_user_id ON story_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_created_at ON story_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_comments_is_approved ON story_comments(is_approved);

-- Story shares tablosu için indexler
CREATE INDEX IF NOT EXISTS idx_story_shares_story_id ON story_shares(story_id);
CREATE INDEX IF NOT EXISTS idx_story_shares_user_id ON story_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_story_shares_shared_at ON story_shares(shared_at DESC);

-- Story hashtags tablosu için indexler
CREATE INDEX IF NOT EXISTS idx_story_hashtags_story_id ON story_hashtags(story_id);
CREATE INDEX IF NOT EXISTS idx_story_hashtags_hashtag ON story_hashtags(hashtag);
CREATE INDEX IF NOT EXISTS idx_story_hashtags_hashtag_lower ON story_hashtags(LOWER(hashtag));

-- Story mentions tablosu için indexler
CREATE INDEX IF NOT EXISTS idx_story_mentions_story_id ON story_mentions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_mentions_mentioned_user ON story_mentions(mentioned_user_id);

-- Story daily stats tablosu için indexler
CREATE INDEX IF NOT EXISTS idx_story_daily_stats_business_id ON story_daily_stats(business_id);
CREATE INDEX IF NOT EXISTS idx_story_daily_stats_story_date ON story_daily_stats(story_date DESC);
CREATE INDEX IF NOT EXISTS idx_story_daily_stats_business_date ON story_daily_stats(business_id, story_date);

-- Story reports tablosu için indexler
CREATE INDEX IF NOT EXISTS idx_story_reports_story_id ON story_reports(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reports_reporter ON story_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_story_reports_is_resolved ON story_reports(is_resolved);

-- Story archive tablosu için indexler
CREATE INDEX IF NOT EXISTS idx_story_archive_business_id ON story_archive(business_id);
CREATE INDEX IF NOT EXISTS idx_story_archive_archived_at ON story_archive(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_archive_archive_reason ON story_archive(archive_reason);

-- ==============================================
-- TRİGGER'LAR (OTOMATİK GÜNCELLEMELER)
-- ==============================================

-- Hikaye beğenildiğinde like_count'u güncelle
CREATE OR REPLACE FUNCTION update_story_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE stories SET like_count = like_count + 1 WHERE id = NEW.story_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE stories SET like_count = like_count - 1 WHERE id = OLD.story_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_story_like_count
    AFTER INSERT OR DELETE ON story_likes
    FOR EACH ROW EXECUTE FUNCTION update_story_like_count();

-- Hikaye yorumlandığında comment_count'u güncelle
CREATE OR REPLACE FUNCTION update_story_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE stories SET comment_count = comment_count + 1 WHERE id = NEW.story_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE stories SET comment_count = comment_count - 1 WHERE id = OLD.story_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_story_comment_count
    AFTER INSERT OR DELETE ON story_comments
    FOR EACH ROW EXECUTE FUNCTION update_story_comment_count();

-- Hikaye paylaşıldığında share_count'u güncelle
CREATE OR REPLACE FUNCTION update_story_share_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE stories SET share_count = share_count + 1 WHERE id = NEW.story_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE stories SET share_count = share_count - 1 WHERE id = OLD.story_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_story_share_count
    AFTER INSERT OR DELETE ON story_shares
    FOR EACH ROW EXECUTE FUNCTION update_story_share_count();

-- Hikaye görüntülendiğinde view_count'u güncelle
CREATE OR REPLACE FUNCTION update_story_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stories SET view_count = view_count + 1 WHERE id = NEW.story_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_story_view_count
    AFTER INSERT ON story_views
    FOR EACH ROW EXECUTE FUNCTION update_story_view_count();

-- Hikaye oluşturulduğunda updated_at'i güncelle
CREATE OR REPLACE FUNCTION update_story_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_story_updated_at
    BEFORE UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION update_story_updated_at();

-- ==============================================
-- FONKSİYONLAR (YARDIMCI FONKSİYONLAR)
-- ==============================================

-- Süresi dolmuş hikayeleri arşivle
CREATE OR REPLACE FUNCTION archive_expired_stories()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER := 0;
    story_record RECORD;
BEGIN
    -- Süresi dolmuş hikayeleri bul
    FOR story_record IN 
        SELECT * FROM stories 
        WHERE expires_at < NOW() AND is_active = TRUE
    LOOP
        -- Arşive taşı
        INSERT INTO story_archive (
            original_story_id, business_id, media_url, media_type, 
            caption, view_count, like_count, comment_count, share_count,
            created_at, archive_reason
        ) VALUES (
            story_record.id, story_record.business_id, story_record.media_url,
            story_record.media_type, story_record.caption, story_record.view_count,
            story_record.like_count, story_record.comment_count, story_record.share_count,
            story_record.created_at, 'expired'
        );
        
        -- Orijinal kaydı sil
        DELETE FROM stories WHERE id = story_record.id;
        
        archived_count := archived_count + 1;
    END LOOP;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Günlük istatistikleri güncelle
CREATE OR REPLACE FUNCTION update_daily_story_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    business_record RECORD;
BEGIN
    -- Her işletme için günlük istatistikleri hesapla
    FOR business_record IN 
        SELECT DISTINCT business_id FROM stories 
        WHERE DATE(created_at) = target_date
    LOOP
        INSERT INTO story_daily_stats (
            business_id, story_date, total_stories, total_views, 
            total_likes, total_comments, total_shares, unique_viewers
        )
        SELECT 
            business_record.business_id,
            target_date,
            COUNT(s.id) as total_stories,
            COALESCE(SUM(s.view_count), 0) as total_views,
            COALESCE(SUM(s.like_count), 0) as total_likes,
            COALESCE(SUM(s.comment_count), 0) as total_comments,
            COALESCE(SUM(s.share_count), 0) as total_shares,
            COUNT(DISTINCT sv.user_id) as unique_viewers
        FROM stories s
        LEFT JOIN story_views sv ON s.id = sv.story_id
        WHERE s.business_id = business_record.business_id 
        AND DATE(s.created_at) = target_date
        ON CONFLICT (business_id, story_date) 
        DO UPDATE SET
            total_stories = EXCLUDED.total_stories,
            total_views = EXCLUDED.total_views,
            total_likes = EXCLUDED.total_likes,
            total_comments = EXCLUDED.total_comments,
            total_shares = EXCLUDED.total_shares,
            unique_viewers = EXCLUDED.unique_viewers,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- CRON JOB (OTOMATİK TEMİZLİK)
-- ==============================================

-- Her saat başı süresi dolmuş hikayeleri arşivle
-- Bu fonksiyonu cron job olarak çalıştırın:
-- SELECT archive_expired_stories();

-- Her gün gece yarısı günlük istatistikleri güncelle
-- Bu fonksiyonu cron job olarak çalıştırın:
-- SELECT update_daily_story_stats();

-- ==============================================
-- ÖRNEK SORGULAR (TEST İÇİN)
-- ==============================================

-- Bir işletmenin aktif hikayelerini getir
-- SELECT * FROM stories WHERE business_id = 'business-uuid' AND is_active = TRUE ORDER BY created_at DESC;

-- Bir hikayenin detaylı istatistiklerini getir
-- SELECT 
--     s.*,
--     COUNT(DISTINCT sv.user_id) as unique_viewers,
--     COUNT(DISTINCT sl.user_id) as unique_likers,
--     COUNT(DISTINCT sc.user_id) as unique_commenters
-- FROM stories s
-- LEFT JOIN story_views sv ON s.id = sv.story_id
-- LEFT JOIN story_likes sl ON s.id = sl.story_id
-- LEFT JOIN story_comments sc ON s.id = sc.story_id
-- WHERE s.id = 'story-uuid'
-- GROUP BY s.id;

-- En popüler hikayeleri getir
-- SELECT s.*, b.name as business_name
-- FROM stories s
-- JOIN businesses b ON s.business_id = b.id
-- WHERE s.is_active = TRUE
-- ORDER BY s.view_count DESC, s.like_count DESC
-- LIMIT 20;

-- ==============================================
-- VERİTABANI YAPISI TAMAMLANDI
-- ==============================================