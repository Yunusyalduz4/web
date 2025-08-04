"use client";
import { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

interface LocationPickerProps {
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  defaultLocation?: { lat: number; lng: number };
}

const containerStyle = {
  width: '100%',
  height: '300px'
};

const defaultCenter = {
  lat: 41.0082, // İstanbul merkez
  lng: 28.9784
};

// Static libraries array to prevent performance warnings
const libraries = ["places"] as const;

export default function LocationPicker({ onLocationSelect, defaultLocation }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState(defaultLocation || defaultCenter);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const onMapClick = useCallback(async (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      setSelectedLocation({ lat, lng });
      setIsLoading(true);

      try {
        // Reverse geocoding ile adres bilgisini al
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat, lng } });
        
        if (result.results[0]) {
          const fullAddress = result.results[0].formatted_address;
          setAddress(fullAddress);
          
          onLocationSelect({
            latitude: lat,
            longitude: lng,
            address: fullAddress
          });
        }
      } catch (error) {
        console.error('Adres alınamadı:', error);
        setAddress('Adres alınamadı');
      } finally {
        setIsLoading(false);
      }
    }
  }, [onLocationSelect]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (!isLoaded) {
    return (
      <div className="w-full h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Harita yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={selectedLocation}
          zoom={13}
          onClick={onMapClick}
          onLoad={onMapLoad}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {selectedLocation && (
            <Marker
              position={selectedLocation}
              animation={google.maps.Animation.DROP}
            />
          )}
        </GoogleMap>
        
        {isLoading && (
          <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded-lg shadow-md text-sm">
            Adres alınıyor...
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Seçilen Konum
        </label>
        <div className="text-sm text-gray-600 space-y-1">
          <div>Enlem: {selectedLocation.lat.toFixed(6)}</div>
          <div>Boylam: {selectedLocation.lng.toFixed(6)}</div>
          {address && (
            <div className="mt-2 p-2 bg-gray-50 rounded border">
              <strong>Adres:</strong> {address}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Haritada bir yere tıklayarak konumunuzu seçin
        </p>
      </div>
    </div>
  );
} 