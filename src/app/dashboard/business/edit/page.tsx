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
  });

  const [images, setImages] = useState<Array<{ id: string; image_url: string; image_order: number }>>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateBusinessMutation = trpc.business.updateBusiness.useMutation();
  const getBusinessImagesQuery = trpc.business.getBusinessImages.useQuery(
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

  const handleLocationChange = (location: { latitude: number; longitude: number; address: string }) => {
    setFormData(prev => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
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
      });
      alert('İşletme bilgileri başarıyla güncellendi!');
    } catch (error) {
      alert('Güncelleme sırasında bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddImage = async () => {
    if (!business || !newImageUrl.trim()) return;

    try {
      await addBusinessImageMutation.mutateAsync({
        businessId: business.id,
        imageUrl: newImageUrl,
        imageOrder: images.length,
      });
      setNewImageUrl('');
      getBusinessImagesQuery.refetch();
    } catch (error) {
      alert('Resim eklenirken bir hata oluştu.');
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

    try {
      await updateBusinessImageMutation.mutateAsync({
        id: imageId,
        businessId: business.id,
        imageOrder: newOrder,
      });
      getBusinessImagesQuery.refetch();
    } catch (error) {
      alert('Resim sırası güncellenirken bir hata oluştu.');
    }
  };

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
        <span className="text-5xl mb-2">⏳</span>
        <span className="text-lg text-gray-400">İşletme bilgileri yükleniyor...</span>
      </main>
    );
  }

  if (!business) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
        <span className="text-5xl mb-2">🏢</span>
        <span className="text-lg text-gray-500">İşletme bulunamadı.</span>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-4 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            İşletme Düzenle
          </h1>
          <button
            onClick={() => router.push('/dashboard/business')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ← Geri
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Temel Bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İşletme Adı *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="İşletme adını girin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Telefon numarası"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="E-posta adresi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adres *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="İşletme adresi"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="İşletme hakkında açıklama"
            />
          </div>

          {/* Konum Seçici */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Konum
            </label>
            <LocationPicker
              onLocationSelect={handleLocationChange}
              defaultLocation={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : undefined}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-600 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Güncelleniyor...' : 'İşletme Bilgilerini Güncelle'}
          </button>
        </form>
      </div>

      {/* Slider Resimleri */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Slider Resimleri</h2>
        
        {/* Yeni Resim Ekleme */}
        <div className="flex gap-4 mb-6">
          <input
            type="url"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="Resim URL'si girin"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={handleAddImage}
            disabled={!newImageUrl.trim()}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            Ekle
          </button>
        </div>

        {/* Mevcut Resimler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={image.id} className="relative group">
              <img
                src={image.image_url}
                alt={`Slider resim ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              {/* Fallback for failed images */}
              <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center hidden">
                <div className="text-center text-gray-500">
                  <div className="text-2xl mb-1">🖼️</div>
                  <div className="text-xs">Resim Yüklenemedi</div>
                </div>
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => handleReorderImages(image.id, Math.max(0, index - 1))}
                    disabled={index === 0}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 disabled:opacity-50"
                    title="Yukarı taşı"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleReorderImages(image.id, index + 1)}
                    disabled={index === images.length - 1}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 disabled:opacity-50"
                    title="Aşağı taşı"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    title="Sil"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        {images.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz slider resmi eklenmemiş. Yukarıdaki formu kullanarak resim ekleyebilirsiniz.
          </div>
        )}
      </div>
    </main>
  );
} 