"use client";
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Leaflet CSS'i dinamik olarak yükle - Production uyumlu
const LeafletMap = dynamic(() => import('./LeafletMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <div className="text-sm text-gray-600">Harita yükleniyor...</div>
      </div>
    </div>
  )
});

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

export default function Map(props: MapProps) {
  const {
    center,
    zoom = 12,
    markers = [],
    onMarkerClick,
    showUserLocation = true,
    onMapClick,
    className = "w-full h-full"
  } = props || {};

  // Default center - İstanbul
  const defaultCenter = { lat: 41.0082, lng: 28.9784 };
  const mapCenter = center || defaultCenter;

  return (
    <div className={className} style={props.style}>
      <LeafletMap
        center={mapCenter}
        zoom={zoom}
        markers={markers}
        onMarkerClick={onMarkerClick}
        showUserLocation={showUserLocation}
        onMapClick={onMapClick}
      />
    </div>
  );
}