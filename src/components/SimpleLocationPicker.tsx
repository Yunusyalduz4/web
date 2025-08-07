"use client";
import { useState } from 'react';

interface LocationPickerProps {
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

export default function SimpleLocationPicker({ onLocationSelect }: LocationPickerProps) {
  const [latitude, setLatitude] = useState(41.0082);
  const [longitude, setLongitude] = useState(28.9784);
  const [address, setAddress] = useState('İstanbul, Türkiye');

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          setAddress(`Konum: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          
          onLocationSelect({
            latitude: lat,
            longitude: lng,
            address: `Konum: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
          });
        },
        (error) => {
          console.error('Konum alınamadı:', error);
          setAddress('Konum alınamadı');
        }
      );
    } else {
      setAddress('Tarayıcınız konum özelliğini desteklemiyor');
    }
  };

  const handleManualSubmit = () => {
    onLocationSelect({
      latitude,
      longitude,
      address: address || `Konum: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          <span>📍</span>
          Konumumu Al
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enlem
          </label>
          <input
            type="number"
            value={latitude}
            onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
            step="any"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Boylam
          </label>
          <input
            type="number"
            value={longitude}
            onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
            step="any"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Adres (Opsiyonel)
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Adres bilgisi..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      <button
        type="button"
        onClick={handleManualSubmit}
        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
      >
        Konumu Kaydet
      </button>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• "Konumumu Al" butonu ile anlık konumunuzu alın</p>
        <p>• Enlem/Boylam değerlerini manuel olarak düzenleyebilirsiniz</p>
        <p>• Adres bilgisini manuel olarak girebilirsiniz</p>
      </div>
    </div>
  );
}
