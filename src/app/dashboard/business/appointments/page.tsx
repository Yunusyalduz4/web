"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useMemo, useState } from 'react';
import { skipToken } from '@tanstack/react-query';

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

  const handleStatus = async (id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    setError('');
    setSuccess('');
    try {
      await updateStatus.mutateAsync({ id, status });
      setSuccess('Randevu güncellendi!');
      appointmentsQuery.refetch();
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      setError(err.message || 'Hata oluştu');
    }
  };

  const activeAppointments = useMemo(() => {
    if (!appointments) return [] as any[];
    return appointments.filter((a: any) => a.status === 'pending' || a.status === 'confirmed');
  }, [appointments]);

  const filteredHistory = useMemo(() => {
    if (!appointments) return [] as any[];
    return appointments.filter((a: any) => {
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
        if (!employeeFilters.some((e) => names.includes(e))) return false;
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
  }, [appointments, statusFilter, serviceFilters, employeeFilters, dateFrom, dateTo]);

  return (
    <main className="relative max-w-3xl mx-auto p-4 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">kuado</div>
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
            Aktif randevular
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
        {activeAppointments.map((a: any) => (
          <div
            key={a.id}
            className="group relative bg-white/60 backdrop-blur-md rounded-xl shadow hover:shadow-lg transition overflow-hidden border border-white/40 animate-fade-in"
          >
            {/* Status Badge */}
            <div className="absolute top-2 right-2 z-10">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm ${
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
            <div className="p-4">
              {/* Date & Time */}
              <div className="mb-2">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <span className="text-base">📅</span>
                  <span className="font-semibold text-gray-800 text-sm" suppressHydrationWarning>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(a.appointment_datetime))}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-base">🕐</span>
                  <span className="font-semibold text-gray-800 text-sm" suppressHydrationWarning>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(a.appointment_datetime))}</span>
                </div>
              </div>

              {/* Customer, Service & Employee Info */}
              <div className="grid grid-cols-1 gap-2 mb-3">
                <div className="flex items-center gap-2 p-2 bg-white/60 backdrop-blur-md rounded-lg border border-white/40">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    👤
                  </div>
                  <div>
                    <p className="text-[11px] text-blue-600 font-medium">Müşteri</p>
                    <p className="font-semibold text-gray-800 text-sm">{a.user_name || 'Bilinmiyor'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-white/60 backdrop-blur-md rounded-lg border border-white/40">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    💇‍♂️
                  </div>
                  <div>
                    <p className="text-[11px] text-purple-600 font-medium">Hizmet</p>
                    <p className="font-semibold text-gray-800 text-sm">
                      {a.service_names && a.service_names.length > 0 
                        ? a.service_names.join(', ') 
                        : 'Bilinmiyor'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-white/60 backdrop-blur-md rounded-lg border border-white/40">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    ✂️
                  </div>
                  <div>
                    <p className="text-[11px] text-green-600 font-medium">Çalışan</p>
                    <p className="font-semibold text-gray-800 text-sm">
                      {a.employee_names && a.employee_names.length > 0 
                        ? a.employee_names.join(', ') 
                        : 'Bilinmiyor'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {a.status === 'pending' && (
                  <>
                    <button
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-2.5 px-3 rounded-lg text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow hover:shadow-md flex items-center justify-center gap-2"
                      onClick={() => handleStatus(a.id, 'confirmed')}
                    >
                      <span>✅</span>
                      Onayla
                    </button>
                    <button
                      className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white py-2.5 px-3 rounded-lg text-sm font-semibold hover:from-rose-600 hover:to-rose-700 transition-all duration-200 shadow hover:shadow-md flex items-center justify-center gap-2"
                      onClick={() => handleStatus(a.id, 'cancelled')}
                    >
                      <span>❌</span>
                      İptal Et
                    </button>
                  </>
                )}
                {a.status === 'confirmed' && (
                  <button
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-2.5 px-3 rounded-lg text-sm font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow hover:shadow-md flex items-center justify-center gap-2"
                    onClick={() => handleStatus(a.id, 'completed')}
                  >
                    <span>🎉</span>
                    Tamamlandı
                  </button>
                )}
                {(a.status === 'completed' || a.status === 'cancelled') && (
                  <div className="flex-1 text-center py-2.5 px-3 rounded-lg bg-white/60 backdrop-blur-md border border-white/40 text-gray-700 text-sm font-medium">
                    {a.status === 'completed' ? '✅ Randevu tamamlandı' : '❌ Randevu iptal edildi'}
                  </div>
                )}
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500"></div>
          </div>
        ))}
        {(!appointments || appointments.length === 0) && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 animate-fade-in">
            <span className="text-5xl mb-2">📭</span>
            <span className="text-lg">Henüz randevu yok.</span>
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
                <option value="pending">Bekleyen</option>
                <option value="confirmed">Onaylı</option>
                <option value="completed">Tamamlanan</option>
                <option value="cancelled">İptal</option>
              </select>
              <input type="date" value={dateFrom} onChange={(e)=> setDateFrom(e.target.value)} className="px-2 py-2 rounded-lg bg-white/80 border border-white/50 text-sm text-gray-900" />
              <input type="date" value={dateTo} onChange={(e)=> setDateTo(e.target.value)} className="px-2 py-2 rounded-lg bg-white/80 border border-white/50 text-sm text-gray-900" />
              <button onClick={() => { setServiceFilters([]); setEmployeeFilters([]); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }} className="px-2 py-2 rounded-lg bg-white/80 border border-white/50 text-sm text-gray-900">Sıfırla</button>
            </div>

            {/* History List */}
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {filteredHistory.map((a: any) => (
                <div key={a.id} className="bg-white/60 backdrop-blur-md border border-white/40 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-semibold text-gray-900" suppressHydrationWarning>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(a.appointment_datetime))}</div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : a.status === 'confirmed' ? 'bg-green-100 text-green-800' : a.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{a.status}</span>
                  </div>
                  <div className="text-[12px] text-gray-700">{Array.isArray(a.service_names) ? a.service_names.join(', ') : ''}</div>
                  <div className="text-[12px] text-gray-500">{Array.isArray(a.employee_names) ? a.employee_names.join(', ') : ''}</div>
                </div>
              ))}
              {filteredHistory.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-6">Filtrelere uygun randevu bulunamadı.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 