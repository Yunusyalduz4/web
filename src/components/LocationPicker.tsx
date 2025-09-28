"use client";
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Leaflet LocationPicker'ı dinamik olarak yükle
const LeafletLocationPicker = dynamic(() => import('./LeafletLocationPicker'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <div className="text-sm text-gray-600">Konum seçici yükleniyor...</div>
      </div>
    </div>
  )
});

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  defaultLocation?: { lat: number; lng: number; address?: string };
  className?: string;
}

export default function LocationPicker({ onLocationSelect, defaultLocation, className = "" }: LocationPickerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <LeafletLocationPicker
        onLocationSelect={onLocationSelect}
        defaultLocation={defaultLocation}
      />
    </div>
  );
}