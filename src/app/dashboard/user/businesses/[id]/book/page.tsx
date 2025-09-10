"use client";
import { trpc } from '../../../../../../utils/trpcClient';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
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
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState('');

  // Tek çalışan varsa otomatik seçim yap
  useEffect(() => {
    if (employees && employees.length === 1 && selectedServices.length > 0) {
      const singleEmployee = employees[0];
      const newSelections = selectedServices.map(selection => ({
        ...selection,
        employeeId: singleEmployee.id,
        employee: singleEmployee
      }));
      setSelectedServices(newSelections);
    }
  }, [employees, selectedServices.length]);

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

  // Hizmet seçim modal'ından seçilen hizmetleri ekle
  const addSelectedServices = () => {
    if (selectedServiceIds.length === 0) return;
    
    const newSelections: ServiceSelection[] = selectedServiceIds.map(serviceId => {
      const service = services?.find((s: any) => s.id === serviceId);
      const newSelection = {
        serviceId,
        employeeId: '',
        service,
        employee: null
      };

      // Eğer tek çalışan varsa, yeni hizmet için de otomatik seç
      if (employees && employees.length === 1) {
        newSelection.employeeId = employees[0].id;
        newSelection.employee = employees[0];
      }

      return newSelection;
    });

    setSelectedServices([...selectedServices, ...newSelections]);
    setSelectedServiceIds([]);
    setShowServiceModal(false);
    setError('');
  };

  // Hizmet kaldırma fonksiyonu
  const removeService = (index: number) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  // Özel tarih seçme fonksiyonu
  const handleCustomDateSelect = () => {
    if (!customDate) return;
    
    const selectedDate = new Date(customDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Geçmiş tarih kontrolü
    if (selectedDate < today) {
      setError('Geçmiş bir tarih seçemezsiniz. Lütfen bugün veya gelecek bir tarih seçin.');
      return;
    }
    
    // 6 ay sonrası kontrolü
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    if (selectedDate > sixMonthsLater) {
      setError('En fazla 6 ay sonrasına kadar randevu alabilirsiniz.');
      return;
    }
    
    setDate(customDate);
    setTime('');
    setShowCustomDatePicker(false);
    setError('');
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
  
  // Tek çalışan varsa, o çalışanın müsaitlik durumunu al
  const singleEmployeeId = employees && employees.length === 1 ? employees[0].id : null;
  const { data: allAvailability } = trpc.business.getEmployeeAvailability.useQuery(
    { employeeId: singleEmployeeId || allEmployeeIds[0] || '' },
    { enabled: !!(singleEmployeeId || allEmployeeIds[0]) }
  );

  // Meşgul slotları backend'den al (birden fazla çalışan seçimine göre)
  const { data: busySlots } = trpc.appointment.getBusySlotsForEmployees.useQuery(
    {
      employeeIds: singleEmployeeId ? [singleEmployeeId] : (allEmployeeIds.length ? allEmployeeIds : []),
      date: date || new Date().toISOString().split('T')[0], // Türkiye saati olarak gönder
      durationMinutes: totalDuration || 15,
    },
    { enabled: !!date && !!(singleEmployeeId || allEmployeeIds.length > 0) }
  );

  const availableTimes = useMemo(() => {
    if (!allAvailability || !date || (!singleEmployeeId && allEmployeeIds.length === 0)) return [];
    
    const dayOfWeek = getDayOfWeek(date);
    const daySlots = allAvailability.filter((a: any) => a.day_of_week === dayOfWeek);
    
    // Eğer o gün için müsaitlik yoksa, boş array döndür
    if (daySlots.length === 0) {
      return [];
    }
    
    const slots: string[] = [];
    daySlots.forEach((slot: any) => {
      let [h, m] = slot.start_time.split(":").map(Number);
      const [eh, em] = slot.end_time.split(":").map(Number);
      while (h < eh || (h === eh && m < em)) {
        const token = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        // Geçmiş saatleri atla, meşgul slotları da dahil et
        const slotDate = new Date(`${date}T${token}:00`);
        const isPast = slotDate.getTime() <= Date.now();
        if (!isPast) {
          slots.push(token);
        }
        m += 15;
        if (m >= 60) { h++; m = 0; }
      }
    });
    return slots;
  }, [allAvailability, date, singleEmployeeId, allEmployeeIds]);

  // Meşgul slot'ları kontrol etmek için yardımcı fonksiyon
  const isSlotBusy = (timeSlot: string) => {
    // Eğer seçili tarih bugünse, geçmiş saatleri meşgul yap
    if (date === new Date().toISOString().split('T')[0]) {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      
      // Geçmiş saatler için 15 dakikalık buffer ekle
      const bufferTime = new Date(now.getTime() + 15 * 60000);
      const bufferTimeStr = bufferTime.getHours().toString().padStart(2, '0') + ':' + bufferTime.getMinutes().toString().padStart(2, '0');
      
      // Eğer slot geçmiş zamandaysa meşgul yap
      if (timeSlot < bufferTimeStr) {
        return true;
      }
    }
    
    // Mevcut meşgul slot kontrolü
    return busySlots?.[timeSlot] || false;
  };

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

    // Seçilen saat meşgul mu kontrol et
    if (isSlotBusy(time)) {
      setError('Seçilen saat dolu. Lütfen başka bir saat seçiniz.');
      return;
    }

    // Çalışan müsaitlik kontrolü
    if (availableTimes.length === 0) {
      setError('Seçilen günde çalışan müsait değil. Lütfen başka bir gün seçiniz.');
      return;
    }

    // Tüm hizmetler için çalışan seçilmiş mi kontrol et
    const incompleteSelections = selectedServices.some(s => !s.serviceId || !s.employeeId);
    if (incompleteSelections) {
      setError('Tüm hizmetler için çalışan seçin.');
      return;
    }

    // Türkiye saatini UTC olarak gönder (backend'de UTC olarak işlenecek)
    const turkeyDateTime = new Date(`${date}T${time}:00`);
    const appointmentDatetime = turkeyDateTime.toISOString();
    
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

  const startDateTime = date && time ? new Date(`${date}T${time}:00`) : null; // Türkiye saati olarak göster
  const endDateTime = startDateTime ? new Date(startDateTime.getTime() + totalDuration * 60000) : null;

  return (
    <main className="relative max-w-2xl mx-auto p-3 sm:p-4 min-h-screen pb-20 sm:pb-24 bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 text-gray-900 shadow-sm hover:shadow-md active:shadow-lg transition touch-manipulation min-h-[44px]"
          >
            <span className="text-base">←</span>
            <span className="hidden xs:inline text-sm font-medium">Geri</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6 bg-white/60 backdrop-blur-md border border-white/40 p-4 sm:p-6 md:p-8 rounded-2xl shadow-xl w-full animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">
            Randevu Al
          </h1>
          <div className="text-xs sm:text-sm text-gray-700">
            {selectedServices.length > 0 && (
              <span className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-white/70 border border-white/40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <span className="hidden xs:inline">{totalDuration} dk • ₺{totalPrice.toFixed(0)}</span>
                <span className="xs:hidden">{totalDuration}dk • ₺{totalPrice.toFixed(0)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Tek Çalışan Bilgisi - Mobile Optimized */}
        {employees && employees.length === 1 && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">⚡</span>
              <span className="text-sm font-medium text-blue-800">
                Bu işletmenin tek çalışanı var: <strong>{employees[0].name}</strong>
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Çalışan seçimi otomatik olarak yapıldı, değiştiremezsiniz.
            </p>
          </div>
        )}

        {/* Modern Hizmet Seçimi - Mobile Optimized */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Hizmetler</h2>
            <button
              type="button"
              onClick={() => setShowServiceModal(true)}
              className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-semibold shadow hover:shadow-lg active:scale-95 transition touch-manipulation min-h-[44px]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span className="hidden xs:inline">Hizmet Seç</span>
              <span className="xs:hidden">Seç</span>
            </button>
          </div>

          {/* Seçili Hizmetler - Mobile Optimized */}
          {selectedServices.length > 0 ? (
            <div className="space-y-3">
              {selectedServices.map((selection, index) => (
                <div key={index} className="group relative p-3 rounded-xl bg-white/80 backdrop-blur-md border border-white/60 shadow-sm hover:shadow-md transition-all duration-200">
                  {/* Hizmet Bilgisi - Mobile Optimized */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white text-xs font-bold grid place-items-center shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{selection.service?.name}</h3>
                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-rose-500">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                              {selection.service?.duration_minutes} dk
                            </span>
                            <span className="flex items-center gap-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-fuchsia-500">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                              ₺{selection.service?.price}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Kaldır Butonu - Mobile Optimized */}
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="opacity-60 hover:opacity-100 active:opacity-100 transition-opacity duration-200 p-2 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200 active:scale-95 touch-manipulation min-h-[44px]"
                      title="Hizmeti kaldır"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* Çalışan Seçimi - Mobile Optimized */}
                  <div className="ml-8">
                    <label className="flex flex-col gap-1 text-gray-700 font-medium">
                      <span className="text-xs text-gray-600">Çalışan Seçin</span>
                      <div className="relative">
                        <select
                          value={selection.employeeId}
                          onChange={(e) => updateEmployeeSelection(index, e.target.value)}
                          required
                          disabled={!selection.serviceId || (employees && employees.length === 1)}
                          className="w-full border border-white/60 bg-white/80 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-100 transition disabled:bg-gray-100 appearance-none cursor-pointer touch-manipulation min-h-[44px]"
                        >
                          <option value="">Çalışan seçiniz</option>
                          {selection.serviceId && getEmployeesForService(selection.serviceId).map((e: any) => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </div>
                      {employees && employees.length === 1 && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Tek çalışan olduğu için otomatik seçildi
                        </span>
                      )}
                    </label>

                    {/* Seçili Çalışan Bilgisi */}
                    {selection.employee && (
                      <div className="mt-2 p-2 rounded-lg bg-gradient-to-r from-fuchsia-50 to-indigo-50 border border-fuchsia-200">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white text-xs font-bold grid place-items-center">
                            {selection.employee.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-fuchsia-900 text-sm">{selection.employee.name}</p>
                            <p className="text-xs text-fuchsia-700">Seçili çalışan</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">Henüz hizmet seçilmedi</p>
              <p className="text-sm">Yukarıdaki butona tıklayarak hizmet seçin</p>
            </div>
          )}
        </div>

        {/* Hizmet Seçim Modal - Mobile Optimized */}
        {showServiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
              {/* Modal Header - Mobile Optimized */}
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Hizmet Seçin</h3>
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition touch-manipulation min-h-[44px]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">İstediğiniz hizmetleri seçin (çoklu seçim yapabilirsiniz)</p>
              </div>

              {/* Modal Body - Mobile Optimized */}
              <div className="p-4 sm:p-6 max-h-96 overflow-y-auto overscroll-contain">
                <div className="space-y-3">
                  {services?.map((service: any) => (
                    <label key={service.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-fuchsia-300 hover:bg-fuchsia-50 active:bg-fuchsia-100 transition cursor-pointer group touch-manipulation min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServiceIds([...selectedServiceIds, service.id]);
                          } else {
                            setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                          }
                        }}
                        className="mt-1 w-4 h-4 text-fuchsia-600 border-gray-300 rounded focus:ring-fuchsia-500"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 group-hover:text-fuchsia-700 transition truncate">{service.name}</h4>
                        <div className="flex items-center gap-2 sm:gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-rose-500">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            {service.duration_minutes} dk
                          </span>
                          <span className="flex items-center gap-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-fuchsia-500">
                              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            ₺{service.price}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Modal Footer - Mobile Optimized */}
              <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 active:bg-gray-200 transition touch-manipulation min-h-[44px]"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={addSelectedServices}
                    disabled={selectedServiceIds.length === 0}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:shadow-xl transition touch-manipulation min-h-[44px]"
                  >
                    {selectedServiceIds.length > 0 ? `${selectedServiceIds.length} Hizmet Ekle` : 'Hizmet Ekle'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Özel Tarih Seçme Modal - Mobile Optimized */}
        {showCustomDatePicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
              {/* Modal Header - Mobile Optimized */}
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Özel Tarih Seçin</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomDatePicker(false);
                      setCustomDate('');
                      setError('');
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition touch-manipulation min-h-[44px]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">İstediğiniz tarihi seçin (bugünden 6 ay sonrasına kadar)</p>
              </div>

              {/* Modal Body - Mobile Optimized */}
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarih Seçin
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-fuchsia-100 focus:border-fuchsia-300 transition touch-manipulation min-h-[44px]"
                    />
                  </div>
                  
                  {customDate && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span className="text-sm font-medium text-blue-800">
                          Seçilen Tarih: {new Date(customDate).toLocaleDateString('tr-TR', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer - Mobile Optimized */}
              <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomDatePicker(false);
                      setCustomDate('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 active:bg-gray-200 transition touch-manipulation min-h-[44px]"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleCustomDateSelect}
                    disabled={!customDate}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:shadow-xl transition touch-manipulation min-h-[44px]"
                  >
                    Tarihi Seç
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tarih ve Saat Seçimi - Mobile Optimized */}
        {selectedServices.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Tarih ve Saat</h2>
            
            {/* Seçilen Tarih Bilgisi */}
            {date && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">📅</span>
                  <span className="text-sm font-medium text-green-800">
                    Seçilen Tarih: <strong>{new Date(date).toLocaleDateString('tr-TR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}</strong>
                  </span>
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {availableTimes.length > 0 ? (
                    <>
                      Bu tarihte <strong>{availableTimes.filter(t => !isSlotBusy(t)).length}</strong> müsait saat bulunuyor.
                    </>
                  ) : (
                    <>
                      Bu tarihte müsait saat bulunmuyor. Lütfen başka bir tarih seçin.
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tek çalışan müsaitlik bilgisi */}
            {employees && employees.length === 1 && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">👤</span>
                  <span className="text-sm font-medium text-blue-800">
                    Çalışan: <strong>{employees[0].name}</strong>
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {availableTimes.length > 0 ? (
                    <>
                      Bu çalışan seçilen tarihte müsait.
                      <span className="ml-1">
                        ({availableTimes.filter(t => !isSlotBusy(t)).length} müsait saat)
                      </span>
                    </>
                  ) : (
                    <>
                      Bu çalışan seçilen tarihte müsait değil.
                      <span className="ml-1 text-orange-600">
                        Lütfen başka bir tarih seçin.
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Tarih Seçimi Header - Mobile Optimized */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Tarih Seçin</h3>
              <button
                type="button"
                onClick={() => setShowCustomDatePicker(true)}
                className="inline-flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-lg bg-white/60 border border-white/40 text-sm text-gray-700 hover:bg-white/80 active:bg-white/90 transition-colors touch-manipulation min-h-[44px]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="hidden xs:inline">Özel Tarih</span>
                <span className="xs:hidden">Özel</span>
              </button>
            </div>

            {/* Tarih slotları (yatay kaydırmalı) - Mobile Optimized */}
            <div className="-mx-3 sm:-mx-4 px-3 sm:px-4">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {nextDays.map((d) => {
                  const enabled = availableWeekdays.has(getDayOfWeek(d.dateStr));
                  const selected = date === d.dateStr;
                  const isToday = d.dateStr === new Date().toISOString().split('T')[0];
                  
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => { if (enabled) { setDate(d.dateStr); setTime(''); } }}
                      className={`shrink-0 px-3 py-2 rounded-xl text-sm transition border relative touch-manipulation min-h-[44px] ${
                        selected 
                          ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white border-transparent shadow' 
                          : enabled 
                            ? 'bg-white/60 text-gray-800 border-white/40 backdrop-blur-md hover:bg-white/80 active:bg-white/90' 
                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      }`}
                      aria-pressed={selected}
                      title={enabled ? `${d.dateStr} - Müsait` : `${d.dateStr} - Müsait değil`}
                    >
                      {d.label}
                      {isToday && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-rose-500 to-fuchsia-600 rounded-full border-2 border-white"></div>
                      )}
                      {!enabled && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                  Müsait değil
                </span>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 bg-gradient-to-r from-rose-500 to-fuchsia-600 rounded-full"></span>
                  Bugün
                </span>
              </div>
            </div>

            {/* Saat slotları (chip grid) - Mobile Optimized */}
            {date && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Uygun Saatler 
                    {availableTimes.length > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({availableTimes.filter(t => !isSlotBusy(t)).length}/{availableTimes.length} müsait)
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => { 
                      if (availableTimes.length) {
                        // Meşgul olmayan ve geçmiş olmayan ilk uygun saati bul
                        const firstAvailable = availableTimes.find(t => !isSlotBusy(t));
                        if (firstAvailable) {
                          setTime(firstAvailable);
                          setError(''); // Hata mesajını temizle
                        } else {
                          setError('Bu gün için uygun saat bulunamadı.');
                        }
                      }
                    }}
                    className="text-sm text-blue-600 hover:underline active:text-blue-800 touch-manipulation min-h-[44px] px-2 py-1"
                  >
                    En Yakın Uygun Saat
                  </button>
                </div>
                {availableTimes.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableTimes.map((t) => {
                      const selected = time === t;
                      const isBusy = isSlotBusy(t);
                      
                      // Geçmiş saat kontrolü
                      const isPastTime = date === new Date().toISOString().split('T')[0] && 
                        (() => {
                          const now = new Date();
                          const bufferTime = new Date(now.getTime() + 15 * 60000);
                          const bufferTimeStr = bufferTime.getHours().toString().padStart(2, '0') + ':' + bufferTime.getMinutes().toString().padStart(2, '0');
                          return t < bufferTimeStr;
                        })();
                      
                      const isDisabled = isBusy || isPastTime;
                      const isPastSlot = isPastTime && !isBusy; // Sadece geçmiş saat (meşgul değil)
                      
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            if (isDisabled) {
                              if (isPastSlot) {
                                setError('Bu saat geçmiş zamanda. Lütfen gelecek bir saat seçiniz.');
                              } else {
                                setError('Bu saat dolu. Lütfen başka bir saat seçiniz.');
                              }
                              return;
                            }
                            // Toggle özelliği: Eğer aynı saat seçiliyse seçimi kaldır
                            if (selected) {
                              setTime('');
                            } else {
                              setTime(t);
                            }
                            setError(''); // Hata mesajını temizle
                          }}
                          className={`px-3 py-2 rounded-lg text-sm transition border touch-manipulation min-h-[44px] ${
                            selected ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white border-transparent shadow' 
                            : isPastSlot ? 'bg-orange-100 text-orange-600 border-orange-200 cursor-not-allowed opacity-70' 
                            : isBusy ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed opacity-60' 
                            : 'bg-white/60 text-gray-800 border-white/40 backdrop-blur-md hover:bg-white/80 active:bg-white/90'
                          }`}
                          aria-pressed={selected}
                          disabled={isDisabled}
                          title={
                            isPastSlot ? 'Bu saat geçmiş zamanda' : 
                            isBusy ? 'Bu saat dolu' : 
                            'Bu saati seç'
                          }
                        >
                          {t}
                          {isPastSlot && (
                            <div className="flex items-center justify-center mt-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-orange-500">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </div>
                          )}
                          {isBusy && !isPastSlot && (
                            <div className="flex items-center justify-center mt-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-red-500">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </div>
                          )}
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

        {/* Özet - Mobile Optimized */}
        {selectedServices.length > 0 && (
          <div className="p-3 sm:p-4 md:p-5 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 border border-white/40 text-gray-900">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <span className="font-semibold text-sm sm:text-base">Randevu Özeti</span>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">Toplam</div>
                <div className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">₺{totalPrice.toFixed(0)}</div>
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
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-semibold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] touch-manipulation min-h-[44px]"
        >
          Randevu Al
        </button>
      </form>

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