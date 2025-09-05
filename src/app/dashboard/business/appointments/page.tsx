"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useMemo, useState, useEffect } from 'react';
import { skipToken } from '@tanstack/react-query';
import { useRealTimeAppointments } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-800",
};

export default function BusinessAppointmentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses, isLoading: loadingBusiness } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;
  const appointmentsQuery = trpc.appointment.getByBusiness.useQuery(businessId ? { businessId } : skipToken);
  const { data: appointments, isLoading } = appointmentsQuery;
  const { data: services } = trpc.business.getServices.useQuery(businessId ? { businessId } : skipToken);
  const { data: employees } = trpc.business.getEmployees.useQuery(businessId ? { businessId } : skipToken);
  const updateStatus = trpc.appointment.updateStatus.useMutation();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [employeeFilters, setEmployeeFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'confirmed'|'cancelled'|'completed'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Optimistic updates için local state
  const [optimisticAppointments, setOptimisticAppointments] = useState<any[]>([]);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<string | null>(null);

  // Socket.IO hook'u
  const { isConnected, socket } = useSocket();

  // Appointments'ı yenileme event'ini dinle
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;

    const handleRefreshAppointments = (event: CustomEvent) => {
      if (event.detail.businessId === businessId) {
        // Debouncing - çok sık yenileme yapmasın
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          console.log('🔄 Appointments sayfasında randevular yenileniyor...');
          appointmentsQuery.refetch();
        }, 200); // 200ms debounce
      }
    };

    window.addEventListener('refreshAppointments', handleRefreshAppointments as EventListener);

    return () => {
      clearTimeout(refreshTimer);
      window.removeEventListener('refreshAppointments', handleRefreshAppointments as EventListener);
    };
  }, [businessId, appointmentsQuery]);

  // Socket.IO event'lerini dinle ve randevuları güncelle
  useEffect(() => {
    if (!isConnected || !socket || !businessId) return;

    // Randevu durumu güncellendiğinde UI'ı hemen yenile
    const handleAppointmentStatusUpdate = (data: any) => {
      console.log('🔔 Randevu durumu güncellendi:', data);
      if (data.businessId === businessId) {
        // Optimistic update varsa temizle
        setOptimisticAppointments([]);
        // Randevuları hemen yenile
        appointmentsQuery.refetch();
      }
    };

    // Randevu oluşturulduğunda UI'ı hemen yenile
    const handleAppointmentCreated = (data: any) => {
      console.log('🔔 Yeni randevu oluşturuldu:', data);
      if (data.businessId === businessId) {
        // Optimistic update varsa temizle
        setOptimisticAppointments([]);
        // Randevuları hemen yenile
        appointmentsQuery.refetch();
      }
    };

    // Event listener'ları ekle
    socket.on('socket:appointment:status_updated', handleAppointmentStatusUpdate);
    socket.on('socket:appointment:created', handleAppointmentCreated);

    return () => {
      // Cleanup
      socket.off('socket:appointment:status_updated', handleAppointmentStatusUpdate);
      socket.off('socket:appointment:created', handleAppointmentCreated);
    };
  }, [isConnected, socket, businessId, appointmentsQuery]);

  // Randevu durumu değiştiğinde otomatik olarak yenile
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      // Randevular değiştiğinde UI'ı güncelle
      console.log('📅 Randevular güncellendi, UI yenileniyor...');
    }
  }, [appointments]);

  const handleStatus = async (id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    setError('');
    setSuccess('');
    setUpdatingAppointmentId(id);

    // Optimistic update - UI'ı hemen güncelle
    const oldAppointments = appointments || [];
    const updatedAppointments = oldAppointments.map((apt: any) => 
      apt.id === id ? { ...apt, status } : apt
    );

    // Local state'i hemen güncelle
    setOptimisticAppointments(updatedAppointments);

    try {
      await updateStatus.mutateAsync({ appointmentId: id, businessId: businessId || '', status });
      setSuccess('Randevu güncellendi!');
      
      // Socket.IO event'i beklemeden UI'ı güncelle
      setTimeout(() => {
        appointmentsQuery.refetch();
        setOptimisticAppointments([]); // Optimistic state'i temizle
        setUpdatingAppointmentId(null);
      }, 100); // 100ms sonra server'dan güncel veriyi al
      
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      // Hata durumunda eski veriyi geri yükle
      setOptimisticAppointments(oldAppointments);
      setUpdatingAppointmentId(null);
      setError(err.message || 'Hata oluştu');
    }
  };

  // Aktif randevuları hesapla (pending + confirmed)
  const activeAppointments = useMemo(() => {
    const currentAppointments = optimisticAppointments.length > 0 ? optimisticAppointments : appointments;
    if (!currentAppointments) return [];
    
    return currentAppointments.filter((a: any) => 
      a.status === 'pending' || a.status === 'confirmed'
    );
  }, [optimisticAppointments, appointments]);

  const activeAppointmentsCount = activeAppointments.length;

  const filteredHistory = useMemo(() => {
    const currentAppointments = optimisticAppointments.length > 0 ? optimisticAppointments : appointments;
    if (!currentAppointments) return [];
    
    return currentAppointments.filter((a: any) => {
      // Status
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      // Services by names
      if (serviceFilters.length > 0) {
        const names: string[] = Array.isArray(a.service_names) ? a.service_names : [];
        if (!serviceFilters.some((s) => names.includes(s))) return false;
      }
      // Employees by names
      if (employeeFilters.length > 0) {
        const names: string[] = Array.isArray(a.employee_names) ? a.employee_names : [];
        if (!serviceFilters.some((e) => names.includes(e))) return false;
      }
      // Date range
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`).getTime();
        if (new Date(a.appointment_datetime).getTime() < from) return false;
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`).getTime();
        if (new Date(a.appointment_datetime).getTime() > to) return false;
      }
      return true;
    });
  }, [optimisticAppointments, appointments, statusFilter, serviceFilters, employeeFilters, dateFrom, dateTo]);

  return (
    <main className="relative max-w-3xl mx-auto p-4 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
          <button 
            onClick={() => router.push('/dashboard/business')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 text-gray-900 shadow-sm hover:shadow-md transition"
          >
            <span className="text-base">←</span>
            <span className="hidden sm:inline text-sm font-medium">Geri</span>
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-white/40 text-[13px] text-gray-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Aktif randevular ({activeAppointmentsCount})
          </div>
          <button onClick={() => setShowHistory(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-[13px] font-semibold shadow-sm hover:shadow-md">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Geçmiş
          </button>
        </div>
      </div>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">Randevular yükleniyor...</span>
        </div>
      )}
      <div className="grid gap-3">
        {/* Sadece aktif randevuları göster (pending + confirmed) */}
        {activeAppointments?.map((a: any) => (
          <div
            key={a.id}
            className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow p-3"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{a.user_name || 'Müşteri'}</div>
                <div className="text-[12px] text-gray-600 flex items-center gap-1" suppressHydrationWarning>
                  <span>📅</span>
                  <span>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(a.appointment_datetime))}</span>
                  <span className="mx-1 text-gray-400">•</span>
                  <span>🕐</span>
                  <span>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(a.appointment_datetime))}</span>
                </div>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] border ${
                a.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                a.status === 'confirmed' ? 'bg-green-50 text-green-800 border-green-200' :
                a.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {a.status === 'pending' && 'Bekliyor'}
                {a.status === 'confirmed' && 'Onaylandı'}
                {a.status === 'cancelled' && 'İptal'}
                {a.status === 'completed' && 'Tamamlandı'}
              </span>
            </div>

            <div className="space-y-1.5 mb-2">
              <div className="text-[13px] text-gray-800 truncate">Hizmet: {a.service_names && a.service_names.length > 0 ? a.service_names.join(', ') : '—'}</div>
              <div className="text-[13px] text-gray-800 truncate">Çalışan: {a.employee_names && a.employee_names.length > 0 ? a.employee_names.join(', ') : '—'}</div>
            </div>

            <div className="flex gap-6">
              {a.status === 'pending' && (
                <>
                  <button 
                    className={`text-[13px] font-medium transition-all ${
                      updatingAppointmentId === a.id 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-emerald-700 hover:text-emerald-800'
                    }`} 
                    onClick={() => handleStatus(a.id, 'confirmed')}
                    disabled={updatingAppointmentId === a.id}
                  >
                    {updatingAppointmentId === a.id ? 'Güncelleniyor...' : 'Onayla'}
                  </button>
                  <button 
                    className={`text-[13px] font-medium transition-all ${
                      updatingAppointmentId === a.id 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-rose-700 hover:text-rose-800'
                    }`} 
                    onClick={() => handleStatus(a.id, 'cancelled')}
                    disabled={updatingAppointmentId === a.id}
                  >
                    {updatingAppointmentId === a.id ? 'Güncelleniyor...' : 'İptal Et'}
                  </button>
                </>
              )}
              {a.status === 'confirmed' && (
                <button 
                  className={`text-[13px] font-medium transition-all ${
                    updatingAppointmentId === a.id 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-indigo-700 hover:text-indigo-800'
                  }`} 
                  onClick={() => handleStatus(a.id, 'completed')}
                  disabled={updatingAppointmentId === a.id}
                >
                  {updatingAppointmentId === a.id ? 'Güncelleniyor...' : 'Tamamlandı'}
                </button>
              )}
              {a.status === 'completed' && (
                <div className="text-[13px] text-gray-700">Tamamlandı</div>
              )}
              {a.status === 'cancelled' && (
                <div className="text-[13px] text-gray-600">İptal Edildi</div>
              )}
            </div>
          </div>
        ))}
        {(!activeAppointments || activeAppointments.length === 0) && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 animate-fade-in">
            <span className="text-5xl mb-2">📭</span>
            <span className="text-lg">Aktif randevu yok</span>
          </div>
        )}
      </div>
      {error && <div className="text-red-600 text-sm text-center animate-shake mt-4">{error}</div>}
      {success && <div className="text-green-600 text-sm text-center animate-fade-in mt-4">{success}</div>}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative mx-auto my-6 max-w-2xl w-[94%] bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-white/50 text-[13px] text-gray-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Geçmiş Randevular
              </div>
              <button onClick={() => setShowHistory(false)} className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold shadow hover:shadow-md">Kapat</button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div className="flex flex-wrap gap-1.5 p-2 bg-white/70 border border-white/40 rounded-lg">
                <span className="text-[11px] font-semibold text-gray-700">Hizmet:</span>
                {services?.map((s: any) => (
                  <button key={s.id} onClick={() => setServiceFilters(prev => prev.includes(s.name) ? prev.filter(n => n !== s.name) : [...prev, s.name])} className={`px-2 py-1 rounded-full text-[11px] font-medium border ${serviceFilters.includes(s.name) ? 'bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white border-transparent' : 'bg-white/80 text-gray-700 border-white/50'}`}>{s.name}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 bg-white/70 border border-white/40 rounded-lg">
                <span className="text-[11px] font-semibold text-gray-700">Çalışan:</span>
                {employees?.map((e: any) => (
                  <button key={e.id} onClick={() => setEmployeeFilters(prev => prev.includes(e.name) ? prev.filter(n => n !== e.name) : [...prev, e.name])} className={`px-2 py-1 rounded-full text-[11px] font-medium border ${employeeFilters.includes(e.name) ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white border-transparent' : 'bg-white/80 text-gray-700 border-white/50'}`}>{e.name}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <select value={statusFilter} onChange={(e)=> setStatusFilter(e.target.value as any)} className="px-2 py-2 rounded-lg bg-white/80 border border-white/50 text-sm text-gray-900">
                <option value="all">Tümü</option>
                <option value="pending">Bekliyor</option>
                <option value="confirmed">Onaylandı</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
              <input type="date" value={dateFrom} onChange={(e)=> setDateFrom(e.target.value)} className="px-2 py-2 rounded-lg bg-white/80 border border-white/50 text-sm text-gray-900" placeholder="Başlangıç" />
              <input type="date" value={dateTo} onChange={(e)=> setDateTo(e.target.value)} className="px-2 py-2 rounded-lg bg-white/80 border border-white/50 text-sm text-gray-900" placeholder="Bitiş" />
              <button onClick={() => { setServiceFilters([]); setEmployeeFilters([]); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }} className="px-2 py-2 rounded-lg bg-white/80 border border-white/50 text-sm text-gray-900">Sıfırla</button>
            </div>

            {/* History List */}
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {filteredHistory.map((a: any) => (
                <div key={a.id} className="bg-white/60 backdrop-blur-md border border-white/40 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-semibold text-gray-900" suppressHydrationWarning>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(a.appointment_datetime))}</div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : a.status === 'confirmed' ? 'bg-green-100 text-green-800' : a.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {a.status === 'pending' ? 'Bekliyor' : 
                       a.status === 'confirmed' ? 'Onaylandı' : 
                       a.status === 'cancelled' ? 'İptal Edildi' : 
                       a.status === 'completed' ? 'Tamamlandı' : a.status}
                    </span>
                  </div>
                  <div className="text-[12px] text-gray-700">Hizmet: {Array.isArray(a.service_names) ? a.service_names.join(', ') : '—'}</div>
                  <div className="text-[12px] text-gray-500">Çalışan: {Array.isArray(a.service_names) ? a.employee_names.join(', ') : '—'}</div>
                </div>
              ))}
              {filteredHistory.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-6">Filtrelere uygun randevu bulunamadı</div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 