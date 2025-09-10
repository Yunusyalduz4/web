"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';
import React from 'react';
import { handleLogout } from '../../../../utils/authUtils';
import { useUserPushNotifications } from '../../../../hooks/useUserPushNotifications';
import NotificationsButton from '../../../../components/NotificationsButton';
import SupportButton from '../../../../components/SupportButton';
import { useRealTimeReviews } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export default function UserProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery(userId ? { userId } : skipToken);
  const { data: userReviews, isLoading: reviewsLoading } = trpc.review.getByUser.useQuery(
    userId ? { userId, page: 1, limit: 50 } : skipToken
  );
  const updateMutation = trpc.user.updateProfile.useMutation();
  const deleteReviewMutation = trpc.review.deleteUserReview.useMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'reviews'>('profile');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photoSwiper, setPhotoSwiper] = useState<any>(null);
  
  // WebSocket entegrasyonu
  const { isConnected, isConnecting, error: socketError } = useWebSocketStatus();
  const { setCallbacks: setReviewCallbacks } = useRealTimeReviews(userId);
  
  // Push notification hook
  const { isSupported, isSubscribed, isLoading: pushLoading, error: pushError, subscribe, unsubscribe } = useUserPushNotifications();

  // Profil yüklendiğinde inputlara aktar
  React.useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!userId) return;
    try {
      await updateMutation.mutateAsync({ userId, name, email, password: password || undefined, phone, address });
      setSuccess('Profil başarıyla güncellendi!');
      setPassword('');
      setTimeout(() => router.refresh(), 1200);
    } catch (err: any) {
      setError(err.message || 'Profil güncellenemedi');
    }
  };

  const handleUserLogout = async () => {
    await handleLogout();
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Bu değerlendirmeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    
    try {
      await deleteReviewMutation.mutateAsync({ reviewId });
      // Sayfayı yenile
      router.refresh();
    } catch (error: any) {
      console.error('Review silme hatası:', error);
      alert('Değerlendirme silinirken bir hata oluştu: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-base text-gray-600">Profil yükleniyor…</span>
      </main>
    );
  }

  return (
    <main className="relative max-w-md mx-auto p-3 sm:p-4 pb-20 sm:pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/70 backdrop-blur-md border-b border-white/40">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-white/70 border border-white/50 text-gray-900 text-xs sm:text-sm hover:bg-white/80 active:bg-white/90 transition touch-manipulation min-h-[44px]">
            <span>←</span>
            <span className="hidden xs:inline">Geri</span>
          </button>
          <div className="text-sm sm:text-base font-bold tracking-tight text-gray-800">Profil</div>
          <div className="flex items-center gap-1 sm:gap-2">
            <SupportButton userType="user" />
            <NotificationsButton userType="user" />
          </div>
        </div>
      </div>

      {/* Header Mini - Mobile Optimized */}
      <section className="mt-3 sm:mt-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-xs sm:text-sm font-bold grid place-items-center">
            {(profile?.name?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">{profile?.name || 'Kullanıcı'}</div>
            <div className="text-xs sm:text-sm text-gray-600 truncate">{profile?.email || ''}</div>
          </div>
        </div>
      </section>

      {/* Tab Navigation - Mobile Optimized */}
      <section className="mt-3 sm:mt-4">
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/60 backdrop-blur-md border border-white/40">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-3 py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation min-h-[44px] ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-white/70 active:bg-white/80'
            }`}
          >
            <span className="hidden xs:inline">Profil Bilgileri</span>
            <span className="xs:hidden">Profil</span>
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 px-3 py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation min-h-[44px] ${
              activeTab === 'reviews'
                ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-white/70 active:bg-white/80'
            }`}
          >
            <span className="hidden xs:inline">Değerlendirmelerim</span>
            <span className="xs:hidden">Yorumlar</span>
          </button>
        </div>
      </section>

      {/* Tab Content - Mobile Optimized */}
      {activeTab === 'profile' && (
        <section className="mt-3 sm:mt-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Ad Soyad</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 touch-manipulation min-h-[44px]"
                autoComplete="name"
                placeholder="Adınız ve soyadınız"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 touch-manipulation min-h-[44px]"
                autoComplete="email"
                placeholder="E-posta adresiniz"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-200 touch-manipulation min-h-[44px]"
                autoComplete="tel"
                placeholder="05xx xxx xx xx"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Adres</label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={3}
                className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-200 touch-manipulation resize-none"
                placeholder="Adresiniz"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Yeni Şifre (opsiyonel)</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-200 touch-manipulation min-h-[44px]"
                autoComplete="new-password"
                placeholder="Yeni şifreniz"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs sm:text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-xs sm:text-sm text-green-700">{success}</div>
            )}

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm sm:text-base font-semibold shadow-md hover:shadow-lg active:shadow-xl transition disabled:opacity-60 touch-manipulation min-h-[44px]"
            >
              {updateMutation.isPending ? 'Güncelleniyor…' : 'Kaydet'}
            </button>
          </form>
        </section>
      )}

      {/* Değerlendirmelerim Tab - Mobile Optimized */}
      {activeTab === 'reviews' && (
        <section className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          {/* Header Stats - Mobile Optimized */}
          {userReviews?.reviews && userReviews.reviews.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-bold text-amber-900">Değerlendirme Geçmişiniz</h3>
                    <p className="text-[10px] sm:text-xs text-amber-700">
                      {userReviews.reviews.length} değerlendirme • 
                      Ortalama {((userReviews.reviews.reduce((acc: number, r: any) => acc + (r.service_rating + r.employee_rating) / 2, 0) / userReviews.reviews.length)).toFixed(1)}/5
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm sm:text-lg font-bold text-amber-900">
                    {userReviews.reviews.filter((r: any) => r.is_approved).length}
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-700">Onaylı</div>
                </div>
              </div>
            </div>
          )}

          {reviewsLoading ? (
            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-700 mb-1">Değerlendirmeleriniz yükleniyor...</div>
              <div className="text-xs text-gray-500">Lütfen bekleyin</div>
            </div>
          ) : !userReviews?.reviews || userReviews.reviews.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Henüz Değerlendirme Yapmadınız</h3>
              <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto leading-relaxed">
                Tamamlanan randevularınız için değerlendirme yaparak deneyimlerinizi paylaşın ve diğer kullanıcılara yardımcı olun.
              </p>
              <button
                onClick={() => router.push('/dashboard/user/reviews')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                İlk Değerlendirmemi Yap
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {userReviews.reviews.map((review: any, index: number) => (
                <div key={review.id} className="group bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 hover:bg-white/80 hover:shadow-md transition-all duration-200 hover:border-white/70">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md">
                        {review.business_name?.charAt(0)?.toUpperCase() || 'İ'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-0.5">{review.business_name}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          <span>{new Date(review.appointment_datetime).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Rating & Status */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-amber-500">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                        </svg>
                        <span className="text-sm font-bold text-gray-900">
                          {((review.service_rating + review.employee_rating) / 2).toFixed(1)}
                        </span>
                      </div>
                      {review.is_approved ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Onaylı
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Bekliyor
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Service & Employee Info */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-blue-50 border border-blue-100">
                      <div className="w-5 h-5 rounded bg-blue-500 text-white flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-blue-600 font-medium truncate">
                          {Array.isArray(review.service_names) ? review.service_names.join(', ') : '—'}
                        </div>
                      </div>
                    </div>
                    
                    {review.employee_names && review.employee_names.length > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-purple-50 border border-purple-100">
                        <div className="w-5 h-5 rounded bg-purple-500 text-white flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-purple-600 font-medium truncate">
                            {review.employee_names.join(', ')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <div className="mb-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-start gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-400 mt-0.5">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 font-medium mb-1">Yorumunuz</div>
                          <div className="text-xs text-gray-700 leading-relaxed mb-2">"{review.comment}"</div>
                          
                          {/* Review Photos - Minimal */}
                          {review.photos && review.photos.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                  <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                                  <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                <span className="text-xs text-gray-500 font-medium">{review.photos.length} görsel</span>
                              </div>
                              <div className="flex gap-1 overflow-x-auto">
                                {review.photos.slice(0, 4).map((photo: string, photoIndex: number) => (
                                  <div
                                    key={photoIndex}
                                    className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer group"
                                    onClick={() => {
                                      setCurrentPhotos(review.photos);
                                      setCurrentPhotoIndex(photoIndex);
                                      setPhotoModalOpen(true);
                                    }}
                                  >
                                    <img
                                      src={photo}
                                      alt={`Review photo ${photoIndex + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                    {/* Fallback for failed images */}
                                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center hidden">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      </svg>
                                    </div>
                                  </div>
                                ))}
                                {review.photos.length > 4 && (
                                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium">
                                    +{review.photos.length - 4}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rating Details */}
                  <div className="flex items-center justify-between mb-3 p-2 rounded-md bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-amber-700 font-medium">Hizmet:</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} width="10" height="10" viewBox="0 0 24 24" fill="none" className={star <= review.service_rating ? 'text-amber-500' : 'text-gray-300'}>
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                            </svg>
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-amber-900 ml-1">{review.service_rating}/5</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-amber-700 font-medium">Çalışan:</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} width="10" height="10" viewBox="0 0 24 24" fill="none" className={star <= review.employee_rating ? 'text-amber-500' : 'text-gray-300'}>
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                            </svg>
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-amber-900 ml-1">{review.employee_rating}/5</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span>{new Date(review.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}</span>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={deleteReviewMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-all duration-200 disabled:opacity-50"
                      title="Bu değerlendirmeyi sil"
                    >
                      {deleteReviewMutation.isPending ? (
                        <>
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Siliniyor...
                        </>
                      ) : (
                        <>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Sil
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Push Notification - Kullanıcı - Mobile Optimized */}
      {isSupported && (
        <section className="mt-3 sm:mt-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-semibold text-gray-800">Push Bildirimleri</div>
              <div className="text-[10px] sm:text-xs text-gray-600">
                {isSubscribed 
                  ? 'Randevu güncellemeleri için bildirim alınıyor' 
                  : 'Randevu güncellemeleri için bildirim almak ister misiniz?'
                }
              </div>
            </div>
            <button 
              onClick={isSubscribed ? unsubscribe : subscribe} 
              disabled={pushLoading} 
              className={`px-3 py-2 rounded-lg text-xs font-semibold touch-manipulation min-h-[44px] ${
                isSubscribed ? 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700' : 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700'
              } disabled:opacity-50`}
            >
              {pushLoading ? '⏳' : isSubscribed ? 'Kapat' : 'Aç'}
            </button>
          </div>
          {pushError && (
            <div className="mt-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[10px] sm:text-xs text-red-700">
              {pushError.includes('VAPID') 
                ? 'Push bildirimleri yapılandırılmamış. Lütfen daha sonra tekrar deneyin.' 
                : pushError
              }
            </div>
          )}
        </section>
      )}

      {/* Logout - Mobile Optimized */}
      <section className="mt-3 sm:mt-4">
        <button
          onClick={handleUserLogout}
          className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm sm:text-base font-medium transition-colors touch-manipulation min-h-[44px]"
        >
          Çıkış Yap
        </button>
      </section>

      {/* Photo Modal - Swiper - Mobile Optimized */}
      {photoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-2 sm:p-4">
          <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Close Button - Mobile Optimized */}
            <button
              onClick={() => setPhotoModalOpen(false)}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 active:bg-white/40 transition-colors touch-manipulation min-h-[44px]"
            >
              <span className="text-xl">×</span>
            </button>

            {/* Photo Counter - Mobile Optimized */}
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 bg-black/50 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 text-white text-xs sm:text-sm">
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
              <div className="flex justify-center gap-1 sm:gap-2 p-2 sm:p-4 overflow-x-auto no-scrollbar">
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

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        :root { 
          --randevuo-radius: 16px; 
          --randevuo-shadow: 0 8px 24px -12px rgba(0,0,0,0.25);
          --mobile-safe-area: env(safe-area-inset-bottom, 0px);
        }
        html, body { 
          font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; 
        }
        
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
        
        /* Custom breakpoint for extra small screens */
        @media (max-width: 475px) {
          .xs\\:inline {
            display: inline;
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
  );
} 