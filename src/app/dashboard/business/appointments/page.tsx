"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useMemo, useState, useEffect } from 'react';
import { skipToken } from '@tanstack/react-query';
import { useRealTimeAppointments } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';
import { useSocket } from '../../../../hooks/useSocket';

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
  const { data: allAppointments, isLoading } = appointmentsQuery;
  
  // Employee ise sadece kendi randevularını filtrele
  const appointments = useMemo(() => {
    if (session?.user?.role === 'employee' && session?.user?.employeeId) {
      return allAppointments?.filter((a: any) => a.employee_id === session.user.employeeId) || [];
    }
    return allAppointments || [];
  }, [allAppointments, session?.user?.role, session?.user?.employeeId]);
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
  
  // Aktif randevular için filtreleme ve sayfalama
  const [activeServiceFilters, setActiveServiceFilters] = useState<string[]>([]);
  const [activeEmployeeFilters, setActiveEmployeeFilters] = useState<string[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all'|'pending'|'confirmed'>('all');
  const [activeDateFrom, setActiveDateFrom] = useState<string>('');
  const [activeDateTo, setActiveDateTo] = useState<string>('');
  const [activeCurrentPage, setActiveCurrentPage] = useState(1);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Filtre kartı açık/kapalı durumu
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isHistoryFiltersOpen, setIsHistoryFiltersOpen] = useState(false);
  
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

  // Aktif randevuları hesapla (pending + confirmed) ve filtrele
  const activeAppointments = useMemo(() => {
    const currentAppointments = optimisticAppointments.length > 0 ? optimisticAppointments : appointments;
    if (!currentAppointments) return [];
    
    return currentAppointments.filter((a: any) => {
      // Sadece pending ve confirmed randevular
      if (a.status !== 'pending' && a.status !== 'confirmed') return false;
      
      // Status filtresi
      if (activeStatusFilter !== 'all' && a.status !== activeStatusFilter) return false;
      
      // Hizmet filtresi
      if (activeServiceFilters.length > 0) {
        const names: string[] = Array.isArray(a.service_names) ? a.service_names : [];
        if (!activeServiceFilters.some((s) => names.includes(s))) return false;
      }
      
      // Çalışan filtresi
      if (activeEmployeeFilters.length > 0) {
        const names: string[] = Array.isArray(a.employee_names) ? a.employee_names : [];
        if (!activeEmployeeFilters.some((e) => names.includes(e))) return false;
      }
      
      // Tarih aralığı filtresi
      if (activeDateFrom) {
        const from = new Date(`${activeDateFrom}T00:00:00`).getTime();
        if (new Date(a.appointment_datetime).getTime() < from) return false;
      }
      if (activeDateTo) {
        const to = new Date(`${activeDateTo}T23:59:59`).getTime();
        if (new Date(a.appointment_datetime).getTime() > to) return false;
      }
      
      return true;
    });
  }, [optimisticAppointments, appointments, activeStatusFilter, activeServiceFilters, activeEmployeeFilters, activeDateFrom, activeDateTo]);

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
  
  // Sayfalama hesaplamaları
  const totalActivePages = Math.ceil(activeAppointments.length / itemsPerPage);
  const startActiveIndex = (activeCurrentPage - 1) * itemsPerPage;
  const endActiveIndex = startActiveIndex + itemsPerPage;
  const paginatedActiveAppointments = activeAppointments.slice(startActiveIndex, endActiveIndex);
  
  const totalHistoryPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startHistoryIndex = (historyCurrentPage - 1) * itemsPerPage;
  const endHistoryIndex = startHistoryIndex + itemsPerPage;
  const paginatedHistory = filteredHistory.slice(startHistoryIndex, endHistoryIndex);

  return (
    <main className="relative max-w-md mx-auto p-3 sm:p-4 pb-20 sm:pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/80 backdrop-blur-md border-b border-white/60 mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.push('/dashboard/business')} className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/70 border border-white/50 text-gray-900 shadow-sm hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
              <div className="text-[10px] sm:text-xs text-gray-600">Randevu Yönetimi</div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
            <button 
              onClick={() => setShowHistory(true)} 
              className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-[10px] sm:text-xs font-semibold shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span className="hidden xs:inline">Geçmiş</span>
            </button>
          </div>
        </div>
        
        {/* Aktif Randevular Sayısı - Mobile Optimized */}
        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-white/50 text-xs sm:text-sm font-semibold text-gray-900">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold">Aktif Randevular</div>
              <div className="text-[10px] sm:text-xs text-gray-600">{activeAppointmentsCount} randevu</div>
            </div>
          </div>
        </div>
        
        {/* Filtreleme Kartı - Mobile Optimized */}
        <div className="mt-3 sm:mt-4 bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"/></svg>
              </div>
              <h2 className="text-sm sm:text-lg font-bold text-gray-900">Filtreler</h2>
            </div>
            <button 
              type="button"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/80 border border-white/50 text-gray-700 flex items-center justify-center hover:bg-white active:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
            >
              {isFiltersOpen ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
          </div>
          
          {isFiltersOpen && (
            <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            {/* Hizmet Filtreleri - Mobile Optimized */}
            <div>
              <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Hizmetler</div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {services?.map((s: any) => (
                  <button 
                    key={s.id} 
                    onClick={() => {
                      setActiveServiceFilters(prev => 
                        prev.includes(s.name) ? prev.filter(n => n !== s.name) : [...prev, s.name]
                      );
                      setActiveCurrentPage(1);
                    }} 
                    className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-medium border transition-all touch-manipulation min-h-[44px] ${
                      activeServiceFilters.includes(s.name) 
                        ? 'bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white border-transparent shadow-md' 
                        : 'bg-white/80 text-gray-700 border-white/50 hover:bg-white/90 hover:border-rose-200 active:bg-white'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Çalışan Filtreleri - Mobile Optimized */}
            <div>
              <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Çalışanlar</div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {employees?.map((e: any) => (
                  <button 
                    key={e.id} 
                    onClick={() => {
                      setActiveEmployeeFilters(prev => 
                        prev.includes(e.name) ? prev.filter(n => n !== e.name) : [...prev, e.name]
                      );
                      setActiveCurrentPage(1);
                    }} 
                    className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-medium border transition-all touch-manipulation min-h-[44px] ${
                      activeEmployeeFilters.includes(e.name) 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-md' 
                        : 'bg-white/80 text-gray-700 border-white/50 hover:bg-white/90 hover:border-indigo-200 active:bg-white'
                    }`}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Durum Filtresi - Mobile Optimized */}
            <div>
              <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Durum</div>
              <select 
                value={activeStatusFilter} 
                onChange={(e) => {
                  setActiveStatusFilter(e.target.value as any);
                  setActiveCurrentPage(1);
                }} 
                className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 touch-manipulation min-h-[44px]"
                style={{ fontSize: '16px' }}
              >
                <option value="all">Tüm Durumlar</option>
                <option value="pending">Bekliyor</option>
                <option value="confirmed">Onaylandı</option>
              </select>
            </div>
            
            {/* Tarih Filtreleri - Mobile Optimized */}
            <div>
              <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Tarih Aralığı</div>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Başlangıç Tarihi</div>
                  <input 
                    type="date" 
                    value={activeDateFrom} 
                    onChange={(e) => {
                      setActiveDateFrom(e.target.value);
                      setActiveCurrentPage(1);
                    }} 
                    className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 touch-manipulation min-h-[44px]" 
                    placeholder="Başlangıç"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Bitiş Tarihi</div>
                  <input 
                    type="date" 
                    value={activeDateTo} 
                    onChange={(e) => {
                      setActiveDateTo(e.target.value);
                      setActiveCurrentPage(1);
                    }} 
                    className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 touch-manipulation min-h-[44px]" 
                    placeholder="Bitiş"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>
            </div>
            
            {/* Sıfırla Butonu - Mobile Optimized */}
            <div className="flex justify-center pt-2">
              <button 
                onClick={() => { 
                  setActiveServiceFilters([]); 
                  setActiveEmployeeFilters([]); 
                  setActiveStatusFilter('all'); 
                  setActiveDateFrom(''); 
                  setActiveDateTo(''); 
                  setActiveCurrentPage(1);
                }} 
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-xs sm:text-sm font-medium text-gray-700 hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Filtreleri Sıfırla
              </button>
            </div>
            </div>
          )}
        </div>
      </div>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-gray-400 animate-pulse">
          <span className="text-4xl sm:text-5xl mb-2">⏳</span>
          <span className="text-sm sm:text-lg">Randevular yükleniyor...</span>
        </div>
      )}
      <div className="space-y-3">
        {/* Sayfalanmış aktif randevuları göster - Mobile Optimized */}
        {paginatedActiveAppointments?.map((a: any) => (
          <div
            key={a.id}
            className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-3 sm:p-4 hover:shadow-md active:shadow-lg transition-all"
          >
            {/* Header - Mobile Optimized */}
            <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                  {a.user_name ? a.user_name.charAt(0).toUpperCase() : 'M'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">{a.user_name || 'Müşteri'}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600 flex items-center gap-1" suppressHydrationWarning>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(a.appointment_datetime))}</span>
                    <span className="mx-1 text-gray-400">•</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(a.appointment_datetime))}</span>
                  </div>
                </div>
              </div>
              <span className={`shrink-0 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${
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

            {/* Detaylar - Mobile Optimized */}
            <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 text-[10px] sm:text-sm text-gray-800">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="font-medium">Hizmet:</span>
                <span className="truncate">{a.service_names && a.service_names.length > 0 ? a.service_names.join(', ') : '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] sm:text-sm text-gray-800">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
                <span className="font-medium">Çalışan:</span>
                <span className="truncate">{a.employee_names && a.employee_names.length > 0 ? a.employee_names.join(', ') : '—'}</span>
              </div>
            </div>

            {/* Aksiyon Butonları - Mobile Optimized */}
            <div className="flex gap-1.5 sm:gap-2">
              {a.status === 'pending' && (
                <>
                  <button 
                    className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-[10px] sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
                      updatingAppointmentId === a.id 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-md hover:shadow-lg active:shadow-xl'
                    }`} 
                    onClick={() => handleStatus(a.id, 'confirmed')}
                    disabled={updatingAppointmentId === a.id}
                  >
                    {updatingAppointmentId === a.id ? (
                      <>
                        <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/90 border-t-transparent rounded-full animate-spin"></span>
                        <span>Güncelleniyor...</span>
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span>Onayla</span>
                      </>
                    )}
                  </button>
                  <button 
                    className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-[10px] sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
                      updatingAppointmentId === a.id 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-md hover:shadow-lg active:shadow-xl'
                    }`} 
                    onClick={() => handleStatus(a.id, 'cancelled')}
                    disabled={updatingAppointmentId === a.id}
                  >
                    {updatingAppointmentId === a.id ? (
                      <>
                        <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/90 border-t-transparent rounded-full animate-spin"></span>
                        <span>Güncelleniyor...</span>
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span>İptal Et</span>
                      </>
                    )}
                  </button>
                </>
              )}
              {a.status === 'confirmed' && (
                <button 
                  className={`w-full flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-[10px] sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] ${
                    updatingAppointmentId === a.id 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700 shadow-md hover:shadow-lg active:shadow-xl'
                  }`} 
                  onClick={() => handleStatus(a.id, 'completed')}
                  disabled={updatingAppointmentId === a.id}
                >
                  {updatingAppointmentId === a.id ? (
                    <>
                      <span className="inline-block w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/90 border-t-transparent rounded-full animate-spin"></span>
                      <span>Güncelleniyor...</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span className="hidden xs:inline">Tamamlandı Olarak İşaretle</span>
                      <span className="xs:hidden">Tamamla</span>
                    </>
                  )}
                </button>
              )}
              {a.status === 'completed' && (
                <div className="w-full flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl bg-green-100 text-green-800 text-[10px] sm:text-sm font-semibold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Tamamlandı</span>
                </div>
              )}
              {a.status === 'cancelled' && (
                <div className="w-full flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl bg-red-100 text-red-800 text-[10px] sm:text-sm font-semibold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>İptal Edildi</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {(!paginatedActiveAppointments || paginatedActiveAppointments.length === 0) && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-gray-500 animate-fade-in">
            <span className="text-4xl sm:text-5xl mb-2">📭</span>
            <span className="text-sm sm:text-lg">Aktif randevu yok</span>
          </div>
        )}
        
        {/* Aktif Randevular Sayfalama - Mobile Optimized */}
        {totalActivePages > 1 && (
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
            <button
              onClick={() => setActiveCurrentPage(1)}
              disabled={activeCurrentPage === 1}
              className="px-2 sm:px-3 py-2 rounded-xl bg-white/80 border border-white/50 text-[10px] sm:text-xs text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
            >
              İlk
            </button>
            <button
              onClick={() => setActiveCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={activeCurrentPage === 1}
              className="px-2 sm:px-3 py-2 rounded-xl bg-white/80 border border-white/50 text-[10px] sm:text-xs text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
            >
              Önceki
            </button>
            <span className="px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-gray-700 bg-white/60 rounded-xl">
              {activeCurrentPage} / {totalActivePages}
            </span>
            <button
              onClick={() => setActiveCurrentPage(prev => Math.min(totalActivePages, prev + 1))}
              disabled={activeCurrentPage === totalActivePages}
              className="px-2 sm:px-3 py-2 rounded-xl bg-white/80 border border-white/50 text-[10px] sm:text-xs text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
            >
              Sonraki
            </button>
            <button
              onClick={() => setActiveCurrentPage(totalActivePages)}
              disabled={activeCurrentPage === totalActivePages}
              className="px-2 sm:px-3 py-2 rounded-xl bg-white/80 border border-white/50 text-[10px] sm:text-xs text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
            >
              Son
            </button>
          </div>
        )}
      </div>
      {error && <div className="text-red-600 text-xs sm:text-sm text-center animate-shake mt-3 sm:mt-4">{error}</div>}
      {success && <div className="text-green-600 text-xs sm:text-sm text-center animate-fade-in mt-3 sm:mt-4">{success}</div>}

      {/* History Modal - Mobile Optimized */}
      {showHistory && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative mx-auto my-6 max-w-md w-[94%] bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl shadow-2xl p-3 sm:p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div className="text-sm sm:text-lg font-bold text-gray-900">Geçmiş Randevular</div>
                  <div className="text-[10px] sm:text-xs text-gray-600">{filteredHistory.length} randevu</div>
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(false)} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation min-h-[44px]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            {/* Filtreler - Mobile Optimized */}
            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-2 sm:p-3 mb-3 sm:mb-4">
              <div className="flex items-center justify-between">
                <div className="text-xs sm:text-sm font-semibold text-gray-900">Filtreler</div>
                <button 
                  type="button"
                  onClick={() => setIsHistoryFiltersOpen(!isHistoryFiltersOpen)}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-white/80 border border-white/50 text-gray-700 flex items-center justify-center hover:bg-white active:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
                >
                  {isHistoryFiltersOpen ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </button>
              </div>
              
              {isHistoryFiltersOpen && (
                <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
              {/* Hizmet Filtreleri - Mobile Optimized */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Hizmetler</div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {services?.map((s: any) => (
                    <button 
                      key={s.id} 
                      onClick={() => {
                        setServiceFilters(prev => prev.includes(s.name) ? prev.filter(n => n !== s.name) : [...prev, s.name]);
                        setHistoryCurrentPage(1);
                      }} 
                      className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-medium border transition-all touch-manipulation min-h-[44px] ${
                        serviceFilters.includes(s.name) 
                          ? 'bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white border-transparent shadow-md' 
                          : 'bg-white/80 text-gray-700 border-white/50 hover:bg-white/90 hover:border-rose-200 active:bg-white'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Çalışan Filtreleri - Mobile Optimized */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Çalışanlar</div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {employees?.map((e: any) => (
                    <button 
                      key={e.id} 
                      onClick={() => {
                        setEmployeeFilters(prev => prev.includes(e.name) ? prev.filter(n => n !== e.name) : [...prev, e.name]);
                        setHistoryCurrentPage(1);
                      }} 
                      className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-medium border transition-all touch-manipulation min-h-[44px] ${
                        employeeFilters.includes(e.name) 
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-md' 
                          : 'bg-white/80 text-gray-700 border-white/50 hover:bg-white/90 hover:border-indigo-200 active:bg-white'
                      }`}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Durum Filtresi - Mobile Optimized */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Durum</div>
                <select 
                  value={statusFilter} 
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setHistoryCurrentPage(1);
                  }} 
                  className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 touch-manipulation min-h-[44px]"
                  style={{ fontSize: '16px' }}
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="pending">Bekliyor</option>
                  <option value="confirmed">Onaylandı</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </div>
              
              {/* Sıfırla Butonu - Mobile Optimized */}
              <div className="flex justify-center pt-2">
                <button 
                  onClick={() => { 
                    setServiceFilters([]); 
                    setEmployeeFilters([]); 
                    setStatusFilter('all'); 
                    setDateFrom(''); 
                    setDateTo(''); 
                    setHistoryCurrentPage(1);
                  }} 
                  className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-xs sm:text-sm font-medium text-gray-700 hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Filtreleri Sıfırla
                </button>
              </div>
                </div>
              )}
            </div>

            {/* Geçmiş Randevular Listesi - Mobile Optimized */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {paginatedHistory.map((a: any) => (
                <div key={a.id} className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-2 sm:p-3 hover:shadow-md active:shadow-lg transition-all">
                  <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-gray-400 to-gray-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold">
                        {a.user_name ? a.user_name.charAt(0).toUpperCase() : 'M'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] sm:text-sm font-bold text-gray-900" suppressHydrationWarning>
                          {typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(a.appointment_datetime))}
                        </div>
                        <div className="text-[9px] sm:text-xs text-gray-600">{a.user_name || 'Müşteri'}</div>
                      </div>
                    </div>
                    <span className={`px-1.5 sm:px-2 py-1 rounded-lg text-[9px] sm:text-xs font-semibold shrink-0 ${
                      a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      a.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                      a.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {a.status === 'pending' ? 'Bekliyor' : 
                       a.status === 'confirmed' ? 'Onaylandı' : 
                       a.status === 'cancelled' ? 'İptal Edildi' : 
                       a.status === 'completed' ? 'Tamamlandı' : a.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-xs text-gray-700">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span className="font-medium">Hizmet:</span>
                      <span className="truncate">{Array.isArray(a.service_names) ? a.service_names.join(', ') : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-xs text-gray-600">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
                      <span className="font-medium">Çalışan:</span>
                      <span className="truncate">{Array.isArray(a.employee_names) ? a.employee_names.join(', ') : '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
              {paginatedHistory.length === 0 && (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Filtrelere uygun randevu bulunamadı</div>
                </div>
              )}
            </div>
            
            {/* Geçmiş Sayfalama - Mobile Optimized */}
            {totalHistoryPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-white/30">
                <button
                  onClick={() => setHistoryCurrentPage(1)}
                  disabled={historyCurrentPage === 1}
                  className="px-2 sm:px-3 py-2 rounded-xl bg-white/80 border border-white/50 text-[10px] sm:text-xs text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
                >
                  İlk
                </button>
                <button
                  onClick={() => setHistoryCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={historyCurrentPage === 1}
                  className="px-2 sm:px-3 py-2 rounded-xl bg-white/80 border border-white/50 text-[10px] sm:text-xs text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
                >
                  Önceki
                </button>
                <span className="px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-gray-700 bg-white/60 rounded-xl">
                  {historyCurrentPage} / {totalHistoryPages}
                </span>
                <button
                  onClick={() => setHistoryCurrentPage(prev => Math.min(totalHistoryPages, prev + 1))}
                  disabled={historyCurrentPage === totalHistoryPages}
                  className="px-2 sm:px-3 py-2 rounded-xl bg-white/80 border border-white/50 text-[10px] sm:text-xs text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
                >
                  Sonraki
                </button>
                <button
                  onClick={() => setHistoryCurrentPage(totalHistoryPages)}
                  disabled={historyCurrentPage === totalHistoryPages}
                  className="px-2 sm:px-3 py-2 rounded-xl bg-white/80 border border-white/50 text-[10px] sm:text-xs text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
                >
                  Son
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// Global CSS for mobile optimizations
const globalStyles = `
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
  
  /* Custom breakpoint for extra small screens */
  @media (max-width: 475px) {
    .xs\\:inline {
      display: inline;
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
  
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
  }
  @keyframes shake {
    10%, 90% { transform: translateX(-2px); }
    20%, 80% { transform: translateX(4px); }
    30%, 50%, 70% { transform: translateX(-8px); }
    40%, 60% { transform: translateX(8px); }
  }
  .animate-shake {
    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
  }
`;

// Add global styles to the page
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = globalStyles;
  document.head.appendChild(styleElement);
} 