// ==============================================
// HİKAYE YARDIMCI FONKSİYONLARI
// ==============================================

import { Story, StoryStatus, StoryStatusInfo, MediaUploadOptions, MediaUploadResult } from '../types/story';

// ==============================================
// HİKAYE DURUMU FONKSİYONLARI
// ==============================================

/**
 * Hikayenin süresi dolmuş mu kontrol eder
 */
export const isStoryExpired = (createdAt: Date | string): boolean => {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  const storyAge = now.getTime() - created.getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000; // 24 saat milisaniye cinsinden
  return storyAge > twentyFourHours;
};

/**
 * Hikayenin kalan süresini hesaplar (milisaniye cinsinden)
 */
export const getStoryTimeRemaining = (createdAt: Date | string): number => {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  const storyAge = now.getTime() - created.getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const remaining = twentyFourHours - storyAge;
  return Math.max(0, remaining);
};

/**
 * Hikayenin durum bilgilerini döndürür
 */
export const getStoryStatus = (story: Story): StoryStatusInfo => {
  const isExpired = isStoryExpired(story.created_at);
  const timeRemaining = getStoryTimeRemaining(story.created_at);
  
  let status: StoryStatus;
  if (story.is_archived) {
    status = 'archived';
  } else if (!story.is_active) {
    status = 'deleted';
  } else if (isExpired) {
    status = 'expired';
  } else {
    status = 'active';
  }

  return {
    status,
    isExpired,
    timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
    canEdit: status === 'active' && !isExpired,
    canDelete: status === 'active' || status === 'expired',
    canView: status === 'active' && !isExpired
  };
};

/**
 * Hikayenin kalan süresini formatlar (örn: "2 saat 30 dakika")
 */
export const formatTimeRemaining = (timeRemaining: number): string => {
  if (timeRemaining <= 0) return 'Süresi doldu';
  
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours} saat ${minutes} dakika`;
  } else if (minutes > 0) {
    return `${minutes} dakika ${seconds} saniye`;
  } else {
    return `${seconds} saniye`;
  }
};

// ==============================================
// HİKAYE FİLTRELEME FONKSİYONLARI
// ==============================================

/**
 * Aktif hikayeleri filtreler (süresi dolmamış)
 */
export const filterActiveStories = (stories: Story[]): Story[] => {
  return stories.filter(story => {
    const status = getStoryStatus(story);
    return status.canView;
  });
};

/**
 * Hikayeleri tarihe göre sıralar
 */
export const sortStoriesByDate = (stories: Story[], ascending: boolean = false): Story[] => {
  return [...stories].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

/**
 * Hikayeleri etkileşim sayısına göre sıralar
 */
export const sortStoriesByEngagement = (stories: Story[]): Story[] => {
  return [...stories].sort((a, b) => {
    const engagementA = a.view_count + a.like_count + a.comment_count + a.share_count;
    const engagementB = b.view_count + b.like_count + b.comment_count + b.share_count;
    return engagementB - engagementA;
  });
};

// ==============================================
// HİKAYE İSTATİSTİK FONKSİYONLARI
// ==============================================

/**
 * Hikayenin etkileşim oranını hesaplar
 */
export const calculateEngagementRate = (story: Story): number => {
  const totalInteractions = story.view_count + story.like_count + story.comment_count + story.share_count;
  const engagementRate = story.view_count > 0 ? (totalInteractions / story.view_count) * 100 : 0;
  return Math.round(engagementRate * 100) / 100; // 2 ondalık basamak
};

/**
 * Hikayelerin toplam istatistiklerini hesaplar
 */
export const calculateTotalStats = (stories: Story[]) => {
  return stories.reduce((acc, story) => {
    acc.totalStories += 1;
    acc.totalViews += story.view_count;
    acc.totalLikes += story.like_count;
    acc.totalComments += story.comment_count;
    acc.totalShares += story.share_count;
    return acc;
  }, {
    totalStories: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0
  });
};

/**
 * En popüler hikayeleri bulur
 */
export const getTopStories = (stories: Story[], limit: number = 10): Story[] => {
  return sortStoriesByEngagement(stories).slice(0, limit);
};

// ==============================================
// MEDYA YÜKLEME FONKSİYONLARI
// ==============================================

/**
 * Dosya boyutunu kontrol eder
 */
export const validateFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

/**
 * Dosya tipini kontrol eder
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * Resim boyutlarını kontrol eder
 */
export const validateImageDimensions = (
  file: File, 
  maxWidth: number, 
  maxHeight: number
): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.width <= maxWidth && img.height <= maxHeight);
    };
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Video süresini kontrol eder
 */
export const validateVideoDuration = (
  file: File, 
  maxDuration: number
): Promise<boolean> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve(video.duration <= maxDuration);
    };
    video.onerror = () => resolve(false);
    video.src = URL.createObjectURL(file);
  });
};

/**
 * Medya dosyasını sıkıştırır
 */
export const compressMedia = async (
  file: File, 
  options: MediaUploadOptions
): Promise<File> => {
  if (file.type.startsWith('image/')) {
    return compressImage(file, options);
  } else if (file.type.startsWith('video/')) {
    return compressVideo(file, options);
  }
  return file;
};

/**
 * Resmi sıkıştırır
 */
const compressImage = async (
  file: File, 
  options: MediaUploadOptions
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Boyutları hesapla
      let { width, height } = img;
      const maxWidth = options.maxWidth || 1080;
      const maxHeight = options.maxHeight || 1920;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Resmi çiz
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Canvas'ı blob'a çevir
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, file.type, options.quality ? options.quality / 100 : 0.8);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Videoyu sıkıştırır (basit implementasyon)
 */
const compressVideo = async (
  file: File, 
  options: MediaUploadOptions
): Promise<File> => {
  // Video sıkıştırma için daha gelişmiş bir kütüphane gerekebilir
  // Şimdilik orijinal dosyayı döndürüyoruz
  return file;
};

// ==============================================
// HİKAYE FORMATLAMA FONKSİYONLARI
// ==============================================

/**
 * Hashtag'leri metinden çıkarır
 */
export const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#[\w\u00c0-\u017f\u0100-\u017f\u0180-\u024f\u1e00-\u1eff]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
};

/**
 * Mention'ları metinden çıkarır
 */
export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@[\w\u00c0-\u017f\u0100-\u017f\u0180-\u024f\u1e00-\u1eff]+/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(mention => mention.substring(1)) : [];
};

/**
 * Metni hashtag ve mention'larla birlikte formatlar
 */
export const formatStoryText = (text: string): string => {
  let formatted = text;
  
  // Hashtag'leri linkle
  formatted = formatted.replace(/#[\w\u00c0-\u017f\u0100-\u017f\u0180-\u024f\u1e00-\u1eff]+/g, (match) => {
    return `<span class="hashtag">${match}</span>`;
  });
  
  // Mention'ları linkle
  formatted = formatted.replace(/@[\w\u00c0-\u017f\u0100-\u017f\u0180-\u024f\u1e00-\u1eff]+/g, (match) => {
    return `<span class="mention">${match}</span>`;
  });
  
  return formatted;
};

// ==============================================
// HİKAYE GÖRÜNTÜLEME FONKSİYONLARI
// ==============================================

/**
 * Hikayenin görüntülenme süresini hesaplar
 */
export const calculateViewDuration = (startTime: number, endTime: number): number => {
  return Math.round((endTime - startTime) / 1000); // saniye cinsinden
};

/**
 * Cihaz tipini tespit eder
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// ==============================================
// HİKAYE PAYLAŞIM FONKSİYONLARI
// ==============================================

/**
 * Hikaye paylaşım linkini oluşturur
 */
export const generateStoryShareLink = (storyId: string, baseUrl: string): string => {
  return `${baseUrl}/story/${storyId}`;
};

/**
 * Sosyal medya paylaşım metnini oluşturur
 */
export const generateShareText = (story: Story, platform: string): string => {
  const businessName = story.business_name || 'İşletme';
  const baseText = `${businessName} hikayesini görüntüle!`;
  
  switch (platform) {
    case 'whatsapp':
      return `${baseText} ${story.media_url}`;
    case 'twitter':
      return `${baseText} #${businessName.replace(/\s+/g, '')}`;
    case 'facebook':
      return `${baseText}`;
    default:
      return baseText;
  }
};

// ==============================================
// HİKAYE TEMİZLİK FONKSİYONLARI
// ==============================================

/**
 * Süresi dolmuş hikayeleri temizler
 */
export const cleanupExpiredStories = async (): Promise<number> => {
  try {
    // Bu fonksiyon backend'de çalışacak
    // Frontend'de sadece API çağrısı yapılacak
    const response = await fetch('/api/story/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    return result.archivedCount || 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Hikaye arşivini temizler (eski kayıtları siler)
 */
export const cleanupStoryArchive = async (daysToKeep: number = 30): Promise<number> => {
  try {
    const response = await fetch('/api/story/cleanup-archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ daysToKeep }),
    });
    
    const result = await response.json();
    return result.deletedCount || 0;
  } catch (error) {
    return 0;
  }
};

// ==============================================
// HİKAYE BİLDİRİM FONKSİYONLARI
// ==============================================

/**
 * Hikaye bildirimlerini gönderir
 */
export const sendStoryNotification = async (
  type: 'new_story' | 'story_liked' | 'story_commented' | 'story_shared',
  storyId: string,
  userId: string,
  message: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/story/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        storyId,
        userId,
        message,
      }),
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
};

// ==============================================
// HİKAYE ANALİTİK FONKSİYONLARI
// ==============================================

/**
 * Hikaye performans skorunu hesaplar
 */
export const calculateStoryPerformanceScore = (story: Story): number => {
  const engagement = story.view_count + story.like_count + story.comment_count + story.share_count;
  const timeSinceCreation = Date.now() - new Date(story.created_at).getTime();
  const hoursSinceCreation = timeSinceCreation / (1000 * 60 * 60);
  
  // Performans skoru: etkileşim / saat
  const performanceScore = hoursSinceCreation > 0 ? engagement / hoursSinceCreation : 0;
  return Math.round(performanceScore * 100) / 100;
};

/**
 * Hikaye trend analizi yapar
 */
export const analyzeStoryTrends = (stories: Story[]) => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentStories = stories.filter(story => 
    new Date(story.created_at) > last24Hours
  );
  
  const weeklyStories = stories.filter(story => 
    new Date(story.created_at) > last7Days
  );
  
  return {
    last24Hours: {
      count: recentStories.length,
      totalViews: recentStories.reduce((sum, story) => sum + story.view_count, 0),
      totalLikes: recentStories.reduce((sum, story) => sum + story.like_count, 0),
    },
    last7Days: {
      count: weeklyStories.length,
      totalViews: weeklyStories.reduce((sum, story) => sum + story.view_count, 0),
      totalLikes: weeklyStories.reduce((sum, story) => sum + story.like_count, 0),
    },
    averageEngagement: weeklyStories.length > 0 
      ? weeklyStories.reduce((sum, story) => sum + calculateEngagementRate(story), 0) / weeklyStories.length
      : 0
  };
};
