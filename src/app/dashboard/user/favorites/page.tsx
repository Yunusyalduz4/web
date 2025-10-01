"use client";
import { useSession } from "next-auth/react";
import { trpc } from '../../../../utils/trpcClient';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
// Iconlar: Fluent tarzında inline SVG kullanımı (paket bağımlılığı olmadan)
import { useRealTimeBusiness } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Ziyaretçi kullanıcı kontrolü
  const isGuest = status === 'unauthenticated' || !session || !session?.user?.id;
  
  if (isGuest) {
    return (
      <main className="relative max-w-4xl mx-auto p-3 sm:p-4 pb-20 sm:pb-28 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-rose-500 to-fuchsia-500 rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12.1 21.35l-1.1-1.01C5.14 15.24 2 12.36 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.59 4.81 14.26 4 16 4 18.5 4 20.5 6 20.5 8.5c0 3.86-3.14 6.74-8.9 11.84l-.5.46z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">Ziyaretçi Olarak Giriş Yaptınız</h1>
              <p className="text-gray-600">Bilgilere erişmek için üyelik oluşturun</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/register')}
                className="w-full bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white px-6 py-3 rounded-xl font-medium hover:from-rose-600 hover:to-fuchsia-600 transition-all"
              >
                Üyelik Oluştur
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-white text-gray-700 px-6 py-3 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }
  
  const { data: favorites, isLoading } = trpc.favorites.list.useQuery();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'favorites'>('recent');
  const [searchOpen, setSearchOpen] = useState(false);
  

  // WebSocket entegrasyonu
  const { isConnected, isConnecting, error: socketError } = useWebSocketStatus();
  const { setCallbacks: setBusinessCallbacks } = useRealTimeBusiness();




  const list = useMemo(() => {
    let l = (favorites || []).map((b: any) => ({
      ...b,
      _rating: parseFloat(b.overall_rating || 0)
    }));
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter((b: any) => (b.name || '').toLowerCase().includes(q) || (b.address || '').toLowerCase().includes(q));
    }
    l.sort((a: any, b: any) => {
      if (sortBy === 'recent') return new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime();
      if (sortBy === 'rating') return (b._rating || 0) - (a._rating || 0);
      return (b.favorites_count || 0) - (a.favorites_count || 0);
    });
    return l;
  }, [favorites, search, sortBy]);

  return (
    <main className="relative max-w-4xl mx-auto p-3 sm:p-4 pb-20 sm:pb-28 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
          <button
            onClick={() => router.push('/dashboard/user/businesses')}
            className="w-10 h-10 rounded-xl bg-white/50 hover:bg-white/70 active:bg-white/80 text-gray-900 shadow-sm transition touch-manipulation flex items-center justify-center relative"
            style={{
              border: '2px solid transparent',
              background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #3b82f6, #ef4444, #ffffff) border-box',
              borderRadius: '12px'
            }}
            title="İşletmeler"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-700">
              <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Header - Mobile Optimized */}
      <div className="mt-2">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-center bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">Favoriler</h1>
          </div>
          
          {/* Search Toggle Button */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="ml-4 w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 touch-manipulation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
        
        {/* Search Bar - Animated */}
        <div className={`mt-4 transition-all duration-300 ease-in-out overflow-hidden ${
          searchOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="flex items-center gap-2 border border-white/40 bg-white/60 backdrop-blur-md text-gray-900 rounded-2xl px-3 sm:px-4 py-3 shadow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600 shrink-0"><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2"/></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Favorilerde ara"
              className="flex-1 outline-none text-sm bg-transparent touch-manipulation min-h-[44px]"
            />
          </div>
        </div>
        
        {/* Sort - Always Visible */}
        <div className="mt-4">
          <div className="flex items-center gap-2 border border-white/40 bg-white/60 backdrop-blur-md text-gray-900 rounded-2xl px-3 sm:px-4 py-3 shadow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600 shrink-0"><path d="M4 7h12M4 12h8M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <select 
              className="flex-1 text-sm outline-none bg-transparent touch-manipulation min-h-[44px]" 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="recent">Sırala: En Yeni</option>
              <option value="rating">Sırala: Puan</option>
              <option value="favorites">Sırala: Favori</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">Favoriler yükleniyor...</span>
        </div>
      )}

      {/* Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4">
        {list.map((b: any) => (
          <div
            key={b.id}
            className="group relative bg-white/60 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden border border-white/40 hover:border-rose-300 cursor-pointer touch-manipulation"
            onClick={() => router.push(`/dashboard/user/businesses/${b.id}`)}
          >
            {/* Degrade Border - Sol Kenar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-red-500 to-white rounded-l-2xl"></div>
            
            {/* Main Content - Mobile Optimized */}
            <div className="relative p-3 sm:p-4">
              {/* Top: Avatar + Name + Rating, Right: Favorited Date */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-white/70 border border-white/50 shrink-0">
                    {b.profile_image_url ? (
                      <img src={b.profile_image_url} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-xs text-gray-700">🏢</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0 mb-1">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{b.name}</h3>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-700 shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        {parseFloat(b.overall_rating || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white/60 backdrop-blur-md border border-white/40 text-gray-700 shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  {new Date(b.favorited_at).toLocaleDateString('tr-TR')}
                </span>
              </div>

              {/* Address */}
              <div className="flex items-center gap-2 text-gray-700 text-xs sm:text-sm mb-3">
                <span className="text-sm">📍</span>
                <span className="truncate">{b.address}</span>
              </div>

              {/* Meta chips - Mobile Optimized */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/60 border border-white/40">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#e11d48"><path d="M12.1 21.35l-1.1-1.01C5.14 15.24 2 12.36 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.59 4.81 14.26 4 16 4 18.5 4 20.5 6 20.5 8.5c0 3.86-3.14 6.74-8.9 11.84l-.5.46z"/></svg>
                  {b.favorites_count || 0}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/60 border border-white/40">
                  🗳️ {b.total_reviews || 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {list.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-500">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-rose-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl sm:text-4xl">🤍</span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Henüz favori işletme yok</h3>
          <p className="text-gray-500 text-center max-w-md text-sm sm:text-base px-4">
            İşletme detay sayfasından favorilere ekleyerek hızlıca randevu oluşturabilirsiniz.
          </p>
        </div>
      )}
      {/* Bottom nav, layout üzerinden gelir */}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        :root { 
          --randevuo-radius: 16px; 
          --randevuo-shadow: 0 8px 24px -12px rgba(0,0,0,0.25);
          --mobile-safe-area: env(safe-area-inset-bottom, 0px);
        }
        html, body { 
          font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; 
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          
          /* Touch targets */
          button, input, select, textarea {
            touch-action: manipulation;
          }
          
          /* Prevent zoom on input focus */
          input[type="text"], input[type="email"], input[type="password"], input[type="date"], input[type="time"], textarea {
            font-size: 16px;
          }
          
          /* Smooth scrolling */
          .overscroll-contain {
            overscroll-behavior: contain;
          }
        }
        
        /* Animation improvements */
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

    </main>
  );
}


