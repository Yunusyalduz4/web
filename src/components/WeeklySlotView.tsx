"use client";
import { useState, useMemo, useRef, useEffect } from 'react';
import { trpc } from '../utils/trpcClient';
import { skipToken } from '@tanstack/react-query';
import { useSocket } from '../hooks/useSocket';

interface WeeklySlotViewProps {
  businessId: string;
  appointments: any[];
}

export default function WeeklySlotView({ businessId, appointments }: WeeklySlotViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null);
  const [showManualAppointmentModal, setShowManualAppointmentModal] = useState(false);
  const [selectedSlotData, setSelectedSlotData] = useState<{date: string, time: string} | null>(null);

  // Socket.IO hook'u
  const { isConnected, socket } = useSocket();

  // TRPC queries
  const { data: weeklySlots, isLoading: weeklyLoading, refetch: refetchWeeklySlots } = trpc.slots.getWeeklySlots.useQuery(
    businessId ? { businessId, startDate: new Date().toLocaleDateString('en-CA') } : skipToken
  );

  const { data: customDateSlots, refetch: refetchCustomDate } = trpc.slots.getCustomDateSlots.useQuery(
    businessId && customDate ? { businessId, date: customDate } : skipToken
  );

  const { data: services } = trpc.business.getServices.useQuery(
    businessId ? { businessId } : skipToken
  );

  const { data: employees } = trpc.business.getEmployees.useQuery(
    businessId ? { businessId } : skipToken
  );

  // Socket.IO event'lerini dinle ve UI'ı güncelle
  useEffect(() => {
    if (!isConnected || !socket) return;

    // Debouncing için timer
    let refreshTimer: NodeJS.Timeout;

    // Batch update fonksiyonu
    const batchRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        console.log('🔄 Batch refresh yapılıyor...');
        refetchWeeklySlots();
        if (customDate) {
          refetchCustomDate();
        }
        // Parent component'e randevuları yenilemesi için event gönder
        window.dispatchEvent(new CustomEvent('refreshAppointments', { detail: { businessId } }));
      }, 300); // 300ms debounce
    };

    // Randevu durumu güncellendiğinde slot'ları yenile
    const handleAppointmentStatusUpdate = (data: any) => {
      console.log('🔔 Randevu durumu güncellendi:', data);
      if (data.businessId === businessId) {
        batchRefresh();
      }
    };

    // Randevu oluşturulduğunda slot'ları yenile
    const handleAppointmentCreated = (data: any) => {
      console.log('🔔 Yeni randevu oluşturuldu:', data);
      if (data.businessId === businessId) {
        batchRefresh();
      }
    };

    // Event listener'ları ekle
    socket.on('socket:appointment:status_updated', handleAppointmentStatusUpdate);
    socket.on('socket:appointment:created', handleAppointmentCreated);

    return () => {
      // Cleanup
      clearTimeout(refreshTimer);
      socket.off('socket:appointment:status_updated', handleAppointmentStatusUpdate);
      socket.off('socket:appointment:created', handleAppointmentCreated);
    };
  }, [isConnected, socket, businessId, customDate, refetchWeeklySlots, refetchCustomDate]);

  // Randevu durumu değiştiğinde slot'ları yenile
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      // Randevular değiştiğinde slot'ları yenile
      refetchWeeklySlots();
      if (customDate) {
        refetchCustomDate();
      }
    }
  }, [appointments, customDate, refetchWeeklySlots, refetchCustomDate]);

  const createManualAppointment = trpc.appointment.createManualAppointment.useMutation({
    onSuccess: () => {
      setShowManualAppointmentModal(false);
      setSelectedSlotData(null);
      
      // Slot verilerini yenile
      console.log('Randevu oluşturuldu, slot verileri yenileniyor...');
      
      // Weekly slots'ı yenile
      if (weeklySlots) {
        refetchWeeklySlots();
        console.log('Weekly slots yenilendi');
      }
      
      // Özel tarih seçimi varsa onu da yenile
      if (showCustomDate) {
        refetchCustomDate();
        console.log('Custom date slots yenilendi');
      }

      // Parent component'e appointments'ı yenilemesi için event gönder
      window.dispatchEvent(new CustomEvent('refreshAppointments', { detail: { businessId } }));
      console.log('Appointments yenileme event\'i gönderildi');
    },
    onError: (error) => {
      console.error('Manuel randevu oluşturma hatası:', error);
      console.error('Hata detayları:', {
        code: error.data?.code,
        message: error.message,
        data: error.data
      });
      alert(`Randevu oluşturulurken hata oluştu:\n\nKod: ${error.data?.code || 'Bilinmiyor'}\nMesaj: ${error.message}`);
    }
  });

  // Gün tıklama işlemi
  const handleDayClick = (dayData: any) => {
    if (selectedDate === dayData.date) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dayData.date);
      setShowCustomDate(false);
    }
  };

  // Özel tarih seçimi
  const handleCustomDateSelect = async () => {
    if (!customDate) return;
    
    try {
      await refetchCustomDate();
      if (customDateSlots && customDateSlots.slots.length > 0) {
        setShowCustomDate(true);
        setSelectedDate(null);
      }
    } catch (error) {
      console.error('Custom date slots fetch error:', error);
    }
  };

  // Dolu slot'a tıklama işlemi
  const handleBusySlotClick = (slotTime: string, date: string) => {
    const targetAppointment = appointments.find((apt: any) => {
      const aptDate = new Date(apt.appointment_datetime).toLocaleDateString('en-CA');
      const aptTime = new Date(apt.appointment_datetime).toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return aptDate === date && aptTime === slotTime && (apt.status === 'pending' || apt.status === 'confirmed');
    });

    if (targetAppointment) {
      const appointmentCard = document.getElementById(`appointment-${targetAppointment.id}`);
      if (appointmentCard) {
        appointmentCard.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        setHighlightedAppointmentId(targetAppointment.id);
        
        setTimeout(() => {
          setHighlightedAppointmentId(null);
        }, 1500);
      }
    }
  };

  // Boş slot'a tıklama işlemi
  const handleAvailableSlotClick = (slotTime: string, date: string) => {
    setSelectedSlotData({ date, time: slotTime });
    setShowManualAppointmentModal(true);
  };

  // Seçili gün için randevu detaylarını al
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate || !appointments) return [];
    
    return appointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointment_datetime).toLocaleDateString('en-CA');
      return aptDate === selectedDate && (apt.status === 'pending' || apt.status === 'confirmed');
    });
  }, [selectedDate, appointments]);

  // Özel seçilen gün için randevu detaylarını al
  const customDateAppointments = useMemo(() => {
    if (!customDate || !appointments) return [];
    
    return appointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointment_datetime).toLocaleDateString('en-CA');
      return aptDate === customDate && (apt.status === 'pending' || apt.status === 'confirmed');
    });
  }, [customDate, appointments]);

  // Loading state'i optimize et
  const isLoading = weeklyLoading || !weeklySlots;

  if (isLoading) {
    return (
      <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-4 shadow">
        <div className="flex items-center justify-center py-8 text-gray-400 animate-pulse">
          <span className="text-2xl mr-2">⏳</span>
          <span>Slot bilgileri yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!weeklySlots || weeklySlots.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-4 shadow">
        <div className="text-center py-6 text-gray-500">
          <span className="text-2xl mb-2 block">📅</span>
          <span className="text-sm">Slot bilgileri bulunamadı</span>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-4 shadow">
      {/* Başlık ve Özel Tarih Seçimi */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-gray-900">7 Günlük Slot Görünümü</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">15dk aralıklarla</span>
          <button 
            onClick={() => setShowCustomDate(!showCustomDate)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showCustomDate 
                ? 'bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white shadow-md' 
                : 'bg-white/80 text-gray-700 border border-white/50 hover:bg-white/90'
            }`}
          >
            📅 Özel Tarih
          </button>
        </div>
      </div>

      {/* Özel Tarih Seçimi */}
      {showCustomDate && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-800">Özel Tarih Seçimi</span>
            <span className="text-xs text-blue-600">İstediğiniz günü seçin</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 px-3 py-2 rounded-lg border border-blue-300 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={handleCustomDateSelect}
              disabled={!customDate}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Göster
            </button>
            <button
              onClick={() => {
                setShowCustomDate(false);
                setCustomDate('');
              }}
              className="px-3 py-2 rounded-lg bg-white/80 text-gray-700 text-sm border border-gray-300 hover:bg-white/90"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 7 Günlük Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {weeklySlots.map((day: any, index: number) => (
          <button
            key={day.date}
            onClick={() => handleDayClick(day)}
            className={`relative p-2 rounded-lg text-center transition-all ${
              selectedDate === day.date
                ? 'bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white shadow-lg'
                : day.isToday
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white'
                : 'bg-white/80 text-gray-900 hover:bg-white/90'
            }`}
          >
            {/* Gün adı */}
            <div className={`text-[10px] font-bold mb-1 ${
              selectedDate === day.date ? 'text-white' : 'text-gray-600'
            }`}>
              {new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short' })}
            </div>
            
            {/* Gün numarası */}
            <div className={`text-lg font-bold ${
              selectedDate === day.date ? 'text-white' : 'text-gray-900'
            }`}>
              {new Date(day.date).getDate()}
            </div>
            
            {/* Slot özeti */}
            <div className={`text-[9px] mt-1 ${
              selectedDate === day.date ? 'text-white/90' : 'text-gray-500'
            }`}>
              <div className="flex items-center justify-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  day.availableSlots > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></span>
                <span>{day.availableSlots}</span>
              </div>
            </div>

            {/* Bugün işareti */}
            {day.isToday && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-rose-500 to-fuchsia-600 rounded-full border-2 border-white"></div>
            )}
          </button>
        ))}
      </div>

      {/* Seçili Gün Detayları (7 günlük) */}
      {selectedDate && weeklySlots.find(d => d.date === selectedDate)?.slots && (
        <div className="border-t border-white/40 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-gray-900">
              {new Date(selectedDate).toLocaleDateString('tr-TR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <button 
              onClick={() => setSelectedDate(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Slot Detayları */}
          <div className="grid grid-cols-4 gap-1 mb-3">
            {weeklySlots.find(d => d.date === selectedDate)?.slots.map((slot: any, index: number) => (
              <div
                key={index}
                className={`p-2 rounded-lg text-center text-xs font-medium transition-all ${
                  slot.isPast
                    ? 'bg-orange-100 text-orange-600 border border-orange-200'
                    : slot.isBusy
                    ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 hover:scale-105 cursor-pointer'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 hover:scale-105 cursor-pointer'
                }`}
                onClick={
                  slot.isPast 
                    ? undefined 
                    : slot.isBusy 
                    ? () => handleBusySlotClick(slot.time, selectedDate)
                    : () => handleAvailableSlotClick(slot.time, selectedDate)
                }
                title={
                  slot.isPast 
                    ? 'Geçmiş saat' 
                    : slot.isBusy 
                    ? 'Randevu detayını görmek için tıklayın'
                    : 'Manuel randevu oluşturmak için tıklayın'
                }
              >
                <div className="font-bold">{slot.time}</div>
                <div className="text-[10px]">
                  {slot.isPast ? '⏰ Geçmiş' : slot.isBusy ? '🔴 Dolu' : '✅ Müsait'}
                </div>
              </div>
            ))}
          </div>

          {/* O Günkü Randevular */}
          {selectedDayAppointments.length > 0 && (
            <div className="border-t border-white/40 pt-3">
              <div className="text-xs font-bold text-gray-700 mb-2">O Günkü Randevular:</div>
              <div className="space-y-2">
                {selectedDayAppointments.map((apt: any) => (
                  <div 
                    key={apt.id} 
                    id={`appointment-${apt.id}`}
                    className={`bg-white/60 rounded-lg p-2 text-xs transition-all duration-1500 ${
                      highlightedAppointmentId === apt.id 
                        ? 'ring-4 ring-yellow-400 ring-opacity-75 shadow-2xl scale-105 bg-gradient-to-r from-yellow-50 to-orange-50' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">
                        {new Date(apt.appointment_datetime).toLocaleTimeString('tr-TR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {apt.status === 'pending' ? 'Bekliyor' :
                         apt.status === 'confirmed' ? 'Onaylandı' : 'Tamamlandı'}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-700">
                      <div>Müşteri: {apt.user_name || apt.customer_name || '—'}</div>
                      <div>Hizmet: {Array.isArray(apt.service_names) ? apt.service_names.join(', ') : '—'}</div>
                      <div>Çalışan: {Array.isArray(apt.employee_names) ? apt.employee_names.join(', ') : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Özel Seçilen Gün Detayları */}
      {showCustomDate && customDateSlots && (
        <div className="border-t border-white/40 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-gray-900">
              {new Date(customDate).toLocaleDateString('tr-TR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
              <span className="ml-2 text-xs text-blue-600 font-normal">(Özel Seçim)</span>
            </div>
            <button 
              onClick={() => {
                setShowCustomDate(false);
                setCustomDate('');
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Slot Detayları */}
          <div className="grid grid-cols-4 gap-1 mb-3">
            {customDateSlots.slots.map((slot: any, index: number) => (
              <div
                key={index}
                className={`p-2 rounded-lg text-center text-xs font-medium transition-all ${
                  slot.isPast
                    ? 'bg-orange-100 text-orange-600 border border-orange-200'
                    : slot.isBusy
                    ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 hover:scale-105 cursor-pointer'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 hover:scale-105 cursor-pointer'
                }`}
                onClick={
                  slot.isPast 
                    ? undefined 
                    : slot.isBusy 
                    ? () => handleBusySlotClick(slot.time, customDate)
                    : () => handleAvailableSlotClick(slot.time, customDate)
                }
                title={
                  slot.isPast 
                    ? 'Geçmiş saat' 
                    : slot.isBusy 
                    ? 'Randevu detayını görmek için tıklayın'
                    : 'Manuel randevu oluşturmak için tıklayın'
                }
              >
                <div className="font-bold">{slot.time}</div>
                <div className="text-[10px]">
                  {slot.isPast ? '⏰ Geçmiş' : slot.isBusy ? '🔴 Dolu' : '✅ Müsait'}
                </div>
              </div>
            ))}
          </div>

          {/* O Günkü Randevular */}
          {customDateAppointments.length > 0 && (
            <div className="border-t border-white/40 pt-3">
              <div className="text-xs font-bold text-gray-700 mb-2">O Günkü Randevular:</div>
              <div className="space-y-2">
                {customDateAppointments.map((apt: any) => (
                  <div 
                    key={apt.id} 
                    id={`appointment-${apt.id}`}
                    className={`bg-white/60 rounded-lg p-2 text-xs transition-all duration-1500 ${
                      highlightedAppointmentId === apt.id 
                        ? 'ring-4 ring-yellow-400 ring-opacity-75 shadow-2xl scale-105 bg-gradient-to-r from-yellow-50 to-orange-50' 
                        : ''
                    }`}
                  >
                                          <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          {new Date(apt.appointment_datetime).toLocaleTimeString('tr-TR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {apt.status === 'pending' ? 'Bekliyor' :
                         apt.status === 'confirmed' ? 'Onaylandı' : 'Tamamlandı'}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-700">
                      <div>Müşteri: {apt.user_name || apt.customer_name || '—'}</div>
                      <div>Hizmet: {Array.isArray(apt.service_names) ? apt.service_names.join(', ') : '—'}</div>
                      <div>Çalışan: {Array.isArray(apt.employee_names) ? apt.employee_names.join(', ') : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Manuel Randevu Oluşturma Modal'ı */}
    {showManualAppointmentModal && (
      <ManualAppointmentModal
        isOpen={showManualAppointmentModal}
        onClose={() => {
          setShowManualAppointmentModal(false);
          setSelectedSlotData(null);
        }}
        slotData={selectedSlotData}
        businessId={businessId}
        services={services || []}
        employees={employees || []}
        onCreateAppointment={createManualAppointment.mutate}
        isLoading={createManualAppointment.isPending}
      />
    )}
    </>
  );
}

// Manuel Randevu Modal Component'i
function ManualAppointmentModal({ 
  isOpen, 
  onClose, 
  slotData, 
  businessId, 
  services, 
  employees, 
  onCreateAppointment, 
  isLoading 
}: {
  isOpen: boolean;
  onClose: () => void;
  slotData: {date: string, time: string} | null;
  businessId: string;
  services: any[];
  employees: any[];
  onCreateAppointment: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerSurname: '',
    customerPhone: '',
    selectedServices: [] as string[],
    selectedEmployee: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Müşteri adı zorunlu';
    }
    if (!formData.customerSurname.trim()) {
      newErrors.customerSurname = 'Müşteri soyadı zorunlu';
    }
    if (formData.selectedServices.length === 0) {
      newErrors.selectedServices = 'En az bir hizmet seçin';
    }
    if (!formData.selectedEmployee) {
      newErrors.selectedEmployee = 'Çalışan seçin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !slotData) return;

    // Rastgele müşteri ID oluştur
    const customerId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Randevu verisi hazırla
    const appointmentData = {
      businessId,
      customerId,
      customerName: formData.customerName.trim(),
      customerSurname: formData.customerSurname.trim(),
      customerPhone: formData.customerPhone.trim() || undefined,
      appointmentDate: slotData.date,
      appointmentTime: slotData.time,
      serviceIds: formData.selectedServices,
      employeeId: formData.selectedEmployee,
      notes: formData.notes.trim() || undefined
    };

    console.log('Gönderilen veri:', appointmentData);
    onCreateAppointment(appointmentData);
  };

  // Hizmet seçimi toggle
  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  if (!isOpen || !slotData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Manuel Randevu Oluştur</h2>
              <p className="text-sm text-white/90">
                {new Date(slotData.date).toLocaleDateString('tr-TR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} - {slotData.time}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Müşteri Bilgileri */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
              👤 Müşteri Bilgileri
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ad * <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    errors.customerName ? 'border-rose-300 bg-rose-50' : 'border-gray-300 bg-white'
                  } focus:outline-none focus:ring-2 focus:ring-rose-200`}
                  placeholder="Müşteri adı"
                />
                {errors.customerName && (
                  <p className="text-xs text-rose-600 mt-1">{errors.customerName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Soyad * <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerSurname}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerSurname: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    errors.customerSurname ? 'border-rose-300 bg-rose-50' : 'border-gray-300 bg-white'
                  } focus:outline-none focus:ring-2 focus:ring-rose-200`}
                  placeholder="Müşteri soyadı"
                />
                {errors.customerSurname && (
                  <p className="text-xs text-rose-600 mt-1">{errors.customerSurname}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Telefon (Opsiyonel)
              </label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="0555 123 45 67"
              />
            </div>
          </div>

          {/* Hizmet Seçimi */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
              🎯 Hizmet Seçimi <span className="text-rose-500">*</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formData.selectedServices.includes(service.id)
                      ? 'border-rose-500 bg-rose-50 text-rose-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{service.name}</div>
                  <div className="text-xs text-gray-500">{service.duration_minutes} dk</div>
                  <div className="text-xs font-semibold text-gray-600">₺{service.price}</div>
                </button>
              ))}
            </div>
            
            {errors.selectedServices && (
              <p className="text-xs text-rose-600">{errors.selectedServices}</p>
            )}
          </div>

          {/* Çalışan Seçimi */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
              👨‍💼 Çalışan Seçimi <span className="text-rose-500">*</span>
            </h3>
            
            <select
              value={formData.selectedEmployee}
              onChange={(e) => setFormData(prev => ({ ...prev, selectedEmployee: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                errors.selectedEmployee ? 'border-rose-300 bg-rose-50' : 'border-gray-300 bg-white'
              } focus:outline-none focus:ring-2 focus:ring-rose-200`}
            >
              <option value="">Çalışan seçin</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            
            {errors.selectedEmployee && (
              <p className="text-xs text-rose-600">{errors.selectedEmployee}</p>
            )}
          </div>

          {/* Notlar */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
              📝 Notlar (Opsiyonel)
            </h3>
            
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="Randevu hakkında notlar..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white font-medium shadow hover:shadow-md transition-all disabled:opacity-50"
            >
              {isLoading ? 'Oluşturuluyor...' : 'Randevu Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
