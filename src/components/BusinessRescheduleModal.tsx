"use client";
import { useState, useEffect, useMemo } from 'react';
import { trpc } from '../utils/trpcClient';
import Toast, { ToastType } from './Toast';
import { useSession } from 'next-auth/react';
import { skipToken } from '@tanstack/react-query';

function getDayOfWeek(dateStr: string) {
  return new Date(dateStr).getDay();
}

// Gün adları Türkçe
const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const dayNamesShort = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

// Haftalık tarih aralığını hesapla
function getWeekDates(startDate: Date) {
  const dates = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay()); // Haftanın başını bul
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
}

interface BusinessRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string | number;
    appointment_datetime: string;
    employee_id?: string | number;
    business_id: string | number;
    business_name?: string;
    employee_name?: string;
    is_manual?: boolean;
    user_name?: string; // Guest kontrolü için
    services?: Array<{
      service_id: string;
      service_name: string;
      duration_minutes: number;
      price: number;
      employee_id: string;
    }>;
  } | null;
  onRescheduleSubmitted?: () => void;
}

export default function BusinessRescheduleModal({ isOpen, onClose, appointment, onRescheduleSubmitted }: BusinessRescheduleModalProps) {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  
  // Toast state
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: ToastType;
  }>({
    open: false,
    message: '',
    type: 'info'
  });

  // Çalışanları getir
  const { data: employees } = trpc.business.getEmployees.useQuery(
    appointment?.business_id ? { businessId: appointment.business_id.toString() } : skipToken,
    { enabled: isOpen && !!appointment?.business_id }
  );

  // Business için mevcut erteleme istekleri gerekli değil
  // Bu query sadece user rolü için tasarlanmış

  // Tüm randevular için direkt erteleme (erteleme isteği sistemi kaldırıldı)
  const directRescheduleMutation = trpc.appointment.rescheduleAppointment.useMutation();

  // Çalışan ID'sini al - Business için seçilen çalışanı kullan
  const getEmployeeId = () => {
    if (selectedEmployeeId) {
      return selectedEmployeeId;
    }
    // Eğer çalışan seçilmemişse, mevcut randevunun çalışanını kullan
    if (appointment?.employee_id) {
      return appointment.employee_id.toString();
    }
    // Services array'inden ilk çalışan ID'sini al
    if (appointment?.services && appointment.services.length > 0) {
      return appointment.services[0]?.employee_id?.toString();
    }
    return null;
  };

  const targetEmployeeId = getEmployeeId();

  // Randevu toplam süresi (dakika) - tüm hizmetlerin toplamı
  const totalDurationMinutes = useMemo(() => {
    if (!appointment?.services || appointment.services.length === 0) return 0;
    return appointment.services.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0);
  }, [appointment?.services]);

  // Çalışan müsaitlik verilerini al
  const { data: allAvailability, isLoading: availabilityLoading, error: availabilityError } = trpc.business.getEmployeeAvailability.useQuery(
    targetEmployeeId ? {
      employeeId: targetEmployeeId
    } : skipToken,
    { 
      enabled: !!targetEmployeeId && isOpen,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // Meşgul slotları al
  const { data: busySlots } = trpc.business.getBusySlots.useQuery(
    targetEmployeeId && appointment?.business_id ? {
      employeeId: targetEmployeeId,
      businessId: appointment.business_id.toString(),
      startDate: selectedDate || new Date().toISOString().split('T')[0],
      endDate: selectedDate || new Date().toISOString().split('T')[0]
    } : skipToken,
    { 
      enabled: !!targetEmployeeId && !!appointment?.business_id && !!selectedDate && isOpen,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // Mevcut randevuyu meşgul slotlardan çıkar
  const filteredBusySlots = useMemo(() => {
    if (!busySlots || !appointment) return busySlots;
    return busySlots.filter(slot => slot.appointmentId !== appointment.id.toString());
  }, [busySlots, appointment]);

  // Yardımcı: HH:MM -> dakika
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  // Seçilen tarih için müsait saatleri hesapla (tüm randevu süresini dikkate al)
  const availableTimes = useMemo(() => {
    if (!allAvailability || !selectedDate || !targetEmployeeId) {
      return [];
    }

    const dayOfWeek = getDayOfWeek(selectedDate);
    const daySlots = allAvailability.filter(slot => slot.day_of_week === dayOfWeek);
    
    if (daySlots.length === 0) {
      return [];
    }

    const times = [];
    for (const slot of daySlots) {
      const startTime = slot.start_time;
      const endTime = slot.end_time;
      
      // 15 dakikalık aralıklarla saatler oluştur
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      
      while (start < end) {
        const timeStr = start.toTimeString().slice(0, 5);
        const candidateStartMin = toMinutes(timeStr);
        const candidateEnd = new Date(start.getTime() + Math.max(totalDurationMinutes, 15) * 60000);

        // Müsait slot sınırı: bitiş, slot end'ini aşmamalı (bitiş eşitlik dışı)
        const withinSlot = candidateEnd <= end;

        // Meşgul aralıklarla çakışmamalı (start < busyEnd && end > busyStart)
        const overlapsBusy = filteredBusySlots?.some(busySlot => {
          const busyStartMin = toMinutes(busySlot.startTime);
          const busyEndMin = toMinutes(busySlot.endTime);
          const candidateEndMin = toMinutes(candidateEnd.toTimeString().slice(0, 5));
          return candidateStartMin < busyEndMin && candidateEndMin > busyStartMin;
        });
        
        if (withinSlot && !overlapsBusy) {
          times.push(timeStr);
        }
        
        start.setMinutes(start.getMinutes() + 15);
      }
    }
    
    return times.sort();
  }, [allAvailability, selectedDate, targetEmployeeId, filteredBusySlots, totalDurationMinutes]);

  // Modal açıldığında mevcut randevu tarihini seç
  useEffect(() => {
    if (isOpen && appointment) {
      const appointmentDate = new Date(appointment.appointment_datetime);
      setSelectedDate(appointmentDate.toISOString().split('T')[0]);
      setCurrentWeekStart(appointmentDate);
      
      // Mevcut çalışanı seç
      const currentEmployeeId = appointment.employee_id || 
        (appointment.services && appointment.services[0]?.employee_id);
      if (currentEmployeeId) {
        setSelectedEmployeeId(currentEmployeeId.toString());
      }
    }
  }, [isOpen, appointment]);

  // Çalışan değiştiğinde tarih ve saat seçimini sıfırla
  useEffect(() => {
    if (selectedEmployeeId) {
      setSelectedTime('');
    }
  }, [selectedEmployeeId]);

  // Tarih değiştiğinde saat seçimini sıfırla
  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate]);

  // Hafta navigasyonu
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  const weekDates = getWeekDates(currentWeekStart);

  // Form gönderimi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime || !selectedEmployeeId) {
      setError('Lütfen tarih, saat ve çalışan seçin');
      return;
    }

    // İsteğe bağlı sebep verildiyse minimum uzunluk kontrolü (sunucu min: 10)
    if (requestReason && requestReason.trim().length > 0 && requestReason.trim().length < 10) {
      setError('Lütfen en az 10 karakterlik bir erteleme sebebi yazın veya boş bırakın');
      return;
    }

    if (!appointment) {
      setError('Randevu bilgisi bulunamadı');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const newAppointmentDatetime = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      
      // Tüm randevular için direkt erteleme
      await directRescheduleMutation.mutateAsync({
        appointmentId: appointment.id.toString(),
        newAppointmentDatetime,
        newEmployeeId: selectedEmployeeId
      });

      setToast({
        open: true,
        message: 'Randevu başarıyla ertelendi',
        type: 'success'
      });

      // Formu sıfırla
      setSelectedDate('');
      setSelectedTime('');
      setSelectedEmployeeId('');
      setRequestReason('');
      
      // Modalı kapat
      setTimeout(() => {
        onClose();
        onRescheduleSubmitted?.();
      }, 1500);

    } catch (error: any) {
      console.error('Erteleme hatası:', error);
      setError(error.message || 'Erteleme işlemi sırasında bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden">
        {/* Modern Header with Gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-white pr-8">
            🏢 Randevu Ertelama
          </h2>
        </div>
        
        <div className="p-6 max-h-[80vh] overflow-y-auto">

          {/* Modern Current Appointment Card */}
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-emerald-50 rounded-2xl border border-gray-100">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Mevcut Randevu</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                <span className="font-medium">İşletme:</span>
                <span className="ml-2">{appointment.business_name || 'Bilinmiyor'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <span className="font-medium">Çalışan:</span>
                <span className="ml-2">{appointment.employee_name || 'Belirtilmemiş'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                <span className="font-medium">Tarih:</span>
                <span className="ml-2">{new Date(appointment.appointment_datetime).toLocaleString('tr-TR')}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Modern Employee Selection */}
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <label className="text-sm font-semibold text-gray-900">Yeni Çalışan Seçin</label>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-0 py-0 bg-transparent border-0 focus:ring-0 focus:outline-none text-sm font-medium"
                  required
                >
                  <option value="">Çalışan seçin...</option>
                  {employees?.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modern Date Picker Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <label className="text-sm font-semibold text-gray-900">Yeni Tarih Seçin</label>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => navigateWeek('prev')}
                    className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-gray-700 px-3">
                    {weekDates[0].toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateWeek('next')}
                    className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modern Week Chips - Horizontal Scroll */}
              <div className="-mx-1 mb-4 overflow-x-auto no-scrollbar">
                <div className="px-1 flex items-stretch gap-2 min-w-max">
                  {weekDates.map((date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isSelected = selectedDate === dateStr;
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const isPast = date.getTime() < todayStart.getTime();

                    const base = 'inline-flex flex-col items-center justify-center px-3 py-2 rounded-2xl border-2 transition-colors duration-200 select-none min-w-[84px] min-h-[64px]';
                    const state = isSelected
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow-md'
                      : isToday
                      ? 'bg-white text-emerald-700 border-emerald-300'
                      : isPast
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300';

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => !isPast && setSelectedDate(dateStr)}
                        disabled={isPast}
                        className={`${base} ${state}`}
                        role="button"
                        aria-pressed={isSelected}
                        aria-current={isToday ? 'date' : undefined}
                        title={date.toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long' })}
                      >
                        <span className={`text-[11px] font-semibold ${isSelected ? 'text-white/90' : isToday ? 'text-emerald-700' : 'text-gray-600'}`}>
                          {date.toLocaleDateString('tr-TR', { weekday: 'short' })}
                        </span>
                        <span className={`text-lg leading-none font-extrabold mt-1 ${isSelected ? 'text-white' : 'text-current'}`}>
                          {date.getDate()}
                        </span>
                        {isToday && !isSelected && (
                          <span className="mt-1 text-[10px] text-emerald-600">Bugün</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modern Time Picker Section */}
            {selectedDate && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <label className="text-sm font-semibold text-gray-900">Müsait Saatler</label>
                  {availableTimes.length > 0 && (
                    <span className="ml-auto text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full font-medium">
                      {availableTimes.length} müsait
                    </span>
                  )}
                </div>
                
                {availabilityLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    <p className="text-sm text-gray-500 mt-3">Müsaitlik kontrol ediliyor...</p>
                  </div>
                ) : availabilityError ? (
                  <div className="text-center py-8">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3" role="img" aria-label="Hata">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-500">Müsaitlik bilgisi alınamadı</p>
                  </div>
                ) : availableTimes.length === 0 ? (
                  <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3" role="img" aria-label="Bilgi">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">Bu tarihte müsait saat bulunmuyor</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto">
                    {availableTimes.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 border-2 touch-manipulation min-h-[56px] ${
                          selectedTime === time
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow-lg transform scale-105'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-95'
                        }`}
                        role="button"
                        aria-pressed={selectedTime === time}
                        title={`Saat ${time}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modern Reason Section */}
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <label className="text-sm font-semibold text-gray-900">
                  Not (Opsiyonel)
                </label>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full px-0 py-0 bg-transparent border-0 focus:ring-0 focus:outline-none text-sm resize-none placeholder-gray-500"
                  rows={3}
                  placeholder="Not ekleyin..."
                />
                {requestReason && requestReason.trim().length > 0 && requestReason.trim().length < 10 && (
                  <div className="mt-2 text-xs text-amber-600">En az 10 karakter girin veya boş bırakın.</div>
                )}
              </div>
            </div>

            {/* Modern Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Modern Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !selectedDate ||
                  !selectedTime ||
                  !selectedEmployeeId ||
                  (requestReason.trim().length > 0 && requestReason.trim().length < 10)
                }
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base shadow-lg disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Gönderiliyor...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Randevuyu Ertelama
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full px-6 py-3 text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all duration-200 font-medium text-base"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toast */}
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
