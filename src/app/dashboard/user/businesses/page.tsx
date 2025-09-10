"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
// Iconlar: Fluent stilinde inline SVG'ler kullanılacak
import Map from '../../../../components/Map';
import Hero from '../../../../components/ui/Hero';
import { useRealTimeBusiness } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';

export default function UserBusinessesPage() {
  const [view, setView] = useState<'list' | 'map'>('list');
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'favorites'>('distance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // WebSocket entegrasyonu
  const { isConnected, isConnecting, error: socketError } = useWebSocketStatus();
  const { setCallbacks: setBusinessCallbacks } = useRealTimeBusiness();

  // Kullanıcı konumunu al
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // WebSocket callback'lerini ayarla
  useEffect(() => {
    setBusinessCallbacks({
      onBusinessUpdated: () => {
        console.log('🔄 İşletme listesi güncellendi');
        // İşletme listesini yenile
        window.location.reload();
      },
      onServiceUpdated: () => {
        console.log('🔄 Hizmetler güncellendi');
        window.location.reload();
      },
      onEmployeeUpdated: () => {
        console.log('🔄 Çalışanlar güncellendi');
        window.location.reload();
      }
    });
  }, [setBusinessCallbacks]);

  // Cinsiyet filtresi ile işletmeleri çek
  const { data: businesses, isLoading } = trpc.user.getBusinessesWithGenderFilter.useQuery({
    genderFilter: genderFilter === 'all' ? undefined : genderFilter,
    latitude: userLocation?.lat,
    longitude: userLocation?.lng,
    radius: maxDistanceKm || undefined
  });

  // Haversine ile km hesapla
  function distanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(to.lat - from.lat);
    const dLon = toRad(to.lng - from.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const businessesWithDistance = useMemo(() => {
    if (!businesses) return [] as any[];
    let list = businesses.map((b: any) => {
      const bizPos = { lat: b.latitude || 0, lng: b.longitude || 0 };
      const d = userLocation ? distanceKm(userLocation, bizPos) : null;
      return { ...b, _distanceKm: d, _rating: parseFloat(b.overall_rating || 0) };
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b: any) =>
        (b.name || '').toLowerCase().includes(q) ||
        (b.address || '').toLowerCase().includes(q)
      );
    }
    if (minRating > 0) {
      list = list.filter((b: any) => (b._rating || 0) >= minRating);
    }
    if (maxDistanceKm != null && userLocation) {
      list = list.filter((b: any) => b._distanceKm != null && b._distanceKm <= maxDistanceKm);
    }
    if (hasPhone) {
      list = list.filter((b: any) => !!b.phone);
    }
    if (hasEmail) {
      list = list.filter((b: any) => !!b.email);
    }
    list.sort((a: any, b: any) => {
      if (sortBy === 'distance') {
        const da = a._distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b._distanceKm ?? Number.POSITIVE_INFINITY;
        return da - db;
      }
      if (sortBy === 'rating') {
        return (b._rating || 0) - (a._rating || 0);
      }
      // favorites
        return (b.favorites_count || 0) - (a.favorites_count || 0);
    });
    return list;
  }, [businesses, userLocation, search, minRating, maxDistanceKm, sortBy, hasPhone, hasEmail]);

  // İşletmeleri harita marker'larına çevir
  const mapMarkers = businesses?.map((b: any) => ({
    id: b.id,
    position: { lat: b.latitude || 39.9334, lng: b.longitude || 32.8597 },
    title: b.name,
    color: '#3b82f6'
  })) || [];

  const handleMarkerClick = (markerId: string) => {
    router.push(`/dashboard/user/businesses/${markerId}`);
  };

  return (
    <>
    <main className="relative max-w-4xl mx-auto p-3 sm:p-4 pb-20 sm:pb-28 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none truncate">randevuo</div>
            {/* WebSocket Durumu */}
            <div className="flex items-center gap-1">
              {isConnecting && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Bağlanıyor..."></div>
              )}
              {isConnected && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
              )}
              {socketError && (
                <div className="w-2 h-2 bg-red-400 rounded-full" title={`Hata: ${socketError}`}></div>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/user/favorites')}
            className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/70 active:bg-white/80 border border-white/40 text-gray-900 text-xs sm:text-sm shadow-sm touch-manipulation min-h-[44px] transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#e11d48"><path d="M12.1 21.35l-1.1-1.01C5.14 15.24 2 12.36 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.59 4.81 14.26 4 16 4 18.5 4 20.5 6 20.5 8.5c0 3.86-3.14 6.74-8.9 11.84l-.5.46z"/></svg>
            <span className="hidden xs:inline">Favoriler</span>
          </button>
        </div>
      </div>

      {/* Search pill - Mobile Optimized */}
      <div className="mt-3">
        <div className="flex items-center gap-2 border border-white/40 bg-white/60 backdrop-blur-md text-gray-900 rounded-2xl px-3 sm:px-4 py-3 shadow-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600 shrink-0"><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2"/></svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kuaför, berber, salon veya adres ara"
            className="flex-1 outline-none text-sm bg-transparent placeholder-gray-500 min-w-0"
          />
          <button 
            onClick={() => setFilterOpen(true)} 
            className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-xs shadow hover:shadow-lg active:scale-95 touch-manipulation min-h-[44px] transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M7 7v10M17 7v10M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <span className="hidden xs:inline">Filtre</span>
          </button>
        </div>
      </div>

      {/* Quick Filters - Mobile Optimized */}
      <div className="mt-3 space-y-3">
        {/* Cinsiyet Filtresi */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-700">Cinsiyet:</span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                genderFilter === 'all' 
                  ? 'border-purple-500 bg-purple-50 text-purple-700' 
                  : 'border-white/50 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90'
              }`}
              onClick={() => setGenderFilter('all')}
            >
              <span>👥 Tümü</span>
            </button>
            
            <button
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                genderFilter === 'male' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-white/50 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90'
              }`}
              onClick={() => setGenderFilter(genderFilter === 'male' ? 'all' : 'male')}
            >
              <span>👨 Erkek</span>
            </button>
            
            <button
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                genderFilter === 'female' 
                  ? 'border-pink-500 bg-pink-50 text-pink-700' 
                  : 'border-white/50 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90'
              }`}
              onClick={() => setGenderFilter(genderFilter === 'female' ? 'all' : 'female')}
            >
              <span>👩 Kadın</span>
            </button>
          </div>
        </div>

        {/* Mesafe Filtresi */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-700">Mesafe:</span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                maxDistanceKm === 2
                  ? 'border-rose-500 bg-rose-50 text-rose-700' 
                  : 'border-white/50 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90'
              }`}
              onClick={() => setMaxDistanceKm(maxDistanceKm === 2 ? null : 2)}
            >
              <span>📍 2 km</span>
            </button>
            
            <button
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                maxDistanceKm === 5
                  ? 'border-rose-500 bg-rose-50 text-rose-700' 
                  : 'border-white/50 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90'
              }`}
              onClick={() => setMaxDistanceKm(maxDistanceKm === 5 ? null : 5)}
            >
              <span>📍 5 km</span>
            </button>
            
            <button
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                maxDistanceKm === 10
                  ? 'border-rose-500 bg-rose-50 text-rose-700' 
                  : 'border-white/50 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90'
              }`}
              onClick={() => setMaxDistanceKm(maxDistanceKm === 10 ? null : 10)}
            >
              <span>📍 10 km</span>
            </button>
            
            <button
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                maxDistanceKm === 20
                  ? 'border-rose-500 bg-rose-50 text-rose-700' 
                  : 'border-white/50 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90'
              }`}
              onClick={() => setMaxDistanceKm(maxDistanceKm === 20 ? null : 20)}
            >
              <span>📍 20 km</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Switch - Mobile Optimized */}
      <div className="flex items-center justify-center mb-3 mt-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm">
          <button
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 touch-manipulation min-h-[44px] ${view === 'list' ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-gray-800 hover:bg-white/70 active:bg-white/80 active:scale-95'}`}
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z"/></svg>
            <span className="hidden xs:inline">Liste</span>
          </button>
          <button
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 touch-manipulation min-h-[44px] ${view === 'map' ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-gray-800 hover:bg-white/70 active:bg-white/80 active:scale-95'}`}
            onClick={() => setView('map')}
            aria-pressed={view === 'map'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4l6 2 6-2v16l-6 2-6-2-6 2V6l6-2zM9 6v12l6 2V8L9 6z"/></svg>
            <span className="hidden xs:inline">Harita</span>
          </button>
        </div>
      </div>

      {/* Eski toolbar kaldırıldı; yalnızca üstteki arama pill'i ve filtre modalı kullanılacak */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">İşletmeler yükleniyor...</span>
        </div>
      )}
      <div className="transition-all duration-500">
        {view === 'list' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
            {businessesWithDistance?.map((b: any) => (
              <div
                key={b.id}
                className="group relative bg-white/60 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden border border-white/40 hover:border-rose-300 cursor-pointer touch-manipulation"
                onClick={() => router.push(`/dashboard/user/businesses/${b.id}`)}
              >
                {/* Main Content - Mobile Optimized */}
                <div className="relative p-3 sm:p-4">
                  {/* Top: Avatar + Name + Rating, Right: Distance */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-white/70 border border-white/50 shrink-0">
                        {b.profile_image_url ? (
                          <img src={b.profile_image_url} alt={b.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-xs text-gray-700">🏢</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0 mb-1">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{b.name}</h3>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-700 shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                            {parseFloat(b.overall_rating || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {b._distanceKm != null && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white/60 backdrop-blur-md border border-white/40 text-gray-700 shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>
                        {b._distanceKm < 1 ? `${Math.round(b._distanceKm * 1000)} m` : `${b._distanceKm.toFixed(1)} km`}
                      </span>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-2 text-gray-700 text-xs sm:text-sm mb-3">
                    <span className="text-sm">📍</span>
                    <span className="truncate">{b.address}</span>
                  </div>

                  {/* Meta chips - Mobile Optimized */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/60 border border-white/40">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="#e11d48"><path d="M12.1 21.35l-1.1-1.01C5.14 15.24 2 12.36 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.59 4.81 14.26 4 16 4 18.5 4 20.5 6 20.5 8.5c0 3.86-3.14 6.74-8.9 11.84l-.5.46z"/></svg>
                      {b.favorites_count || 0}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/60 border border-white/40">
                      🗳️ {b.total_reviews || 0}
                    </span>
                    {/* Cinsiyet bilgisi */}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${
                      b.gender_service === 'male' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : b.gender_service === 'female'
                        ? 'bg-pink-50 text-pink-700 border-pink-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {b.gender_service === 'male' && '👨 Erkek'}
                      {b.gender_service === 'female' && '👩 Kadın'}
                      {b.gender_service === 'unisex' && '👥 Unisex'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {view === 'map' && (
          <div className="w-full h-[60vh] sm:h-[55vh] min-h-[300px] sm:min-h-[400px] rounded-2xl overflow-hidden animate-fade-in">
            <Map
              center={{ lat: 39.9334, lng: 32.8597 }} // Ankara merkez
              zoom={10}
              markers={mapMarkers.map(m => ({ ...m, color: '#ef476f' }))}
              onMarkerClick={handleMarkerClick}
              showUserLocation={true}
              className="w-full h-full"
            />
          </div>
        )}
      </div>
      {(!businesses || businesses.length === 0) && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🏢</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Henüz İşletme Yok</h3>
          <p className="text-gray-500 text-center max-w-md">
            Şu anda sistemde kayıtlı işletme bulunmuyor. Daha sonra tekrar kontrol edebilirsiniz.
          </p>
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

    {/* Filters Modal - Mobile Optimized */}
    {filterOpen && (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
        <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:max-w-2xl sm:h-[80vh] bg-white/70 backdrop-blur-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col border border-white/40">
          {/* Mobile drag handle */}
          <div className="py-2 flex items-center justify-center sm:hidden">
            <div className="w-12 h-1.5 rounded-full bg-gray-300" />
          </div>
          <div className="px-3 sm:px-4 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-lg">Filtreler</h3>
            <button 
              className="px-3 py-2 rounded-xl bg-rose-600 text-white border border-transparent hover:bg-rose-700 active:bg-rose-800 text-sm inline-flex items-center gap-2 transition-all touch-manipulation min-h-[44px]" 
              onClick={() => setFilterOpen(false)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Kapat
            </button>
          </div>
          <div className="px-3 sm:px-4 space-y-4 overflow-auto flex-1 pb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Minimum Puan</label>
              <select 
                className="w-full border border-white/40 rounded-xl px-3 py-3 text-sm bg-white/60 backdrop-blur-md text-gray-900 touch-manipulation" 
                value={minRating} 
                onChange={(e) => setMinRating(Number(e.target.value))}
              >
                <option value={0}>Tümü</option>
                <option value={3}>3+</option>
                <option value={4}>4+</option>
                <option value={4.5}>4.5+</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Maksimum Mesafe</label>
              <select 
                className="w-full border border-white/40 rounded-xl px-3 py-3 text-sm bg-white/60 backdrop-blur-md text-gray-900 touch-manipulation" 
                value={maxDistanceKm ?? ''} 
                onChange={(e) => setMaxDistanceKm(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Filtresiz</option>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Sırala</label>
              <select 
                className="w-full border border-white/40 rounded-xl px-3 py-3 text-sm bg-white/60 backdrop-blur-md text-gray-900 touch-manipulation" 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="distance">Mesafe</option>
                <option value="rating">Puan</option>
                <option value="favorites">Favori</option>
              </select>
            </div>
            
            {/* Checkbox options - Mobile optimized */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm text-gray-900 touch-manipulation min-h-[44px] p-2 -m-2 rounded-lg hover:bg-white/50 active:bg-white/70 transition-colors">
                <input 
                  type="checkbox" 
                  checked={hasPhone} 
                  onChange={(e) => setHasPhone(e.target.checked)} 
                  className="w-4 h-4 text-rose-600 bg-gray-100 border-gray-300 rounded focus:ring-rose-500"
                />
                <span>📞 Telefonu olanlar</span>
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-900 touch-manipulation min-h-[44px] p-2 -m-2 rounded-lg hover:bg-white/50 active:bg-white/70 transition-colors">
                <input 
                  type="checkbox" 
                  checked={hasEmail} 
                  onChange={(e) => setHasEmail(e.target.checked)} 
                  className="w-4 h-4 text-rose-600 bg-gray-100 border-gray-300 rounded focus:ring-rose-500"
                />
                <span>📧 E-postası olanlar</span>
              </label>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">Cinsiyet Filtresi</label>
              <div className="grid grid-cols-3 gap-2">
                <label className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all touch-manipulation min-h-[60px] ${
                  genderFilter === 'all' 
                    ? 'border-purple-500 bg-purple-50 text-purple-700' 
                    : 'border-white/50 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90'
                }`}>
                  <input
                    type="radio"
                    name="genderFilter"
                    value="all"
                    checked={genderFilter === 'all'}
                    onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                    className="hidden"
                  />
                  <div className="text-center">
                    <div className="text-lg mb-1">👥</div>
                    <div className="text-xs font-medium">Tümü</div>
                  </div>
                </label>
                
                <label className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all touch-manipulation min-h-[60px] ${
                  genderFilter === 'male' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-white/50 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90'
                }`}>
                  <input
                    type="radio"
                    name="genderFilter"
                    value="male"
                    checked={genderFilter === 'male'}
                    onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                    className="hidden"
                  />
                  <div className="text-center">
                    <div className="text-lg mb-1">👨</div>
                    <div className="text-xs font-medium">Erkek</div>
                  </div>
                </label>
                
                <label className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all touch-manipulation min-h-[60px] ${
                  genderFilter === 'female' 
                    ? 'border-pink-500 bg-pink-50 text-pink-700' 
                    : 'border-white/50 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90'
                }`}>
                  <input
                    type="radio"
                    name="genderFilter"
                    value="female"
                    checked={genderFilter === 'female'}
                    onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                    className="hidden"
                  />
                  <div className="text-center">
                    <div className="text-lg mb-1">👩</div>
                    <div className="text-xs font-medium">Kadın</div>
                  </div>
                </label>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center px-2">
                {genderFilter === 'male' && 'Sadece erkek ve unisex işletmeler gösterilecek'}
                {genderFilter === 'female' && 'Sadece kadın ve unisex işletmeler gösterilecek'}
                {genderFilter === 'all' && 'Tüm işletmeler gösterilecek'}
              </div>
            </div>
            
            <div className="pt-2">
              <button
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold active:scale-95 transition-all bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md hover:shadow-lg touch-manipulation min-h-[44px]"
                onClick={() => setFilterOpen(false)}
              >
                ✅ Filtreleri Uygula
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
} 