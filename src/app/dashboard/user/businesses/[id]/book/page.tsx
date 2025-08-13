"use client";
import { trpc } from '../../../../../../utils/trpcClient';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { skipToken } from '@tanstack/react-query';

function getDayOfWeek(dateStr: string) {
  return new Date(dateStr).getDay();
}

interface ServiceSelection {
  serviceId: string;
  employeeId: string;
  service: any;
  employee: any;
}

export default function BookAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params?.id as string;
  const { data: session } = useSession();
  const userId = session?.user.id;

  const { data: services, isLoading: loadingServices } = trpc.business.getServices.useQuery({ businessId }, { enabled: !!businessId });
  const { data: employees, isLoading: loadingEmployees } = trpc.business.getEmployees.useQuery({ businessId }, { enabled: !!businessId });
  const bookMutation = trpc.appointment.book.useMutation();

  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Seçili hizmetlerin toplam süresini hesapla
  const totalDuration = useMemo(() => {
    return selectedServices.reduce((total, selection) => {
      const raw = selection.service?.duration_minutes as any;
      const value = typeof raw === 'number' ? raw : parseInt(String(raw ?? '0'), 10);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [selectedServices]);

  // Seçili hizmetlerin toplam fiyatını hesapla
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((total, selection) => {
      const raw = (selection.service as any)?.price;
      const value = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '0').replace(',', '.'));
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [selectedServices]);

  // Hizmet ekleme fonksiyonu
  const addService = () => {
    if (selectedServices.length >= 5) {
      setError('En fazla 5 hizmet seçebilirsiniz.');
      return;
    }
    setSelectedServices([...selectedServices, {
      serviceId: '',
      employeeId: '',
      service: null,
      employee: null
    }]);
    setError('');
  };

  // Hizmet kaldırma fonksiyonu
  const removeService = (index: number) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  // Hizmet seçimi güncelleme
  const updateServiceSelection = (index: number, serviceId: string) => {
    const service = services?.find((s: any) => s.id === serviceId);
    const newSelections = [...selectedServices];
    newSelections[index] = {
      ...newSelections[index],
      serviceId,
      service,
      employeeId: '', // Hizmet değişince çalışanı sıfırla
      employee: null
    };
    setSelectedServices(newSelections);
  };

  // Çalışan seçimi güncelleme
  const updateEmployeeSelection = (index: number, employeeId: string) => {
    const employee = employees?.find((e: any) => e.id === employeeId);
    const newSelections = [...selectedServices];
    newSelections[index] = {
      ...newSelections[index],
      employeeId,
      employee
    };
    setSelectedServices(newSelections);
  };

  // Seçili çalışanların uygunluk saatlerini al
  const allEmployeeIds = selectedServices.map(s => s.employeeId).filter(Boolean);
  const { data: allAvailability } = trpc.business.getEmployeeAvailability.useQuery(
    { employeeId: allEmployeeIds[0] || '' },
    { enabled: !!allEmployeeIds[0] }
  );

  // Meşgul slotları backend'den al (birden fazla çalışan seçimine göre)
  const { data: busySlots } = trpc.appointment.getBusySlotsForEmployees.useQuery(
    {
      employeeIds: allEmployeeIds.length ? allEmployeeIds : ([] as string[]),
      date: date || new Date().toISOString().split('T')[0],
      durationMinutes: totalDuration || 15,
    },
    { enabled: !!date && allEmployeeIds.length > 0 }
  );

  const availableTimes = useMemo(() => {
    if (!allAvailability || !date || allEmployeeIds.length === 0) return [];
    const dayOfWeek = getDayOfWeek(date);
    const daySlots = allAvailability.filter((a: any) => a.day_of_week === dayOfWeek);
    const slots: string[] = [];
    daySlots.forEach((slot: any) => {
      let [h, m] = slot.start_time.split(":").map(Number);
      const [eh, em] = slot.end_time.split(":").map(Number);
      while (h < eh || (h === eh && m < em)) {
        const token = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        // Geçmiş saatleri ve meşgul slotları atla
        const slotDate = new Date(`${date}T${token}:00`);
        const isPast = slotDate.getTime() <= Date.now();
        const isBusy = busySlots?.[token];
        if (!isPast && !isBusy) {
          slots.push(token);
        }
        m += 15;
        if (m >= 60) { h++; m = 0; }
      }
    });
    return slots;
  }, [allAvailability, date, allEmployeeIds, busySlots]);

  // Takvim: önümüzdeki 14 gün için slot butonları
  const nextDays = useMemo(() => {
    const days: { dateStr: string; label: string; weekday: string }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short' });
      const weekday = d.toLocaleDateString('tr-TR', { weekday: 'short' });
      days.push({ dateStr, label, weekday });
    }
    return days;
  }, []);

  const availableWeekdays = useMemo(() => {
    if (!allAvailability) return new Set<number>();
    return new Set(allAvailability.map((a: any) => a.day_of_week));
  }, [allAvailability]);

  // Hizmete göre çalışanları getir
  const { data: employeesByService } = trpc.business.getEmployeesByService.useQuery(
    { serviceId: selectedServices.find(s => s.serviceId)?.serviceId || '' },
    { enabled: !!selectedServices.find(s => s.serviceId)?.serviceId }
  );

  const getEmployeesForService = (serviceId: string) => {
    if (!serviceId) return [];
    // Eğer bu hizmet için özel çalışan listesi varsa onu kullan, yoksa tüm çalışanları göster
    return employeesByService || employees || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validasyon
    if (!userId || selectedServices.length === 0 || !date || !time) {
      setError('Tüm alanları doldurun.');
      return;
    }

    // Tüm hizmetler için çalışan seçilmiş mi kontrol et
    const incompleteSelections = selectedServices.some(s => !s.serviceId || !s.employeeId);
    if (incompleteSelections) {
      setError('Tüm hizmetler için çalışan seçin.');
      return;
    }

    const appointmentDatetime = new Date(`${date}T${time}:00`).toISOString();
    
    try {
      await bookMutation.mutateAsync({
        userId,
        businessId,
        appointmentDatetime,
        services: selectedServices.map(s => ({
          serviceId: s.serviceId,
          employeeId: s.employeeId
        }))
      });
      setSuccess('Randevu başarıyla oluşturuldu!');
      setTimeout(() => router.push(`/dashboard/user`), 1500);
    } catch (err: any) {
      setError(err.message || 'Randevu oluşturulamadı');
    }
  };

  const startDateTime = date && time ? new Date(`${date}T${time}:00`) : null;
  const endDateTime = startDateTime ? new Date(startDateTime.getTime() + totalDuration * 60000) : null;

  return (
    <main className="relative max-w-2xl mx-auto p-4 min-h-screen pb-24 bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">kuado</div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 text-gray-900 shadow-sm hover:shadow-md transition"
          >
            <span className="text-base">←</span>
            <span className="hidden sm:inline text-sm font-medium">Geri</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-white/60 backdrop-blur-md border border-white/40 p-6 md:p-8 rounded-2xl shadow-xl w-full animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">
            Randevu Al
          </h1>
          <div className="text-sm text-gray-700">
            {selectedServices.length > 0 && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-white/40">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                {totalDuration} dk • ₺{totalPrice.toFixed(0)}
              </span>
            )}
          </div>
        </div>

        {/* Hizmet Seçimi */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Hizmetler</h2>
            <button
              type="button"
              onClick={addService}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-semibold shadow hover:shadow-lg active:scale-95 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Hizmet Ekle
            </button>
          </div>

          {selectedServices.map((selection, index) => (
            <div key={index} className="p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-800">Hizmet {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeService(index)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 border border-white/40 text-rose-700 hover:bg-white/90 transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Kaldır
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-gray-700 font-medium">
                  Hizmet
                  <select
                    value={selection.serviceId}
                    onChange={(e) => updateServiceSelection(index, e.target.value)}
                    required
                    className="border border-white/40 bg-white/60 backdrop-blur-md text-gray-900 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-rose-100 transition"
                  >
                    <option value="">Seçiniz</option>
                    {services?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (₺{s.price} • {s.duration_minutes} dk)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-gray-700 font-medium">
                  Çalışan
                  <select
                    value={selection.employeeId}
                    onChange={(e) => updateEmployeeSelection(index, e.target.value)}
                    required
                    disabled={!selection.serviceId}
                    className="border border-white/40 bg-white/60 backdrop-blur-md text-gray-900 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-fuchsia-100 transition disabled:bg-gray-100"
                  >
                    <option value="">Seçiniz</option>
                    {selection.serviceId && getEmployeesForService(selection.serviceId).map((e: any) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {selection.service && (
                <div className="mt-3 p-3 rounded-xl bg-white/60 backdrop-blur-md border border-white/40">
                  <p className="text-sm text-gray-800">
                    <strong>{selection.service.name}</strong> • ₺{selection.service.price || 0} • {selection.service.duration_minutes || 0} dk
                    {selection.employee && ` • ${selection.employee.name}`}
                  </p>
                </div>
              )}
            </div>
          ))}

          {selectedServices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Henüz hizmet seçilmedi. Yukarıdaki butona tıklayarak hizmet ekleyin.
            </div>
          )}
        </div>

        {/* Tarih ve Saat Seçimi */}
        {selectedServices.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Tarih ve Saat</h2>
            
            {/* Tarih slotları (yatay kaydırmalı) */}
            <div className="-mx-4 px-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {nextDays.map((d) => {
                  const enabled = availableWeekdays.has(getDayOfWeek(d.dateStr));
                  const selected = date === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => { if (enabled) { setDate(d.dateStr); setTime(''); } }}
                      className={`shrink-0 px-3 py-2 rounded-xl text-sm transition border ${selected ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white border-transparent shadow' : enabled ? 'bg-white/60 text-gray-800 border-white/40 backdrop-blur-md hover:bg-white/80' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                      aria-pressed={selected}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Saat slotları (chip grid) */}
            {date && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uygun Saatler</span>
                  <button
                    type="button"
                    onClick={() => { if (availableTimes.length) setTime(availableTimes[0]); }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    En Yakın Uygun Saat
                  </button>
                </div>
                {availableTimes.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableTimes.map((t) => {
                      const selected = time === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTime(t)}
                          className={`px-3 py-2 rounded-lg text-sm transition border ${selected ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white border-transparent shadow' : 'bg-white/60 text-gray-800 border-white/40 backdrop-blur-md hover:bg-white/80'}`}
                          aria-pressed={selected}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">Seçilen gün için uygun saat yok.</span>
                )}
              </div>
            )}

            {availableTimes.length === 0 && date && (
              <span className="text-xs text-gray-500">Seçilen gün için uygun saat yok.</span>
            )}
          </div>
        )}

        {/* Özet */}
        {selectedServices.length > 0 && (
          <div className="p-4 md:p-5 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 border border-white/40 text-gray-900">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <span className="font-semibold">Randevu Özeti</span>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">Toplam</div>
                <div className="text-2xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">₺{totalPrice.toFixed(0)}</div>
              </div>
            </div>

            {startDateTime && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="px-3 py-2 rounded-xl bg-white/70 border border-white/40 text-sm text-gray-900" suppressHydrationWarning>
                  <div className="text-[11px] text-gray-600">Başlangıç</div>
                  <div className="font-medium">{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(startDateTime)}</div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/70 border border-white/40 text-sm text-gray-900" suppressHydrationWarning>
                  <div className="text-[11px] text-gray-600">Tahmini Bitiş</div>
                  <div className="font-medium">{typeof window==='undefined' ? '' : endDateTime?.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedServices.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 border border-white/40 text-xs text-gray-800">
                  <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white grid place-items-center">{i+1}</span>
                  <span className="truncate max-w-[10rem]">{s.service?.name || 'Hizmet'}</span>
                  {s.employee?.name && <span className="text-gray-500">• {s.employee.name}</span>}
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-white/40 text-xs text-gray-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                {selectedServices.length} hizmet
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-white/40 text-xs text-gray-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                {totalDuration} dk
              </span>
            </div>
          </div>
        )}

        {error && <div className="text-red-600 text-sm text-center animate-shake">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center animate-fade-in">{success}</div>}

        <button
          type="submit"
          disabled={selectedServices.length === 0}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          Randevu Al
        </button>
      </form>

      <style jsx global>{`
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
      `}</style>
    </main>
  );
} 