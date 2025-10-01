"use client";
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet icon sorununu çöz
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletLocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  defaultLocation?: { lat: number; lng: number; address?: string };
}

// Harita tıklama olayları
function MapClickHandler({ 
  onLocationSelect, 
  selectedLocation, 
  setSelectedLocation 
}: { 
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectedLocation: (location: { lat: number; lng: number } | null) => void;
}) {
  useMapEvents({
    click: async (e) => {
      const newLocation = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      
      setSelectedLocation(newLocation);
      
      // Reverse geocoding ile adres al
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLocation.lat}&lon=${newLocation.lng}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        
        const address = data.display_name || `${newLocation.lat.toFixed(4)}, ${newLocation.lng.toFixed(4)}`;
        
        onLocationSelect({
          lat: newLocation.lat,
          lng: newLocation.lng,
          address: address
        });
      } catch (error) {
        console.error('Adres alınamadı:', error);
        onLocationSelect({
          lat: newLocation.lat,
          lng: newLocation.lng,
          address: `${newLocation.lat.toFixed(4)}, ${newLocation.lng.toFixed(4)}`
        });
      }
    }
  });
  
  return null;
}

// Seçilen konum marker'ı
function SelectedLocationMarker({ location }: { location: { lat: number; lng: number } | null }) {
  if (!location) return null;

  return (
    <Marker
      position={[location.lat, location.lng]}
      icon={L.divIcon({
        className: 'selected-location-marker',
        html: `
          <div style="
            width: 30px;
            height: 30px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
          ">📍</div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-gray-900">Seçilen Konum</h3>
          <p className="text-sm text-gray-600">
            Lat: {location.lat.toFixed(4)}<br/>
            Lng: {location.lng.toFixed(4)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

export default function LeafletLocationPickerComponent({
  onLocationSelect,
  defaultLocation
}: LeafletLocationPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    defaultLocation ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Mevcut konumu al
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum özelliğini desteklemiyor');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setSelectedLocation(currentLocation);
        
        try {
          // Reverse geocoding ile adres al
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLocation.lat}&lon=${currentLocation.lng}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          
          const address = data.display_name || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`;
          
          onLocationSelect({
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            address: address
          });
        } catch (error) {
          console.error('Adres alınamadı:', error);
          onLocationSelect({
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            address: `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
          });
        }
        
        setIsLoading(false);
      },
      (error) => {
        setError('Konum alınamadı: ' + error.message);
        setIsLoading(false);
      }
    );
  };

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Konum seçici yükleniyor...</div>
        </div>
      </div>
    );
  }

  // Default center - İstanbul
  const defaultCenter = { lat: 41.0082, lng: 28.9784 };
  const mapCenter = defaultLocation ? { lat: defaultLocation.lat, lng: defaultLocation.lng } : defaultCenter;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Kontrol butonları */}
      <div className="flex gap-2 p-3 bg-white border-b border-gray-200">
        <button
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isLoading ? 'Konum alınıyor...' : '📍 Mevcut Konumum'}
        </button>
        
        <button
          onClick={() => setSelectedLocation(null)}
          className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
        >
          🗑️ Temizle
        </button>
      </div>

      {/* Hata mesajı */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Harita */}
      <div className="flex-1">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
        >
          {/* OpenStreetMap tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Harita tıklama olayları */}
          <MapClickHandler
            onLocationSelect={onLocationSelect}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
          />
          
          {/* Seçilen konum marker'ı */}
          <SelectedLocationMarker location={selectedLocation} />
        </MapContainer>
      </div>

      {/* Talimat */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          💡 Haritaya tıklayarak konum seçin veya "Mevcut Konumum" butonuna tıklayın
        </p>
      </div>
    </div>
  );
}
