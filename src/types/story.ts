// ==============================================
// HİKAYE PAYLAŞIMI SİSTEMİ - TYPESCRIPT TİPLERİ
// ==============================================

export interface Story {
  id: string;
  business_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  media_size?: number;
  media_duration?: number;
  caption?: string;
  background_color: string;
  text_color: string;
  font_family: string;
  font_size: number;
  text_position: 'top' | 'center' | 'bottom';
  filter_type: string;
  is_highlighted: boolean;
  is_pinned: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  expires_at: string;
  updated_at: string;
  
  // İlişkili veriler
  business_name?: string;
  owner_user_id?: string;
  owner_name?: string;
  owner_email?: string;
}

export interface StoryView {
  id: string;
  story_id: string;
  user_id: string;
  viewed_at: string;
  view_duration?: number;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  ip_address?: string;
  user_agent?: string;
  
  // İlişkili veriler
  viewer_name?: string;
}

export interface StoryLike {
  id: string;
  story_id: string;
  user_id: string;
  liked_at: string;
  
  // İlişkili veriler
  liker_name?: string;
}

export interface StoryComment {
  id: string;
  story_id: string;
  user_id: string;
  comment: string;
  is_approved: boolean;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
  
  // İlişkili veriler
  commenter_name?: string;
}

export interface StoryShare {
  id: string;
  story_id: string;
  user_id: string;
  share_type: 'internal' | 'external' | 'copy_link';
  shared_at: string;
  external_platform?: string;
  share_message?: string;
}

export interface StoryHashtag {
  id: string;
  story_id: string;
  hashtag: string;
  created_at: string;
}

export interface StoryMention {
  id: string;
  story_id: string;
  mentioned_user_id: string;
  mentioned_at: string;
}

export interface StoryDailyStats {
  id: string;
  business_id: string;
  story_date: string;
  total_stories: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  unique_viewers: number;
  avg_view_duration: number;
  created_at: string;
  updated_at: string;
}

export interface StoryReport {
  id: string;
  story_id: string;
  reporter_user_id: string;
  report_reason: 'spam' | 'inappropriate' | 'harassment' | 'violence' | 'fake' | 'other';
  report_description?: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface StoryArchive {
  id: string;
  original_story_id: string;
  business_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  archived_at: string;
  archive_reason: 'expired' | 'deleted' | 'reported' | 'admin_removed';
}

// ==============================================
// FORM TİPLERİ
// ==============================================

export interface CreateStoryForm {
  businessId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mediaSize?: number;
  mediaDuration?: number;
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  textPosition?: 'top' | 'center' | 'bottom';
  filterType?: string;
  hashtags?: string[];
  mentions?: string[];
}

export interface UpdateStoryForm {
  id: string;
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  textPosition?: 'top' | 'center' | 'bottom';
  filterType?: string;
  hashtags?: string[];
  mentions?: string[];
}

export interface StoryViewForm {
  storyId: string;
  viewDuration?: number;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
}

export interface StoryCommentForm {
  storyId: string;
  comment: string;
}

export interface StoryShareForm {
  storyId: string;
  shareType: 'internal' | 'external' | 'copy_link';
  externalPlatform?: string;
  shareMessage?: string;
}

// ==============================================
// İSTATİSTİK TİPLERİ
// ==============================================

export interface StoryOverviewStats {
  total_stories: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  avg_views_per_story: number;
  avg_likes_per_story: number;
}

export interface StoryDetailedStats {
  story: Story;
  views: StoryView[];
  likes: StoryLike[];
  comments: StoryComment[];
}

export interface BusinessStoryStats {
  overview: StoryOverviewStats;
  dailyStats: StoryDailyStats[];
}

// ==============================================
// UI TİPLERİ
// ==============================================

export interface StoryViewerProps {
  stories: Story[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onLike: (storyId: string) => void;
  onComment: (storyId: string, comment: string) => void;
  onShare: (storyId: string, shareType: string) => void;
}

export interface StoryCardProps {
  story: Story;
  onClick: () => void;
  showStats?: boolean;
  compact?: boolean;
}

export interface StoryCreatorProps {
  businessId: string;
  onSuccess: (story: Story) => void;
  onCancel: () => void;
}

export interface StoryStatsProps {
  story: Story;
  detailedStats?: StoryDetailedStats;
  showDetails?: boolean;
}

// ==============================================
// FİLTRE VE SIRALAMA TİPLERİ
// ==============================================

export interface StoryFilters {
  businessId?: string;
  mediaType?: 'image' | 'video';
  isHighlighted?: boolean;
  isPinned?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  hashtags?: string[];
}

export interface StorySortOptions {
  field: 'created_at' | 'view_count' | 'like_count' | 'comment_count' | 'share_count';
  direction: 'asc' | 'desc';
}

// ==============================================
// API RESPONSE TİPLERİ
// ==============================================

export interface StoryListResponse {
  stories: Story[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface StoryStatsResponse {
  success: boolean;
  data?: BusinessStoryStats;
  error?: string;
}

export interface StoryActionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// ==============================================
// MEDYA YÜKLEME TİPLERİ
// ==============================================

export interface MediaUploadOptions {
  maxSize: number; // bytes
  allowedTypes: string[];
  quality?: number; // 0-100
  maxWidth?: number;
  maxHeight?: number;
  compress?: boolean;
}

export interface MediaUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  size?: number;
  duration?: number; // video için
  dimensions?: {
    width: number;
    height: number;
  };
}

// ==============================================
// HİKAYE DURUMU TİPLERİ
// ==============================================

export type StoryStatus = 'active' | 'expired' | 'archived' | 'deleted';

export interface StoryStatusInfo {
  status: StoryStatus;
  isExpired: boolean;
  timeRemaining?: number; // milisaniye cinsinden
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
}

// ==============================================
// HİKAYE ETKİLEŞİM TİPLERİ
// ==============================================

export interface StoryInteraction {
  type: 'view' | 'like' | 'comment' | 'share';
  storyId: string;
  userId: string;
  timestamp: string;
  metadata?: any;
}

export interface StoryEngagement {
  storyId: string;
  totalInteractions: number;
  uniqueUsers: number;
  engagementRate: number;
  topHashtags: string[];
  peakViewingTime: string;
}

// ==============================================
// HİKAYE ANALİTİK TİPLERİ
// ==============================================

export interface StoryAnalytics {
  period: 'day' | 'week' | 'month' | 'year';
  totalStories: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  uniqueViewers: number;
  avgViewDuration: number;
  engagementRate: number;
  topPerformingStories: Story[];
  hashtagPerformance: {
    hashtag: string;
    count: number;
    engagement: number;
  }[];
  hourlyDistribution: {
    hour: number;
    views: number;
    likes: number;
  }[];
}

// ==============================================
// HİKAYE BİLDİRİM TİPLERİ
// ==============================================

export interface StoryNotification {
  id: string;
  type: 'new_story' | 'story_liked' | 'story_commented' | 'story_shared' | 'story_expired';
  storyId: string;
  businessId: string;
  userId: string;
  message: string;
  isRead: boolean;
  created_at: string;
}

export interface StoryNotificationSettings {
  newStory: boolean;
  storyLiked: boolean;
  storyCommented: boolean;
  storyShared: boolean;
  storyExpired: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}
