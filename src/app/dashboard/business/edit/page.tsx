"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { trpc } from '../../../../utils/trpcClient';
import LocationPicker from '../../../../components/LocationPicker';
import { useRealTimeBusiness } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMars, faVenus, faVenusMars } from '@fortawesome/free-solid-svg-icons';

export default function BusinessEditPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses, isLoading } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    latitude: 0,
    longitude: 0,
    profileImageUrl: null as string | null,
    genderService: 'unisex' as 'male' | 'female' | 'unisex',
    instagramUrl: '',
    facebookUrl: '',
    tiktokUrl: '',
    xUrl: '',
  });

  const [images, setImages] = useState<Array<{ id: string; image_url: string; image_order: number; is_approved: boolean }>>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showProfileImageModal, setShowProfileImageModal] = useState(false);
  
  // Card açık/kapalı durumları
  const [cardStates, setCardStates] = useState({
    basicInfo: true,
    contact: false,
    gender: false,
    location: false,
    images: false,
    socialMedia: false,
  });

  const updateBusinessMutation = trpc.business.updateBusiness.useMutation();
  const getBusinessImagesQuery = trpc.business.getBusinessImagesForOwner.useQuery(
    { businessId: business?.id || '' },
    { enabled: !!business?.id }
  );
  const addBusinessImageMutation = trpc.business.addBusinessImage.useMutation();
  const updateBusinessImageMutation = trpc.business.updateBusinessImage.useMutation();
  const deleteBusinessImageMutation = trpc.business.deleteBusinessImage.useMutation();

  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || '',
        description: business.description || '',
        address: business.address || '',
        phone: business.phone || '',
        email: business.email || '',
        latitude: business.latitude || 0,
        longitude: business.longitude || 0,
        profileImageUrl: business.profile_image_url || null,
        genderService: business.gender_service || 'unisex',
        instagramUrl: business.instagram_url || '',
        facebookUrl: business.facebook_url || '',
        tiktokUrl: business.tiktok_url || '',
        xUrl: business.x_url || '',
      });
    }
  }, [business]);

  useEffect(() => {
    if (getBusinessImagesQuery.data) {
      setImages(getBusinessImagesQuery.data);
    }
  }, [getBusinessImagesQuery.data]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (location: { lat: number; lng: number; address: string }) => {
    setFormData(prev => ({
      ...prev,
      latitude: location.lat,
      longitude: location.lng,
      address: location.address,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setIsSubmitting(true);
    try {
      await updateBusinessMutation.mutateAsync({
        id: business.id,
        ...formData,
        profileImageUrl: formData.profileImageUrl ?? null,
        genderService: formData.genderService,
      });
      alert('İşletme bilgileri başarıyla güncellendi!');
    } catch (error) {
      alert('Güncelleme sırasında bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // File upload -> base64 -> upload API -> directly add to business images

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
        reject(new Error('Dosya okuma hatası: ' + (error as Error).message));
      }
    });

    // Canvas API kontrolü
    if (typeof document.createElement('canvas').getContext === 'undefined') {
      throw new Error('Bu cihazda görsel işleme desteklenmiyor. Lütfen daha güncel bir tarayıcı kullanın.');
    }

    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      // crossOrigin ayarını kaldırdık - data URL'ler için gerekli değil ve sorun yaratabilir
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas desteklenmiyor'));
            return;
          }

          let { width, height } = img;
          
          // Mobil cihazlarda daha agresif resize
          const mobileMaxSize = isMobile ? 1200 : maxSize;
          const scale = Math.min(1, mobileMaxSize / Math.max(width, height));
          
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          
          // Minimum boyut kontrolü
          if (width < 100 || height < 100) {
            reject(new Error('Görsel çok küçük. Lütfen daha büyük bir görsel seçin.'));
            return;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Görsel kalitesi ayarları
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Mobil cihazlarda daha düşük kalite
          const mobileQuality = isMobile ? Math.min(quality, 0.7) : quality;
          
          ctx.drawImage(img, 0, 0, width, height);
          const mime = file.type.startsWith('image/png') ? 'image/jpeg' : file.type; // PNG -> JPEG küçültme
          const out = canvas.toDataURL(mime, mobileQuality);
          
          // Memory temizliği - event listener'ları temizle
          img.onload = null;
          img.onerror = null;
          img.src = '';
          canvas.width = 0;
          canvas.height = 0;
          
          resolve(out);
        } catch (error) {
          reject(new Error('Görsel işleme hatası: ' + (error as Error).message));
        }
      };
      
      img.onerror = () => {
        reject(new Error('Görsel yüklenemedi - dosya bozuk olabilir'));
      };
      
      img.src = dataUrl;
    });
  };

  // Mobil cihazlar için basit dosya yükleme (resize olmadan)
  const uploadFileSimple = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Dosya okunamadı'));
        reader.readAsDataURL(file);
      } catch (error) {
        reject(new Error('Dosya okuma hatası: ' + (error as Error).message));
      }
    });
  };

  const handleFileSelect = async (file: File) => {
    if (!file || !business) return;
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
      setNewImageUrl(json.url);

      // If API returned data URL fallback, try more compression and retry once to avoid huge payloads in DB
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

      // Directly add uploaded image to business gallery
      await addBusinessImageMutation.mutateAsync({
        businessId: business.id,
        imageUrl: absoluteUrl,
        imageOrder: images.length,
      });
      getBusinessImagesQuery.refetch();
    } catch (e: any) {
      const errorMessage = e.message || 'Dosya yüklenemedi';
      setUploadError(errorMessage);
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
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
      setFormData(prev => ({ ...prev, profileImageUrl: absoluteUrl }));
    } catch (e: any) {
      const errorMessage = e.message || 'Profil fotoğrafı yüklenemedi';
      setUploadError(errorMessage);
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!business) return;

    try {
      await deleteBusinessImageMutation.mutateAsync({
        id: imageId,
        businessId: business.id,
      });
      getBusinessImagesQuery.refetch();
    } catch (error) {
      alert('Resim silinirken bir hata oluştu.');
    }
  };

  const handleReorderImages = async (imageId: string, newOrder: number) => {
    if (!business) return;

    // Local reorder then persist all to keep indexes consistent
    const current = [...images].sort((a, b) => a.image_order - b.image_order);
    const fromIndex = current.findIndex((img) => img.id === imageId);
    if (fromIndex === -1) return;
    const toIndex = Math.max(0, Math.min(newOrder, current.length - 1));
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);

    // Reindex locally
    const reindexed = current.map((img, idx) => ({ ...img, image_order: idx }));
    setImages(reindexed);

    try {
      for (const img of reindexed) {
        await updateBusinessImageMutation.mutateAsync({
          id: img.id,
          businessId: business.id,
          imageOrder: img.image_order,
        });
      }
      getBusinessImagesQuery.refetch();
    } catch (error) {
      alert('Resim sırası güncellenirken bir hata oluştu.');
    }
  };

  const moveImageUp = (index: number) => {
    const img = images.find((i) => i.image_order === index);
    if (img) handleReorderImages(img.id, index - 1);
  };

  const moveImageDown = (index: number) => {
    const img = images.find((i) => i.image_order === index);
    if (img) handleReorderImages(img.id, index + 1);
  };

  const moveImageFirst = (index: number) => {
    const img = images.find((i) => i.image_order === index);
    if (img) handleReorderImages(img.id, 0);
  };

  const moveImageLast = (index: number) => {
    const img = images.find((i) => i.image_order === index);
    if (img) handleReorderImages(img.id, images.length - 1);
  };

  // Card toggle fonksiyonu
  const toggleCard = (cardName: keyof typeof cardStates) => {
    setCardStates(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-5xl mb-2">⏳</span>
        <span className="text-lg text-gray-400">İşletme bilgileri yükleniyor...</span>
      </main>
    );
  }

  if (!business) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-5xl mb-2">🏢</span>
        <span className="text-lg text-gray-500">İşletme bulunamadı.</span>
      </main>
    );
  }

  return (
    <main className="relative max-w-md mx-auto p-3 sm:p-4 pb-20 sm:pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/80 backdrop-blur-md border-b border-white/60 mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.push('/dashboard/business')} className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/70 border border-white/50 text-gray-900 shadow-sm hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
              <div className="text-[10px] sm:text-xs text-gray-600">İşletme Düzenle</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
          </div>
        </div>
      </div>

      {/* Modern Form - Mobile Optimized */}
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {/* Temel Bilgiler Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          <button 
            type="button"
            onClick={() => toggleCard('basicInfo')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                  <path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/>
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors">Temel Bilgiler</h2>
                <p className="text-xs text-gray-500">İşletme adı, açıklama ve profil fotoğrafı</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
              {cardStates.basicInfo ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-blue-600 transition-colors">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-blue-600 transition-colors">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
          
          {cardStates.basicInfo && (
            <div className="px-4 pb-4 space-y-4">
              {/* Profile Image Section */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div 
                  className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => formData.profileImageUrl && setShowProfileImageModal(true)}
                >
                  {formData.profileImageUrl ? (
                    <img src={formData.profileImageUrl} alt="Profil" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-lg">🏢</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 mb-1">Profil Fotoğrafı</div>
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
                    {formData.profileImageUrl && (
                      <button type="button" className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors" onClick={() => setFormData(prev => ({ ...prev, profileImageUrl: null }))}>
                        Kaldır
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Hata mesajı */}
              {uploadError && (
                <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 text-center">
                  ⚠️ {uploadError}
                </div>
              )}
              
              {/* İşletme Adı */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">İşletme Adı *</label>
                <input 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                  placeholder="İşletme adınızı girin" 
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                />
              </div>
              
              {/* Açıklama */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Açıklama</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  rows={2} 
                  placeholder="İşletmeniz hakkında kısa bir açıklama yazın..." 
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none" 
                />
              </div>
            </div>
          )}
        </div>

        {/* İletişim Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          <button 
            type="button"
            onClick={() => toggleCard('contact')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-base font-medium text-gray-900 group-hover:text-green-600 transition-colors">İletişim Bilgileri</h2>
                <p className="text-xs text-gray-500">Telefon, e-posta ve adres bilgileri</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-green-50 transition-colors">
              {cardStates.contact ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-green-600 transition-colors">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-green-600 transition-colors">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
          
          {cardStates.contact && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Telefon</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleInputChange} 
                  placeholder="Telefon numaranızı girin" 
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">E-posta</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  placeholder="E-posta adresinizi girin" 
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Adres *</label>
                <input 
                  name="address" 
                  value={formData.address} 
                  onChange={handleInputChange} 
                  required 
                  placeholder="İşletme adresinizi girin" 
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" 
                />
              </div>
            </div>
          )}
        </div>

        {/* Hizmet Cinsiyeti Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          <button 
            type="button"
            onClick={() => toggleCard('gender')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                  <path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/>
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-base font-medium text-gray-900 group-hover:text-purple-600 transition-colors">Hizmet Cinsiyeti</h2>
                <p className="text-xs text-gray-500">Hangi cinsiyete hizmet veriyorsunuz?</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
              {cardStates.gender ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-purple-600 transition-colors">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-purple-600 transition-colors">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
          
          {cardStates.gender && (
            <div className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.genderService === 'male' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-blue-300'
                }`}>
                  <input
                    type="radio"
                    name="genderService"
                    value="male"
                    checked={formData.genderService === 'male'}
                    onChange={(e) => setFormData(prev => ({ ...prev, genderService: e.target.value as 'male' | 'female' | 'unisex' }))}
                    className="hidden"
                  />
                  <FontAwesomeIcon icon={faMars} className="text-2xl mb-2 text-blue-600" />
                  <div className="text-xs font-medium">Erkek</div>
                </label>
                
                <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.genderService === 'female' 
                    ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-pink-300'
                }`}>
                  <input
                    type="radio"
                    name="genderService"
                    value="female"
                    checked={formData.genderService === 'female'}
                    onChange={(e) => setFormData(prev => ({ ...prev, genderService: e.target.value as 'male' | 'female' | 'unisex' }))}
                    className="hidden"
                  />
                  <FontAwesomeIcon icon={faVenus} className="text-2xl mb-2 text-pink-600" />
                  <div className="text-xs font-medium">Kadın</div>
                </label>
                
                <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.genderService === 'unisex' 
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-purple-300'
                }`}>
                  <input
                    type="radio"
                    name="genderService"
                    value="unisex"
                    checked={formData.genderService === 'unisex'}
                    onChange={(e) => setFormData(prev => ({ ...prev, genderService: e.target.value as 'male' | 'female' | 'unisex' }))}
                    className="hidden"
                  />
                  <FontAwesomeIcon icon={faVenusMars} className="text-2xl mb-2 text-purple-600" />
                  <div className="text-xs font-medium">Unisex</div>
                </label>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-700 text-center">
                  {formData.genderService === 'male' && 'Sadece erkek müşterilere hizmet veriyorsunuz'}
                  {formData.genderService === 'female' && 'Sadece kadın müşterilere hizmet veriyorsunuz'}
                  {formData.genderService === 'unisex' && 'Tüm müşterilere hizmet veriyorsunuz'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Konum Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          <button 
            type="button"
            onClick={() => toggleCard('location')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-base font-medium text-gray-900 group-hover:text-orange-600 transition-colors">Konum</h2>
                <p className="text-xs text-gray-500">İşletmenizin konumunu haritadan seçin</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
              {cardStates.location ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-orange-600 transition-colors">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-orange-600 transition-colors">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
          
          {cardStates.location && (
            <div className="px-4 pb-4">
              <LocationPicker onLocationSelect={handleLocationChange} defaultLocation={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : undefined} />
            </div>
          )}
        </div>

      </form>

      {/* Görsel Yönetimi Card */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
        <button 
          type="button"
          onClick={() => toggleCard('images')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div className="text-left">
              <h2 className="text-base font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Görsel Galerisi</h2>
              <p className="text-xs text-gray-500">İşletmenizin görsellerini yönetin</p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
            {cardStates.images ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-indigo-600 transition-colors">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-indigo-600 transition-colors">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </button>
        
        {cardStates.images && (
          <div className="px-4 pb-4 space-y-4">
            {/* Hata mesajı gösterimi */}
            {uploadError && (
              <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 text-center">
                ⚠️ {uploadError}
              </div>
            )}
            
            {/* Yükleme Alanı */}
            <div
              className="relative rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 flex flex-col items-center justify-center hover:border-indigo-400 transition-colors"
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex items-center justify-center mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div className="text-center mb-3">
                <div className="text-sm font-medium text-gray-900 mb-1">Görsel Ekle</div>
                <div className="text-xs text-gray-600">Sürükle-bırak veya tıkla</div>
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium hover:shadow-md transition-all cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
                {uploading ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-white/90 border-t-transparent rounded-full animate-spin"></span>
                    <span>Yükleniyor</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m6-6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>Resim Yükle</span>
                  </>
                )}
              </label>
            </div>

            {/* Görsel Galerisi */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {images
                  .slice()
                  .sort((a, b) => a.image_order - b.image_order)
                  .map((image, index, arr) => (
                    <div key={image.id} className="relative group bg-white rounded-lg p-2 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                      <div className="relative">
                        <img src={image.image_url} alt={`Resim ${index + 1}`} className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                        
                        {/* Onay Durumu Badge */}
                        <div className="absolute top-1 left-1">
                          {image.is_approved ? (
                            <div className="px-1.5 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-800 text-xs font-medium">
                              ✅ Onaylı
                            </div>
                          ) : (
                            <div className="px-1.5 py-0.5 rounded-full bg-yellow-100 border border-yellow-200 text-yellow-800 text-xs font-medium">
                              ⏳ Bekliyor
                            </div>
                          )}
                        </div>
                        
                        {/* Sıra Numarası */}
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-white/90 border border-gray-200 text-xs font-medium text-gray-900">
                          {index + 1}/{arr.length}
                        </div>
                        
                        {/* Kontrol Butonları */}
                        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveImageFirst(index)} disabled={index === 0} className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 border border-gray-200 text-gray-900 shadow-sm hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed" title="Başa al">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 4v16M10 8l-4 4 4 4M14 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <button onClick={() => moveImageUp(index)} disabled={index === 0} className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 border border-gray-200 text-gray-900 shadow-sm hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed" title="Yukarı">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 8l-5 5h10l-5-5z" fill="currentColor"/></svg>
                          </button>
                          <button onClick={() => moveImageDown(index)} disabled={index === arr.length - 1} className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 border border-gray-200 text-gray-900 shadow-sm hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed" title="Aşağı">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 16l5-5H7l5 5z" fill="currentColor"/></svg>
                          </button>
                          <button onClick={() => moveImageLast(index)} disabled={index === arr.length - 1} className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 border border-gray-200 text-gray-900 shadow-sm hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed" title="Sona al">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 4v16M10 8l4 4-4 4M6 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <button onClick={() => handleDeleteImage(image.id)} className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-500 text-white shadow-sm hover:bg-red-600 transition" title="Sil">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 7h12l-1 13H7L6 7zm3-3h6l1 2H8l1-2z" fill="currentColor"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <div className="text-sm text-gray-500">Henüz görsel yok</div>
                <div className="text-xs text-gray-400 mt-1">Yukarıdaki butona tıklayarak görsel ekleyebilirsiniz</div>
              </div>
            )}
          </div>
        )}
      </div>

        {/* Sosyal Medya Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          <button 
            type="button"
            onClick={() => toggleCard('socialMedia')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className="text-base font-medium text-gray-900 group-hover:text-purple-600 transition-colors">Sosyal Medya</h2>
                <p className="text-xs text-gray-500">İşletmenizin sosyal medya hesapları</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
              {cardStates.socialMedia ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-purple-600 transition-colors">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600 group-hover:text-purple-600 transition-colors">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
          
          {cardStates.socialMedia && (
            <div className="px-4 pb-4 space-y-4">
              {/* Instagram */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  <span className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <defs>
                          <linearGradient id="instagram-gradient-edit" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f09433"/>
                            <stop offset="25%" stopColor="#e6683c"/>
                            <stop offset="50%" stopColor="#dc2743"/>
                            <stop offset="75%" stopColor="#cc2366"/>
                            <stop offset="100%" stopColor="#bc1888"/>
                          </linearGradient>
                        </defs>
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="url(#instagram-gradient-edit)"/>
                        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="white"/>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="white" strokeWidth="2"/>
                      </svg>
                    </div>
                    Instagram
                  </span>
                </label>
                <input 
                  name="instagramUrl" 
                  value={formData.instagramUrl} 
                  onChange={handleInputChange} 
                  type="url"
                  placeholder="https://instagram.com/isletmeniz" 
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all" 
                />
              </div>

              {/* Facebook */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  <span className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    Facebook
                  </span>
                </label>
                <input 
                  name="facebookUrl" 
                  value={formData.facebookUrl} 
                  onChange={handleInputChange} 
                  type="url"
                  placeholder="https://facebook.com/isletmeniz" 
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                />
              </div>

              {/* TikTok */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  <span className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#000000">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                    TikTok
                  </span>
                </label>
                <input 
                  name="tiktokUrl" 
                  value={formData.tiktokUrl} 
                  onChange={handleInputChange} 
                  type="url"
                  placeholder="https://tiktok.com/@isletmeniz" 
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all" 
                />
              </div>

              {/* X (Twitter) */}
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  <span className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#000000">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </div>
                    X (Twitter)
                  </span>
                </label>
                <input 
                  name="xUrl" 
                  value={formData.xUrl} 
                  onChange={handleInputChange} 
                  type="url"
                  placeholder="https://x.com/isletmeniz" 
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all" 
                />
              </div>
            </div>
          )}
        </div>

      {/* Kaydet Butonu - En Altta */}
      <div className="mt-4 sticky bottom-4 z-20">
        <button 
          type="submit" 
          disabled={isSubmitting} 
          onClick={handleSubmit}
          className="w-full py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm sm:text-base font-bold shadow-lg hover:shadow-xl active:shadow-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/90 border-t-transparent rounded-full animate-spin"></span>
              <span>Güncelleniyor...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 21v-8H7v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Değişiklikleri Kaydet</span>
            </div>
          )}
        </button>
      </div>

      {/* Profile Image Modal */}
      {showProfileImageModal && formData.profileImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Profil Fotoğrafı</h3>
                <button
                  onClick={() => setShowProfileImageModal(false)}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6">
                <div className="flex justify-center">
                  <img 
                    src={formData.profileImageUrl} 
                    alt="Profil Fotoğrafı" 
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
             
                <button
                  onClick={() => setShowProfileImageModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
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