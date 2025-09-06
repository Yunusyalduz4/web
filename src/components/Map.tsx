"use client";
import { useState, useEffect, useRef } from 'react';

interface MapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    position: { lat: number; lng: number };
    title: string;
    color?: string;
  }>;
  onMarkerClick?: (markerId: string) => void;
  showUserLocation?: boolean;
  onMapClick?: (position: { lat: number; lng: number }) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Global flag to prevent multiple script loads
declare global {
  interface Window {
    googleMapsLoaded?: boolean;
    googleMapsLoading?: boolean;
  }
}

export default function Map(props: MapProps) {
  // Props'ları güvenli şekilde al ve default değerler ver
  const {
    center,
    zoom = 12,
    markers = [],
    onMarkerClick,
    showUserLocation = true,
    onMapClick,
    className = "w-full h-full"
  } = props || {};

  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userMarker, setUserMarker] = useState<any>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const isStartingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  // Default center - güvenli şekilde
  const defaultCenter = { lat: 39.9334, lng: 32.8597 }; // Ankara
  const mapCenter = center && typeof center.lat === 'number' && typeof center.lng === 'number' 
    ? center 
    : defaultCenter;

  // Konum takibini başlat - tek sefer guard + iki aşamalı deneme
  const startLocationTracking = async () => {
    if (!navigator.geolocation) {
      console.log('Geolocation desteklenmiyor');
      return;
    }

    if (isStartingRef.current || isTrackingLocation) {
      console.log('Konum takibi zaten başlatılıyor veya aktif');
      return; // Zaten başlatılıyor veya aktif
    }
    
    isStartingRef.current = true;
    console.log('Konum takibi başlatılıyor...');

    // Önce düşük doğruluk (daha hızlı) → başarısız olursa yüksek doğruluk dene
    const tryGetPosition = (opts: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      });

    const lowAccuracy: PositionOptions = { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 };
    const highAccuracy: PositionOptions = { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 };

    let firstFix: GeolocationPosition | null = null;
    try {
      firstFix = await tryGetPosition(lowAccuracy);
    } catch (e1: any) {
      console.warn('Düşük doğruluk zaman aşımı/başarısızlık, yüksek doğruluk deneniyor...', e1);
      try {
        firstFix = await tryGetPosition(highAccuracy);
      } catch (e2: any) {
        console.error('İlk konum alınamadı:', e2);
        isStartingRef.current = false;
        setIsTrackingLocation(false);
        return;
      }
    }

    if (firstFix) {
      const userPos = { lat: firstFix.coords.latitude, lng: firstFix.coords.longitude };
      setUserLocation(userPos);
      if (map) {
        // Eski marker'ları tamamen temizle
        if (userMarker) {
          userMarker.setMap(null);
          userMarker.setPosition(null);
          userMarker.setTitle(null);
          userMarker.setIcon(null);
          userMarker.setLabel(null);
          userMarker.setClickable(false);
          userMarker.setDraggable(false);
          userMarker.setVisible(false);
          userMarker.setZIndex(null);
          userMarker.setOpacity(0);
          userMarker.setAnimation(null);
          userMarker.setOptions({});
          setUserMarker(null);
        }
        
        updateUserLocation(userPos);
      }
    }

    // Varsa eski watcher'ı temizle
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Eğer konum takibi durdurulduysa güncelleme yapma
        if (!isTrackingLocation || isStartingRef.current) {
          return;
        }
        
        const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
        
        // Konum değişimi kontrol et (çok küçük değişimleri görmezden gel)
        if (userLocation) {
          const latDiff = Math.abs(userPos.lat - userLocation.lat);
          const lngDiff = Math.abs(userPos.lng - userLocation.lng);
          
          // Sadece belirli bir mesafeden fazla değişim varsa güncelle
          if (latDiff < 0.0001 && lngDiff < 0.0001) {
            return; // Çok küçük değişim, güncelleme yapma
          }
        }
        
        setUserLocation(userPos);
        if (map) {
          // Konum güncelle
          updateUserLocation(userPos);
        }
      },
      (error) => {
        console.error('Konum takibi hatası:', error);
        setIsTrackingLocation(false);
        isStartingRef.current = false;
      },
              { 
          enableHighAccuracy: false, // Düşük doğruluk (daha az sık güncelleme)
          timeout: 30000, // 30 saniye timeout
          maximumAge: 120000 // 2 dakika cache (çok daha az sık güncelleme)
        }
    );

    watchIdRef.current = watchId;
    setIsTrackingLocation(true);
    isStartingRef.current = false;
  };

  // Konum takibini durdur
  const stopLocationTracking = () => {
    console.log('Konum takibi durduruluyor...');
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Konum marker'ını ve bilgisini temizle
    if (userMarker) {
      userMarker.setMap(null);
      setUserMarker(null);
    }
    setUserLocation(null);
    
    setIsTrackingLocation(false);
    isStartingRef.current = false;
    console.log('Konum takibi durduruldu');
  };

  // Kullanıcı konumunu güncelle ve marker ekle
  const updateUserLocation = (position: { lat: number; lng: number }) => {
    if (!map || !window.google) return;
    
    // Eğer marker yoksa yeni oluştur
    if (!userMarker) {
      const newUserMarker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: 'Konumunuz',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="white" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
          anchor: new window.google.maps.Point(12, 12)
        }
      });
      
      // Marker'ı set et
      setUserMarker(newUserMarker);
    } else {
      // Mevcut marker'ın pozisyonunu güncelle
      userMarker.setPosition(position);
    }
    
    // Haritayı kullanıcı konumuna odakla
    map.setCenter(position);
    map.setZoom(15);
    
    // Konum bilgisini güncelle
    setUserLocation(position);
  };

  // Google Maps yükleme
  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        setError(null);

        // Global flag kontrol et
        if (window.googleMapsLoaded) {
          return;
        }

        // Google Maps zaten yüklü mü kontrol et
        if (window.google && window.google.maps) {
          window.googleMapsLoaded = true;
          return;
        }

        // Zaten yükleniyor mu kontrol et
        if (window.googleMapsLoading) {
          // Yükleme tamamlanana kadar bekle
          while (window.googleMapsLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          return;
        }

        // API key kontrol et
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key bulunamadı');
        }

        // Yükleme flag'ini set et
        window.googleMapsLoading = true;

        // Script yükle - loading=async parametresi eklendi
        return new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            window.googleMapsLoaded = true;
            window.googleMapsLoading = false;
            resolve();
          };
          script.onerror = () => {
            window.googleMapsLoading = false;
            reject(new Error('Google Maps yüklenemedi'));
          };
          document.head.appendChild(script);
        });
      } catch (err) {
        window.googleMapsLoading = false;
        setError(err instanceof Error ? err.message : 'Harita yüklenirken hata oluştu');
        setIsLoading(false);
      }
    };

    const initializeMap = () => {
      // mapRef'in DOM'a bağlanmasını bekle
      if (!mapRef.current) {
        console.log('mapRef not ready, retrying...');
        setTimeout(initializeMap, 100);
        return;
      }

      // Google Maps API'nin tamamen yüklenmesini bekle
      if (!window.google || !window.google.maps || !window.google.maps.Map) {
        console.log('Google Maps API not ready, retrying...');
        setTimeout(initializeMap, 100);
        return;
      }

      try {
        console.log('Initializing map with center:', mapCenter);
        console.log('Map container dimensions:', {
          width: mapRef.current.offsetWidth,
          height: mapRef.current.offsetHeight,
          style: mapRef.current.style.cssText
        });
        
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: zoom,
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          // Tek parmakla kullanım için gesture ayarları
          gestureHandling: 'greedy', // Tek parmakla zoom ve pan
          scrollwheel: true, // Mouse wheel ile zoom
          disableDoubleClickZoom: false, // Çift tıklama ile zoom
          draggable: true, // Sürükleme ile pan
          // Touch optimizasyonları
          clickableIcons: false, // POI'ları tıklanamaz yap
          keyboardShortcuts: false, // Klavye kısayollarını kapat
          // Zoom kontrolü ayarları
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_CENTER
          },
          // Konum butonu ekle
          mapTypeControlOptions: {
            style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: window.google.maps.ControlPosition.TOP_RIGHT
          },

          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'landscape',
              elementType: 'geometry',
              stylers: [{ color: '#f8fafc' }]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#e0f2fe' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#ffffff' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#e2e8f0' }]
            },
            {
              featureType: 'road',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#475569' }]
            },
            {
              featureType: 'road',
              elementType: 'labels.text.stroke',
              stylers: [{ color: '#ffffff' }]
            },
            {
              featureType: 'administrative',
              elementType: 'geometry',
              stylers: [{ color: '#f1f5f9' }]
            },
            {
              featureType: 'administrative',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#cbd5e1' }]
            },
            {
              featureType: 'administrative',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#64748b' }]
            }
          ]
        });

        setMap(mapInstance);
        console.log('Map initialized successfully');

        // Harita tıklama olayı
        if (onMapClick) {
          mapInstance.addListener('click', (event: any) => {
            if (event.latLng) {
              onMapClick({
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
              });
            }
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Map initialization error:', err);
        setError('Harita başlatılırken hata oluştu');
        setIsLoading(false);
      }
    };

    loadGoogleMaps().then(() => {
      console.log('Google Maps loaded, initializing map...');
      // Script yüklendikten sonra haritayı başlat
      setTimeout(initializeMap, 100);
    }).catch((err) => {
      console.error('Google Maps loading error:', err);
      setError(err.message);
      setIsLoading(false);
    });
  }, []); // Sadece bir kez çalışsın

  // Harita hazır olduğunda otomatik konum takibini başlat
  useEffect(() => {
    if (map && showUserLocation && !isTrackingLocation && !isStartingRef.current) {
      console.log('Harita hazır, otomatik konum takibi başlatılıyor...');
      // 2 saniye bekle ve sonra konum izni iste
      setTimeout(() => {
        if (!isStartingRef.current && !isTrackingLocation) {
          startLocationTracking();
        }
      }, 2000);
    }
  }, [map, showUserLocation, isTrackingLocation]);

  // Component unmount olduğunda konum takibini durdur
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Marker'ları güncelle
  useEffect(() => {
    if (!map || !window.google) return;

    try {
      console.log('Adding markers:', markers.length);
      // Yeni marker'ları ekle
      markers.forEach(markerData => {
        if (!markerData || !markerData.position || typeof markerData.position.lat !== 'number' || typeof markerData.position.lng !== 'number') {
          console.warn('Geçersiz marker data:', markerData);
          return;
        }

        const marker = new window.google.maps.Marker({
          position: markerData.position,
          map: map,
          title: markerData.title || 'Marker',
          icon: markerData.color ? {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
                  </filter>
                </defs>
                <path d="M20 0C13.373 0 8 5.373 8 12c0 8.5 12 28 12 28s12-19.5 12-28c0-6.627-5.373-12-12-12z" fill="${markerData.color}" filter="url(#shadow)"/>
                <circle cx="20" cy="12" r="6" fill="white" stroke="${markerData.color}" stroke-width="2"/>
                <circle cx="20" cy="12" r="3" fill="${markerData.color}"/>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 40)
          } : undefined,
          animation: window.google.maps.Animation.DROP
        });

        if (onMarkerClick) {
          marker.addListener('click', () => {
            // Marker'a tıklandığında bounce animasyonu
            marker.setAnimation(window.google.maps.Animation.BOUNCE);
            setTimeout(() => {
              marker.setAnimation(null);
            }, 750);
            
            onMarkerClick(markerData.id);
          });
        }

        // Hover efektleri
        marker.addListener('mouseover', () => {
          marker.setZIndex(1000);
        });
        
        marker.addListener('mouseout', () => {
          marker.setZIndex(1);
        });
      });
    } catch (err) {
      console.error('Marker eklenirken hata:', err);
    }
  }, [map, markers, onMarkerClick]);

  return (
    <div className="relative w-full h-full">
      {/* Harita div'i her zaman render edilir */}
      <div 
        ref={mapRef} 
        className={className}
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '500px',
          position: 'relative',
          zIndex: 1
        }}
      />
      
      {/* Custom Zoom Butonları - Mobil için */}
      {map && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 flex flex-col gap-2">
          <button
            onClick={() => {
              if (map) {
                const currentZoom = map.getZoom();
                map.setZoom(currentZoom + 1);
              }
            }}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
            title="Yakınlaştır"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            onClick={() => {
              if (map) {
                const currentZoom = map.getZoom();
                map.setZoom(currentZoom - 1);
              }
            }}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
            title="Uzaklaştır"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Harita yükleniyor...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">⚠️</div>
            <p className="text-red-700 font-medium">Harita yüklenemedi</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}
      



    </div>
  );
}
