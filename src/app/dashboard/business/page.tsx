"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useState, useMemo, useEffect, useRef } from 'react';
import { skipToken } from '@tanstack/react-query';
import QRCode from 'qrcode';
import WeeklySlotView from '../../../components/WeeklySlotView';
import NotificationsButton from '../../../components/NotificationsButton';
import { useRealTimeAppointments, useRealTimeBusiness } from '../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../hooks/useWebSocketEvents';
// Hikaye bileşenleri - GEÇİCİ OLARAK KAPALI
// import { StoryCard, StoryGrid } from '../../../components/story/StoryCard';
// import StoryViewer from '../../../components/story/StoryViewer';

export default function BusinessDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const businessId = session?.user?.businessId;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  // Hikaye state'leri - GEÇİCİ OLARAK KAPALI
  // const [showStoryViewer, setShowStoryViewer] = useState(false);
  // const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Paylaş modal state'leri
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');

  // WebSocket entegrasyonu
  const { isConnected, isConnecting, error: socketError } = useWebSocketStatus();
  const { setCallbacks: setAppointmentCallbacks } = useRealTimeAppointments(undefined, businessId);
  const { setCallbacks: setBusinessCallbacks } = useRealTimeBusiness(businessId);

  // İşletme bilgilerini getir
  const { data: businesses } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => {
    if (session?.user?.role === 'business') {
      return b.owner_user_id === session?.user?.id;
    } else if (session?.user?.role === 'employee') {
      return b.id === session?.user?.businessId;
    }
    return false;
  });

  // Randevuları getir
  const { data: allAppointments, refetch: refetchAppointments } = trpc.appointment.getByBusiness.useQuery(
    businessId ? { businessId } : skipToken
  );

  // Backend'de filtreleme yapıldığı için frontend'de filtreleme gerekmiyor
  const appointments = allAppointments || [];

  // Hizmetleri ve çalışanları getir
  const { data: services } = trpc.business.getServices.useQuery(
    businessId ? { businessId } : skipToken
  );
  
  const { data: employees } = trpc.business.getEmployees.useQuery(
    businessId ? { businessId } : skipToken
  );

  // Hikaye API'leri ve fonksiyonları - GEÇİCİ OLARAK KAPALI
  /*
  const { data: stories, refetch: refetchStories } = trpc.story.getByBusiness.useQuery(
    businessId ? { businessId } : skipToken
  );

  const handleAddStory = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !businessId) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        const uploadResponse = await fetch('/api/upload_base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: base64Data,
            filename: `story_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${file.type.startsWith('video/') ? 'mp4' : 'jpg'}`
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error('Medya yükleme hatası');
        }

        const uploadData = await uploadResponse.json();

        const createResponse = await fetch('/api/story/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            mediaUrl: uploadData.url,
            mediaType: file.type.startsWith('video/') ? 'video' : 'image',
            mediaSize: uploadData.size || 0,
            mediaDuration: uploadData.duration || null,
            caption: '',
            backgroundColor: '#000000',
            textColor: '#FFFFFF',
            fontFamily: 'Arial',
            fontSize: 16,
            textPosition: 'center',
            filterType: 'none',
            hashtags: [],
            mentions: []
          }),
        });

        if (createResponse.ok) {
          refetchStories();
        } else {
          throw new Error('Hikaye oluşturma hatası');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Hikaye ekleme hatası:', error);
    }
  };
  */

  // Push notification hook'u
  const {
    isSupported,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe
  } = usePushNotifications(businessId || undefined);

  // WebSocket callback'lerini ayarla
  useEffect(() => {
    setAppointmentCallbacks({
      onAppointmentCreated: () => {
        refetchAppointments();
      },
      onAppointmentUpdated: () => {
        refetchAppointments();
      },
      onAppointmentCancelled: () => {
        refetchAppointments();
      },
      onAppointmentCompleted: () => {
        refetchAppointments();
      }
    });

    setBusinessCallbacks({
      onBusinessUpdated: () => {
      },
      onServiceUpdated: () => {
      },
      onEmployeeUpdated: () => {
      }
    });
  }, [setAppointmentCallbacks, setBusinessCallbacks, refetchAppointments]);

  // Aktif randevuları hesapla (pending + confirmed)
  const activeAppointments = appointments?.filter((a: any) => 
    a.status === 'pending' || a.status === 'confirmed'
  ).length || 0;

  // Paylaş fonksiyonları
  const generateQRCode = async (url: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('QR kod oluşturma hatası:', error);
      return '';
    }
  };

  const handleShareClick = async () => {
    if (!business) return;
    
    // İşletme detay sayfasının URL'sini oluştur
    const currentUrl = `${window.location.origin}/dashboard/user/businesses/${business.id}`;
    setShareUrl(currentUrl);
    
    try {
      const qrCode = await generateQRCode(currentUrl);
      setQrCodeDataUrl(qrCode);
      setShareModalOpen(true);
    } catch (error) {
      console.error('Paylaş modalı açma hatası:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link kopyalandı!');
    } catch (error) {
      console.error('Link kopyalama hatası:', error);
      alert('Link kopyalanamadı!');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: business?.name || 'İşletme',
          text: `${business?.name} işletmesini inceleyin`,
          url: shareUrl,
        });
      } catch (error) {
        // Kullanıcı paylaşımı iptal ettiyse veya AbortError ise sessizce geç
        if (error instanceof Error && error.name === 'AbortError') {
          // Kullanıcı paylaşımı iptal etti, hiçbir şey yapma
          return;
        }
        console.error('Paylaşım hatası:', error);
      }
    } else {
      // Fallback: link kopyala
      handleCopyLink();
    }
  };

  if (!businessId) {
    return (
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8 text-gray-500">
            <span className="text-2xl mb-2 block">🔒</span>
            <span>İşletme hesabı gerekli</span>
            <div className="mt-2 text-sm text-gray-400">
              Session: {JSON.stringify(session?.user, null, 2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!business) {
    return (
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8 text-gray-500">
            <span className="text-2xl mb-2 block">⏳</span>
            <span>İşletme bilgileri yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  // Onaylanmamış işletme için özel mesaj
  if (!business.is_approved) {
    return (
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-4">
              <div className="text-4xl mb-4">⏳</div>
              <h2 className="text-xl font-semibold text-yellow-800 mb-2">Admin Onayı Bekleniyor</h2>
              <p className="text-yellow-700 mb-4">
                İşletme hesabınız admin onayından sonra aktif olacak. Bu süreçte:
              </p>
              <ul className="text-left text-yellow-700 text-sm space-y-1 mb-4">
                <li>• Randevu alamayacaksınız</li>
                <li>• Hizmet ekleyemeyeceksiniz</li>
                <li>• Çalışan ekleyemeyeceksiniz</li>
                <li>• Dashboard özelliklerini kullanamayacaksınız</li>
              </ul>
              <p className="text-yellow-600 text-xs">
                Onay durumunuz e-posta ile bilgilendirilecek.
              </p>
            </div>
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <main className="relative max-w-md mx-auto p-3 sm:p-4 pb-20 sm:pb-24">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/70 backdrop-blur-md border-b border-white/40 mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
            {/* WebSocket Durumu */}
            <div className="flex items-center gap-1">
              {isConnecting && (
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" title="Bağlanıyor..."></div>
              )}
              {isConnected && (
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
              )}
              {socketError && (
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" title={`Hata: ${socketError}`}></div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Paylaş Butonu */}
            <button 
              onClick={handleShareClick}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center active:scale-95 transition-all duration-200 touch-manipulation bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
              title="İşletmeyi Paylaş"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" fill="currentColor"/>
              </svg>
            </button>
            <NotificationsButton userType="business" />
          </div>
        </div>
      </div>

      {/* Approval Status Banner - Mobile Optimized */}
      {!business.is_approved && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs sm:text-sm">⏳</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-yellow-800">Admin Onayı Bekleniyor</h3>
              <p className="text-xs sm:text-sm text-yellow-700">İşletme hesabınız admin onayından sonra aktif olacak. Bu süreçte randevu alamayacaksınız.</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Image Approval Banner - Mobile Optimized */}
      {business.profile_image_url && !business.profile_image_approved && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs sm:text-sm">📸</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-blue-800">Profil Görseli Onay Bekliyor</h3>
              <p className="text-xs sm:text-sm text-blue-700">Yüklediğiniz profil görseli admin onayından sonra görünür olacak.</p>
            </div>
          </div>
        </div>
      )}

      {/* Business Mini Card - Mobile Optimized */}
      <div 
        className="bg-white/60 backdrop-blur-md border-2 rounded-2xl p-3 sm:p-4 shadow mb-3 sm:mb-4 cursor-pointer hover:bg-white/80 transition-all duration-200 active:scale-[0.98]" 
        style={{
          borderImage: 'linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) 1',
          border: '2px solid transparent',
          background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box'
        }}
        onClick={() => router.push('/dashboard/business/edit')}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {business.profile_image_url && business.profile_image_approved ? (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
              <img 
                src={business.profile_image_url} 
                alt={business.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Resim yüklenemezse fallback ikon göster
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  ((e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement)!.style.display = 'flex';
                }}
              />
              <div className="w-full h-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white flex items-center justify-center text-sm sm:text-lg" style={{ display: 'none' }}>
                🏢
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white flex items-center justify-center text-sm sm:text-lg">🏢</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">{business.name}</div>
            <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] sm:text-[11px] font-semibold"><span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-600 rounded-full"></span>Aktif</span>
              <span className="text-[10px] sm:text-[11px] text-gray-600 truncate">{business.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row - Mobile Optimized */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <MiniStat 
          label="Aktif" 
          value={activeAppointments} 
          color="from-rose-500 to-fuchsia-600" 
          onClick={() => router.push('/dashboard/business/appointments')}
        />
        <MiniStat 
          label="Hizmet" 
          value={services?.length || 0} 
          color="from-indigo-500 to-indigo-600" 
          onClick={() => router.push('/dashboard/business/services')}
        />
        <MiniStat 
          label="Çalışan" 
          value={employees?.length || 0} 
          color="from-emerald-500 to-emerald-600" 
          onClick={() => router.push('/dashboard/business/employees')}
        />
      </div>

      {/* Hikayeler Bölümü - Mobile Optimized - GEÇİCİ OLARAK KAPALI */}
      {/* 
      <div className="bg-white/60 backdrop-blur-md border-2 rounded-2xl p-3 sm:p-4 shadow mb-3 sm:mb-4" 
           style={{
             borderImage: 'linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) 1',
             border: '2px solid transparent',
             background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box'
           }}>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white flex items-center justify-center text-xs sm:text-sm">
            📱
          </div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900">Hikayeler</h3>
        </div>

        <StoryGrid
          stories={stories || []}
          onStoryClick={(story, index) => {
            setSelectedStoryIndex(index);
            setShowStoryViewer(true);
          }}
          onAddStory={session?.user?.role === 'business' ? handleAddStory : undefined}
          showAddButton={session?.user?.role === 'business'}
          className="mb-2"
        />
      </div>
      */}

      {/* Push CTA - Mobile Optimized */}
      {isSupported && !isSubscribed && (
        <div className="mb-3 sm:mb-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4 shadow">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] sm:text-[12px] text-gray-800 min-w-0 flex-1">Yeni randevu taleplerinde anında bildirim almak için açın.</div>
            <button onClick={subscribe} disabled={pushLoading} className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-[10px] sm:text-[11px] font-semibold shadow hover:shadow-md active:shadow-lg disabled:opacity-60 touch-manipulation min-h-[44px]">
              {pushLoading ? 'Açılıyor…' : 'Bildirimleri Aç'}
            </button>
          </div>
          {pushError && <div className="mt-1 text-[10px] sm:text-[11px] text-rose-600">{pushError}</div>}
        </div>
      )}

      {/* Actions Grid - Mobile Optimized */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
        {/* Business Owner - Tüm butonlar görünür */}
        {session?.user?.role === 'business' && (
          <>
            <ActionChip title="Düzenle" onClick={() => router.push('/dashboard/business/edit')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.6"/></svg>
            } borderColor="border-l-blue-500" />
            <ActionChip title="Hizmet" onClick={() => router.push('/dashboard/business/services')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z"/></svg>
            } borderColor="border-l-green-500" />
            <ActionChip title="Çalışan" onClick={() => router.push('/dashboard/business/employees')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
            } borderColor="border-l-purple-500" />
            <ActionChip title="Randevu" onClick={() => router.push('/dashboard/business/appointments')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
            } borderColor="border-l-orange-500" />
            <ActionChip title="Analitik" onClick={() => router.push('/dashboard/business/analytics')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7 3h4v11h-4V10z"/></svg>
            } borderColor="border-l-indigo-500" />
            <ActionChip title="Profil" onClick={() => router.push('/dashboard/business/profile')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
            } borderColor="border-l-pink-500" />
            <ActionChip title="Yorum" onClick={() => router.push('/dashboard/business/reviews')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            } borderColor="border-l-yellow-500" />
          </>
        )}

        {/* Employee - Sadece belirli sayfalar görünür */}
        {session?.user?.role === 'employee' && (
          <>
            {/* Randevu Yönetimi */}
            <ActionChip title="Randevu" onClick={() => router.push('/dashboard/business/appointments')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
            } borderColor="border-l-orange-500" />
            
            {/* İstatistikler - Sadece kendi istatistikleri */}
            <ActionChip title="Analitik" onClick={() => router.push('/dashboard/business/analytics')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7 3h4v11h-4V10z"/></svg>
            } borderColor="border-l-indigo-500" />
            
            {/* Profil - Sadece kendi profili */}
            <ActionChip title="Profil" onClick={() => router.push('/dashboard/business/profile')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
            } borderColor="border-l-pink-500" />
            
            {/* Yorumlar - Sadece kendi randevularının yorumları */}
            <ActionChip title="Yorum" onClick={() => router.push('/dashboard/business/reviews')} icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            } borderColor="border-l-yellow-500" />
          </>
        )}
      </div>

      {/* 7 Günlük Slot Görünümü */}
      <WeeklySlotView 
        businessId={businessId} 
        appointments={appointments || []}
        selectedEmployeeId={session?.user?.role === 'employee' ? session?.user?.employeeId : selectedEmployeeId}
        onEmployeeChange={session?.user?.role === 'employee' ? undefined : setSelectedEmployeeId}
      />

      {/* Hikaye Modal'ları - GEÇİCİ OLARAK KAPALI */}
      {/*
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {showStoryViewer && stories && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          currentIndex={selectedStoryIndex}
          onClose={() => setShowStoryViewer(false)}
          onNext={() => {
            if (selectedStoryIndex < stories.length - 1) {
              setSelectedStoryIndex(prev => prev + 1);
            } else {
              setShowStoryViewer(false);
            }
          }}
          onPrevious={() => {
            if (selectedStoryIndex > 0) {
              setSelectedStoryIndex(prev => prev - 1);
            }
          }}
          onLike={async (storyId) => {
            try {
              await fetch('/api/trpc/story.like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId })
              });
            } catch (error) {
              console.error('Hikaye beğenme hatası:', error);
            }
          }}
        />
      )}
      */}

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

    {/* Paylaş Modal */}
    {shareModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setShareModalOpen(false)} />
        <div className="relative w-full max-w-md max-h-[90vh] bg-white/90 backdrop-blur-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col border border-white/40 overflow-hidden">
          {/* Mobile drag handle */}
          <div className="py-2 flex items-center justify-center sm:hidden">
            <div className="w-12 h-1.5 rounded-full bg-gray-300" />
          </div>
          
          {/* Header */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-lg">Paylaş</h3>
            <button 
              className="px-3 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 text-sm touch-manipulation min-h-[44px]" 
              onClick={() => setShareModalOpen(false)}
            >
              Kapat
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-4 flex-1 overflow-y-auto">
            {/* QR Code */}
            {qrCodeDataUrl && (
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  QR kodu tarayarak işletmeyi görüntüleyin
                </p>
              </div>
            )}

            {/* Link */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İşletme Linki
              </label>
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCopyLink}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 touch-manipulation min-h-[44px] flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>
                </svg>
                Kopyala
              </button>
              <button
                onClick={handleNativeShare}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-semibold hover:from-rose-700 hover:to-pink-700 active:from-rose-800 active:to-pink-800 transition-all duration-200 touch-manipulation min-h-[44px] flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" fill="currentColor"/>
                </svg>
                Paylaş
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function MiniStat({ label, value, color, onClick }: { label: string; value: number; color: string; onClick?: () => void }) {
  return (
    <div 
      className={`bg-white/60 backdrop-blur-md border-2 rounded-xl p-2 sm:p-3 text-center shadow ${onClick ? 'cursor-pointer hover:bg-white/80 transition-all duration-200 active:scale-[0.98]' : ''}`}
      style={{
        borderImage: 'linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) 1',
        border: '2px solid transparent',
        background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box'
      }}
      onClick={onClick}
    >
      <div className={`mx-auto mb-1 h-1 w-8 sm:w-10 rounded-full bg-gradient-to-r ${color}`}></div>
      <div className="text-sm sm:text-lg font-extrabold text-gray-900 leading-none">{value}</div>
      <div className="text-[10px] sm:text-[11px] text-gray-600">{label}</div>
    </div>
  );
}

function ActionChip({ title, onClick, icon, borderColor = "border-l-gray-300" }: { title: string; onClick: () => void; icon: React.ReactNode; borderColor?: string }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-xl bg-white/70 backdrop-blur-md border border-white/50 ${borderColor} border-l-4 text-gray-900 text-[10px] sm:text-[11px] font-semibold shadow hover:shadow-md active:shadow-lg transition touch-manipulation min-h-[44px]`}>
      {icon}
      <span className="hidden xs:inline">{title}</span>
    </button>
  );
}

// Manuel Randevu Müsaitlik Kontrolü Component'i
function ManualAppointmentAvailabilityCheck({ 
  employeeId, 
  date, 
  time, 
  serviceId, 
  services 
}: { 
  employeeId: string; 
  date: string; 
  time: string; 
  serviceId: string; 
  services: any; 
}) {
  // Çalışan müsaitlik durumunu al
  const { data: availability } = trpc.business.getEmployeeAvailability.useQuery(
    { employeeId },
    { enabled: !!employeeId }
  );

  // Seçilen hizmetin süresini al
  const selectedService = services?.find((s: any) => s.id === serviceId);
  const serviceDuration = selectedService?.duration_minutes || 0;

  // O gün için müsaitlik kontrolü
  const isAvailableOnDay = useMemo(() => {
    if (!availability || !date) return false;
    const dayOfWeek = new Date(date).getDay();
    return availability.some((a: any) => a.day_of_week === dayOfWeek);
  }, [availability, date]);

  // O saat için müsaitlik kontrolü
  const isAvailableAtTime = useMemo(() => {
    if (!availability || !date || !time || !isAvailableOnDay) return false;
    
    const dayOfWeek = new Date(date).getDay();
    const daySlots = availability.filter((a: any) => a.day_of_week === dayOfWeek);
    
    if (daySlots.length === 0) return false;
    
    // Seçilen saat ve süre için müsaitlik kontrolü
    const [hour, minute] = time.split(':').map(Number);
    const startTime = hour * 60 + minute; // dakika cinsinden
    const endTime = startTime + serviceDuration;
    
    return daySlots.some((slot: any) => {
      const [slotStartHour, slotStartMin] = slot.start_time.split(':').map(Number);
      const [slotEndHour, slotEndMin] = slot.end_time.split(':').map(Number);
      
      const slotStart = slotStartHour * 60 + slotStartMin;
      const slotEnd = slotEndHour * 60 + slotEndMin;
      
      // Seçilen zaman aralığı slot içinde mi?
      return startTime >= slotStart && endTime <= slotEnd;
    });
  }, [availability, date, time, serviceDuration, isAvailableOnDay]);

  // Çakışan randevuları kontrol et
  const { data: conflicts } = trpc.appointment.getEmployeeConflicts.useQuery(
    {
      employeeId,
      date,
      durationMinutes: serviceDuration
    },
    { enabled: !!employeeId && !!date && !!serviceDuration }
  );

  // Seçilen saatte çakışma var mı?
  const hasConflict = useMemo(() => {
    if (!conflicts || !time) return false;
    return conflicts[time] || false;
  }, [conflicts, time]);

  // Genel durum
  const overallStatus = useMemo(() => {
    if (!isAvailableOnDay) return 'unavailable_day';
    if (!isAvailableAtTime) return 'unavailable_time';
    if (hasConflict) return 'conflict';
    return 'available';
  }, [isAvailableOnDay, isAvailableAtTime, hasConflict]);

  // Durum mesajları
  const getStatusMessage = () => {
    switch (overallStatus) {
      case 'unavailable_day':
        return {
          text: 'Bu çalışan seçilen günde müsait değil',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'unavailable_time':
        return {
          text: 'Bu çalışan seçilen saatte müsait değil',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'conflict':
        return {
          text: 'Bu saatte çakışan randevu var',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'available':
        return {
          text: 'Çalışan müsait ✅',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      default:
        return {
          text: 'Müsaitlik kontrol ediliyor...',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const status = getStatusMessage();

  return (
    <div className={`p-3 rounded-lg border ${status.bgColor} ${status.borderColor}`}>
      <div className={`text-sm font-medium ${status.color} mb-2`}>
        {status.text}
      </div>
      
      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Gün müsaitliği:</span>
          <span className={isAvailableOnDay ? 'text-green-600' : 'text-red-600'}>
            {isAvailableOnDay ? '✅ Müsait' : '❌ Müsait değil'}
          </span>
        </div>
        
        {isAvailableOnDay && (
          <div className="flex items-center justify-between">
            <span>Saat müsaitliği:</span>
            <span className={isAvailableAtTime ? 'text-green-600' : 'text-orange-600'}>
              {isAvailableAtTime ? '✅ Müsait' : '❌ Müsait değil'}
            </span>
          </div>
        )}
        
        {isAvailableAtTime && (
          <div className="flex items-center justify-between">
            <span>Çakışma kontrolü:</span>
            <span className={hasConflict ? 'text-red-600' : 'text-green-600'}>
              {hasConflict ? '❌ Çakışma var' : '✅ Çakışma yok'}
            </span>
          </div>
        )}
        
        {selectedService && (
          <div className="flex items-center justify-between">
            <span>Hizmet süresi:</span>
            <span className="text-gray-700 font-medium">{serviceDuration} dakika</span>
          </div>
        )}
      </div>
      
      {overallStatus !== 'available' && (
        <div className="mt-3 p-2 bg-white/60 rounded border border-white/40">
          <div className="text-xs text-gray-600">
            <strong>Öneriler:</strong>
            {overallStatus === 'unavailable_day' && ' Başka bir gün seçin'}
            {overallStatus === 'unavailable_time' && ' Başka bir saat seçin'}
            {overallStatus === 'conflict' && ' Başka bir saat seçin veya çalışan değiştirin'}
          </div>
        </div>
      )}
    </div>
  );
}

// WeeklySlotView component'i kaldırıldı - yeni sistem gelecek