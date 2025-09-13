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

interface UserRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string | number;
    appointment_datetime: string;
    employee_id?: string | number;
    business_id: string | number;
    business_name?: string;
    employee_name?: string;
    existingRescheduleRequest?: any; // Mevcut erteleme isteği
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

export default function UserRescheduleModal({ isOpen, onClose, appointment, onRescheduleSubmitted }: UserRescheduleModalProps) {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
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

  // Mevcut erteleme isteklerini getir
  const { data: existingRequests, refetch: refetchExistingRequests } = trpc.reschedule.getPendingRescheduleRequests.useQuery(
    undefined,
    { enabled: isOpen }
  );
  
  // Erteleme isteğini iptal et
  const cancelRescheduleMutation = trpc.reschedule.cancelRescheduleRequest.useMutation({
    onSuccess: () => {
      setToast({
        open: true,
        message: '✅ Erteleme isteğiniz iptal edildi!',
        type: 'success'
      });
      refetchExistingRequests();
      setTimeout(() => {
        onClose();
        onRescheduleSubmitted?.();
      }, 1500);
    },
    onError: (error) => {
      setToast({
        open: true,
        message: `❌ İptal işlemi başarısız: ${error.message}`,
        type: 'error'
      });
    }
  });

  // Çalışan ID'sini al - services array'inden
  const getEmployeeId = () => {
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

  // Çalışan adını al - services array'inden
  const getEmployeeName = () => {
    if (appointment?.employee_name) {
      return appointment.employee_name;
    }
    // Services array'inden çalışan adını al (eğer varsa)
    if (appointment?.services && appointment.services.length > 0) {
      // Şimdilik sadece ID göster, daha sonra çalışan adını çekebiliriz
      return `Çalışan ID: ${appointment.services[0].employee_id}`;
    }
    return 'Belirtilmemiş';
  };

  // Çalışan müsaitlik verilerini al
  const queryEnabled = isOpen && !!targetEmployeeId && !!appointment?.business_id;
  
  console.log('🚀 Availability Query Setup:', {
    targetEmployeeId,
    businessId: appointment?.business_id,
    isOpen,
    queryEnabled,
    queryParams: { employeeId: targetEmployeeId || '' }
  });

  const { data: allAvailability, isLoading: availabilityLoading, error: availabilityError } = trpc.business.getEmployeeAvailability.useQuery(
    { employeeId: targetEmployeeId || '' },
    { 
      enabled: queryEnabled,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );



  // Meşgul slotları al
  const { data: busySlots } = trpc.appointment.getBusySlotsForEmployees.useQuery(
    {
      employeeIds: targetEmployeeId ? [targetEmployeeId] : [],
      date: selectedDate || new Date().toISOString().split('T')[0],
      durationMinutes: 15, // Varsayılan 15 dakika
    },
    { enabled: !!selectedDate && !!targetEmployeeId }
  );

  // Müsait saatleri hesapla
  const availableTimes = useMemo(() => {
    
    if (!allAvailability || !selectedDate || !targetEmployeeId) {
      return [];
    }
    
    const dayOfWeek = getDayOfWeek(selectedDate);
    
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
        // Geçmiş saatleri atla
        const slotDate = new Date(`${selectedDate}T${token}:00`);
        const isPast = slotDate.getTime() <= Date.now();
        if (!isPast) {
          slots.push(token);
        }
        m += 15;
        if (m >= 60) { h++; m = 0; }
      }
    });
    
    return slots;
  }, [allAvailability, selectedDate, targetEmployeeId]);

  // Meşgul slot'ları kontrol etmek için yardımcı fonksiyon
  const isSlotBusy = (timeSlot: string) => {
    // Eğer seçili tarih bugünse, geçmiş saatleri meşgul yap
    if (selectedDate === new Date().toISOString().split('T')[0]) {
      const now = new Date();
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

  // Mevcut erteleme isteğini bul (prop'tan veya query'den)
  const existingRequest = appointment?.existingRescheduleRequest || existingRequests?.find(req => req.appointment_id === appointment?.id);

  // Haftalık tarihleri hesapla
  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
  
  // Mevcut randevu tarihini formatla ve hafta başlangıcını ayarla
  useEffect(() => {
    if (appointment?.appointment_datetime) {
      const date = new Date(appointment.appointment_datetime);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = date.toTimeString().slice(0, 5); // HH:MM
      setSelectedDate(dateStr);
      setSelectedTime(timeStr);
      
      // Randevu tarihini içeren haftayı göster
      const appointmentWeekStart = new Date(date);
      appointmentWeekStart.setDate(date.getDate() - date.getDay());
      setCurrentWeekStart(appointmentWeekStart);
    }
  }, [appointment?.appointment_datetime]);

  const createRescheduleMutation = trpc.reschedule.createRescheduleRequest.useMutation({
    onSuccess: (data) => {
      setToast({
        open: true,
        message: '✅ Erteleme isteğiniz başarıyla gönderildi!',
        type: 'success'
      });
      setTimeout(() => {
        onClose();
        setRequestReason('');
        onRescheduleSubmitted?.();
      }, 1500);
    },
    onError: (error) => {
      // Özel hata mesajları için kullanıcı dostu uyarılar
      if (error.message.includes('zaten bekleyen bir erteleme isteği var')) {
        setToast({
          open: true,
          message: '⚠️ Bu randevu için zaten bekleyen bir erteleme isteğiniz bulunmaktadır. Lütfen mevcut isteğinizin onaylanmasını bekleyin.',
          type: 'warning'
        });
      } else if (error.message.includes('Randevu bulunamadı')) {
        setToast({
          open: true,
          message: '❌ Randevu bulunamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.',
          type: 'error'
        });
      } else if (error.message.includes('Bu randevu erteleyemezsiniz')) {
        setToast({
          open: true,
          message: '❌ Bu randevu erteleyemezsiniz. Lütfen işletme ile iletişime geçin.',
          type: 'error'
        });
      } else {
        setToast({
          open: true,
          message: `❌ Erteleme isteği gönderilirken bir hata oluştu: ${error.message}`,
          type: 'error'
        });
      }
    }
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !appointment?.id) return;

    setIsSubmitting(true);
    setError('');
    try {
      // Tarih ve saati birleştir ve ISO formatına çevir
      const isoDateTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      
      const mutationData = {
        appointmentId: appointment.id.toString(),
        newAppointmentDatetime: isoDateTime,
        requestReason: requestReason || undefined,
      };
      
      await createRescheduleMutation.mutateAsync(mutationData);
    } catch (error) {
      // Silent error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!existingRequest?.id) return;
    
    if (confirm('Erteleme isteğinizi iptal etmek istediğinizden emin misiniz?')) {
      await cancelRescheduleMutation.mutateAsync({ requestId: existingRequest.id });
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-md mx-auto shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Modern Header with Gradient - Mobil Optimized */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 sm:px-6 py-4 sm:py-5 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/20 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-white pr-12 sm:pr-8">📅 Randevu Erteleme</h2>
        </div>
        
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">

          {/* Modern Current Appointment Card - Mobil Optimized */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl sm:rounded-2xl border border-gray-100">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Mevcut Randevu</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-start text-xs sm:text-sm text-gray-600">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">İşletme:</span>
                  <span className="ml-1 break-words">{appointment?.business_name || 'Bilinmiyor'}</span>
                </div>
              </div>
              <div className="flex items-start text-xs sm:text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">Çalışan:</span>
                  <span className="ml-1 break-words">{getEmployeeName()}</span>
                </div>
              </div>
              <div className="flex items-start text-xs sm:text-sm text-gray-600">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">Tarih:</span>
                  <span className="ml-1 break-words">{appointment?.appointment_datetime ? new Date(appointment.appointment_datetime).toLocaleString('tr-TR') : 'Bilinmiyor'}</span>
                </div>
              </div>
            </div>
          </div>

        {/* Mevcut Erteleme İsteği - Geliştirilmiş */}
        {existingRequest && (
          <div className="mb-4 p-4 sm:p-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 text-base sm:text-lg">Bekleyen Erteleme İsteği</h3>
                <p className="text-xs sm:text-sm text-orange-700 mt-0.5">
                  İsteğiniz işletme tarafından onay bekliyor
                </p>
              </div>
              <div className="px-3 py-1 bg-orange-200 rounded-full">
                <span className="text-xs font-medium text-orange-800">Bekliyor</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Mevcut Randevu Bilgisi */}
              <div className="bg-white/70 rounded-xl p-4 border border-orange-100">
                <h4 className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Mevcut Randevu
                </h4>
                <p className="text-sm text-gray-700">
                  {appointment?.appointment_datetime ? new Date(appointment.appointment_datetime).toLocaleString('tr-TR') : 'Bilinmiyor'}
                </p>
              </div>

              {/* Yeni Randevu Bilgisi */}
              <div className="bg-white/70 rounded-xl p-4 border border-orange-100">
                <h4 className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  İstenen Yeni Tarih
                </h4>
                <p className="text-sm text-gray-700">
                  {new Date(existingRequest.new_appointment_datetime).toLocaleString('tr-TR')}
                </p>
              </div>

              {/* Sebep Bilgisi */}
              {existingRequest.request_reason && (
                <div className="bg-white/70 rounded-xl p-4 border border-orange-100">
                  <h4 className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Erteleme Sebebi
                  </h4>
                  <p className="text-sm text-gray-700 break-words">
                    {existingRequest.request_reason}
                  </p>
                </div>
              )}

              {/* Durum Bilgisi */}
              <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium text-orange-800">
                    İşletme onayı bekleniyor. Onaylandığında size bildirim gönderilecek.
                  </p>
                </div>
              </div>
            </div>

            {/* İptal Butonu */}
            <button
              onClick={handleCancelRequest}
              disabled={cancelRescheduleMutation.isPending}
              className="w-full mt-4 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base touch-manipulation min-h-[48px] font-semibold shadow-sm hover:shadow-md"
            >
              {cancelRescheduleMutation.isPending ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  İptal Ediliyor...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  İsteği İptal Et
                </div>
              )}
            </button>
          </div>
        )}

        {/* Yeni Erteleme İsteği Formu - Sadece mevcut istek yoksa göster */}
        {!existingRequest && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Modern Date Picker Section - Mobil Optimized */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-900">Yeni Randevu Tarihi</label>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const newWeekStart = new Date(currentWeekStart);
                      newWeekStart.setDate(currentWeekStart.getDate() - 7);
                      setCurrentWeekStart(newWeekStart);
                    }}
                    className="p-2 sm:p-2 rounded-lg sm:rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newWeekStart = new Date(currentWeekStart);
                      newWeekStart.setDate(currentWeekStart.getDate() + 7);
                      setCurrentWeekStart(newWeekStart);
                    }}
                    className="p-2 sm:p-2 rounded-lg sm:rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            
            {/* Haftalık Tarih Grid - Mobil Optimized */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3">
              {weekDates.map((date, index) => {
                const dateStr = date.toISOString().split('T')[0];
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      if (isPast) {
                        setError('Geçmiş tarih seçemezsiniz. Lütfen bugün veya gelecek bir tarih seçiniz.');
                        return;
                      }
                      setSelectedDate(dateStr);
                      setSelectedTime(''); // Tarih değiştiğinde saati temizle
                      setError('');
                    }}
                    disabled={isPast}
                    className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl text-center transition-all duration-200 min-h-[60px] sm:min-h-[70px] touch-manipulation ${
                      isSelected 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                        : isToday 
                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100' 
                        : isPast
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-medium">{dayNamesShort[index]}</div>
                    <div className="text-sm sm:text-base font-bold mt-1">{date.getDate()}</div>
                    {isToday && (
                      <div className="text-xs mt-1 opacity-75">Bugün</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

            {/* Modern Time Picker Section - Mobil Optimized */}
            {selectedDate && (
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <label className="text-xs sm:text-sm font-semibold text-gray-900">Müsait Saatler</label>
                  </div>
                  {availableTimes.length > 0 && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 sm:px-3 py-1 rounded-full font-medium">
                      {availableTimes.filter(t => !isSlotBusy(t)).length} müsait
                    </span>
                  )}
                </div>
              
              {availableTimes.length > 0 ? (
                <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-2 sm:p-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
                    {availableTimes.map((time) => {
                      const selected = selectedTime === time;
                      const isBusy = isSlotBusy(time);
                      
                      // Geçmiş saat kontrolü
                      const isPastTime = selectedDate === new Date().toISOString().split('T')[0] && 
                        (() => {
                          const now = new Date();
                          const bufferTime = new Date(now.getTime() + 15 * 60000);
                          const bufferTimeStr = bufferTime.getHours().toString().padStart(2, '0') + ':' + bufferTime.getMinutes().toString().padStart(2, '0');
                          return time < bufferTimeStr;
                        })();
                      
                      const isDisabled = isBusy || isPastTime;
                      const isPastSlot = isPastTime && !isBusy; // Sadece geçmiş saat (meşgul değil)
                      
                      return (
                        <button
                          key={time}
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
                              setSelectedTime('');
                            } else {
                              setSelectedTime(time);
                            }
                            setError(''); // Hata mesajını temizle
                          }}
                          className={`px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 border-2 touch-manipulation min-h-[48px] sm:min-h-[56px] ${
                            selected 
                              ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white border-transparent shadow-lg transform scale-105' 
                              : isPastSlot 
                              ? 'bg-orange-50 text-orange-600 border-orange-200 cursor-not-allowed opacity-60' 
                              : isBusy 
                              ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed opacity-50' 
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-95'
                          }`}
                          aria-pressed={selected}
                          disabled={isDisabled}
                          title={
                            isPastSlot ? 'Bu saat geçmiş zamanda' :
                            isBusy ? 'Bu saat dolu' :
                            'Bu saati seç'
                          }
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-xs sm:text-sm">{time}</span>
                            {isPastSlot && (
                              <svg width="6" height="6" viewBox="0 0 24 24" fill="none" className="text-orange-500 mt-0.5 sm:mt-1">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 text-center">
                  <div className="text-xl sm:text-2xl mb-2">📅</div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {selectedDate === new Date().toISOString().split('T')[0] 
                      ? 'Bugün için müsait saat bulunmuyor.' 
                      : 'Seçilen gün için müsait saat bulunmuyor.'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Lütfen başka bir tarih seçiniz.
                  </p>
                </div>
              )}
            </div>
          )}

                {/* Modern Error Message - Mobil Optimized */}
                {error && (
                  <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl">
                    <div className="flex items-start">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 mt-0.5">
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs sm:text-sm text-red-600 font-medium break-words">{error}</p>
                    </div>
                  </div>
                )}

                {/* Modern Reason Section - Mobil Optimized */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <label className="text-xs sm:text-sm font-semibold text-gray-900">Erteleme Sebebi (Opsiyonel)</label>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                    <textarea
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Erteleme sebebinizi belirtin..."
                      className="w-full px-0 py-0 bg-transparent border-0 focus:ring-0 focus:outline-none text-xs sm:text-sm resize-none placeholder-gray-500"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3 pt-3 border-t border-gray-200 gap-2">
                      <p className="text-xs text-gray-500">
                        {requestReason.length}/500 karakter
                      </p>
                      <div className="text-xs text-gray-400">
                        💡 Sebep belirtmek onay sürecini hızlandırabilir
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modern Action Buttons - Mobil Optimized */}
                <div className="flex flex-col gap-2 sm:gap-3 pt-2 sm:pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedDate || !selectedTime}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl sm:rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm sm:text-base shadow-lg disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation min-h-[48px]"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm sm:text-base">Gönderiliyor...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span className="text-sm sm:text-base">Erteleme İsteği Gönder</span>
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full px-4 sm:px-6 py-3 text-gray-600 bg-gray-100 rounded-xl sm:rounded-2xl hover:bg-gray-200 transition-all duration-200 font-medium text-sm sm:text-base touch-manipulation min-h-[48px]"
                  >
                    İptal
                  </button>
                </div>
        </form>
        )}

        {/* Bilgi Kutusu - Mobil Optimized */}
        {!existingRequest && (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="text-blue-500 mt-0.5 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-900 mb-1">
                  Erteleme Süreci
                </p>
                <p className="text-xs text-blue-800 break-words">
                  Erteleme isteğiniz ilgili taraflara bildirilecek ve onay bekleyecektir. 
                  İşletme onayladıktan sonra randevunuz yeni tarihe taşınacaktır.
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Toast Notification */}
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        duration={5000}
      />
    </div>
  );
}
