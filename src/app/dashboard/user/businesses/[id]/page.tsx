"use client";
import { trpc } from '@utils/trpcClient';
import { useRouter, useParams } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { useState } from 'react';

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
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={`${sizeClasses[size]} transition-all duration-200 ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } ${
              star <= displayRating 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            }`}
          >
            {star <= displayRating ? '★' : '☆'}
          </button>
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

  const { data: business, isLoading } = trpc.business.getBusinessById.useQuery({ businessId }, { enabled: !!businessId });
  const { data: services } = trpc.business.getServices.useQuery({ businessId }, { enabled: !!businessId });
  const { data: employees } = trpc.business.getEmployees.useQuery({ businessId }, { enabled: !!businessId });
  const { data: businessImages } = trpc.business.getBusinessImages.useQuery({ businessId }, { enabled: !!businessId });
  const { data: businessRating } = trpc.review.getBusinessRating.useQuery({ businessId }, { enabled: !!businessId });
  const { data: reviewsData } = trpc.review.getByBusiness.useQuery({ businessId, page: 1, limit: 5 }, { enabled: !!businessId });

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-pulse">
        <span className="text-5xl mb-2">⏳</span>
        <span className="text-lg text-gray-400">İşletme bilgileri yükleniyor...</span>
      </main>
    );
  }
  if (!business) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
        <span className="text-5xl mb-2">😕</span>
        <span className="text-lg text-gray-500">İşletme bulunamadı.</span>
        <button className="mt-4 px-4 py-2 bg-gray-200 rounded-full" onClick={() => router.back()}>Geri Dön</button>
      </main>
    );
  }

  return (
    <>
      <main className="max-w-4xl mx-auto p-4 pb-24 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-fade-in relative">
      {/* Header with Back Button - Mobile Optimized */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-white/30 hover:border-blue-200/50 text-sm md:text-base"
        >
          <span className="text-base md:text-lg">←</span>
          <span className="font-medium text-gray-700 hidden sm:block">Geri Dön</span>
        </button>
        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white text-lg md:text-2xl font-bold shadow-lg">
          🏢
        </div>
      </div>

      {/* Image Slider - Mobile Optimized */}
      <div className="mb-6 md:mb-8 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl md:shadow-2xl bg-white/80 backdrop-blur-sm border border-white/20">
        <Swiper 
          spaceBetween={0} 
          slidesPerView={1} 
          className="w-full h-48 sm:h-64 md:h-80 lg:h-96"
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          loop={true}
          pagination={{ clickable: true }}
          effect="fade"
          fadeEffect={{ crossFade: true }}
        >
          {(businessImages && businessImages.length > 0
            ? businessImages.map((img: any) => img.image_url)
            : [
                '/public/globe.svg',
                '/public/window.svg',
                '/public/file.svg',
              ]).map((img: string, idx: number) => (
            <SwiperSlide key={idx}>
              <div className="relative w-full h-full">
                <img
                  src={img}
                  alt={`İşletme görseli ${idx + 1}`}
                  className="object-cover w-full h-full select-none"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Resim+Yüklenemedi';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Business Info - Mobile Optimized */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-xl p-6 md:p-8 mb-6 md:mb-8 border border-white/20 animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent select-none mb-3">
            {business.name}
          </h1>
          {business.description && (
            <p className="text-gray-600 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto px-2 mb-4">
              {business.description}
            </p>
          )}
          
          {/* Business Rating */}
          {businessRating && businessRating.total_reviews > 0 && (
            <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-yellow-50/50 to-orange-50/30 rounded-2xl border border-yellow-100/30">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                ⭐
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <StarRating rating={parseFloat(businessRating.overall_rating || 0)} readonly size="md" showValue />
                </div>
                <p className="text-xs text-gray-600">
                  {businessRating.total_reviews} değerlendirme • Son 6 ay: {parseFloat(businessRating.last_6_months_rating || 0).toFixed(1)}/5
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Contact Info Cards - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-blue-50/50 to-blue-100/30 rounded-xl md:rounded-2xl border border-blue-100/30">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-base md:text-lg">
              📍
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 font-medium">Adres</p>
              <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">{business.address}</p>
            </div>
          </div>

          {business.phone && (
            <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-green-50/50 to-green-100/30 rounded-xl md:rounded-2xl border border-green-100/30">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-base md:text-lg">
                📞
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-600 font-medium">Telefon</p>
                <p className="text-xs md:text-sm font-semibold text-gray-800">{business.phone}</p>
              </div>
            </div>
          )}

          {business.email && (
            <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-purple-50/50 to-purple-100/30 rounded-xl md:rounded-2xl border border-purple-100/30">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-base md:text-lg">
                ✉️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-purple-600 font-medium">E-posta</p>
                <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">{business.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Services Section - Mobile Optimized */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-sm md:text-lg">
            💇‍♂️
          </div>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
            Hizmetler
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {services?.map((s: any) => (
            <div key={s.id} className="group bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-blue-200/50">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-gray-800 mb-1 md:mb-2 group-hover:text-blue-600 transition-colors truncate">
                    {s.name}
                  </h3>
                  {s.description && (
                    <p className="text-gray-600 text-xs md:text-sm leading-relaxed line-clamp-2">
                      {s.description}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-sm md:text-lg font-bold shadow-lg ml-2">
                  ⚡
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="flex items-center gap-1 md:gap-2 text-gray-600">
                    <span className="text-xs md:text-sm">⏱️</span>
                    <span className="text-xs md:text-sm font-medium">{s.duration_minutes} dk</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-medium">Fiyat</p>
                  <p className="text-lg md:text-xl font-bold bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">
                    ₺{s.price}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {(!services || services.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">💇‍♂️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Henüz Hizmet Yok</h3>
              <p className="text-gray-500 text-center">
                Bu işletme henüz hizmet eklememiş.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Employees Section - Mobile Optimized */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-sm md:text-lg">
            ✂️
          </div>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
            Çalışanlar
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {employees?.map((e: any) => (
            <div key={e.id} className="group bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-purple-200/50">
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-sm md:text-lg font-bold shadow-lg">
                  {e.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-gray-800 group-hover:text-purple-600 transition-colors truncate">
                    {e.name}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500">Çalışan</p>
                </div>
              </div>
              
              <div className="space-y-1 md:space-y-2">
                {e.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-xs md:text-sm">✉️</span>
                    <span className="text-xs md:text-sm truncate">{e.email}</span>
                  </div>
                )}
                {e.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-xs md:text-sm">📞</span>
                    <span className="text-xs md:text-sm">{e.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {(!employees || employees.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">✂️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Henüz Çalışan Yok</h3>
              <p className="text-gray-500 text-center">
                Bu işletme henüz çalışan eklememiş.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section - Mobile Optimized */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg md:rounded-xl flex items-center justify-center text-white text-sm md:text-lg">
            ⭐
          </div>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Müşteri Değerlendirmeleri
          </h2>
        </div>
        
        {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
          <div className="space-y-4">
            {reviewsData.reviews.map((review: any) => (
              <div key={review.id} className="group bg-white/80 backdrop-blur-sm rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-yellow-200/50">
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm md:text-lg font-bold shadow-lg">
                      {review.user_name?.charAt(0).toUpperCase() || 'M'}
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-bold text-gray-800">
                        {review.user_name || 'Anonim'}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('tr-TR', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <StarRating rating={review.service_rating} readonly size="sm" />
                      <span className="text-xs text-gray-500">Hizmet</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <StarRating rating={review.employee_rating} readonly size="sm" />
                      <span className="text-xs text-gray-500">Çalışan</span>
                    </div>
                  </div>
                </div>

                {/* Review Comment */}
                <div className="bg-gradient-to-r from-yellow-50/30 to-orange-50/30 rounded-xl p-4 border border-yellow-100/30">
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                    "{review.comment}"
                  </p>
                </div>

                {/* Overall Rating */}
                <div className="mt-4 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full">
                    <span className="text-sm font-semibold text-yellow-700">
                      Genel Puan:
                    </span>
                    <StarRating 
                      rating={(review.service_rating + review.employee_rating) / 2} 
                      readonly 
                      size="sm" 
                      showValue 
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Show More Reviews Button */}
            {reviewsData.pagination && reviewsData.pagination.total > 5 && (
              <div className="text-center pt-4">
                <button className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                  <span className="mr-2">📖</span>
                  Tüm Değerlendirmeleri Gör ({reviewsData.pagination.total})
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">⭐</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Henüz Değerlendirme Yok</h3>
            <p className="text-gray-500 text-center">
              Bu işletme için henüz değerlendirme yapılmamış.
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
        
        /* Ensure button is always visible */
        body {
          overflow-x: hidden;
        }
        
        /* Fixed button styles */
        .fixed-button {
          position: fixed !important;
          bottom: 24px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 9999 !important;
        }
      `}</style>
    </main>
    
    {/* Floating Action Button - Always Visible */}
    <button
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 font-semibold text-base md:text-lg hover:scale-105 flex items-center gap-2 md:gap-3 backdrop-blur-sm border border-white/20"
      onClick={() => router.push(`/dashboard/user/businesses/${businessId}/book`)}
    >
      <span className="text-lg md:text-xl">📅</span>
      <span className="hidden sm:inline">Randevu Al</span>
      <span className="sm:hidden">Randevu</span>
    </button>
    </>
  );
} 