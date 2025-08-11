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
    <main className="max-w-2xl mx-auto p-4 pb-24 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h1 className="text-3xl font-extrabold mb-6 text-center bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none animate-fade-in">
        Merhaba, {profile?.name} 👋
      </h1>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Randevularım</h2>
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-white/70 backdrop-blur border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition"
          onClick={() => setHistoryOpen(true)}
          aria-label="Randevu geçmişini aç"
        >
          <span>🕓</span>
          <span>Geçmiş</span>
        </button>
      </div>
      <div className="space-y-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
            <span className="text-5xl mb-2">⏳</span>
            <span className="text-lg">Randevular yükleniyor...</span>
          </div>
        )}
        {!isLoading && activeAppointments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 animate-fade-in">
            <span className="text-5xl mb-2">📭</span>
            <span className="text-lg">Aktif randevunuz yok.</span>
            <span className="text-sm mt-1">Hemen bir işletmeden randevu alabilirsiniz!</span>
          </div>
        )}
        {activeAppointments.map((a: any) => (
          <div
            key={a.id}
            className="group relative bg-white/90 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200 animate-fade-in"
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                a.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                a.status === 'confirmed' ? 'bg-green-100 text-green-800 border border-green-200' :
                a.status === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {a.status === 'pending' && '⏳ Bekliyor'}
                {a.status === 'confirmed' && '✅ Onaylandı'}
                {a.status === 'cancelled' && '❌ İptal'}
                {a.status === 'completed' && '🎉 Tamamlandı'}
              </span>
            </div>

            {/* Main Content */}
            <div className="p-3">
              {/* Date & Time */}
              <div className="mb-2">
                <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                  <span className="text-sm">📅</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {new Date(a.appointment_datetime).toLocaleDateString('tr-TR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <span className="text-sm">🕐</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {new Date(a.appointment_datetime).toLocaleTimeString('tr-TR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>

              {/* Business, Service & Employee Info - Compact */}
              <div className="grid grid-cols-1 gap-1.5 mb-3">
                <div className="flex items-center gap-2 text-[13px] leading-5">
                  <span className="w-5 h-5 rounded-md bg-indigo-500 text-white grid place-items-center">🏢</span>
                  <span className="font-medium text-gray-900 truncate">{a.business_name || 'Bilinmiyor'}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] leading-5">
                  <span className="w-5 h-5 rounded-md bg-purple-500 text-white grid place-items-center">💇‍♂️</span>
                  <span className="text-gray-800 truncate">{a.service_names?.length ? a.service_names.join(', ') : 'Bilinmiyor'}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] leading-5">
                  <span className="w-5 h-5 rounded-md bg-green-500 text-white grid place-items-center">✂️</span>
                  <span className="text-gray-800 truncate">{a.employee_names?.length ? a.employee_names.join(', ') : 'Bilinmiyor'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {a.status === 'pending' && (
                  <button
                    className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-semibold active:scale-95 transition flex items-center justify-center gap-2"
                    onClick={() => handleCancel(a.id)}
                  >
                    <span>❌</span>
                    İptal Et
                  </button>
                )}
                {a.status === 'confirmed' && (
                  <div className="flex-1 text-center py-2 px-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-200">
                    ✅ Randevunuz onaylandı! Hazır olun.
                  </div>
                )}
                {a.status === 'completed' && (
                  <button
                    className="flex-1 bg-yellow-500 text-white py-2 px-3 rounded-lg text-sm font-semibold active:scale-95 transition flex items-center justify-center gap-2"
                    onClick={() => handleReviewClick(a)}
                  >
                    <span>⭐</span>
                    Değerlendir
                  </button>
                )}
                {a.status === 'cancelled' && (
                  <div className="flex-1 text-center py-2 px-3 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium border border-gray-200">
                    ❌ Randevu iptal edildi.
                  </div>
                )}
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
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

      {/* History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 md:inset-0 md:m-auto md:max-w-2xl md:h-[82vh] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col">
            {/* Grabber */}
            <div className="py-2 flex items-center justify-center">
              <div className="w-12 h-1.5 rounded-full bg-gray-300" />
            </div>
            <div className="px-4 pb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Tüm Randevular</h3>
              <button className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm" onClick={() => setHistoryOpen(false)}>Kapat</button>
            </div>
            {/* Sticky filters */}
            <div className="px-4 pb-3 sticky top-0 bg-white z-10 border-b">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
                  <span className="text-gray-500">🔎</span>
                  <input
                    className="w-full outline-none text-sm"
                    placeholder="Ara: işletme, hizmet, çalışan"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {(['all','pending','confirmed','completed','cancelled'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setHistoryStatus(st)}
                      className={`px-3 py-1.5 rounded-full text-xs border ${historyStatus===st? 'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-300'}`}
                    >
                      {st === 'all' ? 'Tümü' : st === 'pending' ? 'Bekliyor' : st === 'confirmed' ? 'Onaylandı' : st === 'completed' ? 'Tamamlandı' : 'İptal'}
                    </button>
                  ))}
                  {(historySearch||historyDate||historyStatus!=='all') && (
                    <button onClick={() => { setHistorySearch(''); setHistoryDate(''); setHistoryStatus('all'); }} className="ml-auto text-xs text-blue-600">Filtreleri Temizle</button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-3 overflow-auto flex-1 space-y-2">
              {filteredHistory.map((a: any) => (
                <div key={a.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="font-medium text-gray-900 truncate">{a.business_name || 'Bilinmiyor'}</div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      a.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      a.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'
                    }`}>{a.status}</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">{new Date(a.appointment_datetime).toLocaleString('tr-TR')}</div>
                  <div className="text-xs text-gray-800 truncate">Hizmet: {a.service_names?.length ? a.service_names.join(', ') : '—'}</div>
                  <div className="text-xs text-gray-800 truncate">Çalışan: {a.employee_names?.length ? a.employee_names.join(', ') : '—'}</div>
                </div>
              ))}
              {filteredHistory.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-8">Kayıt bulunamadı</div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 