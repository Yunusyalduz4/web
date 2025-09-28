"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
// Iconlar: Fluent stilinde inline SVG'ler kullanılacak
import Map from '../../../../components/Map';
import Hero from '../../../../components/ui/Hero';
import { useRealTimeBusiness } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVenusMars, faMars, faVenus } from '@fortawesome/free-solid-svg-icons';

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
  const [category, setCategory] = useState<string>('');
  const [membersOnly, setMembersOnly] = useState<boolean>(false);
  const [bookable, setBookable] = useState<'all' | 'bookable' | 'non_bookable'>('all');

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
        // İşletme listesini yenile
        window.location.reload();
      },
      onServiceUpdated: () => {
        window.location.reload();
      },
      onEmployeeUpdated: () => {
        window.location.reload();
      }
    });
  }, [setBusinessCallbacks]);

  // Cinsiyet filtresi ile işletmeleri çek
  const { data: businesses, isLoading } = trpc.user.getBusinessesWithGenderFilter.useQuery({
    genderFilter: genderFilter === 'all' ? undefined : genderFilter,
    latitude: userLocation?.lat,
    longitude: userLocation?.lng,
    radius: maxDistanceKm || undefined,
    category: category || undefined,
    membersOnly: membersOnly || undefined,
    bookable: bookable,
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
          {/* Center View Switch */}
          <div className="flex absolute left-1/2 -translate-x-1/2">
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm">
              <button
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 touch-manipulation ${view === 'list' ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-gray-800 hover:bg-white/70 active:bg-white/80 active:scale-95'}`}
                onClick={() => setView('list')}
                aria-pressed={view === 'list'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z"/></svg>
                <span>Liste</span>
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 touch-manipulation ${view === 'map' ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md' : 'text-gray-800 hover:bg-white/70 active:bg-white/80 active:scale-95'}`}
                onClick={() => setView('map')}
                aria-pressed={view === 'map'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4l6 2 6-2v16l-6 2-6-2-6 2V6l6-2zM9 6v12l6 2V8L9 6z"/></svg>
                <span>Harita</span>
              </button>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/user/favorites')}
            className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/70 active:bg-white/80 text-gray-900 text-xs sm:text-sm shadow-sm touch-manipulation min-h-[44px] transition-all relative"
            style={{
              border: '2px solid transparent',
              background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #3b82f6, #ef4444, #ffffff) border-box',
              borderRadius: '12px'
            }}
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M3 6h18M8 12h8M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18" cy="6" r="3" fill="currentColor"/>
              <circle cx="6" cy="12" r="3" fill="currentColor"/>
              <circle cx="18" cy="18" r="3" fill="currentColor"/>
            </svg>
            <span className="hidden xs:inline">Filtre</span>
          </button>
        </div>
      </div>

      {/* Quick Filters - Mobile Optimized */}
      <div className="mt-3 space-y-3">
        {/* Cinsiyet Filtresi */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-600">
              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V9.5L21 9ZM3 9L9 9.5V7.5L3 7V9ZM12 8C15.3 8 18 10.7 18 14V16H6V14C6 10.7 8.7 8 12 8Z" fill="currentColor"/>
            </svg>
            Cinsiyet
          </span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                genderFilter === 'all' 
                  ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' 
                  : 'border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90 hover:border-gray-300'
              }`}
              onClick={() => setGenderFilter('all')}
            >
              <FontAwesomeIcon icon={faVenusMars} className={`text-sm ${genderFilter === 'all' ? 'text-purple-600' : 'text-gray-600'}`} />
              Tümü
            </button>
            
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                genderFilter === 'male' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                  : 'border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90 hover:border-gray-300'
              }`}
              onClick={() => setGenderFilter(genderFilter === 'male' ? 'all' : 'male')}
            >
              <FontAwesomeIcon icon={faMars} className={`text-sm ${genderFilter === 'male' ? 'text-blue-600' : 'text-gray-600'}`} />
              Erkek
            </button>
            
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                genderFilter === 'female' 
                  ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm' 
                  : 'border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90 hover:border-gray-300'
              }`}
              onClick={() => setGenderFilter(genderFilter === 'female' ? 'all' : 'female')}
            >
              <FontAwesomeIcon icon={faVenus} className={`text-sm ${genderFilter === 'female' ? 'text-pink-600' : 'text-gray-600'}`} />
              Kadın
            </button>
          </div>
        </div>

        {/* Mesafe Filtresi */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-600">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5S14.5 7.62 14.5 9S13.38 11.5 12 11.5Z" fill="currentColor"/>
            </svg>
            Mesafe
          </span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                maxDistanceKm === 2
                  ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' 
                  : 'border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90 hover:border-gray-300'
              }`}
              onClick={() => setMaxDistanceKm(maxDistanceKm === 2 ? null : 2)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={maxDistanceKm === 2 ? 'text-rose-600' : 'text-gray-600'}>
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5S14.5 7.62 14.5 9S13.38 11.5 12 11.5Z" fill="currentColor"/>
              </svg>
              2 km
            </button>
            
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                maxDistanceKm === 5
                  ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' 
                  : 'border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90 hover:border-gray-300'
              }`}
              onClick={() => setMaxDistanceKm(maxDistanceKm === 5 ? null : 5)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={maxDistanceKm === 5 ? 'text-rose-600' : 'text-gray-600'}>
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5S14.5 7.62 14.5 9S13.38 11.5 12 11.5Z" fill="currentColor"/>
              </svg>
              5 km
            </button>
            
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                maxDistanceKm === 10
                  ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' 
                  : 'border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90 hover:border-gray-300'
              }`}
              onClick={() => setMaxDistanceKm(maxDistanceKm === 10 ? null : 10)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={maxDistanceKm === 10 ? 'text-rose-600' : 'text-gray-600'}>
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5S14.5 7.62 14.5 9S13.38 11.5 12 11.5Z" fill="currentColor"/>
              </svg>
              10 km
            </button>
            
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all text-xs font-medium touch-manipulation min-h-[44px] shrink-0 ${
                maxDistanceKm === 20
                  ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' 
                  : 'border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80 active:bg-white/90 hover:border-gray-300'
              }`}
              onClick={() => setMaxDistanceKm(maxDistanceKm === 20 ? null : 20)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={maxDistanceKm === 20 ? 'text-rose-600' : 'text-gray-600'}>
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5S14.5 7.62 14.5 9S13.38 11.5 12 11.5Z" fill="currentColor"/>
              </svg>
              20 km
            </button>
          </div>
        </div>
      </div>


      {/* (Kaldırıldı) Ek küçük modal – mevcut büyük modal kullanılacak */}

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
                {/* Degrade Border - Sol Kenar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-red-500 to-white rounded-l-2xl"></div>
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
                          {b.is_google_places && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                              Google
                            </span>
                          )}
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
                      {b.gender_service === 'male' && (
                        <>
                          <FontAwesomeIcon icon={faMars} className="text-xs" />
                          Erkek
                        </>
                      )}
                      {b.gender_service === 'female' && (
                        <>
                          <FontAwesomeIcon icon={faVenus} className="text-xs" />
                          Kadın
                        </>
                      )}
                      {b.gender_service === 'unisex' && (
                        <>
                          <FontAwesomeIcon icon={faVenusMars} className="text-xs" />
                          Unisex
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {view === 'map' && (
          <div className="w-full h-[60vh] sm:h-[55vh] min-h-[300px] sm:min-h-[400px] rounded-2xl overflow-hidden animate-fade-in relative">
            {/* Harita Header */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-rose-500/90 via-fuchsia-500/90 to-indigo-500/90 backdrop-blur-md px-4 py-3 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">İşletme Haritası</h3>
                    <p className="text-white/80 text-xs">{businessesWithDistance?.length || 0} işletme bulundu</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white/80 text-xs">Canlı</span>
                </div>
              </div>
            </div>

            {/* Harita Container */}
            <div className="w-full h-full pt-16">
              <Map
                center={{ lat: 39.9334, lng: 32.8597 }} // Ankara merkez
                zoom={10}
                markers={mapMarkers.map(m => ({ ...m, color: '#ef476f' }))}
                onMarkerClick={handleMarkerClick}
                showUserLocation={true}
                className="w-full h-full"
              />
            </div>
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

    {/* Modern Filters Modal */}
    {filterOpen && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pb-20 sm:pb-0">
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
        
        {/* Modal */}
        <div className="relative w-full sm:max-w-2xl h-[85vh] sm:h-[80vh] bg-white/90 backdrop-blur-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/40">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-white/40">
            {/* Mobile drag handle */}
            <div className="py-2 flex items-center justify-center sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-gray-300" />
            </div>
            
            <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-500 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M3 6h18M8 12h8M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="18" cy="6" r="3" fill="currentColor"/>
                    <circle cx="6" cy="12" r="3" fill="currentColor"/>
                    <circle cx="18" cy="18" r="3" fill="currentColor"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Filtreler</h3>
              </div>
              
              <button 
                className="w-10 h-10 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white flex items-center justify-center transition-all shadow-sm"
                onClick={() => setFilterOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Rating Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-500">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <label className="text-sm font-semibold text-gray-900">Minimum Puan</label>
              </div>
              <select 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white text-gray-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                value={minRating} 
                onChange={(e) => setMinRating(Number(e.target.value))}
              >
                <option value={0}>Tümü</option>
                <option value={3}>3+ Yıldız</option>
                <option value={4}>4+ Yıldız</option>
                <option value={4.5}>4.5+ Yıldız</option>
              </select>
            </div>

            {/* Distance Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                  <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5S14.5 7.62 14.5 9S13.38 11.5 12 11.5Z" fill="currentColor"/>
                </svg>
                <label className="text-sm font-semibold text-gray-900">Maksimum Mesafe</label>
              </div>
              <select 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white text-gray-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
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

            {/* Sort Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
                  <path d="M3 6h18M7 12h10M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <label className="text-sm font-semibold text-gray-900">Sıralama</label>
              </div>
              <select 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white text-gray-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="distance">Mesafeye Göre</option>
                <option value="rating">Puana Göre</option>
                <option value="favorites">Favori Sayısına Göre</option>
              </select>
            </div>

            {/* Contact Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-purple-500">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <label className="text-sm font-semibold text-gray-900">İletişim Bilgileri</label>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-rose-300 hover:bg-rose-50 cursor-pointer transition-all">
                  <input 
                    type="checkbox" 
                    checked={hasPhone} 
                    onChange={(e) => setHasPhone(e.target.checked)} 
                    className="w-5 h-5 text-rose-600 bg-gray-100 border-gray-300 rounded focus:ring-rose-500"
                  />
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-900">Telefonu olanlar</span>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-rose-300 hover:bg-rose-50 cursor-pointer transition-all">
                  <input 
                    type="checkbox" 
                    checked={hasEmail} 
                    onChange={(e) => setHasEmail(e.target.checked)} 
                    className="w-5 h-5 text-rose-600 bg-gray-100 border-gray-300 rounded focus:ring-rose-500"
                  />
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-900">E-postası olanlar</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Category & Membership */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                  <path d="M4 4h16v4H4V4zm0 6h10v4H4v-4zm0 6h16v4H4v-4z" fill="currentColor"/>
                </svg>
                <label className="text-sm font-semibold text-gray-900">Kategori & Üyelik</label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Kategori</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  >
                    <option value="">Hepsi</option>
                    <option value="Beauty Salon">Beauty Salon</option>
                    <option value="Hair Salon">Hair Salon</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border-2 border-gray-200">
                  <span className="text-sm text-gray-700">Üyelerimiz</span>
                  <button onClick={() => setMembersOnly(v => !v)} className={`w-12 h-7 rounded-full relative transition ${membersOnly ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition ${membersOnly ? 'translate-x-5' : ''}`}></span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-2">Randevu Durumu</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setBookable('all')} className={`px-3 py-2 rounded-xl border text-sm ${bookable==='all' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-gray-200 bg-white text-gray-700'}`}>Hepsi</button>
                  <button onClick={() => setBookable('bookable')} className={`px-3 py-2 rounded-xl border text-sm ${bookable==='bookable' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-gray-200 bg-white text-gray-700'}`}>Alınabilir</button>
                  <button onClick={() => setBookable('non_bookable')} className={`px-3 py-2 rounded-xl border text-sm ${bookable==='non_bookable' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-gray-200 bg-white text-gray-700'}`}>Alınamaz</button>
                </div>
              </div>
            </div>

            {/* Gender Filter */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-pink-500">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V9.5L21 9ZM3 9L9 9.5V7.5L3 7V9ZM12 8C15.3 8 18 10.7 18 14V16H6V14C6 10.7 8.7 8 12 8Z" fill="currentColor"/>
                </svg>
                <label className="text-sm font-semibold text-gray-900">Cinsiyet Filtresi</label>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  genderFilter === 'all' 
                    ? 'border-purple-500 bg-purple-50 text-purple-700' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                }`}>
                  <input
                    type="radio"
                    name="genderFilter"
                    value="all"
                    checked={genderFilter === 'all'}
                    onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                    className="hidden"
                  />
                  <FontAwesomeIcon icon={faVenusMars} className="text-2xl mb-2 text-purple-600" />
                  <div className="text-xs font-semibold">Tümü</div>
                </label>
                
                <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  genderFilter === 'male' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                }`}>
                  <input
                    type="radio"
                    name="genderFilter"
                    value="male"
                    checked={genderFilter === 'male'}
                    onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                    className="hidden"
                  />
                  <FontAwesomeIcon icon={faMars} className="text-2xl mb-2 text-blue-600" />
                  <div className="text-xs font-semibold">Erkek</div>
                </label>
                
                <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  genderFilter === 'female' 
                    ? 'border-pink-500 bg-pink-50 text-pink-700' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-pink-300 hover:bg-pink-50'
                }`}>
                  <input
                    type="radio"
                    name="genderFilter"
                    value="female"
                    checked={genderFilter === 'female'}
                    onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                    className="hidden"
                  />
                  <FontAwesomeIcon icon={faVenus} className="text-2xl mb-2 text-pink-600" />
                  <div className="text-xs font-semibold">Kadın</div>
                </label>
              </div>
              
              <div className="text-xs text-gray-500 text-center px-2 py-2 bg-gray-50 rounded-lg">
                {genderFilter === 'male' && 'Sadece erkek ve unisex işletmeler gösterilecek'}
                {genderFilter === 'female' && 'Sadece kadın ve unisex işletmeler gösterilecek'}
                {genderFilter === 'all' && 'Tüm işletmeler gösterilecek'}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-white/40 p-4 sm:p-6">
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-all"
                onClick={() => {
                  setMinRating(0);
                  setMaxDistanceKm(null);
                  setSortBy('distance');
                  setHasPhone(false);
                  setHasEmail(false);
                  setGenderFilter('all');
                  setCategory('');
                  setMembersOnly(false);
                  setBookable('all');
                }}
              >
                Temizle
              </button>
              <button
                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white shadow-md hover:shadow-lg active:scale-95 transition-all"
                onClick={() => setFilterOpen(false)}
              >
                Filtreleri Uygula
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
} 