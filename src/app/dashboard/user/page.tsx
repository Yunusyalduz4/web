"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { skipToken } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import ReviewModal from '../../../components/ReviewModal';
import UserRescheduleModal from '../../../components/UserRescheduleModal';
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  
  // Ziyaretçi kullanıcı kontrolü
  const isGuest = status === 'unauthenticated' || !session || !userId;
  
  // Hook'ları her zaman çağır (conditional return'den önce)
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
  
  // Memoized values
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
  
  if (isGuest) {
    return (
      <main className="relative max-w-4xl mx-auto p-3 sm:p-4 pb-20 sm:pb-28 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-rose-500 to-fuchsia-500 rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

  const handleRescheduleClick = (appointment: any) => {
    setRescheduleModal({
      isOpen: true,
      appointment: appointment
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
    
    // Sayfayı yenile ve randevu verilerini güncelle
    router.refresh();
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
    <main className="relative max-w-md mx-auto p-3 pb-20 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none truncate">randevuo</div>
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
              style={{
                border: '2px solid transparent',
                background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #3b82f6, #ef4444, #ffffff) border-box',
                borderRadius: '12px'
              }}
            >
              <span className="text-sm sm:text-base">🕓 Geçmiş</span>
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
                  {request.request_reason && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700">
                      <strong>Erteleme Sebebi:</strong> {request.request_reason}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveRescheduleMutation.mutate({ requestId: String(request.id), action: 'approve' })}
                    disabled={approveRescheduleMutation.isPending || rejectRescheduleMutation.isPending}
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-all touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => rejectRescheduleMutation.mutate({ requestId: String(request.id), action: 'reject' })}
                    disabled={approveRescheduleMutation.isPending || rejectRescheduleMutation.isPending}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 active:bg-red-800 transition-all touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Randevu Kartları */}
      <div className="space-y-4">
        {activeAppointments.map((a: any) => (
          <div 
            key={a.id} 
            className="rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow-sm hover:shadow-md transition-all p-3 sm:p-4 relative"
          >
            {/* Degrade Border */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-red-500 to-white rounded-l-2xl"></div>
            
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
                  className="flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800 active:text-amber-900 touch-manipulation min-h-[44px] px-3 py-2 -mx-2 -my-2 rounded-lg hover:bg-amber-50 active:bg-amber-100 transition-colors"
                  onClick={() => handleReviewClick(a)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-600">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Değerlendir
                </button>
              )}
              {a.status === 'confirmed' && (
                <button
                  className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 active:text-blue-900 touch-manipulation min-h-[44px] px-3 py-2 -mx-2 -my-2 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors"
                  onClick={() => handleRescheduleClick(a)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 11v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Ertele
                </button>
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

      {/* User Reschedule Modal */}
      <UserRescheduleModal
        isOpen={rescheduleModal.isOpen}
        onClose={() => setRescheduleModal(prev => ({ ...prev, isOpen: false }))}
        appointment={rescheduleModal.appointment}
        onRescheduleSubmitted={handleRescheduleSubmitted}
      />

      {/* Modern History Modal */}
      {historyOpen && (
        <div className="modal-container">
          <div className="modal-overlay-bg" onClick={() => setHistoryOpen(false)} />
          <div className="modal-wrapper">
            {/* Header */}
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="modal-header-text">
                  <h2 className="modal-header-title">Tüm Randevular</h2>
                  <p className="modal-header-subtitle">Randevu geçmişiniz</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="modal-close-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            {/* Content */}
            <div className="modal-content">
              <div className="modal-content-scroll">
                {/* Filters */}
                <div className="space-y-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                        <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <label className="text-sm font-semibold text-gray-900">Arama</label>
                    </div>
                    <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-4 py-3 bg-white focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-200 transition-all">
                      <input
                        className="w-full outline-none text-sm text-gray-900 bg-transparent placeholder-gray-500"
                        placeholder="İşletme, hizmet, çalışan ara..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Date and Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <label className="text-sm font-semibold text-gray-900">Tarih</label>
                      </div>
                      <input
                        type="date"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                        value={historyDate}
                        onChange={(e) => setHistoryDate(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <label className="text-sm font-semibold text-gray-900">Durum</label>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        {(['all','pending','confirmed','completed','cancelled'] as const).map(st => (
                          <button
                            key={st}
                            onClick={() => setHistoryStatus(st)}
                            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                              historyStatus===st? 
                              'bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white border-transparent shadow-md' :
                              'bg-white text-gray-700 border-gray-200 hover:border-rose-300 hover:bg-rose-50'
                            }`}
                          >
                            {st === 'all' ? 'Tümü' : st === 'pending' ? 'Bekliyor' : st === 'confirmed' ? 'Onaylandı' : st === 'completed' ? 'Tamamlandı' : 'İptal'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Clear Filters */}
                  {(historySearch||historyDate||historyStatus!=='all') && (
                    <button 
                      onClick={() => { setHistorySearch(''); setHistoryDate(''); setHistoryStatus('all'); }} 
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all font-medium"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-rose-600">
                        <path d="M3 6h18M8 12h8M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="18" cy="6" r="3" fill="currentColor"/>
                        <circle cx="6" cy="12" r="3" fill="currentColor"/>
                        <circle cx="18" cy="18" r="3" fill="currentColor"/>
                      </svg>
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
              {filteredHistory.map((a: any) => (
                <div 
                  key={a.id} 
                  className="rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow-sm hover:shadow-md transition-all p-3 sm:p-4 relative"
                >
                  {/* Degrade Border */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-red-500 to-white rounded-l-2xl"></div>
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
                        className="flex items-center justify-center gap-2 w-full px-3 py-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 active:bg-amber-200 transition-all shadow-sm touch-manipulation min-h-[44px]"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-600">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Değerlendir
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