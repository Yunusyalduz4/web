"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { FaListUl, FaMapMarkedAlt } from 'react-icons/fa';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '1rem',
  marginBottom: '2rem',
};

export default function UserBusinessesPage() {
  const { data: businesses, isLoading } = trpc.business.getBusinesses.useQuery();
  const [view, setView] = useState<'list' | 'map'>('list');
  const router = useRouter();
  const center = { lat: 39.0, lng: 35.0 };

  // Google Maps Marker rendering
  function renderMap(map: google.maps.Map) {
    if (!businesses) return;
    businesses.forEach((b: any) => {
      if (b.latitude && b.longitude) {
        const marker = new window.google.maps.Marker({
          position: { lat: b.latitude, lng: b.longitude },
          map,
          title: b.name,
        });
        marker.addListener('click', () => {
          router.push(`/dashboard/user/businesses/${b.id}`);
        });
      }
    });
  }

  return (
    <main className="max-w-4xl mx-auto p-4 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h1 className="text-2xl font-extrabold mb-6 text-center bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none animate-fade-in">
        İşletmeler
      </h1>
      <div className="flex justify-center mb-8">
        <button
          className={`flex items-center gap-2 px-6 py-2 rounded-l-full font-semibold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${view === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-600 border border-blue-200'}`}
          onClick={() => setView('list')}
          aria-pressed={view === 'list'}
        >
          <FaListUl /> Liste
        </button>
        <button
          className={`flex items-center gap-2 px-6 py-2 rounded-r-full font-semibold text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400 ${view === 'map' ? 'bg-pink-500 text-white shadow-lg' : 'bg-white text-pink-500 border border-pink-200'}`}
          onClick={() => setView('map')}
          aria-pressed={view === 'map'}
        >
          <FaMapMarkedAlt /> Harita
        </button>
      </div>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">İşletmeler yükleniyor...</span>
        </div>
      )}
      <div className="transition-all duration-500">
        {view === 'list' && (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {businesses?.map((b: any) => (
              <li key={b.id} className="border rounded-2xl p-5 bg-white shadow hover:shadow-xl transition-shadow flex flex-col gap-2 animate-fade-in">
                <span className="font-bold text-lg text-blue-700">{b.name}</span>
                <span className="text-gray-500 text-sm">{b.address}</span>
                <span className="text-gray-400 text-xs">{b.phone}</span>
                <span className="text-gray-400 text-xs">{b.email}</span>
                <button
                  className="mt-2 px-4 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  onClick={() => router.push(`/dashboard/user/businesses/${b.id}`)}
                >
                  Detay
                </button>
              </li>
            ))}
          </ul>
        )}
        {view === 'map' && (
          <div className="w-full h-[70vh] min-h-[300px] rounded-2xl overflow-hidden animate-fade-in">
            <Wrapper apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} render={renderMapStatus}>
              <GoogleMapWithMarkers
                businesses={businesses ?? []}
                center={center}
                onMarkerClick={id => router.push(`/dashboard/user/businesses/${id}`)}
              />
            </Wrapper>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </main>
  );
}

// GoogleMapWithMarkers component
function GoogleMapWithMarkers({ businesses, center, onMarkerClick }: { businesses: any[]; center: { lat: number; lng: number }; onMarkerClick: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window.google || !ref.current) return;
    const map = new window.google.maps.Map(ref.current, {
      center,
      zoom: 6,
      mapId: 'DEMO_MAP_ID',
      disableDefaultUI: true,
    });
    if (businesses) {
      businesses.forEach((b: any) => {
        if (b.latitude && b.longitude) {
          const marker = new window.google.maps.Marker({
            position: { lat: b.latitude, lng: b.longitude },
            map,
            title: b.name,
          });
          marker.addListener('click', () => onMarkerClick(b.id));
        }
      });
    }
  }, [businesses, center, onMarkerClick]);
  return <div ref={ref} className="w-full h-full" />;
}

function renderMapStatus(status: Status) {
  if (status === Status.LOADING) return <div className="text-center">Harita yükleniyor...</div>;
  if (status === Status.FAILURE) return <div className="text-center text-red-600">Harita yüklenemedi</div>;
  return <div />;
} 