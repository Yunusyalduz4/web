'use client';

import React, { useState, useMemo } from 'react';
import { trpc } from '../../../../utils/trpcClient';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Story } from '../../../../types/story';
import StoryCard, { StoryGrid } from '../../../../components/story/StoryCard';
import StoryCreator from '../../../../components/story/StoryCreator';
import StoryViewer from '../../../../components/story/StoryViewer';
import { 
  Plus, 
  BarChart3, 
  Eye, 
  Heart, 
  Clock, 
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause
} from 'lucide-react';

export default function BusinessStoriesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showCreator, setShowCreator] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  // Employee ise yetki kontrolü
  if (session?.user?.role === 'employee' && !session?.user?.permissions?.can_manage_appointments) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-5xl mb-2">🔒</span>
        <span className="text-lg text-gray-500">Bu sayfaya erişim yetkiniz yok.</span>
      </main>
    );
  }
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [viewingStories, setViewingStories] = useState<Story[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');

  // API çağrıları
  const { data: business } = trpc.business.getMyBusiness.useQuery();
  const { data: stories, refetch: refetchStories } = trpc.story.getByBusiness.useQuery(
    { businessId: business?.id || '' },
    { enabled: !!business?.id }
  );
  const { data: stats } = trpc.story.getBusinessStats.useQuery(
    { businessId: business?.id || '' },
    { enabled: !!business?.id }
  );

  // Mutations
  const deleteStoryMutation = trpc.story.delete.useMutation({
    onSuccess: () => {
      refetchStories();
    }
  });

  const likeStoryMutation = trpc.story.toggleLike.useMutation();
  const viewStoryMutation = trpc.story.view.useMutation();

  // Filtrelenmiş ve sıralanmış hikayeler
  const filteredStories = useMemo(() => {
    if (!stories) return [];

    let filtered = stories;

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(story => 
        story.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        story.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Durum filtresi
    if (filterType === 'active') {
      filtered = filtered.filter(story => {
        const now = new Date();
        const created = new Date(story.created_at);
        const hoursSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        return hoursSinceCreation < 24 && story.is_active;
      });
    } else if (filterType === 'expired') {
      filtered = filtered.filter(story => {
        const now = new Date();
        const created = new Date(story.created_at);
        const hoursSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        return hoursSinceCreation >= 24 || !story.is_active;
      });
    }

    // Sıralama
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'popular':
          const engagementA = a.view_count + a.like_count + a.comment_count + a.share_count;
          const engagementB = b.view_count + b.like_count + b.comment_count + b.share_count;
          return engagementB - engagementA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [stories, searchTerm, filterType, sortBy]);

  // Hikaye etkileşim fonksiyonları
  const handleStoryClick = (story: Story, index: number) => {
    setViewingStories(filteredStories);
    setCurrentStoryIndex(index);
    setShowViewer(true);
    // Hikaye görüntüleme kaydı
    handleStoryView(story.id);
  };

  const handleStoryView = async (storyId: string) => {
    try {
      await viewStoryMutation.mutateAsync({ 
        storyId,
        deviceType: 'desktop'
      });
    } catch (error) {
    }
  };

  const handleStoryClose = () => {
    setShowViewer(false);
    setViewingStories([]);
    setCurrentStoryIndex(0);
  };

  const handleStoryNext = () => {
    if (currentStoryIndex < viewingStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    }
  };

  const handleStoryPrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };

  const handleStoryLike = async (storyId: string) => {
    try {
      const result = await likeStoryMutation.mutateAsync({ storyId });
      await refetchStories();
    } catch (error) {
    }
  };


  const handleDeleteStory = async (storyId: string) => {
    if (confirm('Bu hikayeyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteStoryMutation.mutateAsync({ storyId });
      } catch (error) {
      }
    }
  };

  const handleCreateSuccess = (story: Story) => {
    setShowCreator(false);
    refetchStories();
  };

  if (!business) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-5xl mb-2">😕</span>
        <span className="text-lg text-gray-500">İşletme bulunamadı.</span>
        <button 
          className="mt-4 px-4 py-2 bg-gray-200 rounded-full" 
          onClick={() => router.back()}
        >
          Geri Dön
        </button>
      </main>
    );
  }

  return (
    <main className="relative max-w-md mx-auto p-3 sm:p-4 pb-20 sm:pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm mb-3 sm:mb-6">
        <div className="flex items-center justify-between">
          <div className="text-sm sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">
            randevuo
          </div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-white/40 text-xs sm:text-sm min-h-[44px]"
          >
            <span className="text-sm sm:text-base text-gray-900">←</span>
            <span className="font-medium text-gray-700 hidden xs:block">Geri</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-4 sm:mb-8">
        <h1 className="text-lg sm:text-3xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent mb-1 sm:mb-2">
          Hikaye Yönetimi
        </h1>
        <p className="text-xs sm:text-base text-gray-600">İşletmenizin hikayelerini oluşturun ve yönetin</p>
      </div>

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/40 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.overview.total_stories || 0}</p>
                <p className="text-xs sm:text-sm text-gray-600">Toplam Hikaye</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/40 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.overview.total_views || 0}</p>
                <p className="text-xs sm:text-sm text-gray-600">Toplam Görüntülenme</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/40 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.overview.total_likes || 0}</p>
                <p className="text-xs sm:text-sm text-gray-600">Toplam Beğeni</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtreler ve Arama */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border border-white/40 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Arama */}
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Hikayelerde ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white/60 border border-white/40 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Durum Filtresi */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="flex-1 bg-white/60 border border-white/40 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
              style={{ fontSize: '16px' }}
            >
              <option value="all">Tüm Hikayeler</option>
              <option value="active">Aktif Hikayeler</option>
              <option value="expired">Süresi Dolmuş</option>
            </select>
          </div>

          {/* Sıralama */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 bg-white/60 border border-white/40 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
              style={{ fontSize: '16px' }}
            >
              <option value="newest">En Yeni</option>
              <option value="oldest">En Eski</option>
              <option value="popular">En Popüler</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hikaye Oluştur Butonu */}
      <div className="flex justify-center mb-4 sm:mb-6">
        <button
          onClick={() => setShowCreator(true)}
          className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 min-h-[44px]"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm">Yeni Hikaye Oluştur</span>
        </button>
      </div>

      {/* Hikaye Listesi */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 sm:p-6 border border-white/40 shadow-sm">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-xl font-bold text-gray-900">Hikayeleriniz</h2>
          <span className="text-xs sm:text-sm text-gray-600">
            {filteredStories.length} hikaye
          </span>
        </div>

        {filteredStories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredStories.map((story, index) => (
              <div key={story.id} className="relative group">
                {/* Hikaye Kartı */}
                <div 
                  className="relative cursor-pointer"
                  onClick={() => handleStoryClick(story, index)}
                >
                  <div className="relative w-full h-24 sm:h-32 rounded-lg overflow-hidden border-2 border-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-0.5">
                    <div className="w-full h-full rounded-lg overflow-hidden bg-white">
                      {story.media_type === 'image' ? (
                        <img
                          src={story.media_url}
                          alt="Story"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={story.media_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Hikaye İstatistikleri - Mobil Uyumlu */}
                  <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 right-1 sm:right-2 bg-black/80 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="font-bold text-[10px] sm:text-xs">{story.view_count}</span>
                        <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="font-bold text-[10px] sm:text-xs">{story.like_count}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Silme Butonu - Mobil Uyumlu */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStory(story.id);
                  }}
                  className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 w-6 h-6 sm:w-7 sm:h-7 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold opacity-100 group-hover:opacity-100 transition-all duration-200 shadow-lg border-2 border-white active:scale-95 touch-manipulation min-h-[44px]"
                  title="Hikayeyi Sil"
                >
                  ×
                </button>

                {/* Hikaye Bilgileri */}
                <div className="mt-1 sm:mt-2 text-center">
                  <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                    {story.caption || 'Hikaye'}
                  </p>
                  <p className="text-[9px] sm:text-xs text-gray-400">
                    {new Date(story.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-400 text-2xl sm:text-3xl">📱</span>
            </div>
            <h3 className="text-sm sm:text-lg font-medium text-gray-700 mb-1 sm:mb-2">Henüz hikaye yok</h3>
            <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">
              İlk hikayenizi oluşturarak müşterilerinizle etkileşime geçin
            </p>
            <button
              onClick={() => setShowCreator(true)}
              className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm min-h-[44px]"
            >
              Hikaye Oluştur
            </button>
          </div>
        )}
      </div>

      {/* Hikaye Oluşturucu Modal */}
      {showCreator && business && (
        <StoryCreator
          businessId={business.id}
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreator(false)}
        />
      )}

      {/* Hikaye Görüntüleyici Modal */}
      {showViewer && (
        <StoryViewer
          stories={viewingStories}
          currentIndex={currentStoryIndex}
          onClose={handleStoryClose}
          onNext={handleStoryNext}
          onPrevious={handleStoryPrevious}
          onLike={handleStoryLike}
        />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        html, body { font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
        
        :root {
          --primary-gradient: linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #3b82f6 100%);
          --glass-bg: rgba(255, 255, 255, 0.6);
          --glass-border: rgba(255, 255, 255, 0.4);
        }
        
        /* Mobile optimizations */
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        /* Touch optimizations */
        * {
          touch-action: manipulation;
        }
        
        /* Prevent zoom on input focus */
        input[type="text"],
        input[type="email"],
        input[type="password"],
        input[type="tel"],
        input[type="url"],
        input[type="search"],
        textarea,
        select {
          font-size: 16px !important;
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Overscroll behavior */
        body {
          overscroll-behavior: contain;
        }
        
        /* Custom breakpoint for extra small screens */
        @media (max-width: 475px) {
          .xs\\:text-\\[10px\\] { font-size: 10px !important; }
          .xs\\:text-xs { font-size: 12px !important; }
          .xs\\:text-sm { font-size: 14px !important; }
          .xs\\:text-base { font-size: 16px !important; }
          .xs\\:text-lg { font-size: 18px !important; }
          .xs\\:text-xl { font-size: 20px !important; }
          .xs\\:text-2xl { font-size: 24px !important; }
          .xs\\:text-3xl { font-size: 30px !important; }
          .xs\\:text-4xl { font-size: 36px !important; }
          .xs\\:text-5xl { font-size: 48px !important; }
          .xs\\:text-6xl { font-size: 60px !important; }
          .xs\\:text-7xl { font-size: 72px !important; }
          .xs\\:text-8xl { font-size: 96px !important; }
          .xs\\:text-9xl { font-size: 128px !important; }
          .xs\\:hidden { display: none !important; }
          .xs\\:inline { display: inline !important; }
          .xs\\:block { display: block !important; }
          .xs\\:flex { display: flex !important; }
          .xs\\:grid { display: grid !important; }
        }
        
        /* Animation keyframes */
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </main>
  );
}
