"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaListUl, FaMapMarkedAlt } from 'react-icons/fa';
import Map from '../../../../components/Map';

export default function UserBusinessesPage() {
  const { data: businesses, isLoading } = trpc.business.getBusinesses.useQuery();
  const [view, setView] = useState<'list' | 'map'>('list');
  const router = useRouter();

  // İşletmeleri harita marker'larına çevir
  const mapMarkers = businesses?.map((b: any) => ({
    id: b.id,
    position: { lat: b.latitude || 39.9334, lng: b.longitude || 32.8597 },
    title: b.name,
    color: '#3b82f6'
  })) || [];

  const handleMarkerClick = (markerId: string) => {
    router.push(`/dashboard/user/businesses/${markerId}`);
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {businesses?.map((b: any) => (
              <div
                key={b.id}
                className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-white/20 hover:border-blue-200/50 animate-fade-in cursor-pointer"
                onClick={() => router.push(`/dashboard/user/businesses/${b.id}`)}
              >
                {/* Glassmorphism Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm"></div>
                
                {/* Subtle Border Glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500"></div>
                
                {/* Main Content */}
                <div className="relative p-5">
                  {/* Business Name & Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 truncate flex-1">
                      {b.name}
                    </h3>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg group-hover:scale-110 transition-all duration-300 ml-3">
                      🏢
                    </div>
                  </div>

                  {/* Contact Info - Modern */}
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-blue-50/50 to-blue-100/30 rounded-xl border border-blue-100/30">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs">
                        📍
                      </div>
                      <span className="text-sm text-gray-700 truncate font-medium">{b.address}</span>
                    </div>
                    
                    {b.phone && (
                      <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-green-50/50 to-green-100/30 rounded-xl border border-green-100/30">
                        <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-xs">
                          📞
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{b.phone}</span>
                      </div>
                    )}
                    
                    {b.email && (
                      <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-purple-50/50 to-purple-100/30 rounded-xl border border-purple-100/30">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs">
                          ✉️
                        </div>
                        <span className="text-sm text-gray-700 truncate font-medium">{b.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 text-sm group-hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/user/businesses/${b.id}`);
                    }}
                  >
                    <span className="text-base">👀</span>
                    Detayları Gör
                  </button>
                </div>

                {/* Subtle Hover Glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500 pointer-events-none"></div>
              </div>
            ))}
          </div>
        )}
        {view === 'map' && (
          <div className="w-full h-[70vh] min-h-[300px] rounded-2xl overflow-hidden animate-fade-in">
            <Map
              center={{ lat: 39.9334, lng: 32.8597 }} // Ankara merkez
              zoom={10}
              markers={mapMarkers}
              onMarkerClick={handleMarkerClick}
              showUserLocation={true}
              className="w-full h-full"
            />
          </div>
        )}
      </div>
      {(!businesses || businesses.length === 0) && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🏢</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Henüz İşletme Yok</h3>
          <p className="text-gray-500 text-center max-w-md">
            Şu anda sistemde kayıtlı işletme bulunmuyor. Daha sonra tekrar kontrol edebilirsiniz.
          </p>
        </div>
      )}
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