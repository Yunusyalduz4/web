"use client";
import { useState, useMemo, useRef, useEffect } from 'react';
import { trpc } from '../utils/trpcClient';
import { skipToken } from '@tanstack/react-query';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useSocket } from '../hooks/useSocket';
import { useSession } from 'next-auth/react';

interface WeeklySlotViewProps {
  businessId: string;
  appointments: any[];
  selectedEmployeeId?: string | null;
  onEmployeeChange?: (employeeId: string | null) => void;
}

export default function WeeklySlotView({ businessId, appointments, selectedEmployeeId, onEmployeeChange }: WeeklySlotViewProps) {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null);
  const [showManualAppointmentModal, setShowManualAppointmentModal] = useState(false);
  const [selectedSlotData, setSelectedSlotData] = useState<{date: string, time: string} | null>(null);
  const [localSelectedEmployeeId, setLocalSelectedEmployeeId] = useState<string | null>(selectedEmployeeId || null);

  // Socket.IO hook'u
  const { isConnected, socket } = useSocket();

  // Employee ise sadece kendi ID'sini kullan
  const isEmployee = session?.user?.role === 'employee';
  const currentEmployeeId = isEmployee ? session?.user?.employeeId : selectedEmployeeId;

  // Employee ise otomatik olarak kendi ID'sini seç
  useEffect(() => {
    if (isEmployee && currentEmployeeId) {
      setLocalSelectedEmployeeId(currentEmployeeId);
    }
  }, [isEmployee, currentEmployeeId]);

  // TRPC queries
  const { data: weeklySlots, isLoading: weeklyLoading, refetch: refetchWeeklySlots } = trpc.slots.getWeeklySlots.useQuery(
    businessId ? { 
      businessId, 
      startDate: new Date().toLocaleDateString('en-CA'),
      selectedEmployeeId: localSelectedEmployeeId || undefined
    } : skipToken
  );

  const { data: customDateSlots, refetch: refetchCustomDate } = trpc.slots.getCustomDateSlots.useQuery(
    businessId && customDate ? { 
      businessId, 
      date: customDate,
      selectedEmployeeId: localSelectedEmployeeId || undefined
    } : skipToken
  );

  const { data: services } = trpc.business.getServices.useQuery(
    businessId ? { businessId } : skipToken
  );

  const { data: employees } = trpc.business.getEmployees.useQuery(
    businessId ? { businessId } : skipToken
  );

  // Employee ise sadece kendi bilgilerini filtrele
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (isEmployee && currentEmployeeId) {
      return employees.filter((emp: any) => emp.id === currentEmployeeId);
    }
    return employees;
  }, [employees, isEmployee, currentEmployeeId]);

  // Business owner ise ilk çalışanı otomatik seç
  useEffect(() => {
    if (!isEmployee && filteredEmployees && filteredEmployees.length > 0 && !localSelectedEmployeeId) {
      setLocalSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [isEmployee, filteredEmployees, localSelectedEmployeeId]);

  // Çalışan değişikliğini handle et
  const handleEmployeeChange = (employeeId: string | null) => {
    setLocalSelectedEmployeeId(employeeId);
    if (onEmployeeChange) {
      onEmployeeChange(employeeId);
    }
  };

  // Socket.IO event'lerini dinle ve UI'ı güncelle
  useEffect(() => {
    if (!isConnected || !socket) return;

    // Debouncing için timer
    let refreshTimer: NodeJS.Timeout;

    // Batch update fonksiyonu
    const batchRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
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
      if (data.businessId === businessId) {
        batchRefresh();
      }
    };

    // Randevu oluşturulduğunda slot'ları yenile
    const handleAppointmentCreated = (data: any) => {
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
      
      // Weekly slots'ı yenile
      if (weeklySlots) {
        refetchWeeklySlots();
      }
      
      // Özel tarih seçimi varsa onu da yenile
      if (showCustomDate) {
        refetchCustomDate();
      }

      // Parent component'e appointments'ı yenilemesi için event gönder
      window.dispatchEvent(new CustomEvent('refreshAppointments', { detail: { businessId } }));
    },
    onError: (error) => {
      // Manuel randevu oluşturma hatası
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
      // Custom date slots fetch error
    }
  };

  // Dolu slot'a tıklama işlemi
  const handleBusySlotClick = (slotTime: string, date: string) => {
    // Seçilen slot'un Date nesnesini oluştur
    const slotStart = new Date(`${date}T${slotTime}:00`);

    // İlgili randevuyu zaman aralığına göre bul (start <= slot < end)
    let bestMatch: any | null = null;
    let bestMatchStartTime: number = -Infinity;

    for (const apt of appointments) {
      // Sadece aktif randevular (pending, confirmed, completed)
      if (!(apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'completed')) continue;

      // Tarih eşleşmesi
      const aptStart = new Date(apt.appointment_datetime);
      const aptDateStr = aptStart.toLocaleDateString('en-CA');
      if (aptDateStr !== date) continue;

      // Seçili çalışana göre filtrele (varsa)
      if (localSelectedEmployeeId) {
        let involvesSelectedEmployee = false;
        if (Array.isArray(apt.services)) {
          involvesSelectedEmployee = apt.services.some((s: any) => s.employee_id === localSelectedEmployeeId);
        } else if (Array.isArray(apt.employee_ids)) {
          involvesSelectedEmployee = apt.employee_ids.includes(localSelectedEmployeeId);
        } else if (Array.isArray(apt.employee_names)) {
          // İsimden eşleşme gerekirse, atla (ID yoksa emin olmak zor)
          involvesSelectedEmployee = true;
        }
        if (!involvesSelectedEmployee) continue;
      }

      // Süre hesapla (services > durations > fallback)
      let totalMinutes = 0;
      if (Array.isArray(apt.services) && apt.services.length > 0) {
        totalMinutes = apt.services.reduce((sum: number, s: any) => sum + (Number(s.duration_minutes) || 0), 0);
      } else if (Array.isArray(apt.durations) && apt.durations.length > 0) {
        totalMinutes = apt.durations.reduce((sum: number, d: any) => sum + Number(d || 0), 0);
      } else {
        // Varsayılan küçük bir süre; bulunamazsa yalnızca başlangıca eşitle
        totalMinutes = 0;
      }

      const aptEnd = new Date(aptStart.getTime() + totalMinutes * 60000);

      const isInRange = totalMinutes > 0
        ? (slotStart >= aptStart && slotStart < aptEnd)
        : (slotStart.getHours() === aptStart.getHours() && slotStart.getMinutes() === aptStart.getMinutes());

      if (isInRange) {
        // Aynı slota birden fazla randevu düşerse, en geç başlayan ama slotStart'tan önce olanı seç
        const startMs = aptStart.getTime();
        if (startMs <= slotStart.getTime() && startMs > bestMatchStartTime) {
          bestMatch = apt;
          bestMatchStartTime = startMs;
        }
      }
    }

    const targetAppointment = bestMatch;

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

  // Randevu kartına tıklama işlemi
  const handleAppointmentClick = (appointmentId: string) => {
    setHighlightedAppointmentId(appointmentId);
    // 3 saniye sonra highlight'ı kaldır
    setTimeout(() => {
      setHighlightedAppointmentId(null);
    }, 3000);
  };

  // Seçili gün için randevu detaylarını al
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate || !appointments) return [];
    
    return appointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointment_datetime).toLocaleDateString('en-CA');
      const matchesDate = aptDate === selectedDate;
      
      // Çalışan filtresi
      let matchesEmployee = true;
      if (localSelectedEmployeeId) {
        // Services array'i varsa kontrol et
        if (apt.services && Array.isArray(apt.services)) {
          matchesEmployee = apt.services.some((service: any) => 
            service.employee_id === localSelectedEmployeeId
          );
        } else {
          // Services array'i yoksa employee_names array'ini kontrol et
          matchesEmployee = apt.employee_names?.some((name: any) => 
            apt.employee_ids?.includes(localSelectedEmployeeId)
          ) || false;
        }
      }
      
      return matchesDate && matchesEmployee;
    });
  }, [selectedDate, appointments, localSelectedEmployeeId]);

  // Özel seçilen gün için randevu detaylarını al
  const customDateAppointments = useMemo(() => {
    if (!customDate || !appointments) return [];
    
    return appointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointment_datetime).toLocaleDateString('en-CA');
      const matchesDate = aptDate === customDate;
      const matchesStatus = apt.status === 'pending' || apt.status === 'confirmed';
      
      // Çalışan filtresi
      let matchesEmployee = true;
      if (localSelectedEmployeeId) {
        matchesEmployee = apt.services?.some((service: any) => 
          service.employee_id === localSelectedEmployeeId
        ) || false;
      }
      
      return matchesDate && matchesStatus && matchesEmployee;
    });
  }, [customDate, appointments, localSelectedEmployeeId]);

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
    <div 
      className="bg-white/60 backdrop-blur-md border-2 rounded-2xl p-4 shadow" 
      style={{
        borderImage: 'linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) 1',
        border: '2px solid transparent',
        background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box'
      }}
    >
      {/* Başlık ve Özel Tarih Seçimi */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-gray-900">7 Günlük Slot Görünümü</div>
        <div className="flex items-center gap-2">
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

      {/* Çalışan Seçici - Sadece business owner için */}
      {!isEmployee && filteredEmployees && filteredEmployees.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-700">Çalışan seçin:</span>
            {filteredEmployees.map((employee: any) => (
              <button
                key={employee.id}
                onClick={() => handleEmployeeChange(employee.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  localSelectedEmployeeId === employee.id
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                    : 'bg-white/80 text-gray-700 border border-white/50 hover:bg-white/90'
                }`}
              >
                {employee.name}
              </button>
            ))}
          </div>
          {localSelectedEmployeeId && (
            <div className="text-xs text-gray-600">
              Sadece <strong>{filteredEmployees.find((e: any) => e.id === localSelectedEmployeeId)?.name}</strong> çalışanının randevuları gösteriliyor
            </div>
          )}
        </div>
      )}

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
            className={`relative p-2 rounded-lg text-center transition-all border-2 ${
              selectedDate === day.date
                ? 'bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white shadow-lg'
                : day.isToday
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white'
                : 'bg-white/80 text-gray-900 hover:bg-white/90'
            }`}
            style={{
              borderImage: 'linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) 1',
              border: '2px solid transparent',
              background: selectedDate === day.date 
                ? 'linear-gradient(135deg, #f43f5e, #d946ef)'
                : day.isToday
                ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                : 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box'
            }}
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
                    : slot.status === 'busy'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 hover:scale-105 cursor-pointer'
                    : slot.status === 'half-busy'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200 hover:scale-105 cursor-pointer'
                    : slot.status === 'unavailable'
                    ? 'bg-gray-100 text-gray-500 border border-gray-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 hover:scale-105 cursor-pointer'
                }`}
                onClick={
                  slot.isPast 
                    ? undefined 
                    : slot.status === 'busy'
                    ? () => handleBusySlotClick(slot.time, selectedDate)
                    : slot.status === 'half-busy' || slot.status === 'available'
                    ? () => handleAvailableSlotClick(slot.time, selectedDate)
                    : undefined
                }
                title={
                  slot.isPast 
                    ? 'Geçmiş saat' 
                    : slot.status === 'busy'
                    ? 'Randevu detayını görmek için tıklayın'
                    : slot.status === 'half-busy'
                    ? `Yarı dolu (${slot.capacity?.busy || 0}/${slot.capacity?.available || 0}) - Manuel randevu oluşturmak için tıklayın`
                    : slot.status === 'unavailable'
                    ? 'Müsaitlik bilgisi yok'
                    : 'Manuel randevu oluşturmak için tıklayın'
                }
              >
                <div className="font-bold">{slot.time}</div>
                <div className="text-[10px]">
                  {slot.isPast 
                    ? '⏰ Geçmiş' 
                    : slot.status === 'busy' 
                    ? '🔴 Dolu' 
                    : slot.status === 'half-busy'
                    ? '🟡 Yarı Dolu'
                    : slot.status === 'unavailable'
                    ? '⚪ Müsait Değil'
                    : '✅ Müsait'
                  }
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
                    className={`bg-white/60 rounded-lg p-2 text-xs transition-all duration-1500 border-2 ${
                      highlightedAppointmentId === apt.id 
                        ? 'ring-4 ring-yellow-400 ring-opacity-75 shadow-2xl scale-105 bg-gradient-to-r from-yellow-50 to-orange-50' 
                        : ''
                    }`}
                    style={{
                      borderImage: 'linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) 1',
                      border: '2px solid transparent',
                      background: highlightedAppointmentId === apt.id 
                        ? 'linear-gradient(135deg, #fef3c7, #fed7aa)'
                        : 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box'
                    }}
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
                      <div>Müşteri: {apt.user_name || 'Müşteri'}</div>
                      <div>Telefon: {apt.user_phone || apt.customer_phone || apt.phone || '—'}</div>
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
                    : slot.status === 'busy'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 hover:scale-105 cursor-pointer'
                    : slot.status === 'half-busy'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200 hover:scale-105 cursor-pointer'
                    : slot.status === 'unavailable'
                    ? 'bg-gray-100 text-gray-500 border border-gray-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 hover:scale-105 cursor-pointer'
                }`}
                onClick={
                  slot.isPast 
                    ? undefined 
                    : slot.status === 'busy'
                    ? () => handleBusySlotClick(slot.time, customDate)
                    : slot.status === 'half-busy' || slot.status === 'available'
                    ? () => handleAvailableSlotClick(slot.time, customDate)
                    : undefined
                }
                title={
                  slot.isPast 
                    ? 'Geçmiş saat' 
                    : slot.status === 'busy'
                    ? 'Randevu detayını görmek için tıklayın'
                    : slot.status === 'half-busy'
                    ? `Yarı dolu (${slot.capacity?.busy || 0}/${slot.capacity?.available || 0}) - Manuel randevu oluşturmak için tıklayın`
                    : slot.status === 'unavailable'
                    ? 'Müsaitlik bilgisi yok'
                    : 'Manuel randevu oluşturmak için tıklayın'
                }
              >
                <div className="font-bold">{slot.time}</div>
                <div className="text-[10px]">
                  {slot.isPast 
                    ? '⏰ Geçmiş' 
                    : slot.status === 'busy' 
                    ? '🔴 Dolu' 
                    : slot.status === 'half-busy'
                    ? '🟡 Yarı Dolu'
                    : slot.status === 'unavailable'
                    ? '⚪ Müsait Değil'
                    : '✅ Müsait'
                  }
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
                    onClick={() => handleAppointmentClick(apt.id)}
                    className={`bg-white/60 rounded-lg p-2 text-xs transition-all duration-1500 cursor-pointer hover:bg-white/80 hover:shadow-md border-2 ${
                      highlightedAppointmentId === apt.id 
                        ? 'ring-4 ring-yellow-400 ring-opacity-75 shadow-2xl scale-105 bg-gradient-to-r from-yellow-50 to-orange-50' 
                        : ''
                    }`}
                    style={{
                      borderImage: 'linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) 1',
                      border: '2px solid transparent',
                      background: highlightedAppointmentId === apt.id 
                        ? 'linear-gradient(135deg, #fef3c7, #fed7aa)'
                        : 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box'
                    }}
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
                      <div>Müşteri: {apt.user_name || 'Müşteri'}</div>
                      <div>Telefon: {apt.user_phone || apt.customer_phone || apt.phone || '—'}</div>
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
        employees={filteredEmployees || []}
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
    customerFullName: '',
    customerPhone: '',
    selectedServices: [] as string[],
    selectedEmployee: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Rehberden kişi seçimi için Web API
  const handleContactPicker = async () => {
    try {
      // HTTPS kontrolü
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert('Rehber erişimi için HTTPS gerekli. Lütfen telefon numarasını manuel olarak girin.');
        return;
      }

      // Contact Picker API desteği kontrolü
      if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
        const contacts = await (navigator as any).contacts.select(['name', 'tel']);
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          const name = contact.name?.[0] || '';
          const phone = contact.tel?.[0] || '';
          
          setFormData(prev => ({
            ...prev,
            customerFullName: name,
            customerPhone: phone
          }));
        }
      } else {
        // Tarayıcı desteği yok
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const isEdge = /Edg/.test(navigator.userAgent);
        
        if (!isChrome && !isEdge) {
          alert('Rehber erişimi sadece Chrome ve Edge tarayıcılarında desteklenir. Telefon numarasını manuel olarak girin.');
        } else {
          alert('Rehber API desteklenmiyor. Telefon numarasını manuel olarak girin.');
        }
      }
    } catch (error: any) {
      console.log('Contact picker error:', error);
      if (error.name === 'NotAllowedError') {
        alert('Rehber erişimi reddedildi. Lütfen izin verin veya telefon numarasını manuel olarak girin.');
      } else {
        alert('Rehber erişimi sırasında hata oluştu. Telefon numarasını manuel olarak girin.');
      }
    }
  };

  // O gün o saatte müsait olan çalışanları filtrele
  const availableEmployees = useMemo(() => {
    if (!employees || !slotData) return [];
    
    const selectedDate = new Date(slotData.date + 'T00:00:00');
    const dayOfWeek = selectedDate.getDay();
    const selectedTime = slotData.time;
    
    return employees.filter((employee: any) => {
      // Çalışanın o gün müsaitlik bilgisi var mı kontrol et
      const availability = employee.availability || [];
      const dayAvailability = availability.find((avail: any) => avail.day_of_week === dayOfWeek);
      
      if (!dayAvailability) return false;
      
      // Seçilen saat müsaitlik aralığında mı kontrol et
      const [startHour, startMin] = dayAvailability.start_time.split(':').map(Number);
      const [endHour, endMin] = dayAvailability.end_time.split(':').map(Number);
      const [selectedHour, selectedMin] = selectedTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const selectedMinutes = selectedHour * 60 + selectedMin;
      
      return selectedMinutes >= startMinutes && selectedMinutes < endMinutes;
    });
  }, [employees, slotData]);

  // Seçili çalışanın verebileceği hizmetleri filtrele
  const availableServices = useMemo(() => {
    
    if (!services || !formData.selectedEmployee) return services;
    
    const selectedEmployee = employees.find((emp: any) => emp.id === formData.selectedEmployee);
    
    if (!selectedEmployee || !selectedEmployee.services) return [];
    
    // Çalışanın verebileceği hizmet ID'lerini al
    const employeeServiceIds = selectedEmployee.services.map((service: any) => service.id);
    
    // Sadece çalışanın verebileceği hizmetleri döndür
    const filteredServices = services.filter((service: any) => employeeServiceIds.includes(service.id));
    
    return filteredServices;
  }, [services, formData.selectedEmployee, employees]);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerFullName.trim()) {
      newErrors.customerFullName = 'Müşteri adı soyadı zorunlu';
    }
    if (formData.selectedServices.length === 0) {
      newErrors.selectedServices = 'En az bir hizmet seçin';
    }
    if (!formData.selectedEmployee) {
      newErrors.selectedEmployee = 'Çalışan seçin';
    }
    if (availableEmployees.length === 0) {
      newErrors.selectedEmployee = 'Bu saatte müsait çalışan bulunmuyor';
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
    
    // Ad soyadı ayır
    const fullName = formData.customerFullName.trim();
    const nameParts = fullName.split(' ');
    const customerName = nameParts[0] || '';
    const customerSurname = nameParts.slice(1).join(' ') || null;
    
    // Randevu verisi hazırla
    const appointmentData = {
      businessId,
      customerId,
      customerName,
      customerSurname,
      customerPhone: formData.customerPhone.trim() || undefined,
      appointmentDate: slotData.date,
      appointmentTime: slotData.time,
      serviceIds: formData.selectedServices,
      employeeId: formData.selectedEmployee,
      notes: formData.notes.trim() || undefined
    };

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

  // Çalışan değiştiğinde seçili hizmetleri temizle ve sadece o çalışanın hizmetlerini göster
  const handleEmployeeChange = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedEmployee: employeeId,
      selectedServices: [] // Çalışan değiştiğinde hizmet seçimlerini temizle
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
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ad Soyad * <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customerFullName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerFullName: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  errors.customerFullName ? 'border-rose-300 bg-rose-50' : 'border-gray-300 bg-white'
                } focus:outline-none focus:ring-2 focus:ring-rose-200`}
                placeholder="Örn: Ahmet Yılmaz"
              />
              {errors.customerFullName && (
                <p className="text-xs text-rose-600 mt-1">{errors.customerFullName}</p>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Telefon (Opsiyonel)
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="0555 123 45 67"
                />
                <button
                  type="button"
                  onClick={handleContactPicker}
                  className="px-3 py-2 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Rehberden kişi seç (Chrome/Edge + HTTPS gerekli)"
                >
                  📞
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                💡 Rehber erişimi Chrome/Edge tarayıcılarında ve HTTPS üzerinde çalışır
              </p>
            </div>
          </div>

          {/* Çalışan Seçimi */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
              👨‍💼 Çalışan Seçimi <span className="text-rose-500">*</span>
            </h3>
            
            <select
              value={formData.selectedEmployee}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                errors.selectedEmployee ? 'border-rose-300 bg-rose-50' : 'border-gray-300 bg-white'
              } focus:outline-none focus:ring-2 focus:ring-rose-200`}
            >
              <option value="">Çalışan seçin</option>
              {availableEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            
            {availableEmployees.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                ⚠️ Bu saatte müsait çalışan bulunmuyor. Lütfen farklı bir saat seçin.
              </p>
            )}
            {errors.selectedEmployee && (
              <p className="text-xs text-rose-600">{errors.selectedEmployee}</p>
            )}
          </div>

          {/* Hizmet Seçimi */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
              🎯 Hizmet Seçimi <span className="text-rose-500">*</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {availableServices.map((service) => (
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
            
            {availableServices.length === 0 && formData.selectedEmployee && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                ⚠️ Seçili çalışanın verebileceği hizmet bulunmuyor. Lütfen farklı bir çalışan seçin veya önce çalışana hizmet ataması yapın.
              </p>
            )}
            {!formData.selectedEmployee && (
              <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                💡 Önce bir çalışan seçin, sonra o çalışanın verebileceği hizmetler görünecek.
              </p>
            )}
            {errors.selectedServices && (
              <p className="text-xs text-rose-600">{errors.selectedServices}</p>
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
