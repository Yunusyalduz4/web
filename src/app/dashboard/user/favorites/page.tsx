"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaSortAmountDown, FaStar, FaHeart } from 'react-icons/fa';

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
    <main className="max-w-4xl mx-auto p-4 pb-20 min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent select-none">Favoriler</h1>
        <button
          onClick={() => router.push('/dashboard/user/businesses')}
          className="px-3 py-1.5 bg-white rounded-lg border text-sm shadow hover:bg-gray-50"
        >
          İşletmelere Dön
        </button>
      </div>

      {/* Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
          <FaSearch className="text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Favorilerde ara"
            className="flex-1 outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
          <FaSortAmountDown className="text-gray-500" />
          <select className="flex-1 text-sm outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="recent">Sırala: En Yeni</option>
            <option value="rating">Sırala: Puan</option>
            <option value="favorites">Sırala: Favori</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">Favoriler yükleniyor...</span>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((b: any) => (
          <div key={b.id} className="group bg-white rounded-xl border border-gray-200 hover:border-pink-300 shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => router.push(`/dashboard/user/businesses/${b.id}`)}>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-semibold text-gray-900 truncate flex-1">{b.name}</h3>
                <span className="text-[11px] text-gray-500">{new Date(b.favorited_at).toLocaleDateString('tr-TR')}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-700 mb-2">
                <span className="inline-flex items-center gap-1"><FaStar className="text-yellow-500" /> {parseFloat(b.overall_rating || 0).toFixed(1)}</span>
                <span className="inline-flex items-center gap-1"><FaHeart className="text-pink-600" /> {b.favorites_count || 0}</span>
                <span className="inline-flex items-center gap-1">🗳️ {b.total_reviews || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 text-xs mb-3">
                <span>📍</span>
                <span className="truncate">{b.address}</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-semibold active:scale-95 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/user/businesses/${b.id}`);
                  }}
                >
                  Detaylar
                </button>
                <button
                  className="flex-1 bg-pink-600 text-white py-2 px-3 rounded-lg text-sm font-semibold active:scale-95 transition"
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
          <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🤍</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Henüz favori işletme yok</h3>
          <p className="text-gray-500 text-center max-w-md">
            İşletme detay sayfasından favorilere ekleyerek hızlıca randevu oluşturabilirsiniz.
          </p>
        </div>
      )}
    </main>
  );
}


