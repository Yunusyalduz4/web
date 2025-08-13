"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { skipToken } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import ReviewModal from '../../../components/ReviewModal';

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
  const cancelMutation = trpc.appointment.cancelAppointment.useMutation();
  
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
    router.refresh();
  };

  return (
    <main className="relative max-w-2xl mx-auto p-4 pb-28 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">kuado</div>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/70 text-gray-900 border border-white/40 shadow-sm transition"
              aria-label="Randevu geçmişini aç"
            >
              <span className="text-base">🕓</span>
              <span className="text-sm font-medium">Geçmiş</span>
            </button>
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-extrabold mt-4 mb-6 text-center bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none animate-soft-in">
        Merhaba, {profile?.name} 👋
      </h1>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Randevularım</h2>
      
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
            className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow p-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{a.business_name || 'Bilinmiyor'}</div>
                <div className="text-[12px] text-gray-600 flex items-center gap-1" suppressHydrationWarning>
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

            {/* Details */}
            <div className="space-y-1.5 mb-2">
              <div className="text-[13px] text-gray-800 truncate">Hizmet: {a.service_names?.length ? a.service_names.join(', ') : '—'}</div>
              <div className="text-[13px] text-gray-800 truncate">Çalışan: {a.employee_names?.length ? a.employee_names.join(', ') : '—'}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-6">
              {a.status === 'pending' && (
                <button
                  className="text-[13px] font-medium text-rose-700"
                  onClick={() => handleCancel(a.id)}
                >
                  İptal Et
                </button>
              )}
              {a.status === 'completed' && (
                <button
                  className="text-[13px] font-medium text-gray-900"
                  onClick={() => handleReviewClick(a)}
                >
                  Değerlendir
                </button>
              )}
              {a.status === 'confirmed' && (
                <div className="text-[13px] text-green-700">Onaylandı</div>
              )}
              {a.status === 'cancelled' && (
                <div className="text-[13px] text-gray-600">İptal edildi</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        :root { --kuado-radius: 16px; --kuado-shadow: 0 8px 24px -12px rgba(0,0,0,0.25); }
        html, body { font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
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

      {/* History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />

          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full md:max-w-2xl h-[85vh] md:h-[80vh] bg-white/70 backdrop-blur-md rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-white/40">
              <div className="py-2 flex items-center justify-center">
                <div className="w-12 h-1.5 rounded-full bg-gray-300" />
              </div>
              <div className="px-4 pb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Tüm Randevular</h3>
                <button className="px-3 py-1.5 rounded-xl bg-white/60 border border-white/40 hover:bg-white/80 text-sm" onClick={() => setHistoryOpen(false)}>Kapat</button>
              </div>

              {/* Filters */}
              <div className="px-4 pb-3 border-t border-white/40">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 border border-white/40 rounded-xl px-3 py-2 bg-white/60 backdrop-blur-md">
                    <span className="text-gray-900">🔎</span>
                    <input
                      className="w-full outline-none text-sm text-gray-900 bg-transparent"
                      placeholder="Ara: işletme, hizmet, çalışan"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                    />
                  </div>
                  <input
                    type="date"
                    className="w-full border border-white/40 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white/60 backdrop-blur-md"
                    value={historyDate}
                    onChange={(e) => setHistoryDate(e.target.value)}
                  />
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {(['all','pending','confirmed','completed','cancelled'] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => setHistoryStatus(st)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition ${historyStatus===st? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white border-transparent shadow':'bg-white/60 text-gray-700 border-white/40 backdrop-blur-md'}`}
                      >
                        {st === 'all' ? 'Tümü' : st === 'pending' ? 'Bekliyor' : st === 'confirmed' ? 'Onaylandı' : st === 'completed' ? 'Tamamlandı' : 'İptal'}
                      </button>
                    ))}
                    {(historySearch||historyDate||historyStatus!=='all') && (
                      <button onClick={() => { setHistorySearch(''); setHistoryDate(''); setHistoryStatus('all'); }} className="ml-auto text-xs text-rose-600">Temizle</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
              {filteredHistory.map((a: any) => (
                <div key={a.id} className="rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow p-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="font-medium text-gray-900 truncate mr-2">{a.business_name || 'Bilinmiyor'}</div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      a.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      a.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'
                    }`}>{a.status}</span>
                  </div>
                   <div className="text-xs text-gray-600 mb-1" suppressHydrationWarning>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(a.appointment_datetime))}</div>
                  <div className="text-xs text-gray-800 truncate">Hizmet: {a.service_names?.length ? a.service_names.join(', ') : '—'}</div>
                  <div className="text-xs text-gray-800 truncate">Çalışan: {a.employee_names?.length ? a.employee_names.join(', ') : '—'}</div>
                </div>
              ))}
              {filteredHistory.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-8">Kayıt bulunamadı</div>
              )}
              <div className="h-2" />
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav, layout üzerinden gelir */}
    </main>
  );
} 