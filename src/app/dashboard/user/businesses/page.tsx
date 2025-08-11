"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaListUl,
  FaMapMarkedAlt,
  FaHeart,
  FaSlidersH,
  FaSearch,
  FaStar,
  FaMapMarkerAlt,
  FaRegHeart,
  FaSortAmountDown,
  FaTimes
} from 'react-icons/fa';
import Map from '../../../../components/Map';

export default function UserBusinessesPage() {
  const { data: businesses, isLoading } = trpc.business.getBusinesses.useQuery();
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
    <main className="max-w-4xl mx-auto p-4 pb-20 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none">İşletmeler</h1>
        <button
          onClick={() => router.push('/dashboard/user/favorites')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-600 text-white text-sm shadow hover:bg-pink-700 active:scale-[0.98]"
        >
          <FaHeart /> Favorilerim
        </button>
      </div>

      {/* View Switch */}
      <div className="flex items-center justify-center gap-0 mb-3">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-l-full text-sm font-semibold transition ${view === 'list' ? 'bg-blue-600 text-white shadow' : 'bg-white text-blue-700 border border-blue-200'}`}
          onClick={() => setView('list')}
          aria-pressed={view === 'list'}
        >
          <FaListUl /> Liste
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-r-full text-sm font-semibold transition ${view === 'map' ? 'bg-blue-600 text-white shadow' : 'bg-white text-blue-700 border border-blue-200'}`}
          onClick={() => setView('map')}
          aria-pressed={view === 'map'}
        >
          <FaMapMarkedAlt /> Harita
        </button>
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-blue-50 via-white to-pink-50 pb-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
            <FaSearch className="text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İşletme veya adres ara"
              className="flex-1 outline-none text-sm"
            />
          </div>
          {/* Sort */}
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
            <FaSortAmountDown className="text-gray-500" />
            <select className="flex-1 text-sm outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="distance">Sırala: Mesafe</option>
              <option value="rating">Sırala: Puan</option>
              <option value="favorites">Sırala: Favori</option>
            </select>
          </div>
          {/* Quick filters summary + open modal */}
          <div className="flex items-center gap-2">
            <button onClick={() => setFilterOpen(true)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border text-sm">
              <FaSlidersH /> Filtreler
            </button>
          </div>
        </div>
        {/* Quick chips */}
        <div className="mt-2 flex items-center gap-2 overflow-auto">
          {[0,3,4,4.5].map(v => (
            <button key={v} onClick={() => setMinRating(v)} className={`px-3 py-1.5 rounded-full text-xs border ${minRating===v? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300'}`}>{v===0? 'Puan: Tümü': `Puan: ${v}+`}</button>
          ))}
          {[null,2,5,10,20].map((v,idx)=> (
            <button key={idx} onClick={() => setMaxDistanceKm(v as any)} className={`px-3 py-1.5 rounded-full text-xs border ${maxDistanceKm===v? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300'}`}>{v==null? 'Mesafe: Sınırsız': `${v} km`}</button>
          ))}
          <button onClick={() => setHasPhone(!hasPhone)} className={`px-3 py-1.5 rounded-full text-xs border ${hasPhone? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300'}`}>Telefon</button>
          <button onClick={() => setHasEmail(!hasEmail)} className={`px-3 py-1.5 rounded-full text-xs border ${hasEmail? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300'}`}>E-posta</button>
        </div>
      </div>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">İşletmeler yükleniyor...</span>
        </div>
      )}
      <div className="transition-all duration-500">
        {view === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {businessesWithDistance?.map((b: any) => (
              <div
                key={b.id}
                className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-200 hover:border-blue-300 cursor-pointer"
                onClick={() => router.push(`/dashboard/user/businesses/${b.id}`)}
              >
                {/* Main Content */}
                <div className="relative p-4">
                  {/* Name + distance */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 truncate flex-1">{b.name}</h3>
                    {b._distanceKm != null && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-gray-50 border text-gray-700"><FaMapMarkerAlt />{b._distanceKm < 1 ? `${Math.round(b._distanceKm * 1000)} m` : `${b._distanceKm.toFixed(1)} km`}</span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-gray-700 mb-2">
                    <span className="inline-flex items-center gap-1"><FaStar className="text-yellow-500" /> {parseFloat(b.overall_rating || 0).toFixed(1)}</span>
                    <span className="inline-flex items-center gap-1"><FaRegHeart className="text-pink-600" /> {b.favorites_count || 0}</span>
                    <span className="inline-flex items-center gap-1">🗳️ {b.total_reviews || 0}</span>
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-2 text-gray-600 text-xs mb-3">
                    <span>📍</span>
                    <span className="truncate">{b.address}</span>
                  </div>

                  {/* CTA */}
                  <button
                    className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-semibold active:scale-95 transition flex items-center justify-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/user/businesses/${b.id}`);
                    }}
                  >
                    👀 Detaylar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {view === 'map' && (
          <div className="w-full h-[70vh] min-h-[300px] rounded-2xl overflow-hidden animate-fade-in">
            <Map
              center={{ lat: 39.9334, lng: 32.8597 }} // Ankara merkez
              zoom={10}
              markers={mapMarkers}
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
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </main>

    {/* Filters Modal */}
    {filterOpen && (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40" onClick={() => setFilterOpen(false)} />
        <div className="absolute inset-x-0 bottom-0 md:inset-0 md:m-auto md:max-w-2xl md:h-[70vh] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col">
          <div className="py-2 flex items-center justify-center">
            <div className="w-12 h-1.5 rounded-full bg-gray-300" />
          </div>
          <div className="px-4 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filtreler</h3>
            <button className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm inline-flex items-center gap-2" onClick={() => setFilterOpen(false)}>
              <FaTimes /> Kapat
            </button>
          </div>
          <div className="px-4 space-y-3 overflow-auto flex-1">
            <div>
              <label className="text-sm text-gray-600">Minimum Puan</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                <option value={0}>Tümü</option>
                <option value={3}>3+</option>
                <option value={4}>4+</option>
                <option value={4.5}>4.5+</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Maksimum Mesafe</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={maxDistanceKm ?? ''} onChange={(e) => setMaxDistanceKm(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Sınırsız</option>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Sırala</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="distance">Mesafe</option>
                <option value="rating">Puan</option>
                <option value="favorites">Favori</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={hasPhone} onChange={(e) => setHasPhone(e.target.checked)} /> Telefonu olanlar</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={hasEmail} onChange={(e) => setHasEmail(e.target.checked)} /> E-postası olanlar</label>
            </div>
            <div className="pt-2">
              <button
                className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-semibold active:scale-95 transition"
                onClick={() => setFilterOpen(false)}
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
} 