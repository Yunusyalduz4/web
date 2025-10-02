"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { useEffect, useMemo, useState } from 'react';
import { useRealTimeAppointments, useRealTimeReviews, useRealTimeBusiness, useRealTimeNotifications } from '../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../hooks/useWebSocketEvents';
import { WhatsAppSettingsModal } from '../../../components/WhatsAppSettingsModal';

// Admin panel kategorileri
type AdminTab = 
  | 'overview' 
  | 'pending'
  | 'users' 
  | 'businesses' 
  | 'appointments' 
  | 'services' 
  | 'employees' 
  | 'reviews' 
  | 'review-approval'
  | 'slider-approval'
  | 'analytics';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user.role === 'admin';

  // WebSocket entegrasyonu
  const { isConnected, isConnecting, error: socketError } = useWebSocketStatus();
  const { setCallbacks: setAppointmentCallbacks } = useRealTimeAppointments();
  const { setCallbacks: setReviewCallbacks } = useRealTimeReviews();
  const { setCallbacks: setBusinessCallbacks } = useRealTimeBusiness();
  const { setCallbacks: setNotificationCallbacks } = useRealTimeNotifications();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Overview stats
  const { data: stats } = trpc.admin.getStats.useQuery(undefined, { enabled: isAdmin });
  
  // Tab-specific queries
  const pendingApprovalsQuery = trpc.admin.getPendingApprovals.useQuery(undefined, { enabled: isAdmin && activeTab === 'pending' });
  const usersQuery = trpc.admin.listUsers.useQuery({ q: searchQuery || undefined }, { enabled: isAdmin && activeTab === 'users' });
  const businessesQuery = trpc.admin.listBusinesses.useQuery({ q: searchQuery || undefined }, { enabled: isAdmin && activeTab === 'businesses' });
  const appointmentsQuery = trpc.admin.listAppointments.useQuery({ limit: 100 }, { enabled: isAdmin && activeTab === 'appointments' });
  const servicesQuery = trpc.admin.listServices.useQuery(undefined, { enabled: isAdmin && activeTab === 'services' });
  const employeesQuery = trpc.admin.listEmployees.useQuery(undefined, { enabled: isAdmin && activeTab === 'employees' });
  const reviewsQuery = trpc.admin.listReviews.useQuery(undefined, { enabled: isAdmin && activeTab === 'reviews' });
  const pendingReviewsQuery = trpc.admin.getPendingReviews.useQuery(undefined, { enabled: isAdmin && activeTab === 'review-approval' });
  const pendingRepliesQuery = trpc.admin.getPendingReplies.useQuery(undefined, { enabled: isAdmin && activeTab === 'review-approval' });
  const pendingBusinessImagesQuery = trpc.admin.getPendingBusinessImages.useQuery(undefined, { enabled: isAdmin && activeTab === 'slider-approval' });

  useEffect(() => {
    if (session && !isAdmin) router.push('/unauthorized');
  }, [session, isAdmin, router]);

  // WebSocket callback'lerini ayarla
  useEffect(() => {
    setAppointmentCallbacks({
      onAppointmentCreated: () => {
        // Tüm admin verilerini yenile
        window.location.reload(); // Admin için basit yenileme
      },
      onAppointmentUpdated: () => {
        window.location.reload();
      },
      onAppointmentCancelled: () => {
        window.location.reload();
      }
    });

    setReviewCallbacks({
      onReviewCreated: () => {
        window.location.reload();
      },
      onReviewReplied: () => {
        window.location.reload();
      }
    });

    setBusinessCallbacks({
      onBusinessUpdated: () => {
        window.location.reload();
      },
      onServiceUpdated: () => {
        window.location.reload();
      },
      onEmployeeUpdated: () => {
        window.location.reload();
      }
    });

    setNotificationCallbacks({
      onNotificationSent: () => {
        window.location.reload();
      }
    });
  }, [setAppointmentCallbacks, setReviewCallbacks, setBusinessCallbacks, setNotificationCallbacks]);

  if (!session) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="text-sm text-gray-600">Yükleniyor…</div>
      </main>
    );
  }

  return (
    <main className="relative max-w-md mx-auto p-3 sm:p-4 pb-20 sm:pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/70 backdrop-blur-md border-b border-white/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-sm sm:text-lg font-bold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
              🛡️ Admin Panel • RANDEVUO
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 bg-white/60 px-1.5 sm:px-2 py-1 rounded-full">
              {session.user.email}
            </div>
            {/* WebSocket Durumu */}
            <div className="flex items-center gap-1">
              {isConnecting && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Bağlanıyor..."></div>
              )}
              {isConnected && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
              )}
              {socketError && (
                <div className="w-2 h-2 bg-red-400 rounded-full" title={`Hata: ${socketError}`}></div>
              )}
            </div>
          </div>
          
          {/* Global Search */}
          <div className="flex items-center gap-2 border border-white/40 bg-white/60 text-gray-900 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-600">
              <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <input 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Ara..." 
              className="bg-transparent outline-none text-[10px] sm:text-sm w-24 sm:w-48" 
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-2 sm:mt-3 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {([
            { id: 'overview', label: '📊 Genel Bakış', icon: '📊' },
            { id: 'pending', label: '⏳ Onay Bekleyenler', icon: '⏳' },
            { id: 'users', label: '👥 Kullanıcılar', icon: '👥' },
            { id: 'businesses', label: '🏢 İşletmeler', icon: '🏢' },
            { id: 'appointments', label: '📅 Randevular', icon: '📅' },
            { id: 'services', label: '🔧 Hizmetler', icon: '🔧' },
            { id: 'employees', label: '👨‍💼 Çalışanlar', icon: '👨‍💼' },
            { id: 'reviews', label: '⭐ Değerlendirmeler', icon: '⭐' },
            { id: 'review-approval', label: '✅ Yorum Onayları', icon: '✅' },
            { id: 'slider-approval', label: '🖼️ Slider Onayları', icon: '🖼️' },
            { id: 'analytics', label: '📈 Analitik', icon: '📈' }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-sm font-medium transition-all min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-white/60 text-gray-700 border border-white/50 hover:bg-white/80'
              }`}
            >
              <span className="hidden xs:inline">{tab.icon}</span>
              <span className="xs:ml-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === 'overview' && <OverviewPanel stats={stats} setActiveTab={setActiveTab} />}
        {activeTab === 'pending' && <PendingApprovalsPanel data={pendingApprovalsQuery.data} isLoading={pendingApprovalsQuery.isLoading} />}
        {activeTab === 'users' && <UsersPanel query={searchQuery} data={usersQuery.data} isLoading={usersQuery.isLoading} />}
        {activeTab === 'businesses' && <BusinessesPanel query={searchQuery} data={businessesQuery.data} isLoading={businessesQuery.isLoading} />}
        {activeTab === 'appointments' && <AppointmentsPanel data={appointmentsQuery.data} isLoading={appointmentsQuery.isLoading} />}
        {activeTab === 'services' && <ServicesPanel data={servicesQuery.data} isLoading={servicesQuery.isLoading} />}
        {activeTab === 'employees' && <EmployeesPanel data={employeesQuery.data} isLoading={employeesQuery.isLoading} />}
        {activeTab === 'reviews' && <ReviewsPanel data={reviewsQuery.data} isLoading={reviewsQuery.isLoading} />}
        {activeTab === 'review-approval' && <ReviewApprovalPanel pendingReviews={pendingReviewsQuery.data} pendingReplies={pendingRepliesQuery.data} isLoading={pendingReviewsQuery.isLoading || pendingRepliesQuery.isLoading} />}
        {activeTab === 'slider-approval' && <SliderApprovalPanel pendingBusinessImages={pendingBusinessImagesQuery.data} isLoading={pendingBusinessImagesQuery.isLoading} />}
        {activeTab === 'analytics' && <AnalyticsPanel />}
      </div>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        html, body { font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
        
        :root {
          --primary-gradient: linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #3b82f6 100%);
          --glass-bg: rgba(255, 255, 255, 0.7);
          --glass-border: rgba(255, 255, 255, 0.5);
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

// ===== PANEL COMPONENTS =====

function OverviewPanel({ stats, setActiveTab }: { stats: any; setActiveTab: (tab: AdminTab) => void }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">📊 Sistem Genel Bakış</h2>
        <p className="text-xs sm:text-sm text-gray-600">RANDEVUO platformunun genel durumu ve istatistikleri</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2">👥</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
          <div className="text-[10px] sm:text-sm text-gray-600">Toplam Kullanıcı</div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2">🏢</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats?.totalBusinesses || 0}</div>
          <div className="text-[10px] sm:text-sm text-gray-600">Toplam İşletme</div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2">📅</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats?.totalAppointments || 0}</div>
          <div className="text-[10px] sm:text-sm text-gray-600">Toplam Randevu</div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2">⭐</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats?.totalReviews || 0}</div>
          <div className="text-[10px] sm:text-sm text-gray-600">Toplam Değerlendirme</div>
        </div>
      </div>

      {/* Pending Approvals Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2">⏳</div>
          <div className="text-lg sm:text-2xl font-bold text-yellow-800">{stats?.pendingBusinesses || 0}</div>
          <div className="text-[10px] sm:text-sm text-yellow-700">Onay Bekleyen İşletme</div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2">📸</div>
          <div className="text-lg sm:text-2xl font-bold text-blue-800">{stats?.pendingImages || 0}</div>
          <div className="text-[10px] sm:text-sm text-blue-700">Görsel Onay Bekleyen</div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2">⭐</div>
          <div className="text-lg sm:text-2xl font-bold text-orange-800">{stats?.pendingReviews || 0}</div>
          <div className="text-[10px] sm:text-sm text-orange-700">Onay Bekleyen Yorum</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2">💬</div>
          <div className="text-lg sm:text-2xl font-bold text-purple-800">{stats?.pendingReplies || 0}</div>
          <div className="text-[10px] sm:text-sm text-purple-700">Onay Bekleyen Yanıt</div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-3xl mb-2">🖼️</div>
          <div className="text-lg sm:text-2xl font-bold text-indigo-800">{stats?.pendingSliderImages || 0}</div>
          <div className="text-[10px] sm:text-sm text-indigo-700">Onay Bekleyen Slider Görsel</div>
        </div>
      </div>

      {/* System Test Actions */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-3 sm:p-6">
        <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">🧪 Sistem Testleri</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/cron/auto-complete-appointments');
                const result = await response.json();
                if (result.success) {
                  alert('✅ Otomatik tamamlandı kontrolü başarıyla çalıştırıldı!');
                } else {
                  alert('❌ Hata: ' + result.error);
                }
              } catch (error) {
                alert('❌ Bağlantı hatası: ' + error);
              }
            }}
            className="p-3 sm:p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all min-h-[44px]"
          >
            <div className="text-lg sm:text-2xl mb-1 sm:mb-2">🔄</div>
            <div className="text-[10px] sm:text-sm font-medium">Otomatik Tamamlandı Test</div>
            <div className="text-[8px] sm:text-xs opacity-80">24 saat geçmiş randevuları kontrol et</div>
          </button>
          
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/cron/init', { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                  alert('✅ Cron job sistemi başarıyla başlatıldı!');
                } else {
                  alert('❌ Hata: ' + result.error);
                }
              } catch (error) {
                alert('❌ Bağlantı hatası: ' + error);
              }
            }}
            className="p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all min-h-[44px]"
          >
            <div className="text-lg sm:text-2xl mb-1 sm:mb-2">⚙️</div>
            <div className="text-[10px] sm:text-sm font-medium">Cron Job Başlat</div>
            <div className="text-[8px] sm:text-xs opacity-80">Otomatik sistemleri başlat</div>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-3 sm:p-6">
        <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">🚀 Hızlı İşlemler</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <button 
            onClick={() => setActiveTab('pending')}
            className="p-3 sm:p-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all min-h-[44px]"
          >
            <div className="text-lg sm:text-2xl mb-1 sm:mb-2">⏳</div>
            <div className="text-[10px] sm:text-sm font-medium">Onay Bekleyenler</div>
          </button>
          
          <button 
            onClick={() => setActiveTab('businesses')}
            className="p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all min-h-[44px]"
          >
            <div className="text-lg sm:text-2xl mb-1 sm:mb-2">🏢</div>
            <div className="text-[10px] sm:text-sm font-medium">İşletmeleri Yönet</div>
          </button>
          
          <button 
            onClick={() => setActiveTab('users')}
            className="p-3 sm:p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all min-h-[44px]"
          >
            <div className="text-lg sm:text-2xl mb-1 sm:mb-2">👥</div>
            <div className="text-[10px] sm:text-sm font-medium">Kullanıcıları Yönet</div>
          </button>

          <button 
            onClick={() => setActiveTab('review-approval')}
            className="p-3 sm:p-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 transition-all min-h-[44px]"
          >
            <div className="text-lg sm:text-2xl mb-1 sm:mb-2">✅</div>
            <div className="text-[10px] sm:text-sm font-medium">Yorum Onayları</div>
          </button>

          <button 
            onClick={() => setActiveTab('slider-approval')}
            className="p-3 sm:p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all min-h-[44px]"
          >
            <div className="text-lg sm:text-2xl mb-1 sm:mb-2">🖼️</div>
            <div className="text-[10px] sm:text-sm font-medium">Slider Onayları</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function BusinessesPanel({ query, data, isLoading }: { query: string; data: any[] | undefined; isLoading: boolean }) {
  const utils = trpc.useUtils();
  const update = trpc.admin.updateBusiness.useMutation();
  const remove = trpc.admin.deleteBusiness.useMutation();
  const [editing, setEditing] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [whatsappSettings, setWhatsAppSettings] = useState<any | null>(null);

  return (
    <section className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-xl font-bold text-gray-900">🏢 İşletme Yönetimi</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all text-[10px] sm:text-sm min-h-[44px]"
        >
          ➕ Yeni İşletme
        </button>
      </div>

      {/* Search Results */}
      {query && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
          <p className="text-[10px] sm:text-sm text-blue-800">
            🔍 "{query}" için arama sonuçları: {data?.length || 0} işletme bulundu
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-6 sm:py-8">
          <div className="text-[10px] sm:text-sm text-gray-500">Yükleniyor…</div>
        </div>
      )}

      {/* Business List */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {data.map((b: any) => (
            <div key={b.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-lg p-3 sm:p-4 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[10px] sm:text-sm font-semibold text-gray-900 truncate">{b.name}</h3>
                  <p className="text-[9px] sm:text-xs text-gray-600 truncate mt-1">{b.address}</p>
                  {b.email && <p className="text-[9px] sm:text-xs text-gray-500 truncate mt-1">{b.email}</p>}
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-white/70 border border-white/50 flex-shrink-0">
                  {b.profile_image_url ? (
                    <img src={b.profile_image_url} alt={b.name} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full grid place-items-center text-sm sm:text-lg text-gray-400">🏢</div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs">
                  <span className="px-1.5 sm:px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {b.is_verified ? '✅ Onaylı' : '⏳ Beklemede'}
                  </span>
                  <span className="px-1.5 sm:px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                    ⭐ {b.average_rating || 0}/5 ({b.total_reviews || 0})
                  </span>
                </div>
                <div className="text-[9px] sm:text-xs text-gray-600">
                  📅 {new Date(b.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditing(b)}
                  className="flex-1 px-2 sm:px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-[9px] sm:text-xs font-medium min-h-[44px]"
                >
                  ✏️ Düzenle
                </button>
                <button 
                  onClick={() => setWhatsAppSettings(b)}
                  className="flex-1 px-2 sm:px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-[9px] sm:text-xs font-medium min-h-[44px]"
                >
                  📱 WhatsApp
                </button>
                <button 
                  onClick={async () => { 
                    if (confirm('Bu işletmeyi silmek istediğinizden emin misiniz?')) {
                      await remove.mutateAsync({ businessId: b.id }); 
                      utils.admin.listBusinesses.invalidate(); 
                    }
                  }}
                  className="flex-1 px-2 sm:px-3 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors text-[9px] sm:text-xs font-medium min-h-[44px]"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.length === 0 && (
        <div className="text-center py-6 sm:py-8">
          <div className="text-3xl sm:text-4xl mb-2">🏢</div>
          <p className="text-[10px] sm:text-sm text-gray-500">Henüz işletme bulunmuyor</p>
        </div>
      )}

      {/* Modals */}
      {editing && (
        <EditBusinessModal 
          data={editing} 
          onClose={() => setEditing(null)} 
          onSave={async (payload: any) => { 
            await update.mutateAsync(payload); 
            setEditing(null); 
            utils.admin.listBusinesses.invalidate(); 
          }} 
        />
      )}

      {/* WhatsApp Settings Modal */}
      {whatsappSettings && (
        <WhatsAppSettingsModal 
          business={whatsappSettings} 
          onClose={() => setWhatsAppSettings(null)} 
        />
      )}
    </section>
  );
}

function UsersPanel({ query, data, isLoading }: { query: string; data: any[] | undefined; isLoading: boolean }) {
  const utils = trpc.useUtils();
  const update = trpc.admin.updateUser.useMutation();
  const remove = trpc.admin.deleteUser.useMutation();
  const [editing, setEditing] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">👥 Kullanıcı Yönetimi</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all"
        >
          ➕ Yeni Kullanıcı
        </button>
      </div>

      {/* Search Results */}
      {query && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            🔍 "{query}" için arama sonuçları: {data?.length || 0} kullanıcı bulundu
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Yükleniyor…</div>
        </div>
      )}

      {/* Users List */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((u: any) => (
            <div key={u.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-lg p-4 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{u.name}</h3>
                  <p className="text-xs text-gray-600 truncate mt-1">{u.email}</p>
                  {u.phone && <p className="text-xs text-gray-500 truncate mt-1">{u.phone}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-red-100 text-red-800' :
                    u.role === 'business' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {u.role === 'admin' ? '👑 Admin' : u.role === 'business' ? '🏢 İşletme' : '👤 Müşteri'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                {u.address && (
                  <div className="text-xs text-gray-600">
                    📍 {u.address}
                  </div>
                )}
                <div className="text-xs text-gray-600">
                  📅 {new Date(u.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditing(u)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                >
                  ✏️ Düzenle
                </button>
                <button 
                  onClick={async () => { 
                    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
                      await remove.mutateAsync({ userId: u.id }); 
                      utils.admin.listUsers.invalidate(); 
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors text-xs font-medium"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-gray-500">Henüz kullanıcı bulunmuyor</p>
        </div>
      )}

      {/* Modals */}
      {editing && (
        <EditUserModal 
          data={editing} 
          onClose={() => setEditing(null)} 
          onSave={async (payload: any) => { 
            await update.mutateAsync(payload); 
            setEditing(null); 
            utils.admin.listUsers.invalidate(); 
          }} 
        />
      )}
    </section>
  );
}

function AppointmentsPanel({ data, isLoading }: { data: any[] | undefined; isLoading: boolean }) {
  const update = trpc.admin.updateAppointmentStatus.useMutation();
  const utils = trpc.useUtils();

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">📅 Randevu Yönetimi</h2>
        <div className="text-sm text-gray-600">
          Toplam: {data?.length || 0} randevu
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Yükleniyor…</div>
        </div>
      )}

      {/* Appointments List */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((a: any) => (
            <div key={a.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-lg p-4 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {a.business_name || 'İşletme'}
                  </h3>
                  <p className="text-xs text-gray-600 truncate mt-1">
                    👤 {a.user_name || 'Müşteri'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  a.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  a.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {a.status === 'pending' ? '⏳ Beklemede' :
                   a.status === 'confirmed' ? '✅ Onaylandı' :
                   a.status === 'completed' ? '✅ Tamamlandı' :
                   '❌ İptal Edildi'}
                </span>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="text-xs text-gray-700">
                  📅 {new Date(a.appointment_datetime).toLocaleDateString('tr-TR')}
                </div>
                <div className="text-xs text-gray-700">
                  🕐 {new Date(a.appointment_datetime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {a.notes && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    📝 {a.notes}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['pending','confirmed','completed','cancelled'] as const).map(st => (
                  <button 
                    key={st} 
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      a.status === st 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`} 
                    onClick={async () => { 
                      await update.mutateAsync({ id: a.id, status: st }); 
                      utils.admin.listAppointments.invalidate(); 
                    }}
                  >
                    {st === 'pending' ? '⏳' :
                     st === 'confirmed' ? '✅' :
                     st === 'completed' ? '✅' :
                     '❌'}
                    {st === 'pending' ? 'Beklemede' :
                     st === 'confirmed' ? 'Onayla' :
                     st === 'completed' ? 'Tamamla' :
                     'İptal Et'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📅</div>
          <p className="text-gray-500">Henüz randevu bulunmuyor</p>
        </div>
      )}
    </section>
  );
}

// Services Panel
function ServicesPanel({ data, isLoading }: { data: any[] | undefined; isLoading: boolean }) {
  const utils = trpc.useUtils();
  const create = trpc.admin.createService.useMutation();
  const update = trpc.admin.updateService.useMutation();
  const remove = trpc.admin.deleteService.useMutation();
  const [editing, setEditing] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">🔧 Hizmet Yönetimi</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all"
        >
          ➕ Yeni Hizmet
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Yükleniyor…</div>
        </div>
      )}

      {/* Services List */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((s: any) => (
            <div key={s.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-lg p-4 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{s.name}</h3>
                  <p className="text-xs text-gray-600 truncate mt-1">{s.business_name}</p>
                  {s.category_name && (
                    <p className="text-xs text-gray-500 truncate mt-1">🏷️ {s.category_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">₺{s.price}</div>
                  <div className="text-xs text-gray-500">{s.duration_minutes} dk</div>
                </div>
              </div>
              
              {s.description && (
                <div className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                  {s.description}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditing(s)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                >
                  ✏️ Düzenle
                </button>
                <button 
                  onClick={async () => { 
                    if (confirm('Bu hizmeti silmek istediğinizden emin misiniz?')) {
                      await remove.mutateAsync({ serviceId: s.id }); 
                      utils.admin.listServices.invalidate(); 
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors text-xs font-medium"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🔧</div>
          <p className="text-gray-500">Henüz hizmet bulunmuyor</p>
        </div>
      )}
    </section>
  );
}

// Employees Panel
function EmployeesPanel({ data, isLoading }: { data: any[] | undefined; isLoading: boolean }) {
  const utils = trpc.useUtils();
  const create = trpc.admin.createEmployee.useMutation();
  const update = trpc.admin.updateEmployee.useMutation();
  const remove = trpc.admin.deleteEmployee.useMutation();
  const [editing, setEditing] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">👨‍💼 Çalışan Yönetimi</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all"
        >
          ➕ Yeni Çalışan
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Yükleniyor…</div>
        </div>
      )}

      {/* Employees List */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((e: any) => (
            <div key={e.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-lg p-4 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{e.name}</h3>
                  <p className="text-xs text-gray-600 truncate mt-1">{e.business_name}</p>
                  {e.email && (
                    <p className="text-xs text-gray-500 truncate mt-1">📧 {e.email}</p>
                  )}
                  {e.phone && (
                    <p className="text-xs text-gray-500 truncate mt-1">📞 {e.phone}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {e.name.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="text-xs text-gray-600 mb-3">
                📅 {new Date(e.created_at).toLocaleDateString('tr-TR')}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditing(e)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                >
                  ✏️ Düzenle
                </button>
                <button 
                  onClick={async () => { 
                    if (confirm('Bu çalışanı silmek istediğinizden emin misiniz?')) {
                      await remove.mutateAsync({ employeeId: e.id }); 
                      utils.admin.listEmployees.invalidate(); 
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors text-xs font-medium"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">👨‍💼</div>
          <p className="text-gray-500">Henüz çalışan bulunmuyor</p>
        </div>
      )}
    </section>
  );
}

// Reviews Panel
function ReviewsPanel({ data, isLoading }: { data: any[] | undefined; isLoading: boolean }) {
  const utils = trpc.useUtils();
  const update = trpc.admin.updateReview.useMutation();
  const remove = trpc.admin.deleteReview.useMutation();
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">⭐ Değerlendirme Yönetimi</h2>
        <div className="text-sm text-gray-600">
          Toplam: {data?.length || 0} değerlendirme
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Yükleniyor…</div>
        </div>
      )}

      {/* Reviews List */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((r: any) => (
            <div key={r.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-lg p-4 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {r.user_name || 'Müşteri'}
                  </h3>
                  <p className="text-xs text-gray-600 truncate mt-1">
                    🏢 {r.business_name || 'İşletme'}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-1">
                    📅 {new Date(r.appointment_datetime).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-gray-600">Hizmet:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= r.service_rating ? 'text-yellow-400' : 'text-gray-300'}>
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600">Çalışan:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= r.employee_rating ? 'text-yellow-400' : 'text-gray-300'}>
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-700 mb-3 bg-gray-50 p-2 rounded">
                💬 {r.comment}
              </div>

              {r.business_reply && (
                <div className="text-xs text-blue-700 mb-3 bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                  🏢 <strong>İşletme Yanıtı:</strong> {r.business_reply}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditing(r)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                >
                  ✏️ Düzenle
                </button>
                <button 
                  onClick={async () => { 
                    if (confirm('Bu değerlendirmeyi silmek istediğinizden emin misiniz?')) {
                      await remove.mutateAsync({ reviewId: r.id }); 
                      utils.admin.listReviews.invalidate(); 
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors text-xs font-medium"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">⭐</div>
          <p className="text-gray-500">Henüz değerlendirme bulunmuyor</p>
        </div>
      )}
    </section>
  );
}

// Pending Approvals Panel
function PendingApprovalsPanel({ data, isLoading }: { data: any[] | undefined; isLoading: boolean }) {
  const utils = trpc.useUtils();
  const approveBusiness = trpc.admin.approveBusiness.useMutation();
  const approveImage = trpc.admin.approveBusinessProfileImage.useMutation();
  const [approvalNote, setApprovalNote] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);

  const handleApproval = async (businessId: string, approve: boolean, type: 'business' | 'image') => {
    try {
      if (type === 'business') {
        await approveBusiness.mutateAsync({ businessId, approve, note: approvalNote });
      } else {
        await approveImage.mutateAsync({ businessId, approve, note: approvalNote });
      }
      
      setApprovalNote('');
      setSelectedBusiness(null);
      utils.admin.getPendingApprovals.invalidate();
      utils.admin.listBusinesses.invalidate();
    } catch (error) {
    }
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">⏳ Onay Bekleyen İşletmeler</h2>
        <div className="text-sm text-gray-600">
          Toplam: {data?.length || 0} onay bekleyen
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Yükleniyor…</div>
        </div>
      )}

      {/* Pending Approvals List */}
      {!isLoading && data && (
        <div className="space-y-4">
          {data.map((business: any) => (
            <div key={business.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-lg p-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{business.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">👤 {business.owner_name} ({business.owner_email})</p>
                  <p className="text-sm text-gray-600 mt-1">📍 {business.address}</p>
                  <p className="text-sm text-gray-600 mt-1">📅 {new Date(business.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  {/* Business Approval Status */}
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    business.is_approved 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {business.is_approved ? '✅ İşletme Onaylandı' : '⏳ İşletme Onay Bekliyor'}
                  </div>
                  
                  {/* Image Approval Status */}
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    business.profile_image_approved 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {business.profile_image_approved ? '✅ Görsel Onaylandı' : '⏳ Görsel Onay Bekliyor'}
                  </div>
                </div>
              </div>

              {/* Profile Image */}
              {business.profile_image_url && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">📸 Profil Görseli:</p>
                  <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                    <img 
                      src={business.profile_image_url} 
                      alt={business.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Approval Actions */}
              <div className="flex items-center gap-3">
                {/* Business Approval */}
                {!business.is_approved && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproval(business.id, true, 'business')}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      ✅ İşletmeyi Onayla
                    </button>
                    <button
                      onClick={() => handleApproval(business.id, false, 'business')}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                      ❌ İşletmeyi Reddet
                    </button>
                  </div>
                )}

                {/* Image Approval */}
                {business.profile_image_url && !business.profile_image_approved && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproval(business.id, true, 'image')}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      ✅ Görseli Onayla
                    </button>
                    <button
                      onClick={() => handleApproval(business.id, false, 'image')}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      ❌ Görseli Reddet
                    </button>
                  </div>
                )}
              </div>

              {/* Approval Note Input */}
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Onay notu ekle (opsiyonel)"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-gray-500">Onay bekleyen işletme bulunmuyor</p>
        </div>
      )}
    </section>
  );
}

// Analytics Panel
function AnalyticsPanel() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📈 Sistem Analitikleri</h2>
        <p className="text-gray-600">RANDEVUO platformunun detaylı analizleri ve raporları</p>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Kullanıcı Büyümesi</h3>
          <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm text-gray-600">Grafik yakında eklenecek</p>
            </div>
          </div>
        </div>

        {/* Business Performance */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏢 İşletme Performansı</h3>
          <div className="h-48 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-2">📈</div>
              <p className="text-sm text-gray-600">Grafik yakında eklenecek</p>
            </div>
          </div>
        </div>

        {/* Appointment Trends */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Randevu Trendleri</h3>
          <div className="h-48 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm text-gray-600">Grafik yakında eklenecek</p>
            </div>
          </div>
        </div>

        {/* Revenue Analytics */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Gelir Analizi</h3>
          <div className="h-48 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-2">💵</div>
              <p className="text-sm text-gray-600">Grafik yakında eklenecek</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Hızlı Raporlar</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium">Günlük Rapor</div>
          </button>
          
          <button className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all">
            <div className="text-2xl mb-2">📈</div>
            <div className="font-medium">Haftalık Rapor</div>
          </button>
          
          <button className="p-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all">
            <div className="text-2xl mb-2">📋</div>
            <div className="font-medium">Aylık Rapor</div>
          </button>
        </div>
      </div>
    </section>
  );
}

function EditBusinessModal({ data, onClose, onSave }: any) {
  const [form, setForm] = useState({
    id: data.id,
    name: data.name || '',
    description: data.description || '',
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    profileImageUrl: data.profile_image_url || null,
  });
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto my-6 max-w-lg w-[92%] bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">İşletme Düzenle</h3>
          <button className="px-2 py-1 rounded-md bg-rose-600 text-white text-xs" onClick={onClose}>Kapat</button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries({ name:'Ad', description:'Açıklama', address:'Adres', phone:'Telefon', email:'E-posta' }).map(([key,label]) => (
            <label key={key} className="block">
              <span className="block text-[11px] text-gray-600 mb-1">{label}</span>
              <input value={(form as any)[key]} onChange={(e)=> setForm(f=> ({...f, [key]: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
          ))}
          <label className="block">
            <span className="block text-[11px] text-gray-600 mb-1">Profil Görseli URL</span>
            <input value={form.profileImageUrl || ''} onChange={(e)=> setForm(f=> ({...f, profileImageUrl: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[11px] text-gray-600 mb-1">Lat</span>
              <input type="number" value={form.latitude} onChange={(e)=> setForm(f=> ({...f, latitude: Number(e.target.value) }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
            <label className="block">
              <span className="block text-[11px] text-gray-600 mb-1">Lng</span>
              <input type="number" value={form.longitude} onChange={(e)=> setForm(f=> ({...f, longitude: Number(e.target.value) }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm" onClick={onClose}>Vazgeç</button>
          <button className="py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold" onClick={()=> onSave(form)}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}

function SliderApprovalPanel({ pendingBusinessImages, isLoading }: { pendingBusinessImages: any[] | undefined; isLoading: boolean }) {
  const utils = trpc.useUtils();
  const approveBusinessSliderImage = trpc.admin.approveBusinessSliderImage.useMutation();
  const [approvalNote, setApprovalNote] = useState('');

  const handleApproveBusinessSliderImage = async (imageId: string, approve: boolean) => {
    try {
      await approveBusinessSliderImage.mutateAsync({ imageId, approve, note: approvalNote });
      utils.admin.getPendingBusinessImages.invalidate();
      utils.admin.getStats.invalidate();
      setApprovalNote('');
    } catch (error) {
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Yükleniyor…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🖼️ İşletme Slider Görselleri Onay Sistemi</h2>
        <p className="text-gray-600">İşletme slider/galeri görselleri için onay yönetimi</p>
      </div>

      {/* Approval Note Input */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-4">
        <label className="block mb-2">
          <span className="text-sm font-medium text-gray-700">Onay Notu (Opsiyonel)</span>
          <input
            type="text"
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
            placeholder="Onay veya red nedeni..."
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none"
          />
        </label>
      </div>

      {/* Pending Slider Images */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">🖼️ Onay Bekleyen İşletme Görselleri ({pendingBusinessImages?.length || 0})</h3>
        
        {!pendingBusinessImages || pendingBusinessImages.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-700">🎉 Onay bekleyen işletme görseli bulunmuyor!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBusinessImages.map((image: any) => (
              <div key={image.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{image.business_name}</h4>
                    <p className="text-xs text-gray-600 mt-1">{image.owner_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(image.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      🖼️ Sıra: {image.image_order}
                    </div>
                  </div>
                </div>
                
                {/* Image Preview */}
                <div className="mb-3">
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <img 
                      src={image.image_url} 
                      alt={`İşletme görseli`} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzExNi41NjkgMTMwIDEzMCAxMTYuNTY5IDEzMCAxMDBDMTMwIDgzLjQzMTQgMTE2LjU2OSA3MCAxMDAgNzBDODMuNDMxNCA3MCA3MCA4My40MzE0IDcwIDEwMEM3MCAxMTYuNTY5IDgzLjQzMTQgMTMwIDEwMCAxMzBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMDAgMTEwQzEwNS41MjMgMTEwIDExMCAxMDUuNTIzIDExMCAxMDBDMTEwIDk0LjQ3NzIgMTA1LjUyMyA5MCAxMDAgOTBDOTQuNDc3MiA5MCA5MCA5NC40Nzc3IDkwIDEwMEM5MCAxMDUuNTIzIDk0LjQ3NzIgMTEwIDEwMCAxMTBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo=';
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveBusinessSliderImage(image.id, true)}
                    disabled={approveBusinessSliderImage.isPending}
                    className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    ✅ Onayla
                  </button>
                  <button
                    onClick={() => handleApproveBusinessSliderImage(image.id, false)}
                    disabled={approveBusinessSliderImage.isPending}
                    className="flex-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    ❌ Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewApprovalPanel({ pendingReviews, pendingReplies, isLoading }: { pendingReviews: any[] | undefined; pendingReplies: any[] | undefined; isLoading: boolean }) {
  const utils = trpc.useUtils();
  const approveReview = trpc.admin.approveReview.useMutation();
  const approveReply = trpc.admin.approveBusinessReply.useMutation();
  const [approvalNote, setApprovalNote] = useState('');

  const handleApproveReview = async (reviewId: string, approve: boolean) => {
    try {
      await approveReview.mutateAsync({ reviewId, approve, note: approvalNote });
      utils.admin.getPendingReviews.invalidate();
      utils.admin.getStats.invalidate();
      setApprovalNote('');
    } catch (error) {
    }
  };

  const handleApproveReply = async (reviewId: string, approve: boolean) => {
    try {
      await approveReply.mutateAsync({ reviewId, approve, note: approvalNote });
      utils.admin.getPendingReplies.invalidate();
      utils.admin.getStats.invalidate();
      setApprovalNote('');
    } catch (error) {
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Yükleniyor…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">✅ Yorum Onay Sistemi</h2>
        <p className="text-gray-600">Müşteri yorumları ve işletme yanıtları için onay yönetimi</p>
      </div>

      {/* Approval Note Input */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-4">
        <label className="block mb-2">
          <span className="text-sm font-medium text-gray-700">Onay Notu (Opsiyonel)</span>
          <input
            type="text"
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
            placeholder="Onay veya red nedeni..."
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none"
          />
        </label>
      </div>

      {/* Pending Reviews */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">⭐ Onay Bekleyen Yorumlar ({pendingReviews?.length || 0})</h3>
        
        {!pendingReviews || pendingReviews.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-700">🎉 Onay bekleyen yorum bulunmuyor!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReviews.map((review: any) => (
              <div key={review.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{review.user_name}</h4>
                    <p className="text-xs text-gray-600 mt-1">{review.business_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(review.appointment_datetime).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      ⭐ {review.service_rating}/5
                    </div>
                    <div className="text-xs text-gray-600">
                      👨‍💼 {review.employee_rating}/5
                    </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                    "{review.comment}"
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveReview(review.id, true)}
                    disabled={approveReview.isPending}
                    className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    ✅ Onayla
                  </button>
                  <button
                    onClick={() => handleApproveReview(review.id, false)}
                    disabled={approveReview.isPending}
                    className="flex-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    ❌ Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Replies */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">💬 Onay Bekleyen İşletme Yanıtları ({pendingReplies?.length || 0})</h3>
        
        {!pendingReplies || pendingReplies.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-700">🎉 Onay bekleyen işletme yanıtı bulunmuyor!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReplies.map((review: any) => (
              <div key={review.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{review.business_name}</h4>
                    <p className="text-xs text-gray-600 mt-1">Yanıt veren işletme</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(review.business_reply_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      👤 {review.user_name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(review.appointment_datetime).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                    "{review.business_reply}"
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveReply(review.id, true)}
                    disabled={approveReply.isPending}
                    className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    ✅ Onayla
                  </button>
                  <button
                    onClick={() => handleApproveReply(review.id, false)}
                    disabled={approveReply.isPending}
                    className="flex-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    ❌ Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditUserModal({ data, onClose, onSave }: any) {
  const [form, setForm] = useState({
    id: data.id,
    name: data.name || '',
    email: data.email || '',
    role: data.role || 'user',
    phone: data.phone || '',
    address: data.address || '',
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
  });
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto my-6 max-w-lg w-[92%] bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Kullanıcı Düzenle</h3>
          <button className="px-2 py-1 rounded-md bg-rose-600 text-white text-xs" onClick={onClose}>Kapat</button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries({ name:'Ad', email:'E-posta', phone:'Telefon', address:'Adres' }).map(([key,label]) => (
            <label key={key} className="block">
              <span className="block text-[11px] text-gray-600 mb-1">{label}</span>
              <input value={(form as any)[key]} onChange={(e)=> setForm(f=> ({...f, [key]: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
          ))}
          <label className="block">
            <span className="block text-[11px] text-gray-600 mb-1">Rol</span>
            <select value={form.role} onChange={(e)=> setForm(f=> ({...f, role: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none">
              <option value="user">user</option>
              <option value="business">business</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[11px] text-gray-600 mb-1">Lat</span>
              <input type="number" value={form.latitude ?? ''} onChange={(e)=> setForm(f=> ({...f, latitude: e.target.value===''? null : Number(e.target.value) }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
            <label className="block">
              <span className="block text-[11px] text-gray-600 mb-1">Lng</span>
              <input type="number" value={form.longitude ?? ''} onChange={(e)=> setForm(f=> ({...f, longitude: e.target.value===''? null : Number(e.target.value) }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm" onClick={onClose}>Vazgeç</button>
          <button className="py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold" onClick={()=> onSave(form)}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}


