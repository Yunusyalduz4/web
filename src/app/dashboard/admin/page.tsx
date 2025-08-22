"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { useEffect, useMemo, useState } from 'react';

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
  | 'analytics';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user.role === 'admin';

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

  useEffect(() => {
    if (session && !isAdmin) router.push('/unauthorized');
  }, [session, isAdmin, router]);

  if (!session) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="text-sm text-gray-600">Yükleniyor…</div>
      </main>
    );
  }

  return (
    <main className="relative max-w-7xl mx-auto p-3 pb-20 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 bg-white/70 backdrop-blur-md border-b border-white/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
              🛡️ Admin Panel • KUADO
            </div>
            <div className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded-full">
              {session.user.email}
            </div>
          </div>
          
          {/* Global Search */}
          <div className="flex items-center gap-2 border border-white/40 bg-white/60 text-gray-900 rounded-xl px-3 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
              <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <input 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Global arama..." 
              className="bg-transparent outline-none text-sm w-48" 
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {([
            { id: 'overview', label: '📊 Genel Bakış', icon: '📊' },
            { id: 'pending', label: '⏳ Onay Bekleyenler', icon: '⏳' },
            { id: 'users', label: '👥 Kullanıcılar', icon: '👥' },
            { id: 'businesses', label: '🏢 İşletmeler', icon: '🏢' },
            { id: 'appointments', label: '📅 Randevular', icon: '📅' },
            { id: 'services', label: '🔧 Hizmetler', icon: '🔧' },
            { id: 'employees', label: '👨‍💼 Çalışanlar', icon: '👨‍💼' },
            { id: 'reviews', label: '⭐ Değerlendirmeler', icon: '⭐' },
            { id: 'analytics', label: '📈 Analitik', icon: '📈' }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-white/60 text-gray-700 border border-white/50 hover:bg-white/80'
              }`}
            >
              <span className="hidden sm:inline">{tab.icon}</span>
              <span className="sm:ml-1">{tab.label}</span>
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
        {activeTab === 'analytics' && <AnalyticsPanel />}
      </div>
    </main>
  );
}

// ===== PANEL COMPONENTS =====

function OverviewPanel({ stats, setActiveTab }: { stats: any; setActiveTab: (tab: AdminTab) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 Sistem Genel Bakış</h2>
        <p className="text-gray-600">KUADO platformunun genel durumu ve istatistikleri</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-6 text-center">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
          <div className="text-sm text-gray-600">Toplam Kullanıcı</div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-6 text-center">
          <div className="text-3xl mb-2">🏢</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalBusinesses || 0}</div>
          <div className="text-sm text-gray-600">Toplam İşletme</div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-6 text-center">
          <div className="text-3xl mb-2">📅</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalAppointments || 0}</div>
          <div className="text-sm text-gray-600">Toplam Randevu</div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-6 text-center">
          <div className="text-3xl mb-2">⭐</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalReviews || 0}</div>
          <div className="text-sm text-gray-600">Toplam Değerlendirme</div>
        </div>
      </div>

      {/* Pending Approvals Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">⏳</div>
          <div className="text-2xl font-bold text-yellow-800">{stats?.pendingBusinesses || 0}</div>
          <div className="text-sm text-yellow-700">Onay Bekleyen İşletme</div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">📸</div>
          <div className="text-2xl font-bold text-blue-800">{stats?.pendingImages || 0}</div>
          <div className="text-sm text-blue-700">Görsel Onay Bekleyen</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Hızlı İşlemler</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setActiveTab('pending')}
            className="p-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all"
          >
            <div className="text-2xl mb-2">⏳</div>
            <div className="font-medium">Onay Bekleyenler</div>
          </button>
          
          <button 
            onClick={() => setActiveTab('businesses')}
            className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all"
          >
            <div className="text-2xl mb-2">🏢</div>
            <div className="font-medium">İşletmeleri Yönet</div>
          </button>
          
          <button 
            onClick={() => setActiveTab('users')}
            className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium">Kullanıcıları Yönet</div>
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

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">🏢 İşletme Yönetimi</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all"
        >
          ➕ Yeni İşletme
        </button>
      </div>

      {/* Search Results */}
      {query && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            🔍 "{query}" için arama sonuçları: {data?.length || 0} işletme bulundu
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Yükleniyor…</div>
        </div>
      )}

      {/* Business List */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((b: any) => (
            <div key={b.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-lg p-4 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{b.name}</h3>
                  <p className="text-xs text-gray-600 truncate mt-1">{b.address}</p>
                  {b.email && <p className="text-xs text-gray-500 truncate mt-1">{b.email}</p>}
                </div>
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/70 border border-white/50 flex-shrink-0">
                  {b.profile_image_url ? (
                    <img src={b.profile_image_url} alt={b.name} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full grid place-items-center text-lg text-gray-400">🏢</div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {b.is_verified ? '✅ Onaylı' : '⏳ Beklemede'}
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                    ⭐ {b.average_rating || 0}/5 ({b.total_reviews || 0})
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  📅 {new Date(b.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditing(b)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                >
                  ✏️ Düzenle
                </button>
                <button 
                  onClick={async () => { 
                    if (confirm('Bu işletmeyi silmek istediğinizden emin misiniz?')) {
                      await remove.mutateAsync({ businessId: b.id }); 
                      utils.admin.listBusinesses.invalidate(); 
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
          <div className="text-4xl mb-2">🏢</div>
          <p className="text-gray-500">Henüz işletme bulunmuyor</p>
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
  const approveImage = trpc.admin.approveBusinessImage.useMutation();
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
      console.error('Approval error:', error);
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
        <p className="text-gray-600">KUADO platformunun detaylı analizleri ve raporları</p>
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


