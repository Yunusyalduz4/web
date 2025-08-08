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
    className = "w-full h-96"
  } = props || {};

  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userMarker, setUserMarker] = useState<any>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Default center - güvenli şekilde
  const defaultCenter = { lat: 39.9334, lng: 32.8597 }; // Ankara
  const mapCenter = center && typeof center.lat === 'number' && typeof center.lng === 'number' 
    ? center 
    : defaultCenter;

  // Konum takibini başlat - tarayıcının kendi popup'ını kullan
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation desteklenmiyor');
      return;
    }

    if (isTrackingLocation) {
      return; // Zaten takip ediliyor
    }

    setIsTrackingLocation(true);
    console.log('Konum takibi başlatılıyor...');

    // İlk konumu al - bu tarayıcının popup'ını tetikler
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('İlk konum alındı:', userPos);
        setUserLocation(userPos);
        
        // Haritayı kullanıcı konumuna odakla
        if (map) {
          map.setCenter(userPos);
          map.setZoom(15);
          updateUserMarker(userPos);
        }
      },
      (error) => {
        console.error('İlk konum alınamadı:', error);
        setIsTrackingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.log('Kullanıcı konum iznini reddetti');
            break;
          case error.POSITION_UNAVAILABLE:
            console.log('Konum bilgisi mevcut değil');
            break;
          case error.TIMEOUT:
            console.log('Konum alma zaman aşımına uğradı');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Sürekli konum takibi
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('Konum güncellendi:', userPos);
        setUserLocation(userPos);
        
        // Harita açıksa marker'ı güncelle
        if (map) {
          updateUserMarker(userPos);
        }
      },
      (error) => {
        console.error('Konum takibi hatası:', error);
        setIsTrackingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    watchIdRef.current = watchId;
  };

  // Konum takibini durdur
  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingLocation(false);
    console.log('Konum takibi durduruldu');
  };

  // Kullanıcı marker'ını güncelle
  const updateUserMarker = (position: { lat: number; lng: number }) => {
    if (!map || !window.google) return;

    // Eski marker'ı kaldır
    if (userMarker) {
      userMarker.setMap(null);
    }

    // Yeni marker ekle
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
    setUserMarker(newUserMarker);
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
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
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
    if (map && showUserLocation && !isTrackingLocation) {
      console.log('Harita hazır, otomatik konum takibi başlatılıyor...');
      // 1 saniye bekle ve sonra konum izni iste
      setTimeout(() => {
        startLocationTracking();
      }, 1000);
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
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C10.477 0 6 4.477 6 10c0 7 10 22 10 22s10-15 10-22c0-5.523-4.477-10-10-10z" fill="${markerData.color}"/>
                <circle cx="16" cy="10" r="4" fill="white"/>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 32)
          } : undefined
        });

        if (onMarkerClick) {
          marker.addListener('click', () => {
            onMarkerClick(markerData.id);
          });
        }
      });
    } catch (err) {
      console.error('Marker eklenirken hata:', err);
    }
  }, [map, markers, onMarkerClick]);

  return (
    <div className="relative" style={{ minHeight: '300px' }}>
      {/* Harita div'i her zaman render edilir */}
      <div 
        ref={mapRef} 
        className={className}
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '300px',
          position: 'relative',
          zIndex: 1
        }}
      />
      
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
      
      {/* Konum butonları */}
      {showUserLocation && !isLoading && !error && (
        <div className="absolute top-4 right-4 flex flex-col gap-2" style={{ zIndex: 3 }}>
          <button
            onClick={() => {
              if (isTrackingLocation) {
                stopLocationTracking();
              } else {
                startLocationTracking();
              }
            }}
            className={`p-2 rounded-lg shadow-lg transition-colors ${
              isTrackingLocation 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title={isTrackingLocation ? 'Konum takibini durdur' : 'Konum takibini başlat'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          </button>
          
          <button
            onClick={() => {
              if (map) {
                map.setCenter(mapCenter);
                map.setZoom(zoom);
              }
            }}
            className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
            title="Merkeze odaklan"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3b82f6"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          </button>
        </div>
      )}

      {/* Konum durumu */}
      {userLocation && (
        <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg text-sm" style={{ zIndex: 3 }}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isTrackingLocation ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-gray-700">
              {isTrackingLocation ? 'Konum takip ediliyor' : 'Konum alındı'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </div>
        </div>
      )}
    </div>
  );
}
