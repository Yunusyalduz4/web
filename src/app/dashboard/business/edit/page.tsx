"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { trpc } from '../../../../utils/trpcClient';
import LocationPicker from '../../../../components/LocationPicker';

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
  });

  const [images, setImages] = useState<Array<{ id: string; image_url: string; image_order: number; is_approved: boolean }>>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Image resize helper to keep payloads small
  const resizeImageToDataUrl = async (file: File, maxSize = 1600, quality = 0.8): Promise<string> => {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsDataURL(file);
    });

    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Görsel yüklenemedi'));
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    let { width, height } = img;
    const scale = Math.min(1, maxSize / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas desteklenmiyor');
    ctx.drawImage(img, 0, 0, width, height);
    const mime = file.type.startsWith('image/png') ? 'image/jpeg' : file.type; // PNG -> JPEG küçültme
    const out = canvas.toDataURL(mime, quality);
    return out;
  };

  const handleFileSelect = async (file: File) => {
    if (!file || !business) return;
    setUploading(true);
    try {
      // Resize before upload to avoid 413
      let dataUrl = await resizeImageToDataUrl(file, 1600, 0.8);

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
        dataUrl = await resizeImageToDataUrl(file, 1200, 0.7);
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
      alert(e.message || 'Dosya yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  // Profile image upload via file picker
  const handleProfileFileSelect = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      // Resize before upload to avoid 413
      let dataUrl = await resizeImageToDataUrl(file, 1600, 0.8);

      const resp = await fetch('/api/upload_base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, filename: file.name }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Upload failed');
      // If API returned data URL fallback, try stronger compression and retry once
      if (json.url && typeof json.url === 'string' && json.url.startsWith('data:')) {
        dataUrl = await resizeImageToDataUrl(file, 1200, 0.7);
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
      alert(e.message || 'Profil fotoğrafı yüklenemedi');
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
    <main className="relative max-w-md mx-auto p-3 pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 bg-white/70 backdrop-blur-md border-b border-white/40 mb-3">
        <div className="flex items-center justify-between">
          <div className="text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">kuado</div>
          <button onClick={() => router.push('/dashboard/business')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/70 border border-white/50 text-gray-900 text-xs shadow-sm">
            <span>←</span>
            <span className="hidden sm:inline">Geri</span>
          </button>
        </div>
      </div>

      {/* Minimal Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <details open className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl px-3 py-3">
          <summary className="text-sm font-semibold text-gray-900 cursor-pointer list-none">Temel Bilgiler</summary>
          <div className="mt-3 grid grid-cols-1 gap-3">
            {/* Profile Image */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/50 bg-white/70 flex items-center justify-center">
                {formData.profileImageUrl ? (
                  <img src={formData.profileImageUrl} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-500">Profil</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-xs font-semibold shadow cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleProfileFileSelect(e.target.files[0])} />
                  {uploading ? 'Yükleniyor…' : 'Profil Fotoğrafı Yükle'}
                </label>
                {formData.profileImageUrl && (
                  <button type="button" className="px-3 py-2 rounded-lg bg-white/80 border border-white/50 text-gray-900 text-xs" onClick={() => setFormData(prev => ({ ...prev, profileImageUrl: null }))}>Kaldır</button>
                )}
              </div>
            </div>
            <input name="name" value={formData.name} onChange={handleInputChange} required placeholder="İşletme adı" className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
            <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Açıklama (opsiyonel)" className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
          </div>
        </details>

        <details className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl px-3 py-3">
          <summary className="text-sm font-semibold text-gray-900 cursor-pointer list-none">İletişim</summary>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Telefon" className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="E-posta" className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
            <input name="address" value={formData.address} onChange={handleInputChange} required placeholder="Adres" className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
          </div>
        </details>

        <details className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl px-3 py-3">
          <summary className="text-sm font-semibold text-gray-900 cursor-pointer list-none">Hizmet Cinsiyeti</summary>
          <div className="mt-3">
            <div className="text-xs text-gray-600 mb-2">Hangi cinsiyete hizmet veriyorsunuz?</div>
            <div className="grid grid-cols-3 gap-2">
              <label className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                formData.genderService === 'male' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-white/50 bg-white/80 text-gray-700 hover:bg-white/90'
              }`}>
                <input
                  type="radio"
                  name="genderService"
                  value="male"
                  checked={formData.genderService === 'male'}
                  onChange={(e) => setFormData(prev => ({ ...prev, genderService: e.target.value as 'male' | 'female' | 'unisex' }))}
                  className="hidden"
                />
                <div className="text-center">
                  <div className="text-lg mb-1">👨</div>
                  <div className="text-xs font-medium">Erkek</div>
                </div>
              </label>
              
              <label className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                formData.genderService === 'female' 
                  ? 'border-pink-500 bg-pink-50 text-pink-700' 
                  : 'border-white/50 bg-white/80 text-gray-700 hover:bg-white/90'
              }`}>
                <input
                  type="radio"
                  name="genderService"
                  value="female"
                  checked={formData.genderService === 'female'}
                  onChange={(e) => setFormData(prev => ({ ...prev, genderService: e.target.value as 'male' | 'female' | 'unisex' }))}
                  className="hidden"
                />
                <div className="text-center">
                  <div className="text-lg mb-1">👩</div>
                  <div className="text-xs font-medium">Kadın</div>
                </div>
              </label>
              
              <label className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                formData.genderService === 'unisex' 
                  ? 'border-purple-500 bg-purple-50 text-purple-700' 
                  : 'border-white/50 bg-white/80 text-gray-700 hover:bg-white/90'
              }`}>
                <input
                  type="radio"
                  name="genderService"
                  value="unisex"
                  checked={formData.genderService === 'unisex'}
                  onChange={(e) => setFormData(prev => ({ ...prev, genderService: e.target.value as 'male' | 'female' | 'unisex' }))}
                  className="hidden"
                />
                <div className="text-center">
                  <div className="text-lg mb-1">👥</div>
                  <div className="text-xs font-medium">Unisex</div>
                </div>
              </label>
            </div>
            <div className="text-[11px] text-gray-500 mt-2 text-center">
              {formData.genderService === 'male' && 'Sadece erkek müşterilere hizmet veriyorsunuz'}
              {formData.genderService === 'female' && 'Sadece kadın müşterilere hizmet veriyorsunuz'}
              {formData.genderService === 'unisex' && 'Tüm müşterilere hizmet veriyorsunuz'}
            </div>
          </div>
        </details>

        <details className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl px-3 py-3">
          <summary className="text-sm font-semibold text-gray-900 cursor-pointer list-none">Konum</summary>
          <div className="mt-3">
            <LocationPicker onLocationSelect={handleLocationChange} defaultLocation={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : undefined} />
          </div>
        </details>

        <button type="submit" disabled={isSubmitting} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:opacity-60 disabled:hover:scale-100">
          {isSubmitting ? 'Güncelleniyor...' : 'Kaydet'}
        </button>
      </form>

      {/* Images */}
      <details className="mt-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl px-3 py-3">
        <summary className="text-sm font-semibold text-gray-900 cursor-pointer list-none">Görseller</summary>
        <div className="mt-3 space-y-3">
          <div
            className="relative rounded-2xl border border-white/50 bg-gradient-to-br from-rose-50/70 to-fuchsia-50/70 backdrop-blur-md p-3 flex items-center justify-between shadow-sm"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white flex items-center justify-center shadow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div className="text-[13px] text-gray-900">
                <div className="font-semibold">Görsel ekle</div>
                <div className="text-[11px] text-gray-700">Sürükle-bırak yap veya butona tıkla</div>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-rose-200 cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
              {uploading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/90 border-t-transparent rounded-full animate-spin"></span>
                  <span>Yükleniyor</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v12m6-6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  <span>Resim Yükle</span>
                </>
              )}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {images
              .slice()
              .sort((a, b) => a.image_order - b.image_order)
              .map((image, index, arr) => (
                <div key={image.id} className="relative group">
                  <img src={image.image_url} alt={`Resim ${index + 1}`} className="w-full h-24 object-cover rounded-md border border-white/50" />
                  
                  {/* Onay Durumu Badge */}
                  <div className="absolute top-1 left-1">
                    {image.is_approved ? (
                      <div className="px-2 py-1 rounded-full bg-green-100 border border-green-200 text-green-800 text-[10px] font-semibold shadow">
                        ✅ Onaylı
                      </div>
                    ) : (
                      <div className="px-2 py-1 rounded-full bg-yellow-100 border border-yellow-200 text-yellow-800 text-[10px] font-semibold shadow">
                        ⏳ Onay Bekliyor
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-white/90 border border-white/60 text-[10px] font-semibold text-gray-900 shadow">{index + 1} / {arr.length}</div>
                  <div className="absolute top-1 right-1 flex gap-1 opacity-100 group-hover:opacity-100">
                    <button onClick={() => moveImageFirst(index)} disabled={index === 0} className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/80 border border-white/60 text-gray-900 shadow hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed" title="Başa al">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 4v16M10 8l-4 4 4 4M14 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={() => moveImageUp(index)} disabled={index === 0} className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/80 border border-white/60 text-gray-900 shadow hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed" title="Yukarı">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 8l-5 5h10l-5-5z" fill="currentColor"/></svg>
                    </button>
                    <button onClick={() => moveImageDown(index)} disabled={index === arr.length - 1} className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/80 border border-white/60 text-gray-900 shadow hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed" title="Aşağı">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 16l5-5H7l5 5z" fill="currentColor"/></svg>
                    </button>
                    <button onClick={() => moveImageLast(index)} disabled={index === arr.length - 1} className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/80 border border-white/60 text-gray-900 shadow hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed" title="Sona al">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 4v16M10 8l4 4-4 4M6 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={() => handleDeleteImage(image.id)} className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-rose-600 text-white shadow hover:bg-rose-700 transition" title="Sil">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 7h12l-1 13H7L6 7zm3-3h6l1 2H8l1-2z" fill="currentColor"/></svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>
          {images.length === 0 && (
            <div className="text-xs text-gray-500">Henüz görsel yok.</div>
          )}
        </div>
      </details>
    </main>
  );
} 