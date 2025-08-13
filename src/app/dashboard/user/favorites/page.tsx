"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
// Iconlar: Fluent tarzında inline SVG kullanımı (paket bağımlılığı olmadan)

export default function FavoritesPage() {
  const router = useRouter();
  const { data: favorites, isLoading } = trpc.favorites.list.useQuery();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'favorites'>('recent');

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
    <main className="relative max-w-4xl mx-auto p-4 pb-28 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">kuado</div>
          <button
            onClick={() => router.push('/dashboard/user/businesses')}
            className="px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/70 border border-white/40 text-gray-900 text-sm shadow-sm transition"
          >
            İşletmeler
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="mt-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-center bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">Favoriler</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          <div className="flex items-center gap-2 border border-white/40 bg-white/60 backdrop-blur-md text-gray-900 rounded-2xl px-4 py-3 shadow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-600"><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2"/></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Favorilerde ara"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 border border-white/40 bg-white/60 backdrop-blur-md text-gray-900 rounded-2xl px-4 py-3 shadow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-600"><path d="M4 7h12M4 12h8M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <select className="flex-1 text-sm outline-none bg-transparent" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
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

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {list.map((b: any) => (
          <div key={b.id} className="group bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow hover:shadow-lg transition cursor-pointer" onClick={() => router.push(`/dashboard/user/businesses/${b.id}`)}>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-semibold text-gray-900 truncate flex-1">{b.name}</h3>
                <span className="text-[11px] px-2 py-1 rounded-full bg-rose-50 text-rose-700">{new Date(b.favorited_at).toLocaleDateString('tr-TR')}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-700 mb-2">
                <span className="inline-flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> {parseFloat(b.overall_rating || 0).toFixed(1)}</span>
                <span className="inline-flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="#e11d48"><path d="M12.1 21.35l-1.1-1.01C5.14 15.24 2 12.36 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.59 4.81 14.26 4 16 4 18.5 4 20.5 6 20.5 8.5c0 3.86-3.14 6.74-8.9 11.84l-.5.46z"/></svg> {b.favorites_count || 0}</span>
                <span className="inline-flex items-center gap-1">🗳️ {b.total_reviews || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 text-xs mb-3">
                <span>📍</span>
                <span className="truncate">{b.address}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-gray-900">
                <button
                  className="px-4 py-2 rounded-xl border border-white/40 bg-white/50 backdrop-blur-md shadow hover:shadow-md font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/user/businesses/${b.id}`);
                  }}
                >
                  Detaylar
                </button>
                <button
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-semibold shadow hover:shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/user/businesses/${b.id}/book`);
                  }}
                >
                  Randevu Al
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {list.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🤍</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Henüz favori işletme yok</h3>
          <p className="text-gray-500 text-center max-w-md">
            İşletme detay sayfasından favorilere ekleyerek hızlıca randevu oluşturabilirsiniz.
          </p>
        </div>
      )}
      {/* Bottom nav, layout üzerinden gelir */}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        html, body { font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
      `}</style>
    </main>
  );
}


