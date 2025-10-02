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
  
  // Meşgule alma modal state'leri
  const [showBusySlotModal, setShowBusySlotModal] = useState(false);
  const [selectedBusySlotData, setSelectedBusySlotData] = useState<{date: string, time: string, selectedSlots?: Array<{date: string, time: string}>, mode?: 'busy' | 'available'} | null>(null);
  
  
  // Mini card için state'ler
  const [showMiniCard, setShowMiniCard] = useState(false);
  const [miniCardData, setMiniCardData] = useState<{
    appointment: any;
    slotTime: string;
    date: string;
    position: { x: number; y: number };
  } | null>(null);


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

  // Randevu başlangıç saatini kontrol et (sadece başlangıç slotunu göstermek için)
  const isAppointmentStartSlot = (slotTime: string, date: string) => {
    const slotStart = new Date(`${date}T${slotTime}:00`);
    
    for (const apt of appointments) {
      // Sadece aktif randevular (pending, confirmed, completed)
      if (!(apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'completed')) continue;

      // Tarih eşleşmesi
      const aptStart = new Date(apt.appointment_datetime);
      const aptDateStr = aptStart.toLocaleDateString('en-CA');
      if (aptDateStr !== date) continue;

      // Sadece başlangıç saatini kontrol et (15dk tolerans)
      const timeDiff = Math.abs(slotStart.getTime() - aptStart.getTime());
      if (timeDiff < 15 * 60000) { // 15 dakika tolerans
        return true;
      }
    }
    return false;
  };

  // Randevu süresi içinde olan slot'ları kontrol et (gizlenecek slot'lar)
  const isAppointmentDurationSlot = (slotTime: string, date: string) => {
    const slotStart = new Date(`${date}T${slotTime}:00`);
    
    for (const apt of appointments) {
      // Sadece aktif randevular (pending, confirmed, completed)
      if (!(apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'completed')) continue;

      // Tarih eşleşmesi
      const aptStart = new Date(apt.appointment_datetime);
      const aptDateStr = aptStart.toLocaleDateString('en-CA');
      if (aptDateStr !== date) continue;

      // Zaman aralığı kontrolü (start < slot < end) - başlangıç hariç
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 60) * 60000);
      
      if (aptStart < slotStart && slotStart < aptEnd) {
        return true;
      }
    }
    return false;
  };

  // Geçmiş saatlerde randevu var mı kontrol et (sadece aktif randevular)
  const getPastAppointment = (slotTime: string, date: string) => {
    const slotStart = new Date(`${date}T${slotTime}:00`);
    
    for (const apt of appointments) {
      // Sadece aktif randevular (pending, confirmed, completed) - cancelled hariç
      if (!(apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'completed')) continue;

      // Tarih eşleşmesi
      const aptStart = new Date(apt.appointment_datetime);
      const aptDateStr = aptStart.toLocaleDateString('en-CA');
      if (aptDateStr !== date) continue;

      // Zaman aralığı kontrolü (start <= slot < end)
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 60) * 60000);
      
      if (aptStart <= slotStart && slotStart < aptEnd) {
        return apt;
      }
    }
    return null;
  };

  // Geçmiş randevuya tıklama işlemi - Mini card göster
  const handlePastAppointmentClick = (slotTime: string, date: string, event: React.MouseEvent) => {
    const pastAppointment = getPastAppointment(slotTime, date);
    if (pastAppointment) {
      // Mini card pozisyonunu hesapla
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      };

      // Mini card'ı göster
      setMiniCardData({
        appointment: pastAppointment,
        slotTime,
        date,
        position
      });
      setShowMiniCard(true);
    }
  };


  // Dolu slot'a tıklama işlemi - Mini card göster
  const handleBusySlotClickForAppointment = (slotTime: string, date: string, event: React.MouseEvent) => {
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
      // Slot'un pozisyonunu al
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: rect.left + rect.width / 2, // Slot'un ortası
        y: rect.top - 10 // Slot'un üstünde 10px
      };

      // Mini card'ı göster
      setMiniCardData({
        appointment: targetAppointment,
        slotTime,
        date,
        position
      });
      setShowMiniCard(true);
    }
  };

  // Mini card'dan randevuya git
  const handleGoToAppointment = (appointment: any) => {
    const appointmentCard = document.getElementById(`appointment-${appointment.id}`);
    if (appointmentCard) {
      appointmentCard.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      setHighlightedAppointmentId(appointment.id);

      setTimeout(() => {
        setHighlightedAppointmentId(null);
      }, 1500);
    }

    // Mini card'ı kapat
    setShowMiniCard(false);
    setMiniCardData(null);
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

  // Seçili gün için randevu detaylarını al (iptal edilenler hariç)
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate || !appointments) return [];
    
    return appointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointment_datetime).toLocaleDateString('en-CA');
      const matchesDate = aptDate === selectedDate;
      
      // İptal edilen randevuları hariç tut
      const isNotCancelled = apt.status !== 'cancelled';
      
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
      
      return matchesDate && matchesEmployee && isNotCancelled;
    });
  }, [selectedDate, appointments, localSelectedEmployeeId]);

  // Özel seçilen gün için randevu detaylarını al (iptal edilenler hariç)
  const customDateAppointments = useMemo(() => {
    if (!customDate || !appointments) return [];
    
    return appointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointment_datetime).toLocaleDateString('en-CA');
      const matchesDate = aptDate === customDate;
      const matchesStatus = apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'completed';
      
      // İptal edilen randevuları hariç tut
      const isNotCancelled = apt.status !== 'cancelled';
      
      // Çalışan filtresi
      let matchesEmployee = true;
      if (localSelectedEmployeeId) {
        matchesEmployee = apt.services?.some((service: any) => 
          service.employee_id === localSelectedEmployeeId
        ) || false;
      }
      
      return matchesDate && matchesStatus && matchesEmployee && isNotCancelled;
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
            {/* Meşgule Alma Butonu */}
            <button
              onClick={() => {
                setSelectedBusySlotData({
                  date: selectedDate || '',
                  time: '',
                  mode: 'busy'
                });
                setShowBusySlotModal(true);
              }}
              className="px-1.5 py-0.5 rounded-md text-xs font-medium bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm hover:from-red-600 hover:to-red-700 hover:shadow-md hover:scale-105 transition-all duration-200 flex items-center gap-0.5"
            >
              <span className="text-xs"></span>
              Meşgule Al
            </button>

            {/* Müsait Yapma Butonu */}
            <button
              onClick={() => {
                setSelectedBusySlotData({
                  date: selectedDate || '',
                  time: '',
                  mode: 'available'
                });
                setShowBusySlotModal(true);
              }}
              className="px-1.5 py-0.5 rounded-md text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-sm hover:from-green-600 hover:to-green-700 hover:shadow-md hover:scale-105 transition-all duration-200 flex items-center gap-0.5"
            >
              <span className="text-xs"></span>
              Müsait Yap
            </button>
          
          <button 
            onClick={() => setShowCustomDate(!showCustomDate)}
            className={`px-1.5 py-0.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-0.5 ${
              showCustomDate 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-sm hover:from-blue-600 hover:to-blue-700 hover:shadow-md hover:scale-105' 
                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0 shadow-sm hover:from-gray-600 hover:to-gray-700 hover:shadow-md hover:scale-105'
            }`}
          >
            <span className="text-xs"></span>
            Özel Tarih
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
            {weeklySlots.find(d => d.date === selectedDate)?.slots
              .filter((slot: any) => {
                // Randevu süresi içindeki slot'ları gizle (başlangıç hariç)
                if (isAppointmentDurationSlot(slot.time, selectedDate)) {
                  return false;
                }
                return true;
              })
              .map((slot: any, index: number) => (
              <div
                key={index}
                className={`p-2 rounded-lg text-center text-xs font-medium transition-all ${
                  slot.isPast
                    ? (selectedDate && getPastAppointment(slot.time, selectedDate) 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 hover:scale-105 cursor-pointer'
                        : 'bg-orange-100 text-orange-600 border border-orange-200')
                    : slot.status === 'busy'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 hover:scale-105 cursor-pointer'
                    : slot.status === 'blocked'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200 hover:scale-105 cursor-pointer'
                    : slot.status === 'half-busy'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200 hover:scale-105 cursor-pointer'
                    : slot.status === 'unavailable'
                    ? 'bg-gray-100 text-gray-500 border border-gray-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 hover:scale-105 cursor-pointer'
                }`}
                onClick={
                  slot.isPast 
                    ? (selectedDate && getPastAppointment(slot.time, selectedDate) ? (e: React.MouseEvent) => handlePastAppointmentClick(slot.time, selectedDate, e) : undefined)
                    : slot.status === 'busy'
                    ? (e: React.MouseEvent) => handleBusySlotClickForAppointment(slot.time, selectedDate, e)
                    : slot.status === 'half-busy' || slot.status === 'available'
                    ? () => handleAvailableSlotClick(slot.time, selectedDate)
                    : undefined
                }
                title={
                  slot.isPast 
                    ? (selectedDate && getPastAppointment(slot.time, selectedDate) ? 'Geçmiş randevu - Detayını görmek için tıklayın' : 'Geçmiş saat')
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
                    ? (selectedDate && getPastAppointment(slot.time, selectedDate) ? 'Tamamlandı' : '⏰ Geçmiş')
                    : slot.status === 'busy' 
                    ? '🔴 Dolu' 
                    : slot.status === 'blocked'
                    ? '🟣 Meşgul'
                    : slot.status === 'half-busy'
                    ? '🟡 Yarı Dolu'
                    : slot.status === 'unavailable'
                    ? 'x'
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
                      <div>Müşteri: {apt.user_name || apt.customer_name || 'Müşteri'}</div>
                      <div>Telefon: {apt.user_phone || apt.customer_phone || apt.phone || '—'}</div>
                      <div>Hizmet: {Array.isArray(apt.service_names) ? apt.service_names.join(', ') : '—'}</div>
                      <div>Çalışan: {Array.isArray(apt.employee_names) ? apt.employee_names.join(', ') : '—'}</div>
                      {apt.notes && (
                        <div className="mt-1 p-1 bg-blue-50 rounded text-[10px] text-blue-700">
                          <strong>Not:</strong> {apt.notes}
                        </div>
                      )}
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
            {customDateSlots.slots
              .filter((slot: any) => {
                // Randevu süresi içindeki slot'ları gizle (başlangıç hariç)
                if (isAppointmentDurationSlot(slot.time, customDate)) {
                  return false;
                }
                return true;
              })
              .map((slot: any, index: number) => (
              <div
                key={index}
                className={`p-2 rounded-lg text-center text-xs font-medium transition-all ${
                  slot.isPast
                    ? (getPastAppointment(slot.time, customDate) 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 hover:scale-105 cursor-pointer'
                        : 'bg-orange-100 text-orange-600 border border-orange-200')
                    : slot.status === 'busy'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 hover:scale-105 cursor-pointer'
                    : slot.status === 'blocked'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200 hover:scale-105 cursor-pointer'
                    : slot.status === 'half-busy'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200 hover:scale-105 cursor-pointer'
                    : slot.status === 'unavailable'
                    ? 'bg-gray-100 text-gray-500 border border-gray-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 hover:scale-105 cursor-pointer'
                }`}
                onClick={
                  slot.isPast 
                    ? (getPastAppointment(slot.time, customDate) ? (e: React.MouseEvent) => handlePastAppointmentClick(slot.time, customDate, e) : undefined)
                    : slot.status === 'busy'
                    ? (e: React.MouseEvent) => handleBusySlotClickForAppointment(slot.time, customDate, e)
                    : slot.status === 'half-busy' || slot.status === 'available'
                    ? () => handleAvailableSlotClick(slot.time, customDate)
                    : undefined
                }
                title={
                  slot.isPast 
                    ? (getPastAppointment(slot.time, customDate) ? 'Geçmiş randevu - Detayını görmek için tıklayın' : 'Geçmiş saat')
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
                    ? (customDate && getPastAppointment(slot.time, customDate) ? '📅 Tamamlandı' : '⏰ Geçmiş')
                    : slot.status === 'busy' 
                    ? '🔴 Dolu' 
                    : slot.status === 'blocked'
                    ? '🟣 Meşgul'
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
                      <div>Müşteri: {apt.user_name || apt.customer_name || 'Müşteri'}</div>
                      <div>Telefon: {apt.user_phone || apt.customer_phone || apt.phone || '—'}</div>
                      <div>Hizmet: {Array.isArray(apt.service_names) ? apt.service_names.join(', ') : '—'}</div>
                      <div>Çalışan: {Array.isArray(apt.employee_names) ? apt.employee_names.join(', ') : '—'}</div>
                      {apt.notes && (
                        <div className="mt-1 p-1 bg-blue-50 rounded text-[10px] text-blue-700">
                          <strong>Not:</strong> {apt.notes}
                        </div>
                      )}
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

    {/* Meşgule Alma Modal'ı */}
    {showBusySlotModal && (
      <BusySlotModal
        isOpen={showBusySlotModal}
        onClose={() => {
          setShowBusySlotModal(false);
          setSelectedBusySlotData(null);
        }}
        slotData={selectedBusySlotData}
        businessId={businessId}
        selectedEmployeeId={localSelectedEmployeeId}
        onSlotBlocked={() => {
          // Slot'ları yenile
          refetchWeeklySlots();
          if (customDate) {
            refetchCustomDate();
          }
          // Parent component'e appointments'ı yenilemesi için event gönder
          window.dispatchEvent(new CustomEvent('refreshAppointments', { detail: { businessId } }));
        }}
        weeklySlots={weeklySlots}
        customDateSlots={customDateSlots}
        refetchWeeklySlots={refetchWeeklySlots}
        refetchCustomDate={refetchCustomDate}
      />
    )}

    {/* Mini Card Modal - Mobile First */}
    {showMiniCard && miniCardData && (
      <div 
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          setShowMiniCard(false);
          setMiniCardData(null);
        }}
      >
        <div 
          className="absolute bg-white rounded-t-3xl shadow-2xl border border-gray-200 mx-auto"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) scale(0.3)',
            width: '600px',
            height: 'auto',
            maxHeight: '90vh',
            transformOrigin: 'center center',
            opacity: 0,
            animation: 'scaleInFade 0.3s ease-out forwards'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Header - Gradient */}
          <div className="bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white p-6 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {miniCardData.slotTime}
                  </div>
                  <div className="text-sm text-white/80">
                    {new Date(miniCardData.date).toLocaleDateString('tr-TR', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMiniCard(false);
                  setMiniCardData(null);
                }}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors touch-manipulation"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Content */}
          <div className="p-6 space-y-6">
            {/* Randevu Bilgileri - Mobile Optimized */}
            <div className="space-y-4">
              {/* Müşteri Bilgisi */}
              <div className="bg-blue-50 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-blue-800">Müşteri</span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {(() => {
                    // Guest kullanıcı kontrolü
                    if (miniCardData.appointment.user_name && miniCardData.appointment.user_name.startsWith('Guest:')) {
                      // "Guest: İsim Soyisim" formatından sadece isim soyisim kısmını al
                      return miniCardData.appointment.user_name.replace('Guest: ', '');
                    }
                    // Normal kullanıcılar için customer_name ve customer_surname kullan
                    return `${miniCardData.appointment.customer_name || ''} ${miniCardData.appointment.customer_surname || ''}`.trim() || 'Müşteri';
                  })()}
                </div>
              </div>

              {/* Hizmet Bilgisi */}
              {(() => {
                // Farklı veri yapılarını kontrol et - service_names öncelikli
                let serviceNames = [];
                
                if (miniCardData.appointment.service_names && Array.isArray(miniCardData.appointment.service_names)) {
                  serviceNames = miniCardData.appointment.service_names;
                } else if (miniCardData.appointment.services && Array.isArray(miniCardData.appointment.services)) {
                  serviceNames = miniCardData.appointment.services.map((s: any) => s.name || s);
                } else if (miniCardData.appointment.appointment_services && Array.isArray(miniCardData.appointment.appointment_services)) {
                  serviceNames = miniCardData.appointment.appointment_services.map((s: any) => s.name || s);
                }
                
                return serviceNames.length > 0 ? (
                  <div className="bg-green-50 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                          <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-green-800">Hizmetler</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {serviceNames.join(', ')}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Süre ve Durum - Yan Yana */}
              <div className="grid grid-cols-2 gap-4">
                {/* Süre */}
                <div className="bg-purple-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-purple-800">Süre</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {miniCardData.appointment.duration || 60} dk
                  </div>
                </div>

                {/* Durum */}
                <div className="bg-orange-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-orange-800">Durum</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 capitalize">
                    {miniCardData.appointment.status === 'pending' ? 'Beklemede' :
                     miniCardData.appointment.status === 'confirmed' ? 'Onaylandı' :
                     miniCardData.appointment.status === 'completed' ? 'Tamamlandı' :
                     miniCardData.appointment.status}
                  </div>
                </div>
              </div>

              {/* Randevu Notu */}
              {miniCardData.appointment.notes && miniCardData.appointment.notes.trim() && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-gray-500 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">Not</span>
                  </div>
                  <div className="text-base text-gray-900">
                    {miniCardData.appointment.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Action Button */}
            <div>
              {/* Randevuya Git Butonu - Primary */}
              <button
                onClick={() => handleGoToAppointment(miniCardData.appointment)}
                className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-3 touch-manipulation active:scale-95"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M13 7l5 5-5 5M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Randevuya Git
              </button>
            </div>
          </div>
        </div>
      </div>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden animate-slide-up flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-1">Manuel Randevu Oluştur</h2>
              <div className="flex items-center gap-2 text-sm text-white/90">
                <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                <span className="truncate">
                  {new Date(slotData.date).toLocaleDateString('tr-TR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} - {slotData.time}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all duration-200 flex items-center justify-center shrink-0 ml-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Müşteri Bilgileri */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm">
                  👤
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Müşteri Bilgileri</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad Soyad <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customerFullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerFullName: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl border text-base text-gray-900 ${
                      errors.customerFullName ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-gray-50'
                    } focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all`}
                    placeholder="Örn: Ahmet Yılmaz"
                  />
                  {errors.customerFullName && (
                    <p className="text-sm text-rose-600 mt-2 flex items-center gap-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
                        <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {errors.customerFullName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon (Opsiyonel)
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    placeholder="0555 123 45 67"
                  />
                </div>
              </div>
            </div>

            {/* Çalışan Seçimi */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-sm">
                  👨‍💼
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Çalışan Seçimi</h3>
                <span className="text-rose-500 text-sm">*</span>
              </div>
              
              <div>
                <select
                  value={formData.selectedEmployee}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-base text-gray-900 ${
                    errors.selectedEmployee ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all`}
                >
                  <option value="">Çalışan seçin</option>
                  {availableEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
                
                {availableEmployees.length === 0 && (
                  <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-800">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-sm font-medium">Bu saatte müsait çalışan bulunmuyor</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">Lütfen farklı bir saat seçin.</p>
                  </div>
                )}
                {errors.selectedEmployee && (
                  <p className="text-sm text-rose-600 mt-2 flex items-center gap-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {errors.selectedEmployee}
                  </p>
                )}
              </div>
            </div>

            {/* Hizmet Seçimi */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm">
                  🎯
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Hizmet Seçimi</h3>
                <span className="text-rose-500 text-sm">*</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableServices.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      formData.selectedServices.includes(service.id)
                        ? 'border-rose-500 bg-gradient-to-br from-rose-50 to-rose-100 text-rose-900 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-base">{service.name}</div>
                      {formData.selectedServices.includes(service.id) && (
                        <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{service.duration_minutes} dk</span>
                      <span className="font-bold text-gray-900">₺{service.price}</span>
                    </div>
                  </button>
                ))}
              </div>
              
              {availableServices.length === 0 && formData.selectedEmployee && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Hizmet bulunamadı</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">Seçili çalışanın verebileceği hizmet bulunmuyor. Lütfen farklı bir çalışan seçin veya önce çalışana hizmet ataması yapın.</p>
                </div>
              )}
              {!formData.selectedEmployee && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Çalışan seçin</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">Önce bir çalışan seçin, sonra o çalışanın verebileceği hizmetler görünecek.</p>
                </div>
              )}
              {errors.selectedServices && (
                <p className="text-sm text-rose-600 flex items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {errors.selectedServices}
                </p>
              )}
            </div>

            {/* Notlar */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-sm">
                  📝
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Notlar</h3>
                <span className="text-gray-500 text-sm">(Opsiyonel)</span>
              </div>
              
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
                placeholder="Randevu hakkında notlar..."
              />
            </div>

          </div>
        </div>

        {/* Form Actions - Fixed at bottom */}
        <form id="manual-appointment-form" onSubmit={handleSubmit}>
          <div className="bg-white border-t border-gray-100 p-4 sm:p-6">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                İptal
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
                    </svg>
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                    </svg>
                    Randevu Oluştur
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Slot İşleme Modal Component'i
function BusySlotModal({ 
  isOpen, 
  onClose, 
  slotData, 
  businessId, 
  selectedEmployeeId,
  onSlotBlocked,
  weeklySlots,
  customDateSlots,
  refetchWeeklySlots,
  refetchCustomDate
}: {
  isOpen: boolean;
  onClose: () => void;
  slotData: {date: string, time: string, selectedSlots?: Array<{date: string, time: string}>, mode?: 'busy' | 'available'} | null;
  businessId: string;
  selectedEmployeeId: string | null;
  onSlotBlocked: () => void;
  weeklySlots?: any;
  customDateSlots?: any;
  refetchWeeklySlots: () => Promise<any>;
  refetchCustomDate: () => Promise<any>;
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Gün seçici için 7 günlük liste oluştur
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const isToday = i === 0;
      const isTomorrow = i === 1;
      
      let dayName = '';
      if (isToday) dayName = 'Bugün';
      else if (isTomorrow) dayName = 'Yarın';
      else dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
      
      dates.push({
        value: date.toISOString().split('T')[0],
        label: dayName,
        date: date.toLocaleDateString('tr-TR', { 
          day: '2-digit', 
          month: '2-digit' 
        }),
        fullDate: date.toLocaleDateString('tr-TR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });
    }
    
    return dates;
  };

  const dateOptions = generateDateOptions();

  // TRPC mutations
  const createBusySlot = trpc.busySlots.createBusySlot.useMutation({
    onSuccess: () => {
      onSlotBlocked();
      onClose();
    },
    onError: (error) => {
      console.error('Slot işleme hatası:', error);
      alert('Slot işleme başarısız: ' + error.message);
    }
  });

  const getBusySlots = trpc.busySlots.getBusySlots.useQuery({
    businessId,
    startDate: selectedDate || new Date().toISOString().split('T')[0],
    endDate: selectedDate || new Date().toISOString().split('T')[0],
    employeeId: selectedEmployeeId || undefined
  }, {
    enabled: !!selectedDate // Sadece tarih seçildiğinde çalışsın
  });

  const deleteBusySlot = trpc.busySlots.deleteBusySlot.useMutation({
    onSuccess: () => {
      onSlotBlocked();
      onClose();
    },
    onError: (error) => {
      console.error('Slot işleme hatası:', error);
      alert('Slot işleme başarısız: ' + error.message);
    }
  });

  // Loading state'i mutation'dan al
  const isLoading = createBusySlot.isPending || deleteBusySlot.isPending;

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (selectedSlots.size === 0) {
      newErrors.slots = 'En az bir slot seçmelisiniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Slot seçimi
  const handleSlotSelection = (slotTime: string, date: string) => {
    const slotKey = `${date}-${slotTime}`;
    const newSelectedSlots = new Set(selectedSlots);
    
    if (newSelectedSlots.has(slotKey)) {
      newSelectedSlots.delete(slotKey);
    } else {
      newSelectedSlots.add(slotKey);
    }
    
    setSelectedSlots(newSelectedSlots);
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !slotData) {
      return;
    }

    const slotsToProcess = Array.from(selectedSlots).map(slotKey => {
      // slotKey format: "2025-10-01-17:45"
      const parts = slotKey.split('-');
      const date = `${parts[0]}-${parts[1]}-${parts[2]}`; // "2025-10-01"
      const time = parts[3]; // "17:45"
      return { date, time };
    });
    const mode = slotData.mode || 'busy';


    try {
      if (mode === 'busy') {
        // Meşgule alma işlemi
        for (const slot of slotsToProcess) {
            await createBusySlot.mutateAsync({
              businessId,
              employeeId: selectedEmployeeId || undefined,
              date: slot.date,
              startTime: slot.time,
              duration: 15, // 15 dakika - sadece seçilen slot
              reason: 'Manuel meşgule alma',
              isAllDay: false
            });
        }
        console.log('Meşgule alma işlemi tamamlandı');
        
        // Slot'ları yenile
        await refetchWeeklySlots();
        // Custom date sadece custom date seçiliyse yenile
        if (customDateSlots) {
          await refetchCustomDate();
        }
        
        // Modal'ı kapat
        onClose();
      } else {
        // Müsait yapma işlemi - busy slot'ları sil
        for (const slot of slotsToProcess) {
          // Önce o tarih ve saatteki busy slot'ları bul
          const busySlotsResult = await getBusySlots.refetch();
          const busySlots = busySlotsResult.data || [];
          
          console.log('Found busy slots for deletion:', busySlots);
          busySlots.forEach((bs: any, index: number) => {
            console.log(`Busy slot ${index}:`, {
              id: bs.id,
              start_datetime: bs.startDateTime,
              end_datetime: bs.endDateTime,
              reason: bs.reason,
              start_type: typeof bs.startDateTime,
              end_type: typeof bs.endDateTime
            });
          });
          
          // Seçilen saatteki busy slot'ları bul ve sil
          const slotsToDelete = busySlots.filter((busySlot: any) => {
            const busyStart = new Date(busySlot.startDateTime);
            const busyEnd = new Date(busySlot.endDateTime);
            const slotTime = new Date(`${slot.date}T${slot.time}:00`);
            
            console.log('Debug slot matching:');
            console.log('- Selected slot time:', slot.time);
            console.log('- Busy slot start:', busyStart);
            console.log('- Busy slot end:', busyEnd);
            console.log('- Slot time:', slotTime);
            console.log('- Is in range:', slotTime >= busyStart && slotTime < busyEnd);
            
            // Slot zamanı busy slot aralığında mı? (15 dakika tolerans ile)
            const timeDiff = Math.abs(slotTime.getTime() - busyStart.getTime());
            const isExactMatch = timeDiff < 15 * 60000; // 15 dakika tolerans
            const isInRange = slotTime >= busyStart && slotTime < busyEnd;
            
            return isExactMatch || isInRange;
          });
          
          console.log('Slots to delete:', slotsToDelete);
          
          // Bulunan busy slot'ları sil
          for (const busySlot of slotsToDelete) {
            await deleteBusySlot.mutateAsync({
              busySlotId: busySlot.id,
              businessId: businessId
            });
          }
        }
        
        
        // Slot'ları yenile
        await refetchWeeklySlots();
        // Custom date sadece custom date seçiliyse yenile
        if (customDateSlots) {
          await refetchCustomDate();
        }
        
        // Modal'ı kapat
        onClose();
      }
    } catch (error) {
      console.error('Form submit error:', error);
      // Error handling is done in the mutation's onError
    }
  };

  if (!isOpen || !slotData) return null;

  const mode = slotData.mode || 'busy';
  

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden animate-slide-up flex flex-col">
        {/* Modal Header */}
        <div className={`sticky top-0 text-white p-4 sm:p-6 ${
          mode === 'busy' 
            ? 'bg-gradient-to-r from-red-500 via-rose-500 to-pink-500' 
            : 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-1">
                {mode === 'busy' ? 'Slot\'ları Meşgule Al' : 'Slot\'ları Müsait Yap'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-white/90">
                <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                <span className="truncate">
                  {selectedSlots.size} slot seçildi
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all duration-200 flex items-center justify-center shrink-0 ml-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Gün Seçici */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-purple-800">Tarih Seçin</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dateOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDate(option.value)}
                    className={`p-3 rounded-xl text-center transition-all duration-200 ${
                      selectedDate === option.value
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 border border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-xs font-semibold">{option.label}</div>
                  </button>
                ))}
              </div>
              
              {selectedDate && (
                <div className="mt-3 p-2 bg-white/60 rounded-lg">
                  <div className="text-xs text-purple-700 font-medium">
                    Seçilen: {dateOptions.find(d => d.value === selectedDate)?.fullDate}
                  </div>
                </div>
              )}
            </div>

            {/* Slot Listesi */}
            {selectedDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-blue-800">
                    {mode === 'busy' ? 'Müsait Slot\'ları Seç' : 'Meşgul Slot\'ları Seç'}
                  </span>
                </div>
                <div className="text-sm text-blue-700 mb-3">
                  {selectedSlots.size} slot seçildi
                </div>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {/* Seçilen tarihe göre slot'ları göster */}
                {(() => {
                  if (!selectedDate || !weeklySlots || !Array.isArray(weeklySlots)) {
                    console.log('No data available');
                    return false;
                  }
                  
                  // Seçilen tarihe uygun günü bul
                  const selectedDayData = weeklySlots.find((day: any) => day.date === selectedDate);
                  console.log('Selected day data:', selectedDayData);
                  
                  return selectedDayData && selectedDayData.slots;
                })() ? (
                  (() => {
                    const selectedDayData = weeklySlots.find((day: any) => day.date === selectedDate);
                    return selectedDayData.slots.map((slot: any, slotIndex: number) => {
                      const slotKey = `${selectedDate}-${slot.time}`;
                      const isSelected = selectedSlots.has(slotKey);
                      const isAvailable = slot.status === 'available' || slot.status === 'half-busy';
                      const isBusy = slot.status === 'busy';
                      const isBlocked = slot.status === 'blocked';
                      
                      // Mode'a göre filtrele
                      if (mode === 'busy' && !isAvailable) return null;
                      if (mode === 'available' && !isBlocked) return null; // Sadece blocked (meşgul) slot'ları göster
                      
                      return (
                        <div
                          key={slotIndex}
                          onClick={() => handleSlotSelection(slot.time, selectedDate)}
                          className={`p-1.5 rounded-lg text-center text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-500 text-white border border-blue-600 shadow-lg scale-105'
                              : mode === 'busy'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                              : isBlocked
                              ? 'bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200'
                          }`}
                        >
                          <div className="text-xs font-medium">{slot.time}</div>
                          <div className="text-xs mt-0.5">
                            {slot.status === 'available' ? '✅' : 
                             slot.status === 'half-busy' ? '⚠️' : 
                             slot.status === 'busy' ? '🔴' : 
                             slot.status === 'blocked' ? '🟣' : '⚪'}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="text-center text-gray-500 text-sm py-4 col-span-3">
                    {mode === 'busy' ? 'Müsait slot bulunamadı' : 'Meşgul slot bulunamadı'}
                  </div>
                )}
              </div>
              {errors.slots && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {errors.slots}
                </p>
              )}
              </div>
            )}

            {/* Tarih Seçilmediğinde Mesaj */}
            {!selectedDate && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-amber-600">
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-amber-800 mb-1">Tarih Seçin</div>
                <div className="text-xs text-amber-700">
                  Slot'ları görmek için önce bir tarih seçmelisiniz
                </div>
              </div>
            )}

            {/* Uyarı Mesajı */}
            <div className={`border rounded-2xl p-4 ${
              mode === 'busy' 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  mode === 'busy' ? 'bg-amber-500' : 'bg-green-500'
                }`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className={`text-sm font-semibold mb-1 ${
                    mode === 'busy' ? 'text-amber-800' : 'text-green-800'
                  }`}>
                    {mode === 'busy' ? 'Dikkat!' : 'Bilgi'}
                  </div>
                  <div className={`text-sm ${
                    mode === 'busy' ? 'text-amber-700' : 'text-green-700'
                  }`}>
                    {mode === 'busy' 
                      ? 'Bu slot\'ları meşgule aldığınızda, müşteriler bu saatlerde randevu alamayacak. Sadece gerekli durumlarda kullanın.'
                      : 'Bu slot\'ları müsait yaptığınızda, müşteriler bu saatlerde randevu alabilecek.'
                    }
                  </div>
                </div>
              </div>
            </div>



            {/* Özet Bilgi */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-gray-500 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-800">Özet</span>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div><strong>İşlem:</strong> {mode === 'busy' ? 'Meşgule Alma' : 'Müsait Yapma'}</div>
                <div><strong>Slot Sayısı:</strong> {selectedSlots.size}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions - Fixed at bottom */}
        <form id="slot-form" onSubmit={handleSubmit}>
          <div className="bg-white border-t border-gray-100 p-4 sm:p-6">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                İptal
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 px-6 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  mode === 'busy' 
                    ? 'bg-gradient-to-r from-red-500 via-rose-500 to-pink-500' 
                    : 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
                    </svg>
                    {mode === 'busy' ? 'Meşgule Alınıyor...' : 'Müsait Yapılıyor...'}
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {mode === 'busy' ? 'Meşgule Al' : 'Müsait Yap'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    
  );
}
