"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { skipToken } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMars, faVenus, faVenusMars } from '@fortawesome/free-solid-svg-icons';
import Map from '../../../../components/Map';
import NotificationsButton from '../../../../components/NotificationsButton';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';

export default function UserBusinesses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  
  // WebSocket entegrasyonu
  const { isConnected, isConnecting, error: socketError } = useWebSocketStatus();
  
  // State management - Hydration safe
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'favorites'>('distance');
  const [hasPhone, setHasPhone] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'unisex'>('all');
  const [category, setCategory] = useState('');
  const [membersOnly, setMembersOnly] = useState(false);
  const [bookable, setBookable] = useState<'all' | 'yes' | 'no'>('all');
  const [isClient, setIsClient] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [distanceFilterOpen, setDistanceFilterOpen] = useState(true);

  // Hydration fix
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Data fetching - Tüm kullanıcılar için (oturum açık/üyeliksiz)
  const { data: userLocation } = trpc.user.getUserLocation.useQuery(
    status === 'authenticated' && userId ? { userId } : skipToken
  );
  const updateUserLocation = trpc.user.updateUserLocation.useMutation();

  // Local state for guest user location
  const [guestLocation, setGuestLocation] = useState<{latitude: number, longitude: number} | null>(null);

  // Get user location - Oturum açık kullanıcılar için database'den, üyeliksiz kullanıcılar için local state'den
  useEffect(() => {
    if (isClient) {
      if (status === 'authenticated' && !userLocation?.latitude && !userLocation?.longitude) {
        // Oturum açık kullanıcı için database'e kaydet
        navigator.geolocation?.getCurrentPosition(
          async (position) => {
            try {
              await updateUserLocation.mutateAsync({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                address: ''
              });
            } catch (error) {
              console.error('Error updating user location:', error);
            }
          },
          (error) => {
            console.log('Location access denied or error:', error);
          }
        );
      } else if (status === 'unauthenticated' && !guestLocation) {
        // Üyeliksiz kullanıcı için local state'e kaydet
        navigator.geolocation?.getCurrentPosition(
          (position) => {
            setGuestLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.log('Location access denied or error:', error);
          }
        );
      }
    }
  }, [status, isClient, userLocation, updateUserLocation, guestLocation]);
  
  // Current location (oturum açık kullanıcı için database'den, üyeliksiz için local state'den)
  const currentLocation = status === 'authenticated' ? userLocation : guestLocation;
  
  const { data: businesses, isLoading, error } = trpc.business.getBusinesses.useQuery({
    userLatitude: currentLocation?.latitude && currentLocation.latitude !== null ? currentLocation.latitude : undefined,
    userLongitude: currentLocation?.longitude && currentLocation.longitude !== null ? currentLocation.longitude : undefined,
    maxDistanceKm: maxDistanceKm || undefined
  }, {
    enabled: true, // Her zaman aktif (oturum açık/üyeliksiz fark etmez)
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Filtered businesses
  const filteredBusinesses = useMemo(() => {
    if (!businesses) return [];
    
    let filtered = businesses.filter((b: any) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!b.name?.toLowerCase().includes(query) && 
            !b.description?.toLowerCase().includes(query) &&
            !b.address?.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Rating filter
      if (minRating > 0 && (!b.overall_rating || b.overall_rating < minRating)) {
        return false;
      }
      
      // Contact filters
      if (hasPhone && !b.phone) return false;
      if (hasEmail && !b.email) return false;
      
      // Gender filter
      if (genderFilter !== 'all' && b.gender_service !== genderFilter) {
        return false;
      }
      
      // Category filter
      if (category && b.category !== category) {
        return false;
      }
      
      // Membership filter
      if (membersOnly && !b.is_member) {
        return false;
      }
      
      // Bookable filter
      if (bookable === 'yes' && !b.is_bookable) return false;
      if (bookable === 'no' && b.is_bookable) return false;
      
      return true;
    });
    
    // Sort
    if (sortBy === 'rating') {
      filtered.sort((a: any, b: any) => {
        // İşletmeleri puanlarına göre sırala, puanı olmayanlar en sonda
        const aRating = a.overall_rating || 0;
        const bRating = b.overall_rating || 0;
        if (a.overall_rating && !b.overall_rating) return -1;
        if (!a.overall_rating && b.overall_rating) return 1;
        return bRating - aRating;
      });
    } else if (sortBy === 'favorites') {
      filtered.sort((a: any, b: any) => (b.favorites_count || 0) - (a.favorites_count || 0));
    } else if (sortBy === 'distance' && userLocation?.latitude && userLocation?.longitude) {
      // Distance sorting is already handled by the backend when user location is provided
      // No need to sort again here
    }
    
    return filtered;
  }, [businesses, searchQuery, minRating, hasPhone, hasEmail, genderFilter, category, membersOnly, bookable, sortBy, userLocation]);

  // Businesses with distance calculation
  const businessesWithDistance = useMemo(() => {
    if (!filteredBusinesses) return filteredBusinesses;
    
    // Distance is now calculated in the backend, so we can use it directly
    const result = filteredBusinesses.map((b: any) => ({
      ...b,
      distance: b.distance || null
    }));
    
    
    return result;
  }, [filteredBusinesses]);

  // Map markers
  const mapMarkers = useMemo(() => {
    return businessesWithDistance?.map((b: any) => ({
      id: b.id,
      position: {
        lat: b.latitude,
        lng: b.longitude
      },
      title: b.name,
      color: '#ef476f'
    })) || [];
  }, [businessesWithDistance]);

  // Dynamic map center
  const mapCenter = useMemo(() => {
    // If current location is available, use it
    if (currentLocation?.latitude && currentLocation?.longitude) {
      return { lat: currentLocation.latitude, lng: currentLocation.longitude };
    }
    
    // If we have businesses, calculate center from them
    if (businessesWithDistance && businessesWithDistance.length > 0) {
      const validBusinesses = businessesWithDistance.filter(b => b.latitude && b.longitude);
      if (validBusinesses.length > 0) {
        const avgLat = validBusinesses.reduce((sum, b) => sum + b.latitude, 0) / validBusinesses.length;
        const avgLng = validBusinesses.reduce((sum, b) => sum + b.longitude, 0) / validBusinesses.length;
        return { lat: avgLat, lng: avgLng };
      }
    }
    
    // Default to Istanbul
    return { lat: 41.0082, lng: 28.9784 };
  }, [currentLocation, businessesWithDistance]);

  const handleMarkerClick = (markerId: string) => {
    router.push(`/dashboard/user/businesses/${markerId}`);
  };


  return (
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
          <div className="inline-flex items-center gap-1 sm:gap-2">
            <NotificationsButton userType="user" />
            <button
              onClick={() => setFilterOpen(true)}
              className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/70 active:bg-white/80 text-gray-900 border border-white/40 shadow-sm transition-all touch-manipulation min-h-[44px]"
              aria-label="Filtreleri aç"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                <path d="M3 6h18M8 12h8M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="18" cy="6" r="3" fill="currentColor"/>
                <circle cx="6" cy="12" r="3" fill="currentColor"/>
                <circle cx="18" cy="18" r="3" fill="currentColor"/>
              </svg>
              <span className="text-sm sm:text-base">Filtreler</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mt-4 sm:mt-0 mb-0 sm:mb-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-center bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none animate-fade-in">
              İşletmeler
            </h1>
            <p className="text-center text-gray-600 text-sm sm:text-base mt-2">
              Yakınınızdaki işletmeleri keşfedin
            </p>
          </div>
          
          {/* Search and Distance Filter Buttons */}
          <div className="flex items-center gap-2">
            {/* Search Toggle Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 touch-manipulation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            
            {/* Distance Filter Toggle Button */}
            <button
              onClick={() => setDistanceFilterOpen(!distanceFilterOpen)}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 touch-manipulation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar - Animated */}
      {!filterOpen && (
        <div className={`mb-6 transition-all duration-300 ease-in-out overflow-hidden ${
          searchOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="İşletme, hizmet, konum ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 sm:py-4 rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-md text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-sm sm:text-base"
            />
          </div>
        </div>
      )}

      {/* Distance Filter - Animated */}
      {!filterOpen && (
        <div className={`mb-6 transition-all duration-300 ease-in-out overflow-hidden ${
          distanceFilterOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-semibold text-gray-900">Mesafe Filtresi</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Maksimum</span>
                <span className="text-sm font-bold text-blue-600">{maxDistanceKm || 'Sınırsız'} km</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Distance Slider */}
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={maxDistanceKm ?? 25}
                  onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((maxDistanceKm ?? 25) - 1) * 2.04}%, #e5e7eb ${((maxDistanceKm ?? 25) - 1) * 2.04}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>
              
              {/* Quick Distance Options */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setMaxDistanceKm(null)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    maxDistanceKm === null 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                      : 'bg-white/60 text-gray-700 hover:bg-white/80'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sınırsız
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setMaxDistanceKm(5)}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded"
                  >
                    5km
                  </button>
                  <button
                    onClick={() => setMaxDistanceKm(10)}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded"
                  >
                    10km
                  </button>
                  <button
                    onClick={() => setMaxDistanceKm(20)}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded"
                  >
                    20km
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* View Toggle */}
      <div className="flex items-center justify-center gap-2 mb-1">
        <button
          onClick={() => setView('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            view === 'list' 
              ? 'bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white shadow-md' 
              : 'bg-white/60 text-gray-700 hover:bg-white/80'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M7 12h10M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Liste
        </button>
        <button
          onClick={() => setView('map')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            view === 'map' 
              ? 'bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white shadow-md' 
              : 'bg-white/60 text-gray-700 hover:bg-white/80'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Harita
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {!isClient ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto mb-2"></div>
              <p className="text-gray-600">İşletmeler yükleniyor...</p>
            </div>
          </div>
        ) : view === 'list' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                          <span className="inline-flex items-center gap-1 text-xs text-gray-700 shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                            {parseFloat(b.overall_rating || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {b.distance && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white/60 backdrop-blur-md border border-white/40 text-gray-700 shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {typeof b.distance === 'number' ? b.distance.toFixed(1) : b.distance} km
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
        
        {isClient && view === 'map' && (
          <div className="w-full h-[60vh] sm:h-[55vh] min-h-[300px] sm:min-h-[400px] rounded-2xl overflow-hidden animate-fade-in relative z-0">
            {/* Harita Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-r from-rose-500/90 via-fuchsia-500/90 to-indigo-500/90 backdrop-blur-md px-4 py-3 rounded-t-2xl">
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
                center={mapCenter}
                zoom={currentLocation?.latitude && currentLocation?.longitude ? 12 : 10}
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

      {/* Modern Filters Modal */}
      {filterOpen && (
        <div className="modal-container">
          <div className="modal-overlay-bg" onClick={() => setFilterOpen(false)} />
          <div className="modal-wrapper">
            {/* Header */}
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M3 6h18M8 12h8M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="18" cy="6" r="3" fill="currentColor"/>
                    <circle cx="6" cy="12" r="3" fill="currentColor"/>
                    <circle cx="18" cy="18" r="3" fill="currentColor"/>
                  </svg>
                </div>
                <div className="modal-header-text">
                  <h2 className="modal-header-title">Filtreler</h2>
                  <p className="modal-header-subtitle">İşletme filtreleme seçenekleri</p>
                </div>
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                className="modal-close-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            {/* Content */}
            <div className="modal-content">
              <div className="modal-content-scroll">
                {/* Rating Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-500">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <label className="text-sm font-semibold text-gray-900">Minimum Puan</label>
                  </div>
                  <select 
                    className="modal-input"
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
                    className="modal-input"
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
                    className="modal-input"
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
                        className="modal-input"
                      >
                        <option value="">Tümü</option>
                        <option value="beauty">Güzellik</option>
                        <option value="health">Sağlık</option>
                        <option value="fitness">Fitness</option>
                        <option value="wellness">Wellness</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Üyelik</label>
                      <select 
                        value={membersOnly ? 'yes' : 'no'}
                        onChange={(e) => setMembersOnly(e.target.value === 'yes')}
                        className="modal-input"
                      >
                        <option value="no">Tümü</option>
                        <option value="yes">Üye Olanlar</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Gender Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-pink-500">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                    </svg>
                    <label className="text-sm font-semibold text-gray-900">Cinsiyet</label>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {(['all','male','female','unisex'] as const).map(gender => (
                      <button
                        key={gender}
                        onClick={() => setGenderFilter(gender)}
                        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                          genderFilter===gender? 
                          'bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white border-transparent shadow-md' :
                          'bg-white text-gray-700 border-gray-200 hover:border-rose-300 hover:bg-rose-50'
                        }`}
                      >
                        {gender === 'all' ? 'Tümü' : gender === 'male' ? 'Erkek' : gender === 'female' ? 'Kadın' : 'Unisex'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bookable Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <label className="text-sm font-semibold text-gray-900">Randevu Durumu</label>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {(['all','yes','no'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setBookable(status)}
                        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                          bookable===status? 
                          'bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white border-transparent shadow-md' :
                          'bg-white text-gray-700 border-gray-200 hover:border-rose-300 hover:bg-rose-50'
                        }`}
                      >
                        {status === 'all' ? 'Tümü' : status === 'yes' ? 'Randevu Alınabilir' : 'Randevu Alınamaz'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Summary */}
                <div className="mt-6 p-4 bg-gradient-to-r from-rose-50 to-fuchsia-50 rounded-xl border border-rose-200">
                  <div className="text-sm font-medium text-gray-900 mb-2">Aktif Filtreler:</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {minRating > 0 && <div>• Minimum {minRating}+ yıldız</div>}
                    {maxDistanceKm && <div>• Maksimum {maxDistanceKm} km</div>}
                    {hasPhone && <div>• Telefonu olanlar</div>}
                    {hasEmail && <div>• E-postası olanlar</div>}
                    {genderFilter !== 'all' && <div>• {genderFilter === 'male' ? 'Erkek' : genderFilter === 'female' ? 'Kadın' : 'Unisex'} hizmet</div>}
                    {category && <div>• {category} kategorisi</div>}
                    {membersOnly && <div>• Üye olanlar</div>}
                    {bookable !== 'all' && <div>• {bookable === 'yes' ? 'Randevu alınabilir' : 'Randevu alınamaz'}</div>}
                    {!minRating && !maxDistanceKm && !hasPhone && !hasEmail && genderFilter === 'all' && !category && !membersOnly && bookable === 'all' && (
                      <div className="text-gray-500">Tüm işletmeler gösterilecek</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-white/40 p-4 sm:p-6">
              <div className="modal-footer">
                <button
                  className="modal-btn modal-btn-secondary modal-btn-flex"
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 12h8M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Temizle</span>
                </button>
                <button
                  className="modal-btn modal-btn-primary modal-btn-flex"
                  onClick={() => setFilterOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Filtreleri Uygula</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}