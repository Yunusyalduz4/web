"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { skipToken } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import ReviewModal from '../../../components/ReviewModal';
import RescheduleModal from '../../../components/RescheduleModal';
import NotificationsButton from '../../../components/NotificationsButton';
import { useRealTimeAppointments, useRealTimeReviews } from '../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../hooks/useWebSocketEvents';

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-800",
};

export default function UserDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: profile } = trpc.user.getProfile.useQuery(userId ? { userId } : skipToken);
  const { data: appointments, isLoading } = trpc.user.appointmentHistory.useQuery(userId ? { userId } : skipToken);
  const { data: userReviews } = trpc.review.getByUser.useQuery(userId ? { userId } : skipToken);
  const cancelMutation = trpc.appointment.cancelAppointment.useMutation();
  
  // Erteleme istekleri
  const { data: pendingRescheduleRequests, refetch: refetchRescheduleRequests, isLoading: isLoadingRequests } = trpc.reschedule.getPendingRescheduleRequests.useQuery();
  const approveRescheduleMutation = trpc.reschedule.approveRescheduleRequest.useMutation({
    onSuccess: () => {
      refetchRescheduleRequests();
    }
  });
  const rejectRescheduleMutation = trpc.reschedule.approveRescheduleRequest.useMutation({
    onSuccess: () => {
      refetchRescheduleRequests();
    }
  });
  
  // WebSocket entegrasyonu
  const { isConnected, isConnecting, error: socketError } = useWebSocketStatus();
  const { setCallbacks: setAppointmentCallbacks } = useRealTimeAppointments(userId);
  const { setCallbacks: setReviewCallbacks } = useRealTimeReviews(userId);
  
  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    appointmentId: string;
    businessName: string;
    serviceName: string;
    employeeName: string;
  }>({
    isOpen: false,
    appointmentId: '',
    businessName: '',
    serviceName: '',
    employeeName: ''
  });

  // Reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    appointment: any;
  }>({
    isOpen: false,
    appointment: null
  });

  // History modal state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDate, setHistoryDate] = useState(''); // YYYY-MM-DD
  const [historyStatus, setHistoryStatus] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'>('all');

  const activeAppointments = useMemo(() => {
    return (appointments || []).filter((a: any) => a.status === 'pending' || a.status === 'confirmed');
  }, [appointments]);

  const filteredHistory = useMemo(() => {
    let list = appointments || [];
    if (historyStatus !== 'all') {
      list = list.filter((a: any) => a.status === historyStatus);
    }
    if (historyDate) {
      list = list.filter((a: any) => {
        const d = new Date(a.appointment_datetime);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === historyDate;
      });
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      list = list.filter((a: any) =>
        (a.business_name || '').toLowerCase().includes(q) ||
        (a.service_names || []).join(', ').toLowerCase().includes(q) ||
        (a.employee_names || []).join(', ').toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, historySearch, historyDate, historyStatus]);

  // WebSocket callback'lerini ayarla
  useEffect(() => {
    setAppointmentCallbacks({
      onAppointmentCreated: () => {
        // Randevu oluşturuldu - liste güncelleniyor
      },
      onAppointmentUpdated: () => {
        // Randevu güncellendi - liste güncelleniyor
      },
      onAppointmentCancelled: () => {
        // Randevu iptal edildi - liste güncelleniyor
      },
      onAppointmentCompleted: () => {
        // Randevu tamamlandı - liste güncelleniyor
      }
    });

    setReviewCallbacks({
      onReviewCreated: () => {
        // Yorum oluşturuldu - liste güncelleniyor
      },
      onReviewReplied: () => {
        // Yorum yanıtlandı - liste güncelleniyor
      },
      onReviewStatusUpdated: () => {
        // Yorum durumu güncellendi - liste güncelleniyor
      }
    });
  }, [setAppointmentCallbacks, setReviewCallbacks]);

  const handleCancel = async (id: string) => {
    if (!userId) return;
    if (!confirm("Randevuyu iptal etmek istediğinize emin misiniz?")) return;
    await cancelMutation.mutateAsync({ id, userId });
    router.refresh();
  };

  const handleReviewClick = (appointment: any) => {
    setReviewModal({
      isOpen: true,
      appointmentId: appointment.id,
      businessName: appointment.business_name || 'Bilinmiyor',
      serviceName: appointment.service_names && appointment.service_names.length > 0 
        ? appointment.service_names.join(', ') 
        : 'Bilinmiyor',
      employeeName: appointment.employee_names && appointment.employee_names.length > 0 
        ? appointment.employee_names.join(', ') 
        : 'Bilinmiyor'
    });
  };

  const handleReviewSubmitted = () => {
    // Review modal'ı kapat
    setReviewModal({
      isOpen: false,
      appointmentId: '',
      businessName: '',
      serviceName: '',
      employeeName: ''
    });
    
    // Sayfayı yenile ve review verilerini güncelle
    router.refresh();
  };

  const handleRescheduleClick = (appointment: any) => {
    setRescheduleModal({
      isOpen: true,
      appointment: appointment
    });
  };

  const handleRescheduleSubmitted = () => {
    // Reschedule modal'ı kapat
    setRescheduleModal({
      isOpen: false,
      appointment: null
    });
    
    // Sayfayı yenile ve randevu verilerini güncelle
    router.refresh();
  };

  return (
    <main className="relative max-w-2xl mx-auto p-3 sm:p-4 pb-20 sm:pb-28 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none truncate">randevuo</div>
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
          <div className="inline-flex items-center gap-1 sm:gap-2">
            <NotificationsButton userType="user" />
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/70 active:bg-white/80 text-gray-900 border border-white/40 shadow-sm transition-all touch-manipulation min-h-[44px]"
              aria-label="Randevu geçmişini aç"
            >
              <span className="text-sm sm:text-base">🕓</span>
              <span className="text-xs sm:text-sm font-medium hidden xs:inline">Geçmiş</span>
            </button>
          </div>
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold mt-3 sm:mt-4 mb-4 sm:mb-6 text-center bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none animate-soft-in px-2">
        Merhaba, {profile?.name} 👋
      </h1>
      {/* Bekleyen Erteleme İstekleri */}
      {pendingRescheduleRequests && pendingRescheduleRequests.length > 0 && (
        <div className="mb-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-sm font-bold text-orange-900">Bekleyen Erteleme İstekleri</div>
              <div className="text-xs text-orange-700">{pendingRescheduleRequests.length} istek onayınızı bekliyor</div>
            </div>
          </div>
          <div className="space-y-3">
            {pendingRescheduleRequests.map((request: any) => (
              <div key={request.id} className="bg-white/80 border border-orange-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm font-semibold text-gray-900">
                    {request.business_name || 'İşletme'}
                  </div>
                  <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">
                    Bekliyor
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-3">
                  <div>Eski Tarih: {typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { 
                    day: '2-digit', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }).format(new Date(request.old_appointment_datetime))}</div>
                  <div>Yeni Tarih: {typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { 
                    day: '2-digit', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }).format(new Date(request.new_appointment_datetime))}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveRescheduleMutation.mutate({ requestId: String(request.id), action: 'approve' })}
                    disabled={approveRescheduleMutation.isPending || rejectRescheduleMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Onayla
                  </button>
                  <button
                    onClick={() => rejectRescheduleMutation.mutate({ requestId: String(request.id), action: 'reject' })}
                    disabled={approveRescheduleMutation.isPending || rejectRescheduleMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Randevularım</h2>
      </div>
      <div className="space-y-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
            <span className="text-5xl mb-2">⏳</span>
            <span className="text-lg">Randevular yükleniyor...</span>
          </div>
        )}
        {!isLoading && activeAppointments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 animate-soft-in">
            <span className="text-5xl mb-2">📭</span>
            <span className="text-lg">Aktif randevunuz yok.</span>
            <span className="text-sm mt-1">Hemen bir işletmeden randevu alabilirsiniz!</span>
          </div>
        )}
        {activeAppointments.map((a: any) => (
          <div
            key={a.id}
            className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm hover:shadow-md transition-all p-3 sm:p-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">{a.business_name || 'Bilinmiyor'}</div>
                <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 mt-1" suppressHydrationWarning>
                  <span>📅</span>
                  <span>
                    {typeof window === 'undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(a.appointment_datetime))}
                  </span>
                  <span className="mx-1 text-gray-400">•</span>
                  <span>🕐</span>
                  <span>
                    {typeof window === 'undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(a.appointment_datetime))}
                  </span>
                </div>
              </div>
              <span className={`shrink-0 px-2 py-1 rounded-full text-xs border ${
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

            {/* Details */}
            <div className="space-y-2 mb-3">
              <div className="text-sm text-gray-800 truncate">
                <span className="font-medium">Hizmet:</span> {a.service_names?.length ? a.service_names.join(', ') : '—'}
              </div>
              <div className="text-sm text-gray-800 truncate">
                <span className="font-medium">Çalışan:</span> {a.employee_names?.length ? a.employee_names.join(', ') : '—'}
              </div>
            </div>

            {/* Actions - Mobile Optimized */}
            <div className="flex gap-3 sm:gap-6">
              {a.status === 'pending' && (
                <button
                  className="text-sm font-medium text-rose-700 hover:text-rose-800 active:text-rose-900 touch-manipulation min-h-[44px] px-2 py-2 -mx-2 -my-2 rounded-lg hover:bg-rose-50 active:bg-rose-100 transition-colors"
                  onClick={() => handleCancel(a.id)}
                >
                  İptal Et
                </button>
              )}
              {a.status === 'completed' && (
                <button
                  className="text-sm font-medium text-gray-900 hover:text-gray-700 active:text-gray-800 touch-manipulation min-h-[44px] px-2 py-2 -mx-2 -my-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => handleReviewClick(a)}
                >
                  Değerlendir
                </button>
              )}
              {a.status === 'confirmed' && (
                <div className="flex items-center gap-3">
                  <button
                    className="text-sm font-medium text-blue-700 hover:text-blue-800 active:text-blue-900 touch-manipulation min-h-[44px] px-2 py-2 -mx-2 -my-2 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors"
                    onClick={() => handleRescheduleClick(a)}
                  >
                    📅 Ertele
                  </button>
                  <div className="text-sm text-green-700 flex items-center min-h-[44px]">
                    <span className="inline-flex items-center gap-1">
                      <span>✅</span>
                      <span>Onaylandı</span>
                    </span>
                  </div>
                </div>
              )}
              {a.status === 'cancelled' && (
                <div className="text-sm text-gray-600 flex items-center min-h-[44px]">
                  <span className="inline-flex items-center gap-1">
                    <span>❌</span>
                    <span>İptal edildi</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
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
        
        /* Custom breakpoint for extra small screens */
        @media (max-width: 475px) {
          .xs\\:inline {
            display: inline;
          }
        }
        
        /* Animation improvements */
        .animate-soft-in {
          animation: softIn 0.6s ease-out;
        }
        
        @keyframes softIn {
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

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
        appointmentId={reviewModal.appointmentId}
        businessName={reviewModal.businessName}
        serviceName={reviewModal.serviceName}
        employeeName={reviewModal.employeeName}
        onReviewSubmitted={handleReviewSubmitted}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={rescheduleModal.isOpen}
        onClose={() => setRescheduleModal(prev => ({ ...prev, isOpen: false }))}
        appointment={rescheduleModal.appointment}
        userRole="user"
        onRescheduleSubmitted={handleRescheduleSubmitted}
      />

      {/* History Modal - Mobile Optimized */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />

          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full sm:max-w-2xl h-[90vh] sm:h-[85vh] bg-white/70 backdrop-blur-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Mobile Optimized */}
            <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-white/40">
              {/* Mobile drag handle */}
              <div className="py-2 flex items-center justify-center sm:hidden">
                <div className="w-12 h-1.5 rounded-full bg-gray-300" />
              </div>
              <div className="px-3 sm:px-4 pb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-lg">Tüm Randevular</h3>
                <button 
                  className="px-3 py-2 rounded-xl bg-white/60 border border-white/40 hover:bg-white/80 active:bg-white/90 text-sm touch-manipulation min-h-[44px] transition-colors" 
                  onClick={() => setHistoryOpen(false)}
                >
                  Kapat
                </button>
              </div>

              {/* Filters - Mobile Optimized */}
              <div className="px-3 sm:px-4 pb-3 border-t border-white/40">
                <div className="grid grid-cols-1 gap-3">
                  {/* Search */}
                  <div className="flex items-center gap-2 border border-white/40 rounded-xl px-3 py-3 bg-white/60 backdrop-blur-md">
                    <span className="text-gray-900 text-lg">🔎</span>
                    <input
                      className="w-full outline-none text-sm text-gray-900 bg-transparent placeholder-gray-500"
                      placeholder="Ara: işletme, hizmet, çalışan"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                    />
                  </div>
                  
                  {/* Date and Status Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="date"
                      className="w-full border border-white/40 rounded-xl px-3 py-3 text-sm text-gray-900 bg-white/60 backdrop-blur-md touch-manipulation"
                      value={historyDate}
                      onChange={(e) => setHistoryDate(e.target.value)}
                    />
                    
                    {/* Status Filter - Horizontal Scroll on Mobile */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                      {(['all','pending','confirmed','completed','cancelled'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => setHistoryStatus(st)}
                          className={`shrink-0 px-3 py-2 rounded-full text-xs border transition-all touch-manipulation min-h-[44px] ${
                            historyStatus===st? 
                            'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white border-transparent shadow-md' :
                            'bg-white/60 text-gray-700 border-white/40 backdrop-blur-md hover:bg-white/80 active:bg-white/90'
                          }`}
                        >
                          {st === 'all' ? 'Tümü' : st === 'pending' ? 'Bekliyor' : st === 'confirmed' ? 'Onaylandı' : st === 'completed' ? 'Tamamlandı' : 'İptal'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Clear Filters */}
                  {(historySearch||historyDate||historyStatus!=='all') && (
                    <button 
                      onClick={() => { setHistorySearch(''); setHistoryDate(''); setHistoryStatus('all'); }} 
                      className="w-full px-3 py-2 text-xs text-rose-600 hover:text-rose-700 active:text-rose-800 touch-manipulation min-h-[44px] rounded-xl hover:bg-rose-50 active:bg-rose-100 transition-colors"
                    >
                      🗑️ Filtreleri Temizle
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content - Mobile Optimized Scroll */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3 overscroll-contain">
              {filteredHistory.map((a: any) => (
                <div key={a.id} className="rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow-sm hover:shadow-md transition-all p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="font-medium text-gray-900 truncate mr-2 text-sm sm:text-base">{a.business_name || 'Bilinmiyor'}</div>
                    <span className={`px-2 py-1 rounded-full text-xs shrink-0 ${
                      a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      a.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      a.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'
                    }`}>
                      {a.status === 'pending' ? 'Bekliyor' : 
                       a.status === 'confirmed' ? 'Onaylandı' : 
                       a.status === 'completed' ? 'Tamamlandı' : 
                       a.status === 'cancelled' ? 'İptal Edildi' : a.status}
                    </span>
                  </div>
                  
                  <div className="text-xs sm:text-sm text-gray-600 mb-2" suppressHydrationWarning>
                    {typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(a.appointment_datetime))}
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    <div className="text-xs sm:text-sm text-gray-800 truncate">
                      <span className="font-medium">Hizmet:</span> {a.service_names?.length ? a.service_names.join(', ') : '—'}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-800 truncate">
                      <span className="font-medium">Çalışan:</span> {a.employee_names?.length ? a.employee_names.join(', ') : '—'}
                    </div>
                  </div>
                  
                  {/* Tamamlanan randevular için değerlendirme butonu - sadece değerlendirme yapılmamış olanlar için */}
                  {a.status === 'completed' && !userReviews?.reviews?.some((review: any) => review.appointment_id === a.id) && (
                    <div className="mt-3 pt-3 border-t border-white/40">
                      <button
                        onClick={() => {
                          handleReviewClick(a);
                          setHistoryOpen(false);
                        }}
                        className="w-full px-3 py-3 bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white text-sm font-medium rounded-lg hover:from-rose-700 hover:to-fuchsia-700 active:from-rose-800 active:to-fuchsia-800 transition-all shadow-sm touch-manipulation min-h-[44px]"
                      >
                        ⭐ Değerlendir
                      </button>
                    </div>
                  )}
                  
                  {/* Değerlendirme yapılmış tamamlanan randevular için bilgi */}
                  {a.status === 'completed' && userReviews?.reviews?.some((review: any) => review.appointment_id === a.id) && (
                    <div className="mt-3 pt-3 border-t border-white/40">
                      <div className="flex items-center justify-center gap-2 px-3 py-3 bg-emerald-600 text-white text-sm font-medium rounded-lg">
                        <span>✅ Değerlendirme yapıldı</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredHistory.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-8">
                  <div className="text-4xl mb-2">🔍</div>
                  <div>Kayıt bulunamadı</div>
                </div>
              )}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav, layout üzerinden gelir */}
    </main>
  );
} 