"use client";
import { trpc } from '@utils/trpcClient';
import { useRouter, useParams } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';

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
  const { data: session } = useSession();

  const { data: business, isLoading } = trpc.business.getBusinessById.useQuery({ businessId }, { enabled: !!businessId });
  const { data: services } = trpc.business.getServices.useQuery({ businessId }, { enabled: !!businessId });
  const { data: employees } = trpc.business.getEmployees.useQuery({ businessId }, { enabled: !!businessId });
  const { data: businessImages } = trpc.business.getBusinessImages.useQuery({ businessId }, { enabled: !!businessId });
  const { data: businessRating } = trpc.review.getBusinessRating.useQuery({ businessId }, { enabled: !!businessId });
  const { data: reviewsData } = trpc.review.getByBusiness.useQuery({ businessId, page: 1, limit: 5 }, { enabled: !!businessId });
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const { data: fullReviews, isLoading: fullReviewsLoading } = trpc.review.getByBusiness.useQuery(
    { businessId, page: reviewsPage, limit: 10 },
    { enabled: !!businessId && reviewsOpen }
  );
  const { data: favStatus, refetch: refetchFav } = trpc.favorites.isFavorite.useQuery({ businessId }, { enabled: !!businessId && !!session?.user });
  const toggleFavorite = trpc.favorites.toggle.useMutation();
  const [activeTab, setActiveTab] = useState<'services' | 'employees' | 'reviews'>('services');
  const [slider, setSlider] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const minServicePrice = useMemo(() => {
    if (!services || services.length === 0) return null as number | null;
    const nums = services.map((s: any) => Number(s.price) || 0).filter((n: number) => n >= 0);
    if (nums.length === 0) return null;
    return Math.min(...nums);
  }, [services]);

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
      <main className="relative max-w-4xl mx-auto p-4 pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 animate-fade-in">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">kuado</div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-white/40 text-sm"
          >
            <span className="text-base text-gray-900">←</span>
            <span className="font-medium text-gray-700 hidden sm:block">Geri</span>
          </button>
        </div>
      </div>

      {/* Favorite toggle + Image Slider */}
      <div className="relative mb-6 md:mb-8 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl md:shadow-2xl bg-white/60 backdrop-blur-md border border-white/40">
        <div className="absolute right-4 top-4 z-10">
          <button
            disabled={!session?.user}
            onClick={async () => {
              await toggleFavorite.mutateAsync({ businessId });
              await refetchFav();
            }}
            className={`px-3 py-2 rounded-full shadow transition-all ${favStatus?.isFavorite ? 'bg-rose-600 text-white' : 'bg-white/70 text-gray-900 border border-white/40 backdrop-blur-md'}`}
            title={session?.user ? (favStatus?.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle') : 'Giriş yapmalısınız'}
          >
            <span className="inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.1 21.35l-1.1-1.01C5.14 15.24 2 12.36 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.59 4.81 14.26 4 16 4 18.5 4 20.5 6 20.5 8.5c0 3.86-3.14 6.74-8.9 11.84l-.5.46z"/></svg>
              {favStatus?.isFavorite ? 'Favoride' : 'Favori'}
            </span>
          </button>
        </div>
        <Swiper 
          spaceBetween={0} 
          slidesPerView={1} 
          className="w-full h-56 sm:h-72 md:h-80 lg:h-96"
          onSwiper={setSlider}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          loop={true}
          pagination={{ clickable: true }}
          effect="fade"
          fadeEffect={{ crossFade: true }}
        >
          {(businessImages && businessImages.length > 0
            ? businessImages.map((img: any) => img.image_url)
            : [
                '/globe.svg',
                '/window.svg',
                '/file.svg',
              ]).map((img: string, idx: number) => (
            <SwiperSlide key={idx}>
              <div className="relative w-full h-full">
                <img
                  src={img}
                  alt={`İşletme görseli ${idx + 1}`}
                  className="object-cover w-full h-full select-none"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
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
        {/* Slider Nav */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
          <button onClick={() => slider?.slidePrev()} className="w-9 h-9 grid place-items-center rounded-full bg-white/70 hover:bg-white/90 border border-white/40 shadow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button onClick={() => slider?.slideNext()} className="w-9 h-9 grid place-items-center rounded-full bg-white/70 hover:bg-white/90 border border-white/40 shadow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl md:rounded-3xl shadow-xl p-6 md:p-8 mb-4 md:mb-6 border border-white/40 animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none mb-3">
            {business.name}
          </h1>
          {business.description && (
            <p className="text-gray-600 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto px-2 mb-4">
              {business.description}
            </p>
          )}
          
          {/* Business Rating */}
          {businessRating && businessRating.total_reviews > 0 && (
            <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-yellow-50/60 to-orange-50/40 rounded-2xl border border-yellow-100/50">
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

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-blue-50/50 to-blue-100/30 rounded-xl md:rounded-2xl border border-blue-100/30">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-base md:text-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 font-medium">Adres</p>
              <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">{business.address}</p>
            </div>
          </div>

          {business.phone && (
            <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-green-50/50 to-green-100/30 rounded-xl md:rounded-2xl border border-green-100/30">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-base md:text-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.46 15.46 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.49a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.2 2.2z"/></svg>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm0 2l8 5 8-5"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-purple-600 font-medium">E-posta</p>
                <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">{business.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Segmented Tabs */}
      <div className="flex items-center justify-center mb-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm">
          {([
            { key: 'services', label: 'Hizmetler' },
            { key: 'employees', label: 'Çalışanlar' },
            { key: 'reviews', label: 'Yorumlar' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeTab===tab.key? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md':'text-gray-800 hover:bg-white/70'}`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services Section - table */}
      {activeTab === 'services' && (
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">Hizmetler</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-3 text-[11px] uppercase tracking-wide text-gray-600 border-b border-white/40">
            <span>Hizmet</span>
            <span>Süre</span>
            <span>Fiyat</span>
          </div>
          <div>
            {services?.map((s: any) => (
              <div key={s.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-3 border-t border-white/30 hover:bg-white/70 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white grid place-items-center text-sm shrink-0">⚡</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{s.name}</div>
                    {s.description && <div className="text-xs text-gray-600 truncate">{s.description}</div>}
                  </div>
                </div>
                <div className="text-sm text-gray-800">{s.duration_minutes} dk</div>
                <div className="text-sm font-bold bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">₺{s.price}</div>
              </div>
            ))}
            {(!services || services.length === 0) && (
              <div className="px-4 py-10 text-center text-gray-500">Bu işletme henüz hizmet eklememiş.</div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Employees Section - table */}
      {activeTab === 'employees' && (
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">Çalışanlar</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow">
          <div className="grid grid-cols-[auto_1fr_auto] gap-2 px-4 py-3 text-[11px] uppercase tracking-wide text-gray-600 border-b border-white/40">
            <span>Ad</span>
            <span>E-posta</span>
            <span>Telefon</span>
          </div>
          <div>
            {employees?.map((e: any) => (
              <div key={e.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-3 border-t border-white/30 hover:bg-white/70 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white grid place-items-center text-sm shrink-0">{e.name.charAt(0).toUpperCase()}</div>
                  <div className="text-sm font-semibold text-gray-900 truncate">{e.name}</div>
                </div>
                <div className="text-sm text-gray-800 truncate">{e.email || '-'}</div>
                <div className="text-sm text-gray-800">{e.phone || '-'}</div>
              </div>
            ))}
            {(!employees || employees.length === 0) && (
              <div className="px-4 py-10 text-center text-gray-500">Bu işletme henüz çalışan eklememiş.</div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Reviews Section - table */}
      {activeTab === 'reviews' && (
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">Müşteri Değerlendirmeleri</h2>
        </div>
        {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-3 text-[11px] uppercase tracking-wide text-gray-600 border-b border-white/40">
              <span>Kullanıcı</span>
              <span>Tarih</span>
              <span>Puan</span>
            </div>
            <div>
              {reviewsData.reviews.slice(0, 5).map((review: any) => (
                <div key={review.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-3 border-t border-white/30 hover:bg-white/70 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 text-white grid place-items-center text-sm shrink-0">
                      {(review.user_name?.charAt(0).toUpperCase() || 'M')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{review.user_name || 'Anonim'}</div>
                      {review.comment && <div className="text-xs text-gray-600 truncate">“{review.comment}”</div>}
                    </div>
                  </div>
                  <div className="text-sm text-gray-800">
                    {new Date(review.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="text-sm text-gray-900">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      {(((review.service_rating || 0) + (review.employee_rating || 0)) / 2).toFixed(1)} / 5
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {reviewsData.pagination && reviewsData.pagination.total > 5 && (
              <div className="px-4 py-3 border-t border-white/40 text-center">
                <button
                  onClick={() => { setReviewsOpen(true); setReviewsPage(1); }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-semibold shadow hover:shadow-md"
                >
                  Tüm Değerlendirmeleri Gör ({reviewsData.pagination.total})
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-gray-500">Bu işletme için henüz değerlendirme yapılmamış.</div>
        )}
      </div>
      )}

      <style jsx global>{`
        /* Ensure button is always visible */
        body { overflow-x: hidden; }
        .fixed-button { position: fixed !important; bottom: 24px !important; left: 50% !important; transform: translateX(-50%) !important; z-index: 9999 !important; }
      `}</style>
    </main>
    
    {/* Reviews Modal */}
    {reviewsOpen && (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setReviewsOpen(false)} />
        <div className="absolute inset-x-0 bottom-0 md:inset-0 md:m-auto md:max-w-2xl md:h-[80vh] bg-white/70 backdrop-blur-md rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col border border-white/40">
          <div className="py-2 flex items-center justify-center">
            <div className="w-12 h-1.5 rounded-full bg-gray-300" />
          </div>
          <div className="px-4 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Tüm Değerlendirmeler</h3>
            <button className="px-3 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-sm" onClick={() => setReviewsOpen(false)}>Kapat</button>
          </div>
          <div className="px-4 pb-3 border-b border-white/40 flex items-center justify-between text-sm text-gray-700">
            <span>Toplam: {fullReviews?.pagination?.total ?? reviewsData?.pagination?.total ?? 0}</span>
            <div className="flex items-center gap-2">
              <button disabled={reviewsPage<=1} onClick={() => setReviewsPage(p => Math.max(1, p-1))} className="px-3 py-1.5 rounded-xl bg-white/60 border border-white/40 disabled:opacity-50">Önceki</button>
              <span>Sayfa {reviewsPage}</span>
              <button disabled={fullReviews && (reviewsPage >= (fullReviews.pagination?.totalPages || 1))} onClick={() => setReviewsPage(p => p+1)} className="px-3 py-1.5 rounded-xl bg-white/60 border border-white/40 disabled:opacity-50">Sonraki</button>
            </div>
          </div>
          <div className="p-4 overflow-auto flex-1 space-y-3">
            {fullReviewsLoading && (
              <div className="text-center text-gray-500">Yükleniyor...</div>
            )}
            {fullReviews?.reviews?.map((review: any) => (
              <div key={review.id} className="border border-white/40 bg-white/60 backdrop-blur-md rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{review.user_name || 'Anonim'}</div>
                      <div className="text-xs text-gray-500" suppressHydrationWarning>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR').format(new Date(review.created_at))}</div>
                  </div>
                  <div className="text-right text-xs text-gray-700">
                    <div>Hizmet: {review.service_rating}/5</div>
                    <div>Çalışan: {review.employee_rating}/5</div>
                  </div>
                </div>
                <div className="text-sm text-gray-800">"{review.comment}"</div>
              </div>
            ))}
            {fullReviews && fullReviews.reviews?.length === 0 && (
              <div className="text-center text-gray-500">Kayıt yok</div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Sticky Booking Bar (mobile-first) */}
    <div className="fixed bottom-20 md:bottom-6 inset-x-0 z-[9999]">
      <div className="mx-auto max-w-4xl px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="md:rounded-2xl md:border md:border-white/40 md:backdrop-blur-md md:bg-white/60 md:shadow-2xl">
          <div className="flex justify-center md:grid md:grid-cols-[1fr_auto] gap-3 items-center p-3">
            <div className="hidden md:flex items-center gap-3 text-sm text-gray-800">
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
              className={`w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold shadow-2xl transition-all duration-200 active:scale-95 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 ${bookingLoading? 'opacity-80 cursor-wait':''}`}
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
    </>
  );
} 