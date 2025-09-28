"use client";
import { useEffect, useRef, useState } from 'react';
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

interface LeafletMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers: Array<{
    id: string;
    position: { lat: number; lng: number };
    title: string;
    color?: string;
  }>;
  onMarkerClick?: (markerId: string) => void;
  showUserLocation?: boolean;
  onMapClick?: (position: { lat: number; lng: number }) => void;
}

// Kullanıcı konumu için marker
function UserLocationMarker({ showUserLocation }: { showUserLocation: boolean }) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const map = useMap();

  useEffect(() => {
    if (!showUserLocation) return;

    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(userPos);
            map.setView(userPos, 15);
          },
          (error) => {
            console.log('Konum alınamadı:', error);
          }
        );
      }
    };

    getUserLocation();
  }, [showUserLocation, map]);

  if (!userLocation) return null;

  return (
    <Marker
      position={[userLocation.lat, userLocation.lng]}
      icon={L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })}
    >
      <Popup>Senin konumun</Popup>
    </Marker>
  );
}

// Harita tıklama olayları
function MapClickHandler({ onMapClick }: { onMapClick?: (position: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick({
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
      }
    }
  });
  return null;
}

// Harita merkezini güncelle
function MapCenter({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom, map]);
  
  return null;
}

export default function LeafletMapComponent({
  center,
  zoom,
  markers,
  onMarkerClick,
  showUserLocation = true,
  onMapClick
}: LeafletMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Harita yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
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
        
        {/* Harita merkezini güncelle */}
        <MapCenter center={center} zoom={zoom} />
        
        {/* Harita tıklama olayları */}
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Kullanıcı konumu */}
        <UserLocationMarker showUserLocation={showUserLocation} />
        
        {/* Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.position.lat, marker.position.lng]}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) {
                  onMarkerClick(marker.id);
                }
              }
            }}
            icon={L.divIcon({
              className: 'custom-marker',
              html: `
                <div style="
                  width: 30px;
                  height: 30px;
                  background: ${marker.color || '#ef4444'};
                  border: 3px solid white;
                  border-radius: 50%;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: 12px;
                ">📍</div>
              `,
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-gray-900">{marker.title}</h3>
                <p className="text-sm text-gray-600">
                  Lat: {marker.position.lat.toFixed(4)}<br/>
                  Lng: {marker.position.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
