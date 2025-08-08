"use client";
import { useState, useEffect, useRef } from 'react';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  defaultLocation?: { lat: number; lng: number; address?: string };
  className?: string;
}

export default function LocationPicker({ onLocationSelect, defaultLocation, className = "" }: LocationPickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address: string } | null>(
    defaultLocation ? { lat: defaultLocation.lat, lng: defaultLocation.lng, address: defaultLocation.address || '' } : null
  );

  // Google Maps yükleme
  useEffect(() => {
    const loadGoogleMaps = async () => {
      // Global flag kontrol et
      if (window.googleMapsLoaded) {
        return;
      }

      if (window.google && window.google.maps) {
        window.googleMapsLoaded = true;
        return;
      }

      // Zaten yükleniyor mu kontrol et
      if (window.googleMapsLoading) {
        while (window.googleMapsLoading) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setError('Google Maps API key bulunamadı');
        return;
      }

      // Yükleme flag'ini set et
      window.googleMapsLoading = true;

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
    };

    loadGoogleMaps().catch((err) => {
      setError(err.message);
    });
  }, []);

  // Mevcut konumu al
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation desteklenmiyor');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        try {
          const address = await reverseGeocode(lat, lng);
          const location = { lat, lng, address };
          setCurrentLocation(location);
          onLocationSelect(location);
        } catch (err) {
          setError('Adres alınamadı');
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        setIsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('Konum izni reddedildi');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Konum bilgisi mevcut değil');
            break;
          case error.TIMEOUT:
            setError('Konum alma zaman aşımına uğradı');
            break;
          default:
            setError('Konum alınamadı');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Reverse geocoding - koordinatları adrese çevir
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps yüklenmedi');
    }

    return new Promise((resolve, reject) => {
      const geocoder = new window.google.maps.Geocoder();
      const latlng = { lat, lng };

      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          reject(new Error('Adres bulunamadı'));
        }
      });
    });
  };

  // Harita tıklama ile konum seç
  const handleMapClick = async (event: any) => {
    if (!event.latLng) return;

    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    setIsLoading(true);
    setError(null);

    try {
      const address = await reverseGeocode(lat, lng);
      const location = { lat, lng, address };
      setCurrentLocation(location);
      onLocationSelect(location);
    } catch (err) {
      setError('Adres alınamadı');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mevcut konum butonu */}
      <button
        type="button"
        onClick={getCurrentLocation}
        disabled={isLoading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Konum alınıyor...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            Mevcut Konumu Al
          </>
        )}
      </button>

      {/* Hata mesajı */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Seçilen konum bilgisi */}
      {currentLocation && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="font-medium mb-1">Seçilen Konum:</div>
          <div className="text-sm">{currentLocation.address}</div>
          <div className="text-xs text-green-600 mt-1">
            {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
          </div>
        </div>
      )}

      {/* Harita */}
      <div className="relative" style={{ height: '300px' }}>
        <div 
          id="location-picker-map"
          className="w-full h-full rounded-lg border border-gray-300"
          style={{ minHeight: '300px' }}
        />
        
        {/* Harita yükleme overlay */}
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Harita yükleniyor...</p>
          </div>
        </div>
      </div>

      {/* Harita başlatma */}
      <MapInitializer 
        onMapClick={handleMapClick}
        defaultLocation={currentLocation}
      />
    </div>
  );
}

// Harita başlatma component'i
function MapInitializer({ 
  onMapClick, 
  defaultLocation 
}: { 
  onMapClick: (event: any) => void;
  defaultLocation: { lat: number; lng: number; address: string } | null;
}) {
  const mapRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeMap = () => {
      if (isInitialized) return;

      const mapElement = document.getElementById('location-picker-map');
      if (!mapElement) {
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
        console.log('Initializing LocationPicker map...');
        const center = defaultLocation 
          ? { lat: defaultLocation.lat, lng: defaultLocation.lng }
          : { lat: 39.9334, lng: 32.8597 }; // Ankara

        const map = new window.google.maps.Map(mapElement, {
          center,
          zoom: 15,
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true
        });

        // Harita tıklama olayı
        map.addListener('click', onMapClick);

        // Varsayılan konum marker'ı
        if (defaultLocation) {
          new window.google.maps.Marker({
            position: { lat: defaultLocation.lat, lng: defaultLocation.lng },
            map: map,
            title: 'Seçilen Konum'
          });
        }

        mapRef.current = map;
        setIsInitialized(true);

        // Loading overlay'i kaldır
        const overlay = mapElement.parentElement?.querySelector('.absolute');
        if (overlay) {
          overlay.remove();
        }

        console.log('LocationPicker map initialized successfully');
      } catch (err) {
        console.error('Map initialization error:', err);
        // Hata durumunda tekrar dene
        setTimeout(initializeMap, 500);
      }
    };

    // Google Maps yüklendikten sonra haritayı başlat
    const checkAndInitialize = () => {
      if (window.google && window.google.maps && window.google.maps.Map) {
        initializeMap();
      } else {
        setTimeout(checkAndInitialize, 100);
      }
    };

    checkAndInitialize();
  }, [defaultLocation, onMapClick, isInitialized]);

  return null;
}
