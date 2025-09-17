"use client";
import { trpc } from '@utils/trpcClient';
import { useRouter, useParams } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
// Hikaye bileşenleri - GEÇİCİ OLARAK KAPALI
// import StoryCard, { StoryGrid } from '@/components/story/StoryCard';
// import StoryViewer from '@/components/story/StoryViewer';
// import { Story } from '@/types/story';

// Inline StarRating Component
interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

function StarRating({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = 'md',
  showValue = false 
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (!readonly) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            className={`${sizeClasses[size]} transition-all duration-200 ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } ${
              star <= displayRating 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            }`}
          >
            {star <= displayRating ? '★' : '☆'}
          </div>
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-gray-600">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export default function BusinessDetailPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params?.id as string;
  const { data: session } = useSession();

  const businessIdNum = businessId ? parseInt(businessId, 10) : 0;
  const { data: business, isLoading } = trpc.business.getBusinessById.useQuery({ businessId }, { enabled: !!businessId });
  const { data: services } = trpc.business.getServices.useQuery({ businessId }, { enabled: !!businessId });
  const { data: employees } = trpc.business.getEmployees.useQuery({ businessId }, { enabled: !!businessId });
  const { data: businessImages } = trpc.business.getBusinessImages.useQuery({ businessId }, { enabled: !!businessId });
  const { data: businessRating } = trpc.review.getBusinessRating.useQuery({ businessId }, { enabled: !!businessId });
  const { data: reviewsData } = trpc.review.getByBusiness.useQuery({ businessId, page: 1, limit: 5 }, { enabled: !!businessId });
  // Hikaye API'si - GEÇİCİ OLARAK KAPALI
  // const { data: businessStories, refetch: refetchStories } = trpc.story.getByBusiness.useQuery({ businessId }, { enabled: !!businessId });
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const { data: fullReviews, isLoading: fullReviewsLoading } = trpc.review.getByBusiness.useQuery(
    { businessId, page: reviewsPage, limit: 10 },
    { enabled: !!businessId && reviewsOpen }
  );
  const { data: favStatus, refetch: refetchFav } = trpc.favorites.isFavorite.useQuery({ businessId }, { enabled: !!businessId && !!session?.user });
  const toggleFavorite = trpc.favorites.toggle.useMutation();
  const [activeTab, setActiveTab] = useState<'services' | 'employees' | 'reviews'>('services');
  const [slider, setSlider] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [photoSliderOpen, setPhotoSliderOpen] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photoSwiper, setPhotoSwiper] = useState<any>(null);
  
  // Employee photo modal state'leri
  const [employeePhotoModalOpen, setEmployeePhotoModalOpen] = useState(false);
  const [selectedEmployeePhoto, setSelectedEmployeePhoto] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  
  // Hikaye state'leri
  // Hikaye state'leri - GEÇİCİ OLARAK KAPALI
  // const [storiesOpen, setStoriesOpen] = useState(false);
  // const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  // const [viewingStories, setViewingStories] = useState<any[]>([]);

  const minServicePrice = useMemo(() => {
    if (!services || services.length === 0) return null as number | null;
    const nums = services.map((s: any) => Number(s.price) || 0).filter((n: number) => n >= 0);
    if (nums.length === 0) return null;
    return Math.min(...nums);
  }, [services]);

  // tRPC mutations - GEÇİCİ OLARAK KAPALI
  // const likeStoryMutation = trpc.story.toggleLike.useMutation();
  // const viewStoryMutation = trpc.story.view.useMutation();

  // Hikaye etkileşim fonksiyonları - GEÇİCİ OLARAK KAPALI
  /*
  const handleStoryClick = (story: any, index: number) => {
    setViewingStories(businessStories || []);
    setCurrentStoryIndex(index);
    setStoriesOpen(true);
    handleStoryView(story.id);
  };

  const handleStoryClose = () => {
    setStoriesOpen(false);
    setViewingStories([]);
    setCurrentStoryIndex(0);
  };

  const handleStoryNext = () => {
    if (currentStoryIndex < viewingStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    }
  };

  const handleStoryPrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };

  const handleStoryLike = async (storyId: string) => {
    try {
      await likeStoryMutation.mutateAsync({ storyId });
      refetchStories();
    } catch (error) {
    }
  };

  const handleStoryView = async (storyId: string) => {
    try {
      await viewStoryMutation.mutateAsync({ 
        storyId,
        deviceType: 'mobile'
      });
    } catch (error) {
    }
  };
  */


  // Filtrelenmiş ve sıralanmış yorumlar
  const filteredAndSortedReviews = useMemo(() => {
    if (!reviewsData?.reviews) return [];
    
    let filtered = reviewsData.reviews;
    
    // Puan filtresi
    if (minRating > 0) {
      filtered = filtered.filter((review: any) => {
        const avgRating = ((review.service_rating || 0) + (review.employee_rating || 0)) / 2;
        return avgRating >= minRating;
      });
    }
    
    // Sıralama
    filtered.sort((a: any, b: any) => {
      const aRating = ((a.service_rating || 0) + (a.employee_rating || 0)) / 2;
      const bRating = ((b.service_rating || 0) + (b.employee_rating || 0)) / 2;
      
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest':
          return bRating - aRating;
        case 'lowest':
          return aRating - bRating;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [reviewsData?.reviews, minRating, sortBy]);

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 animate-pulse">
        <span className="text-5xl mb-2">⏳</span>
        <span className="text-lg text-gray-400">İşletme bilgileri yükleniyor...</span>
      </main>
    );
  }
  if (!business) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-5xl mb-2">😕</span>
        <span className="text-lg text-gray-500">İşletme bulunamadı.</span>
        <button className="mt-4 px-4 py-2 bg-gray-200 rounded-full" onClick={() => router.back()}>Geri Dön</button>
      </main>
    );
  }

  return (
    <>
      <main className="relative max-w-4xl mx-auto p-3 sm:p-4 pb-20 sm:pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 animate-fade-in">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/80 backdrop-blur-md border-b border-white/30 shadow-sm mb-3">
        <div className="flex items-center justify-between">
          <div className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-1 sm:gap-2 px-3 py-2 bg-white/70 backdrop-blur-md rounded-xl shadow-sm active:scale-95 transition-all duration-200 border border-white/40 text-sm touch-manipulation min-h-[44px]"
          >
            <span className="text-lg text-gray-900">←</span>
            <span className="font-medium text-gray-700 text-xs sm:text-sm">Geri</span>
          </button>
        </div>
      </div>

      {/* Favorite toggle + Image Slider - Mobile Optimized */}
      <div className="relative mb-4 rounded-2xl overflow-hidden shadow-lg bg-white/60 backdrop-blur-md border border-white/40">
        <div className="absolute right-3 top-3 z-10">
          <button
            disabled={!session?.user}
            onClick={async () => {
              await toggleFavorite.mutateAsync({ businessId });
              await refetchFav();
            }}
            className={`px-3 py-2 rounded-full shadow transition-all active:scale-95 touch-manipulation min-h-[44px] ${favStatus?.isFavorite ? 'bg-rose-600 text-white' : 'bg-white/80 text-gray-900 border border-white/40 backdrop-blur-md'}`}
            title={session?.user ? (favStatus?.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle') : 'Giriş yapmalısınız'}
          >
            <span className="inline-flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.1 21.35l-1.1-1.01C5.14 15.24 2 12.36 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.59 4.81 14.26 4 16 4 18.5 4 20.5 6 20.5 8.5c0 3.86-3.14 6.74-8.9 11.84l-.5.46z"/></svg>
              <span className="text-xs font-medium">{favStatus?.isFavorite ? 'Favoride' : 'Favori'}</span>
            </span>
          </button>
        </div>
        <Swiper 
          spaceBetween={0} 
          slidesPerView={1} 
          className="w-full h-48 sm:h-56 md:h-72 lg:h-80"
          onSwiper={setSlider}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          loop={true}
          pagination={{ clickable: true }}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          touchRatio={1}
          touchStartPreventDefault={false}
        >
          {(businessImages && businessImages.length > 0
            ? businessImages.map((img: any) => img.image_url)
            : [
                '/globe.svg',
                '/window.svg',
                '/file.svg',
              ]).map((img: string, idx: number) => (
            <SwiperSlide key={idx}>
              <div 
                className="relative w-full h-full cursor-pointer"
                onClick={() => {
                  const businessImagesList = businessImages && businessImages.length > 0
                    ? businessImages.map((img: any) => img.image_url)
                    : ['/globe.svg', '/window.svg', '/file.svg'];
                  setCurrentPhotos(businessImagesList);
                  setCurrentPhotoIndex(idx);
                  setPhotoSliderOpen(true);
                }}
              >
                <img
                  src={img}
                  alt={`İşletme görseli ${idx + 1}`}
                  className="object-cover w-full h-full select-none hover:scale-105 transition-transform duration-300"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Fallback for failed images */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center hidden">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">🖼️</div>
                    <div className="text-sm">Resim Yüklenemedi</div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        {/* Slider Nav - Mobile Optimized */}
    
      </div>

      {/* Business Info - Mobile Optimized */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-lg p-3 sm:p-4 mb-4 border border-white/40 animate-fade-in">
        <div className="text-center mb-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none mb-2">
            {business.name}
          </h1>
          {business.description && (
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto px-1 mb-3">
              {business.description}
            </p>
          )}

          {/* Hikayeler Bölümü - Mobile Optimized - GEÇİCİ OLARAK KAPALI */}
          {/*
          {businessStories && businessStories.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-center mb-3">
                <h3 className="text-sm sm:text-base font-semibold text-gray-700 mr-2">Hikayeler</h3>
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">📱</span>
                </div>
              </div>
              <StoryGrid 
                stories={businessStories} 
                onStoryClick={handleStoryClick}
                className="justify-center"
              />
            </div>
          )}
          */}
          
          {/* Business Rating - Mobile Optimized */}
          {businessRating && businessRating.total_reviews > 0 && (
            <button 
              onClick={() => {
                setActiveTab('reviews');
                // Sayfayı yorumlar sekmesine scroll yap
                setTimeout(() => {
                  const reviewsSection = document.querySelector('[data-tab="reviews"]');
                  if (reviewsSection) {
                    reviewsSection.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'start' 
                    });
                  }
                }, 100);
              }}
              className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-yellow-50/60 to-orange-50/40 rounded-xl border border-yellow-100/50 active:from-yellow-100/80 active:to-orange-100/60 active:border-yellow-200/70 transition-all duration-200 cursor-pointer group mx-auto touch-manipulation active:scale-95 min-h-[44px]"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white text-sm font-bold group-active:scale-110 transition-transform">
                ⭐
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <StarRating rating={parseFloat(businessRating.overall_rating || 0)} readonly size="sm" showValue />
                </div>
                <p className="text-xs text-gray-600 group-active:text-gray-700 transition-colors">
                  {businessRating.total_reviews} değerlendirme
                </p>
                <p className="text-[10px] text-yellow-600 mt-1">
                  Tıklayın →
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Contact Info Cards - Mobile Optimized */}
        <div className="grid grid-cols-1 gap-2">
          {/* Adres Kartı - Mobile Optimized */}
          <button 
            onClick={() => {
              if (business.address) {
                const encodedAddress = encodeURIComponent(business.address);
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
              }
            }}
            className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50/50 to-blue-100/30 rounded-xl border border-blue-100/30 active:from-blue-100/60 active:to-blue-200/40 active:border-blue-200/50 transition-all duration-200 cursor-pointer group touch-manipulation active:scale-95 min-h-[44px]"
            disabled={!business.address}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm group-active:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs text-blue-600 font-medium">Adres</p>
              <p className="text-xs font-semibold text-gray-800 truncate group-active:text-blue-700 transition-colors">
                {business.address || 'Adres bilgisi yok'}
              </p>
              <p className="text-[10px] text-blue-500 mt-1">
                Yol tarifi için tıklayın →
              </p>
            </div>
          </button>

          {/* Telefon Kartı - Mobile Optimized */}
          {business.phone && (
            <button 
              onClick={() => {
                if (business.phone) {
                  window.open(`tel:${business.phone}`, '_self');
                }
              }}
              className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50/50 to-green-100/30 rounded-xl border border-green-100/30 active:from-green-100/60 active:to-green-200/40 active:border-green-200/50 transition-all duration-200 cursor-pointer group touch-manipulation active:scale-95 min-h-[44px]"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-sm group-active:scale-110 transition-transform">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.46 15.46 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.49a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.2 2.2z"/></svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs text-green-600 font-medium">Telefon</p>
                <p className="text-xs font-semibold text-gray-800 group-active:text-green-700 transition-colors">{business.phone}</p>
                <p className="text-[10px] text-green-500 mt-1">
                  Arama yapmak için tıklayın →
                </p>
              </div>
            </button>
          )}

          {/* E-posta Kartı - Mobile Optimized */}
          {business.email && (
            <button 
              onClick={() => {
                if (business.email) {
                  window.open(`mailto:${business.email}`, '_self');
                }
              }}
              className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50/50 to-purple-100/30 rounded-xl border border-purple-100/30 active:from-purple-100/60 active:to-purple-200/40 active:border-purple-200/50 transition-all duration-200 cursor-pointer group touch-manipulation active:scale-95 min-h-[44px]"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm group-active:scale-110 transition-transform">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm0 2l8 5 8-5"/></svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs text-purple-600 font-medium">E-posta</p>
                <p className="text-xs font-semibold text-gray-800 truncate group-active:text-purple-700 transition-colors">{business.email}</p>
                <p className="text-[10px] text-purple-500 mt-1">
                  E-posta göndermek için tıklayın →
                </p>
              </div>
            </button>
          )}
        </div>
      </div>
      {/* Segmented Tabs - Mobile Optimized */}
      <div className="flex items-center justify-center mb-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm">
          {([
            { key: 'services', label: 'Hizmetler' },
            { key: 'employees', label: 'Çalışanlar' },
            { key: 'reviews', label: 'Yorumlar' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              className={`px-3 py-2 rounded-full text-xs font-semibold transition-all touch-manipulation active:scale-95 min-h-[44px] ${activeTab===tab.key? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md':'text-gray-800 active:bg-white/70'}`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services Section - Mobile Optimized */}
      {activeTab === 'services' && (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">Hizmetler</h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-white/40 bg-white/60 backdrop-blur-md shadow">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-gray-600 border-b border-white/40">
            <span>Hizmet</span>
            <span>Süre</span>
            <span>Fiyat</span>
          </div>
          <div>
            {services?.map((s: any) => (
              <div key={s.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-3 border-t border-white/30 active:bg-white/70 transition touch-manipulation min-h-[44px]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white grid place-items-center text-xs shrink-0">⚡</div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">{s.name}</div>
                    {s.description && <div className="text-[10px] text-gray-600 truncate">{s.description}</div>}
                  </div>
                </div>
                <div className="text-xs text-gray-800">{s.duration_minutes} dk</div>
                <div className="text-xs font-bold bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">₺{s.price}</div>
              </div>
            ))}
            {(!services || services.length === 0) && (
              <div className="px-3 py-8 text-center text-gray-500 text-sm">Bu işletme henüz hizmet eklememiş.</div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Employees Section - Mobile Optimized */}
      {activeTab === 'employees' && (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">Çalışanlar</h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-white/40 bg-white/60 backdrop-blur-md shadow">
          <div className="grid grid-cols-[auto_1fr_auto] gap-2 px-3 py-2 text-[10px] uppercase tracking-wide text-gray-600 border-b border-white/40">
            <span>Fotoğraf</span>
            <span>Ad</span>
            <span>İletişim</span>
          </div>
          <div>
            {employees?.map((e: any) => (
              <div key={e.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-3 border-t border-white/30 active:bg-white/70 transition touch-manipulation min-h-[44px]">
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (e.profile_image_url) {
                        setSelectedEmployeePhoto(e.profile_image_url);
                        setSelectedEmployeeName(e.name);
                        setEmployeePhotoModalOpen(true);
                      }
                    }}
                  >
                    {e.profile_image_url ? (
                      <img src={e.profile_image_url} alt={e.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                        {e.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-gray-900 truncate">{e.name}</div>
                </div>
                <div className="text-xs text-gray-800 truncate">{e.email || '-'}</div>
                <div className="text-xs text-gray-800">{e.phone || '-'}</div>
              </div>
            ))}
            {(!employees || employees.length === 0) && (
              <div className="px-3 py-8 text-center text-gray-500 text-sm">Bu işletme henüz çalışan eklememiş.</div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Reviews Section - Mobile Optimized */}
      {activeTab === 'reviews' && (
      <div className="mb-4" data-tab="reviews">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">Müşteri Değerlendirmeleri</h2>
        </div>

        {/* Filtreleme Seçenekleri - Mobile Optimized */}
        <div className="mb-3 flex flex-col gap-2">
          {/* Puan Filtresi */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">Min Puan:</span>
            <select 
              value={minRating}
              className="px-2 py-2 border border-white/40 rounded-lg bg-white/60 text-xs flex-1 touch-manipulation min-h-[44px]"
              onChange={(e) => setMinRating(Number(e.target.value))}
            >
              <option value={0}>Tümü</option>
              <option value={3}>3+</option>
              <option value={4}>4+</option>
              <option value={4.5}>4.5+</option>
            </select>
          </div>

          {/* Tarih Filtresi */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">Sıralama:</span>
            <select 
              value={sortBy}
              className="px-2 py-2 border border-white/40 rounded-lg bg-white/60 text-xs flex-1 touch-manipulation min-h-[44px]"
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">En Yeni</option>
              <option value="oldest">En Eski</option>
              <option value="highest">En Yüksek Puan</option>
              <option value="lowest">En Düşük Puan</option>
            </select>
          </div>
        </div>
        

        
        {filteredAndSortedReviews.length > 0 ? (
          <div className="space-y-2">
            {filteredAndSortedReviews.slice(0, 5).map((review: any) => (
              <div key={review.id} className="bg-white/30 backdrop-blur-sm border border-white/20 rounded-lg p-3 active:bg-white/40 transition-all duration-200 touch-manipulation min-h-[44px]">
                {/* Kullanıcı Bilgisi ve Genel Puan - Mobil Optimized */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center text-xs font-medium">
                      {(review.user_name?.charAt(0).toUpperCase() || 'M')}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-800">{review.user_name || 'Anonim'}</div>
                      <div className="text-[9px] text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('tr-TR', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Genel Puan */}
                  <div className="text-right">
                    <div className="text-xs font-semibold text-amber-600">
                      {(((review.service_rating || 0) + (review.employee_rating || 0)) / 2).toFixed(1)}
                    </div>
                    <div className="text-[9px] text-gray-400">/ 5</div>
                  </div>
                </div>

                {/* Rating'ler */}
                <div className="flex items-center gap-3 mb-2 text-[10px]">
                  <div className="flex items-center gap-1 text-blue-600">
                    <span>Hizmet:</span>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= review.service_rating ? 'text-amber-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-emerald-600">
                    <span>Çalışan:</span>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= review.employee_rating ? 'text-amber-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Yorum Metni */}
                <div className="text-xs text-gray-700 leading-relaxed mb-2">"{review.comment}"</div>

                {/* Review Photos */}
                {review.photos && review.photos.length > 0 && (
                  <div className="mb-2">
                    <div className="grid grid-cols-3 gap-1">
                      {review.photos.slice(0, 3).map((photo: string, index: number) => (
                        <div
                          key={index}
                          className="relative aspect-square cursor-pointer group"
                          onClick={() => {
                            setCurrentPhotos(review.photos);
                            setCurrentPhotoIndex(index);
                            setPhotoSliderOpen(true);
                          }}
                        >
                          <img
                            src={photo}
                            alt={`Review photo ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg hover:opacity-80 transition-opacity"
                          />
                          {index === 2 && review.photos.length > 3 && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                +{review.photos.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* İşletme Yanıtı */}
                {review.business_reply && (
                  <div className="bg-blue-50/30 rounded-lg p-2 border-l border-blue-300">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium text-blue-700">🏢 İşletme Yanıtı</span>
                      </div>
                      <span className="text-[10px] text-blue-500">
                        {new Date(review.business_reply_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="text-[10px] text-blue-600 leading-relaxed">{review.business_reply}</div>
                  </div>
                )}
              </div>
            ))}

            {/* Tüm Yorumları Gör Butonu */}
            {reviewsData?.pagination && reviewsData.pagination.total > 5 && (
              <div className="text-center">
                <button
                  onClick={() => { setReviewsOpen(true); setReviewsPage(1); }}
                  className="px-3 py-2 rounded-md bg-white/40 backdrop-blur-sm border border-white/30 text-gray-600 text-xs font-medium hover:bg-white/60 active:bg-white/70 transition-all duration-200 touch-manipulation min-h-[44px]"
                >
                  Tüm Değerlendirmeleri Gör ({reviewsData.pagination.total})
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-gray-500">
            <div className="text-4xl mb-3">💬</div>
            <div className="text-lg font-medium text-gray-600 mb-2">Henüz Yorum Yok</div>
            <div className="text-sm text-gray-500 max-w-md mx-auto">
              Bu işletme için henüz müşteri değerlendirmesi yapılmamış. 
              İlk yorumu siz yapabilirsiniz!
            </div>
          </div>
        )}
      </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        :root { 
          --randevuo-radius: 16px; 
          --randevuo-shadow: 0 8px 24px -12px rgba(0,0,0,0.25);
          --mobile-safe-area: env(safe-area-inset-bottom, 0px);
        }
        html, body { 
          font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; 
          overflow-x: hidden; 
        }
        .fixed-button { position: fixed !important; bottom: 24px !important; left: 50% !important; transform: translateX(-50%) !important; z-index: 9999 !important; }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          
          /* Touch targets */
          button, input, select, textarea {
            touch-action: manipulation;
          }
          
          /* Prevent zoom on input focus */
          input[type="text"], input[type="email"], input[type="password"], input[type="date"], input[type="time"], textarea {
            font-size: 16px;
          }
          
          /* Smooth scrolling */
          .overscroll-contain {
            overscroll-behavior: contain;
          }
        }
        
        /* Custom Swiper Styles */
        .swiper-pagination-bullet-custom {
          width: 8px !important;
          height: 8px !important;
          background: rgba(255, 255, 255, 0.3) !important;
          opacity: 1 !important;
          margin: 0 4px !important;
        }
        
        .swiper-pagination-bullet-active-custom {
          background: white !important;
        }
        
        .swiper-button-next-custom:after,
        .swiper-button-prev-custom:after {
          display: none !important;
        }
        
        .swiper-pagination {
          bottom: 20px !important;
        }
        
        /* Animation improvements */
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
    
    {/* Reviews Modal - Mobile Optimized */}
    {reviewsOpen && (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setReviewsOpen(false)} />
        <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:max-w-2xl sm:h-[80vh] bg-white/70 backdrop-blur-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col border border-white/40">
          {/* Mobile drag handle */}
          <div className="py-2 flex items-center justify-center sm:hidden">
            <div className="w-12 h-1.5 rounded-full bg-gray-300" />
          </div>
          <div className="px-3 sm:px-4 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-lg">Tüm Değerlendirmeler</h3>
            <button 
              className="px-3 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 text-sm touch-manipulation min-h-[44px]" 
              onClick={() => setReviewsOpen(false)}
            >
              Kapat
            </button>
          </div>
          <div className="px-3 sm:px-4 pb-3 border-b border-white/40 flex items-center justify-between text-sm text-gray-700">
            <span>Toplam: {fullReviews?.pagination?.total ?? reviewsData?.pagination?.total ?? 0}</span>
            <div className="flex items-center gap-2">
              <button 
                disabled={reviewsPage<=1} 
                onClick={() => setReviewsPage(p => Math.max(1, p-1))} 
                className="px-3 py-2 rounded-xl bg-white/60 border border-white/40 disabled:opacity-50 touch-manipulation min-h-[44px]"
              >
                Önceki
              </button>
              <span>Sayfa {reviewsPage}</span>
              <button 
                disabled={fullReviews && (reviewsPage >= (fullReviews.pagination?.totalPages || 1))} 
                onClick={() => setReviewsPage(p => p+1)} 
                className="px-3 py-2 rounded-xl bg-white/60 border border-white/40 disabled:opacity-50 touch-manipulation min-h-[44px]"
              >
                Sonraki
              </button>
            </div>
          </div>
          <div className="p-3 sm:p-4 overflow-auto flex-1 space-y-3 overscroll-contain">
            {fullReviewsLoading && (
              <div className="text-center text-gray-500">Yükleniyor...</div>
            )}
            {fullReviews?.reviews?.map((review: any) => (
              <div key={review.id} className="border border-white/30 bg-white/40 backdrop-blur-sm rounded-lg p-3 hover:bg-white/50 active:bg-white/60 transition-all duration-200 touch-manipulation">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center text-xs font-medium">
                      {(review.user_name?.charAt(0).toUpperCase() || 'M')}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{review.user_name || 'Anonim'}</div>
                      <div className="text-xs text-gray-500" suppressHydrationWarning>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR').format(new Date(review.created_at))}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold text-amber-600">
                      {(((review.service_rating || 0) + (review.employee_rating || 0)) / 2).toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">/ 5</div>
                  </div>
                </div>

                {/* Rating'ler */}
                <div className="flex items-center gap-3 mb-2 text-xs">
                  <div className="flex items-center gap-1 text-blue-600">
                    <span>Hizmet:</span>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= review.service_rating ? 'text-amber-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-emerald-600">
                    <span>Çalışan:</span>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= review.employee_rating ? 'text-amber-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-700 mb-2 leading-relaxed">"{review.comment}"</div>

                {/* Review Photos */}
                {review.photos && review.photos.length > 0 && (
                  <div className="mb-3">
                    <div className="grid grid-cols-5 gap-1">
                      {review.photos.slice(0, 5).map((photo: string, index: number) => (
                        <div
                          key={index}
                          className="relative aspect-square cursor-pointer group"
                          onClick={() => {
                            setCurrentPhotos(review.photos);
                            setCurrentPhotoIndex(index);
                            setPhotoSliderOpen(true);
                          }}
                        >
                          <img
                            src={photo}
                            alt={`Review photo ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg hover:opacity-80 transition-opacity"
                          />
                          {index === 4 && review.photos.length > 5 && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                +{review.photos.length - 5}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* İşletme Yanıtı */}
                {review.business_reply && (
                  <div className="bg-blue-50/50 rounded-lg p-2 border-l-2 border-blue-300">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-blue-700">🏢 İşletme Yanıtı</span>
                      </div>
                      <span className="text-xs text-blue-500">
                        {new Date(review.business_reply_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 leading-relaxed">{review.business_reply}</div>
                  </div>
                )}
              </div>
            ))}
            {fullReviews && fullReviews.reviews?.length === 0 && (
              <div className="text-center text-gray-500">Kayıt yok</div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Sticky Booking Bar - Mobile Optimized */}
    <div className="fixed bottom-20 sm:bottom-6 inset-x-0 z-[9999]">
      <div className="mx-auto max-w-4xl px-3 sm:px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="sm:rounded-2xl sm:border sm:border-white/40 sm:backdrop-blur-md sm:bg-white/60 sm:shadow-2xl">
          <div className="flex justify-center sm:grid sm:grid-cols-[1fr_auto] gap-3 items-center p-3">
            <div className="hidden sm:flex items-center gap-3 text-sm text-gray-800">
              <div className="w-9 h-9 rounded-xl bg-white/70 border border-white/40 backdrop-blur-md shadow grid place-items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Randevu oluştur</div>
                <div className="text-xs text-gray-600 truncate">{minServicePrice!=null? `Başlangıç ₺${minServicePrice}` : 'Hizmetleri görüntüle'}</div>
              </div>
            </div>
            <button
              disabled={bookingLoading}
              onClick={async () => {
                try {
                  setBookingLoading(true);
                  await router.push(`/dashboard/user/businesses/${businessId}/book`);
                } finally {
                  setTimeout(() => setBookingLoading(false), 600);
                }
              }}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold shadow-2xl transition-all duration-200 active:scale-95 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 touch-manipulation min-h-[44px] ${bookingLoading? 'opacity-80 cursor-wait':''}`}
            >
              {bookingLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/90 border-t-transparent rounded-full animate-spin" />
                  <span>Yönlendiriliyor…</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  <span>Randevu Al</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Photo Slider Modal - Mobile Optimized */}
    {photoSliderOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-2 sm:p-4">
        <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Close Button - Mobile Optimized */}
          <button
            onClick={() => setPhotoSliderOpen(false)}
            className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 active:bg-white/40 transition-colors touch-manipulation min-h-[44px]"
          >
            <span className="text-xl">×</span>
          </button>

          {/* Photo Counter - Mobile Optimized */}
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-xs sm:text-sm">
            {currentPhotoIndex + 1} / {currentPhotos.length}
          </div>

          {/* Swiper Container */}
          <div className="flex-1 w-full">
            <Swiper
              modules={[Navigation, Pagination, EffectFade]}
              spaceBetween={0}
              slidesPerView={1}
              initialSlide={currentPhotoIndex}
              onSwiper={setPhotoSwiper}
              onSlideChange={(swiper) => setCurrentPhotoIndex(swiper.activeIndex)}
              effect="fade"
              fadeEffect={{ crossFade: true }}
              navigation={{
                nextEl: '.swiper-button-next-custom',
                prevEl: '.swiper-button-prev-custom',
              }}
              pagination={{
                clickable: true,
                bulletClass: 'swiper-pagination-bullet-custom',
                bulletActiveClass: 'swiper-pagination-bullet-active-custom',
              }}
              className="w-full h-full"
            >
              {currentPhotos.map((photo, index) => (
                <SwiperSlide key={index}>
                  <div className="flex items-center justify-center w-full h-full">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* Custom Navigation Buttons - Mobile Optimized */}
          {currentPhotos.length > 1 && (
            <>
              <button className="swiper-button-prev-custom absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 active:bg-white/40 transition-colors z-10 touch-manipulation min-h-[44px]">
                <span className="text-xl sm:text-2xl">‹</span>
              </button>
              <button className="swiper-button-next-custom absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 active:bg-white/40 transition-colors z-10 touch-manipulation min-h-[44px]">
                <span className="text-xl sm:text-2xl">›</span>
              </button>
            </>
          )}

          {/* Thumbnail Strip - Mobile Optimized */}
          {currentPhotos.length > 1 && (
            <div className="flex justify-center gap-2 p-2 sm:p-4 overflow-x-auto no-scrollbar">
              {currentPhotos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentPhotoIndex(index);
                    photoSwiper?.slideTo(index);
                  }}
                  className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all touch-manipulation ${
                    index === currentPhotoIndex
                      ? 'border-white'
                      : 'border-white/30 hover:border-white/60 active:border-white/80'
                  }`}
                >
                  <img
                    src={photo}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    {/* Hikaye Viewer - GEÇİCİ OLARAK KAPALI */}
    {/*
    {storiesOpen && (
      <StoryViewer
        stories={viewingStories}
        currentIndex={currentStoryIndex}
        onClose={handleStoryClose}
        onNext={handleStoryNext}
        onPrevious={handleStoryPrevious}
        onLike={handleStoryLike}
      />
    )}
    */}

    {/* Employee Photo Modal */}
    {employeePhotoModalOpen && selectedEmployeePhoto && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
          {/* Close Button */}
          <button
            onClick={() => setEmployeePhotoModalOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Employee Info */}
          <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-3 py-2 rounded-lg">
            <div className="text-sm font-medium">{selectedEmployeeName}</div>
            <div className="text-xs opacity-80">Çalışan Fotoğrafı</div>
          </div>
          
          {/* Photo */}
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
            <img
              src={selectedEmployeePhoto}
              alt={selectedEmployeeName}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
} 