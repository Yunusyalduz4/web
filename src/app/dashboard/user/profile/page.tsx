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
import SupportModal from '../../../../components/SupportModal';
import NotificationsModal from '../../../../components/NotificationsModal';
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
  const updateProfileImageMutation = trpc.user.updateProfileImage.useMutation();
  const deleteReviewMutation = trpc.review.deleteUserReview.useMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'reviews'>('profile');
  const [profileOpen, setProfileOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [passwordUpdateOpen, setPasswordUpdateOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photoSwiper, setPhotoSwiper] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
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
      setProfileImageUrl(profile.profile_image_url || null);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!userId) return;
    try {
      await updateMutation.mutateAsync({ name, email, phone });
      setSuccess('Profil başarıyla güncellendi!');
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
      alert('Değerlendirme silinirken bir hata oluştu: ' + error.message);
    }
  };

  // Image resize helper to keep payloads small - mobil uyumlu
  const resizeImageToDataUrl = async (file: File, maxSize = 1600, quality = 0.8): Promise<string> => {
    // Mobil cihaz kontrolü
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // FileReader API kontrolü
    if (typeof FileReader === 'undefined') {
      throw new Error('Bu cihazda dosya okuma desteklenmiyor. Lütfen daha güncel bir tarayıcı kullanın.');
    }

    // Dosya boyutu kontrolü - çok büyük dosyaları reddet
    if (file.size > 10 * 1024 * 1024) { // 10MB
      throw new Error('Dosya çok büyük. Lütfen 10MB\'dan küçük bir dosya seçin.');
    }

    const dataUrl: string = await new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Dosya okunamadı'));
        reader.readAsDataURL(file);
      } catch (error) {
        reject(new Error('Dosya okunamadı'));
      }
    });

    // Canvas API kontrolü
    if (typeof document.createElement('canvas').getContext === 'undefined') {
      throw new Error('Bu cihazda görsel işleme desteklenmiyor. Lütfen daha güncel bir tarayıcı kullanın.');
    }

    const img = new Image();
    img.crossOrigin = 'anonymous'; // CORS sorunlarını önle
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Görsel yüklenemedi - dosya bozuk olabilir'));
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    let { width, height } = img;
    
    // Mobil cihazlarda daha agresif resize
    const mobileMaxSize = isMobile ? 1200 : maxSize;
    const scale = Math.min(1, mobileMaxSize / Math.max(width, height));
    
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    
    // Minimum boyut kontrolü
    if (width < 100 || height < 100) {
      throw new Error('Görsel çok küçük. Lütfen daha büyük bir görsel seçin.');
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas desteklenmiyor');
    
    // Mobil cihazlarda daha düşük kalite
    const mobileQuality = isMobile ? Math.min(quality, 0.7) : quality;
    
    ctx.drawImage(img, 0, 0, width, height);
    const mime = file.type.startsWith('image/png') ? 'image/jpeg' : file.type; // PNG -> JPEG küçültme
    const out = canvas.toDataURL(mime, mobileQuality);
    
    // Memory temizliği
    img.src = '';
    
    return out;
  };

  // Basit dosya yükleme (mobil fallback)
  const uploadFileSimple = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsDataURL(file);
    });
  };

  // Profile image upload via file picker
  const handleProfileFileSelect = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null); // Hata mesajını temizle
    try {
      let dataUrl: string;
      
      // Mobil cihazlarda resize yapmaya çalış, başarısız olursa basit yükleme yap
      try {
        dataUrl = await resizeImageToDataUrl(file, 1600, 0.8);
      } catch (resizeError) {
        dataUrl = await uploadFileSimple(file);
      }

      const resp = await fetch('/api/upload_base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, filename: file.name }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Upload failed');
      // If API returned data URL fallback, try stronger compression and retry once
      if (json.url && typeof json.url === 'string' && json.url.startsWith('data:')) {
        try {
          dataUrl = await resizeImageToDataUrl(file, 1200, 0.7);
        } catch (resizeError) {
          dataUrl = await uploadFileSimple(file);
        }
        
        const resp2 = await fetch('/api/upload_base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, filename: file.name })
        });
        const json2 = await resp2.json();
        if (resp2.ok && json2.url && typeof json2.url === 'string' && json2.url.startsWith('http')) {
          json.url = json2.url;
        } else {
          throw new Error('Görsel çok büyük. Lütfen daha küçük bir görsel yükleyin.');
        }
      }
      const absoluteUrl = json.url.startsWith('http') ? json.url : (typeof window !== 'undefined' ? `${window.location.origin}${json.url}` : json.url);
      
      // Update profile image
      if (userId) {
        await updateProfileImageMutation.mutateAsync({ 
          userId, 
          profileImageUrl: absoluteUrl 
        });
        setProfileImageUrl(absoluteUrl);
        setSuccess('Profil fotoğrafı başarıyla güncellendi!');
        setTimeout(() => router.refresh(), 1200);
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Profil fotoğrafı yüklenemedi';
      setUploadError(errorMessage);
      alert(errorMessage);
    } finally {
      setUploading(false);
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
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
        </div>
      </div>

      {/* Header Mini - Mobile Optimized */}
      <section className="mt-3 sm:mt-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {profileImageUrl ? (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                <img
                  src={profileImageUrl}
                  alt="Profil fotoğrafı"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="w-full h-full bg-gradient-to-br from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-xs sm:text-sm font-bold grid place-items-center hidden">
                  {(profile?.name?.[0] || 'U').toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-xs sm:text-sm font-bold grid place-items-center">
                {(profile?.name?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">{profile?.name || 'Kullanıcı'}</div>
            <div className="text-xs sm:text-sm text-gray-600 truncate">{profile?.email || ''}</div>
          </div>
        </div>
      </section>


      {/* Profil Bilgileri Butonu */}
      <section className="mt-3 sm:mt-4">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-full bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-4 hover:bg-white/70 active:bg-white/80 transition-all touch-manipulation"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900">Profil Bilgileri</h3>
                <p className="text-xs text-gray-600">Kişisel bilgilerinizi düzenleyin</p>
              </div>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className={`text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </section>

      {/* Profil Bilgileri İçeriği - Collapsible */}
      {profileOpen && (
        <section className="mt-3 sm:mt-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Profil Fotoğrafı */}
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Profil Fotoğrafı</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm">
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt="Profil fotoğrafı"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full bg-gradient-to-br from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-lg font-bold grid place-items-center ${profileImageUrl ? 'hidden' : ''}`}>
                    {(profile?.name?.[0] || 'U').toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-all cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleProfileFileSelect(e.target.files[0])} />
                      {uploading ? (
                        <>
                          <span className="inline-block w-3 h-3 border-2 border-white/90 border-t-transparent rounded-full animate-spin"></span>
                          <span>Yükleniyor</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m6-6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          <span>Yükle</span>
                        </>
                      )}
                    </label>
                    {profileImageUrl && (
                      <button 
                        type="button" 
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors" 
                        onClick={() => {
                          setProfileImageUrl(null);
                          if (userId) {
                            updateProfileImageMutation.mutateAsync({ 
                              userId, 
                              profileImageUrl: '' 
                            });
                          }
                        }}
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Hata mesajı */}
              {uploadError && (
                <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 text-center mt-2">
                  ⚠️ {uploadError}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Ad Soyad</label>
              <input
                type="text"
                value={name}
                readOnly
                className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-gray-100 border border-gray-200 text-gray-600 cursor-not-allowed touch-manipulation min-h-[44px]"
                autoComplete="name"
                placeholder="Adınız ve soyadınız"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">E-posta</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-gray-100 border border-gray-200 text-gray-600 cursor-not-allowed touch-manipulation min-h-[44px]"
                autoComplete="email"
                placeholder="E-posta adresiniz"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Telefon</label>
              <input
                type="tel"
                value={phone}
                readOnly
                className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-gray-100 border border-gray-200 text-gray-600 cursor-not-allowed touch-manipulation min-h-[44px]"
                autoComplete="tel"
                placeholder="05xx xxx xx xx"
              />
            </div>
            {/* Şifre Güncelleme Butonu */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setPasswordUpdateOpen(!passwordUpdateOpen)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation min-h-[44px]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 1l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm">Şifre Güncelle</span>
              </button>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs sm:text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-xs sm:text-sm text-green-700">{success}</div>
            )}

          </form>
        </section>
      )}

      {/* Şifre Güncelleme Formu - Collapsible */}
      {passwordUpdateOpen && (
        <section className="mt-3 sm:mt-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4 animate-fade-in">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 1l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Şifre Güncelle</h3>
                <p className="text-xs text-gray-600">Güvenliğiniz için mevcut şifrenizi girin</p>
              </div>
            </div>

            {/* Form */}
            <form className="space-y-4">
              {/* Mevcut Şifre */}
              <div>
                <label className="block text-xs sm:text-sm text-gray-700 mb-2 font-medium">Mevcut Şifre</label>
                <div className="relative">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white/80 border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all touch-manipulation min-h-[44px]"
                    placeholder="Mevcut şifrenizi girin"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Yeni Şifre */}
              <div>
                <label className="block text-xs sm:text-sm text-gray-700 mb-2 font-medium">Yeni Şifre</label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white/80 border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all touch-manipulation min-h-[44px]"
                    placeholder="Yeni şifrenizi girin"
                    required
                    minLength={6}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                      <path d="M12 1l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Şifre Onayı */}
              <div>
                <label className="block text-xs sm:text-sm text-gray-700 mb-2 font-medium">Yeni Şifre Onayı</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white/80 border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all touch-manipulation min-h-[44px]"
                    placeholder="Yeni şifrenizi tekrar girin"
                    required
                    minLength={6}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Şifre Kuralları */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-500 mt-0.5">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">Şifre Kuralları:</p>
                    <ul className="space-y-1 text-blue-600">
                      <li>• En az 6 karakter olmalı</li>
                      <li>• Güçlü bir şifre seçin</li>
                      <li>• Mevcut şifrenizden farklı olmalı</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordUpdateOpen(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all touch-manipulation min-h-[44px]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-xl shadow-sm hover:shadow-md transition-all touch-manipulation min-h-[44px]"
                >
                  Şifre Güncelle
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Değerlendirmelerim Butonu */}
      <section className="mt-3 sm:mt-4">
        <button
          onClick={() => setReviewsOpen(!reviewsOpen)}
          className="w-full bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-4 hover:bg-white/70 active:bg-white/80 transition-all touch-manipulation"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900">Değerlendirmelerim</h3>
                <p className="text-xs text-gray-600">Yaptığınız değerlendirmeleri görüntüleyin</p>
              </div>
            </div>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              className={`text-gray-500 transition-transform ${reviewsOpen ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </section>

      {/* Değerlendirmelerim İçeriği - Collapsible */}
      {reviewsOpen && (
        <section className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 animate-fade-in">
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

      {/* Destek Butonu */}
      <section className="mt-3 sm:mt-4">
        <button
          onClick={() => setSupportOpen(true)}
          className="w-full bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-4 hover:bg-white/70 active:bg-white/80 transition-all touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Destek</h3>
              <p className="text-xs text-gray-600">Yardım ve destek alın</p>
            </div>
          </div>
        </button>
      </section>

      {/* Bildirimler Butonu */}
      <section className="mt-3 sm:mt-4">
        <button
          onClick={() => setNotificationsOpen(true)}
          className="w-full bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-4 hover:bg-white/70 active:bg-white/80 transition-all touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Bildirimler</h3>
              <p className="text-xs text-gray-600">Bildirim ayarlarını yönetin</p>
            </div>
          </div>
        </button>
      </section>

      {/* Push Notification - Kullanıcı - Mobile Optimized */}
      {isSupported && (
        <section className="mt-3 sm:mt-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-semibold text-gray-800">Bildirimlere izin ver</div>
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


      {/* Destek Modal */}
      <SupportModal
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        userType="user"
      />

      {/* Bildirimler Modal */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        userType="user"
      />

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