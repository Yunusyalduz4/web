"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useState, useMemo } from 'react';
import { skipToken } from '@tanstack/react-query';

export default function BusinessDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const businessId = session?.user?.businessId;

  // İşletme bilgilerini getir
  const { data: businesses } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === session?.user?.id);

  // Randevuları getir
  const { data: appointments } = trpc.appointment.getByBusiness.useQuery(
    businessId ? { businessId } : skipToken
  );

  // 7 günlük slot verilerini getir
  const startDate = new Date().toISOString().split('T')[0];
  const { data: weeklySlots, isLoading: weeklyLoading } = trpc.appointment.getWeeklySlots.useQuery(
    businessId ? { businessId, startDate } : skipToken
  );

  // Hizmetleri ve çalışanları getir
  const { data: services } = trpc.business.getServices.useQuery(
    businessId ? { businessId } : skipToken
  );
  
  const { data: employees } = trpc.business.getEmployees.useQuery(
    businessId ? { businessId } : skipToken
  );

  // Push notification hook'u
  const {
    isSupported,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe
  } = usePushNotifications(businessId || undefined);

  // Aktif randevuları hesapla (pending + confirmed)
  const activeAppointments = appointments?.filter((a: any) => 
    a.status === 'pending' || a.status === 'confirmed'
  ).length || 0;

  if (!businessId) {
    return (
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8 text-gray-500">
            <span className="text-2xl mb-2 block">🔒</span>
            <span>İşletme hesabı gerekli</span>
            <div className="mt-2 text-sm text-gray-400">
              Session: {JSON.stringify(session?.user, null, 2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!business) {
    return (
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8 text-gray-500">
            <span className="text-2xl mb-2 block">⏳</span>
            <span>İşletme bilgileri yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  // Onaylanmamış işletme için özel mesaj
  if (!business.is_approved) {
    return (
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-4">
              <div className="text-4xl mb-4">⏳</div>
              <h2 className="text-xl font-semibold text-yellow-800 mb-2">Admin Onayı Bekleniyor</h2>
              <p className="text-yellow-700 mb-4">
                İşletme hesabınız admin onayından sonra aktif olacak. Bu süreçte:
              </p>
              <ul className="text-left text-yellow-700 text-sm space-y-1 mb-4">
                <li>• Randevu alamayacaksınız</li>
                <li>• Hizmet ekleyemeyeceksiniz</li>
                <li>• Çalışan ekleyemeyeceksiniz</li>
                <li>• Dashboard özelliklerini kullanamayacaksınız</li>
              </ul>
              <p className="text-yellow-600 text-xs">
                Onay durumunuz e-posta ile bilgilendirilecek.
              </p>
            </div>
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <main className="relative max-w-md mx-auto p-3 pb-24">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 bg-white/70 backdrop-blur-md border-b border-white/40 mb-3">
        <div className="flex items-center justify-between">
          <div className="text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
          <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/70 border border-white/50 text-gray-900 text-xs shadow-sm">
            <span>←</span>
            <span className="hidden sm:inline">User</span>
          </button>
        </div>
      </div>

      {/* Approval Status Banner */}
      {!business.is_approved && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm">⏳</div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800">Admin Onayı Bekleniyor</h3>
              <p className="text-sm text-yellow-700">İşletme hesabınız admin onayından sonra aktif olacak. Bu süreçte randevu alamayacaksınız.</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Image Approval Banner */}
      {business.profile_image_url && !business.profile_image_approved && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">📸</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800">Profil Görseli Onay Bekliyor</h3>
              <p className="text-sm text-blue-700">Yüklediğiniz profil görseli admin onayından sonra görünür olacak.</p>
            </div>
          </div>
        </div>
      )}

      {/* Business Mini Card */}
      <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-4 shadow mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white flex items-center justify-center">🏢</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold text-gray-900 truncate">{business.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold"><span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>Aktif</span>
              <span className="text-[11px] text-gray-600 truncate">{business.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniStat label="Aktif" value={activeAppointments} color="from-rose-500 to-fuchsia-600" />
        <MiniStat label="Hizmet" value={services?.length || 0} color="from-indigo-500 to-indigo-600" />
        <MiniStat label="Çalışan" value={employees?.length || 0} color="from-emerald-500 to-emerald-600" />
      </div>

      {/* Push CTA */}
      {isSupported && !isSubscribed && (
        <div className="mb-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 shadow">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12px] text-gray-800">Yeni randevu taleplerinde anında bildirim almak için açın.</div>
            <button onClick={subscribe} disabled={pushLoading} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-[11px] font-semibold shadow hover:shadow-md disabled:opacity-60">
              {pushLoading ? 'Açılıyor…' : 'Bildirimleri Aç'}
            </button>
          </div>
          {pushError && <div className="mt-1 text-[11px] text-rose-600">{pushError}</div>}
        </div>
      )}

      {/* Actions Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <ActionChip title="Düzenle" onClick={() => router.push('/dashboard/business/edit')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.6"/></svg>
        } />
        <ActionChip title="Hizmet" onClick={() => router.push('/dashboard/business/services')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z"/></svg>
        } />
        <ActionChip title="Çalışan" onClick={() => router.push('/dashboard/business/employees')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
        } />
        <ActionChip title="Randevu" onClick={() => router.push('/dashboard/business/appointments')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
        } />
        <ActionChip title="Analitik" onClick={() => router.push('/dashboard/business/analytics')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7 3h4v11h-4V10z"/></svg>
        } />
        <ActionChip title="Profil" onClick={() => router.push('/dashboard/business/profile')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
        } />
        <ActionChip title="Yorum" onClick={() => router.push('/dashboard/business/reviews')} icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        } />
      </div>

      {/* 7 Günlük Slot Görünümü */}
      <WeeklySlotView 
        weeklySlots={weeklySlots} 
        isLoading={weeklyLoading} 
        appointments={appointments}
        businessId={businessId}
      />
    </main>
    </>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-2 text-center shadow">
      <div className={`mx-auto mb-1 h-1 w-10 rounded-full bg-gradient-to-r ${color}`}></div>
      <div className="text-lg font-extrabold text-gray-900 leading-none">{value}</div>
      <div className="text-[11px] text-gray-600">{label}</div>
    </div>
  );
}

function ActionChip({ title, onClick, icon }: { title: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/70 backdrop-blur-md border border-white/50 text-gray-900 text-[11px] font-semibold shadow hover:shadow-md">
      {icon}
      <span>{title}</span>
    </button>
  );
}

// Manuel Randevu Müsaitlik Kontrolü Component'i
function ManualAppointmentAvailabilityCheck({ 
  employeeId, 
  date, 
  time, 
  serviceId, 
  services 
}: { 
  employeeId: string; 
  date: string; 
  time: string; 
  serviceId: string; 
  services: any; 
}) {
  // Çalışan müsaitlik durumunu al
  const { data: availability } = trpc.business.getEmployeeAvailability.useQuery(
    { employeeId },
    { enabled: !!employeeId }
  );

  // Seçilen hizmetin süresini al
  const selectedService = services?.find((s: any) => s.id === serviceId);
  const serviceDuration = selectedService?.duration_minutes || 0;

  // O gün için müsaitlik kontrolü
  const isAvailableOnDay = useMemo(() => {
    if (!availability || !date) return false;
    const dayOfWeek = new Date(date).getDay();
    return availability.some((a: any) => a.day_of_week === dayOfWeek);
  }, [availability, date]);

  // O saat için müsaitlik kontrolü
  const isAvailableAtTime = useMemo(() => {
    if (!availability || !date || !time || !isAvailableOnDay) return false;
    
    const dayOfWeek = new Date(date).getDay();
    const daySlots = availability.filter((a: any) => a.day_of_week === dayOfWeek);
    
    if (daySlots.length === 0) return false;
    
    // Seçilen saat ve süre için müsaitlik kontrolü
    const [hour, minute] = time.split(':').map(Number);
    const startTime = hour * 60 + minute; // dakika cinsinden
    const endTime = startTime + serviceDuration;
    
    return daySlots.some((slot: any) => {
      const [slotStartHour, slotStartMin] = slot.start_time.split(':').map(Number);
      const [slotEndHour, slotEndMin] = slot.end_time.split(':').map(Number);
      
      const slotStart = slotStartHour * 60 + slotStartMin;
      const slotEnd = slotEndHour * 60 + slotEndMin;
      
      // Seçilen zaman aralığı slot içinde mi?
      return startTime >= slotStart && endTime <= slotEnd;
    });
  }, [availability, date, time, serviceDuration, isAvailableOnDay]);

  // Çakışan randevuları kontrol et
  const { data: conflicts } = trpc.appointment.getEmployeeConflicts.useQuery(
    {
      employeeId,
      date,
      durationMinutes: serviceDuration
    },
    { enabled: !!employeeId && !!date && !!serviceDuration }
  );

  // Seçilen saatte çakışma var mı?
  const hasConflict = useMemo(() => {
    if (!conflicts || !time) return false;
    return conflicts[time] || false;
  }, [conflicts, time]);

  // Genel durum
  const overallStatus = useMemo(() => {
    if (!isAvailableOnDay) return 'unavailable_day';
    if (!isAvailableAtTime) return 'unavailable_time';
    if (hasConflict) return 'conflict';
    return 'available';
  }, [isAvailableOnDay, isAvailableAtTime, hasConflict]);

  // Durum mesajları
  const getStatusMessage = () => {
    switch (overallStatus) {
      case 'unavailable_day':
        return {
          text: 'Bu çalışan seçilen günde müsait değil',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'unavailable_time':
        return {
          text: 'Bu çalışan seçilen saatte müsait değil',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'conflict':
        return {
          text: 'Bu saatte çakışan randevu var',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'available':
        return {
          text: 'Çalışan müsait ✅',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      default:
        return {
          text: 'Müsaitlik kontrol ediliyor...',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const status = getStatusMessage();

  return (
    <div className={`p-3 rounded-lg border ${status.bgColor} ${status.borderColor}`}>
      <div className={`text-sm font-medium ${status.color} mb-2`}>
        {status.text}
      </div>
      
      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Gün müsaitliği:</span>
          <span className={isAvailableOnDay ? 'text-green-600' : 'text-red-600'}>
            {isAvailableOnDay ? '✅ Müsait' : '❌ Müsait değil'}
          </span>
        </div>
        
        {isAvailableOnDay && (
          <div className="flex items-center justify-between">
            <span>Saat müsaitliği:</span>
            <span className={isAvailableAtTime ? 'text-green-600' : 'text-orange-600'}>
              {isAvailableAtTime ? '✅ Müsait' : '❌ Müsait değil'}
            </span>
          </div>
        )}
        
        {isAvailableAtTime && (
          <div className="flex items-center justify-between">
            <span>Çakışma kontrolü:</span>
            <span className={hasConflict ? 'text-red-600' : 'text-green-600'}>
              {hasConflict ? '❌ Çakışma var' : '✅ Çakışma yok'}
            </span>
          </div>
        )}
        
        {selectedService && (
          <div className="flex items-center justify-between">
            <span>Hizmet süresi:</span>
            <span className="text-gray-700 font-medium">{serviceDuration} dakika</span>
          </div>
        )}
      </div>
      
      {overallStatus !== 'available' && (
        <div className="mt-3 p-2 bg-white/60 rounded border border-white/40">
          <div className="text-xs text-gray-600">
            <strong>Öneriler:</strong>
            {overallStatus === 'unavailable_day' && ' Başka bir gün seçin'}
            {overallStatus === 'unavailable_time' && ' Başka bir saat seçin'}
            {overallStatus === 'conflict' && ' Başka bir saat seçin veya çalışan değiştirin'}
          </div>
        </div>
      )}
    </div>
  );
}

// 7 Günlük Slot Görünümü Component'i
function WeeklySlotView({ 
  weeklySlots, 
  isLoading, 
  appointments, 
  businessId 
}: { 
  weeklySlots: any; 
  isLoading: boolean; 
  appointments: any; 
  businessId: string; 
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDaySlots, setSelectedDaySlots] = useState<any[]>([]);
  const [customDate, setCustomDate] = useState<string>('');
  const [customDateSlots, setCustomDateSlots] = useState<any[]>([]);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showManualAppointment, setShowManualAppointment] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [manualAppointmentData, setManualAppointmentData] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    employeeId: '',
    notes: ''
  });
  
  // Dolu slot tıklama için state'ler
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Manuel tarih için slot verilerini çek
  const { data: customDateData, refetch: refetchCustomDate } = trpc.appointment.getWeeklySlots.useQuery(
    businessId && customDate ? { businessId, startDate: customDate } : skipToken
  );

  // İşletme bilgilerini çek
  const { data: services } = trpc.business.getServices.useQuery(
    businessId ? { businessId } : skipToken
  );
  const { data: employees } = trpc.business.getEmployees.useQuery(
    businessId ? { businessId } : skipToken
  );

  // Manuel randevu ekleme mutation'ı
  const createManualAppointmentMutation = trpc.appointment.createManualAppointment.useMutation();

  const handleDayClick = (dayData: any) => {
    if (selectedDate === dayData.date) {
      setSelectedDate(null);
      setSelectedDaySlots([]);
    } else {
      setSelectedDate(dayData.date);
      setSelectedDaySlots(dayData.slots);
      // Manuel tarih seçimini kapat
      setShowCustomDate(false);
      setCustomDateSlots([]);
    }
    // Manuel randevu modal'ını kapat
    setShowManualAppointment(false);
    setSelectedSlot('');
  };

  const handleCustomDateSelect = async () => {
    if (!customDate) return;
    
    try {
      await refetchCustomDate();
      if (customDateData && customDateData.length > 0) {
        const selectedDay = customDateData[0]; // İlk gün (seçilen tarih)
        setCustomDateSlots(selectedDay.slots);
        setShowCustomDate(true);
        // 7 günlük seçimi kapat
        setSelectedDate(null);
        setSelectedDaySlots([]);
      }
    } catch (error) {
      console.error('Custom date slots fetch error:', error);
    }
    // Manuel randevu modal'ını kapat
    setShowManualAppointment(false);
    setSelectedSlot('');
  };

  // Boş slot'a tıklama - Manuel randevu modal'ını açar
  const handleEmptySlotClick = (slotTime: string, date: string) => {
    setSelectedSlot(slotTime);
    setManualAppointmentData({
      customerName: '',
      customerPhone: '',
      serviceId: '',
      employeeId: employees && employees.length === 1 ? employees[0].id : '',
      notes: ''
    });
    setShowManualAppointment(true);
  };
  
  // Dolu slot'a tıklama - Randevu kartını vurgula ve scroll et
  const handleBusySlotClick = (slotTime: string, date: string) => {
    // O saatteki randevuyu bul
    const appointmentDate = selectedDate || customDate;
    const appointments = appointmentDate === selectedDate ? selectedDayAppointments : customDateAppointments;
    
    const targetAppointment = appointments?.find((apt: any) => {
      const aptTime = new Date(apt.appointment_datetime).toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return aptTime === slotTime;
    });
    
    if (targetAppointment) {
      // Randevu kartını vurgula
      setHighlightedAppointmentId(targetAppointment.id);
      
      // 5 saniye sonra vurgulamayı kaldır
      setTimeout(() => {
        setHighlightedAppointmentId(null);
      }, 5000);
      
      // Scroll işlemi
      setIsScrolling(true);
      const appointmentElement = document.getElementById(`appointment-${targetAppointment.id}`);
      
      if (appointmentElement) {
        appointmentElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // Scroll tamamlandıktan sonra state'i güncelle
        setTimeout(() => {
          setIsScrolling(false);
        }, 1000);
      }
    }
  };

  // Manuel randevu oluşturma
  const handleCreateManualAppointment = async () => {
    if (!selectedSlot || !selectedDate && !customDate || !manualAppointmentData.customerName || !manualAppointmentData.serviceId || !manualAppointmentData.employeeId) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    // Çalışan müsaitlik kontrolü
    const appointmentDate = selectedDate || customDate;
    const appointmentTime = selectedSlot;
    
    // Seçilen hizmetin süresini al
    const selectedService = services?.find((s: any) => s.id === manualAppointmentData.serviceId);
    const serviceDuration = selectedService?.duration_minutes || 0;
    
    // Çalışan müsaitlik kontrolü
    try {
      // Çalışanın o gün müsait olup olmadığını kontrol et
      const availabilityRes = await fetch(`/api/trpc/business.getEmployeeAvailability?input=${encodeURIComponent(JSON.stringify({ employeeId: manualAppointmentData.employeeId }))}`);
      const availabilityData = await availabilityRes.json();
      
      if (availabilityData.result?.data) {
        const dayOfWeek = new Date(appointmentDate).getDay();
        const isAvailableOnDay = availabilityData.result.data.some((a: any) => a.day_of_week === dayOfWeek);
        
        if (!isAvailableOnDay) {
          alert('Bu çalışan seçilen günde müsait değil. Lütfen başka bir gün seçin.');
          return;
        }
        
        // O saat için müsaitlik kontrolü
        const daySlots = availabilityData.result.data.filter((a: any) => a.day_of_week === dayOfWeek);
        const [hour, minute] = appointmentTime.split(':').map(Number);
        const startTime = hour * 60 + minute;
        const endTime = startTime + serviceDuration;
        
        const isAvailableAtTime = daySlots.some((slot: any) => {
          const [slotStartHour, slotStartMin] = slot.start_time.split(':').map(Number);
          const [slotEndHour, slotEndMin] = slot.end_time.split(':').map(Number);
          
          const slotStart = slotStartHour * 60 + slotStartMin;
          const slotEnd = slotEndHour * 60 + slotEndMin;
          
          return startTime >= slotStart && endTime <= slotEnd;
        });
        
        if (!isAvailableAtTime) {
          alert('Bu çalışan seçilen saatte müsait değil. Lütfen başka bir saat seçin.');
          return;
        }
      }
      
      // Çakışma kontrolü
      const conflictsRes = await fetch(`/api/trpc/appointment.getEmployeeConflicts?input=${encodeURIComponent(JSON.stringify({ 
        employeeId: manualAppointmentData.employeeId, 
        date: appointmentDate, 
        durationMinutes: serviceDuration 
      }))}`);
      const conflictsData = await conflictsRes.json();
      
      if (conflictsData.result?.data && conflictsData.result.data[appointmentTime]) {
        alert('Bu saatte çakışan randevu var. Lütfen başka bir saat seçin.');
        return;
      }
      
    } catch (error) {
      console.error('Müsaitlik kontrolü hatası:', error);
      // Müsaitlik kontrolü başarısız olsa bile devam et (opsiyonel)
    }

    try {
      await createManualAppointmentMutation.mutateAsync({
        businessId,
        customerName: manualAppointmentData.customerName,
        customerPhone: manualAppointmentData.customerPhone,
        serviceId: manualAppointmentData.serviceId,
        employeeId: manualAppointmentData.employeeId,
        appointmentDatetime: `${appointmentDate}T${appointmentTime}:00`,
        notes: manualAppointmentData.notes
      });

      alert('Manuel randevu başarıyla oluşturuldu!');
      setShowManualAppointment(false);
      setSelectedSlot('');
      setManualAppointmentData({
        customerName: '',
        customerPhone: '',
        serviceId: '',
        employeeId: '',
        notes: ''
      });
      
      // Sayfayı yenile
      window.location.reload();
    } catch (error: any) {
      alert('Randevu oluşturulamadı: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  // Seçili gün için randevu detaylarını al
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate || !appointments) return [];
    
    return appointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointment_datetime).toISOString().split('T')[0];
      return aptDate === selectedDate && (apt.status === 'pending' || apt.status === 'confirmed');
    });
  }, [selectedDate, appointments]);

  // Manuel seçilen gün için randevu detaylarını al
  const customDateAppointments = useMemo(() => {
    if (!customDate || !appointments) return [];
    
    return appointments.filter((apt: any) => {
      const aptDate = new Date(apt.appointment_datetime).toISOString().split('T')[0];
      return aptDate === customDate && (apt.status === 'pending' || apt.status === 'confirmed');
    });
  }, [customDate, appointments]);

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
      {/* Başlık ve Manuel Tarih Seçimi */}
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

      {/* Manuel Tarih Seçimi */}
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
                setCustomDateSlots([]);
                setShowManualAppointment(false);
                setSelectedSlot('');
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
            {/* Gün adı - Frontend'de tekrar hesapla */}
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
      {selectedDate && selectedDaySlots.length > 0 && (
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
              onClick={() => {
                setSelectedDate(null);
                setShowManualAppointment(false);
                setSelectedSlot('');
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Slot Detayları - Boş slot'lara tıklanabilir */}
          <div className="grid grid-cols-4 gap-1 mb-3">
            {selectedDaySlots.map((slot: any, index: number) => {
              // Geçmiş saat kontrolü
              const isPastTime = selectedDate === new Date().toISOString().split('T')[0] && 
                (() => {
                  const now = new Date();
                  const bufferTime = new Date(now.getTime() + 15 * 60000);
                  const bufferTimeStr = bufferTime.getHours().toString().padStart(2, '0') + ':' + bufferTime.getMinutes().toString().padStart(2, '0');
                  return slot.time < bufferTimeStr;
                })();
              
              const isPastSlot = isPastTime && !slot.isBusy; // Sadece geçmiş saat (meşgul değil)
              const isDisabled = slot.isBusy || isPastTime;
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (isPastSlot) return; // Geçmiş saatler tıklanamaz
                    if (slot.isBusy) {
                      handleBusySlotClick(slot.time, selectedDate);
                    } else {
                      handleEmptySlotClick(slot.time, selectedDate);
                    }
                  }}
                  disabled={isPastSlot}
                  className={`p-2 rounded-lg text-center text-xs font-medium transition-all ${
                    isPastSlot
                      ? 'bg-orange-100 text-orange-600 border border-orange-200 cursor-not-allowed opacity-70'
                      : slot.isBusy
                      ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 cursor-pointer hover:scale-105'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 cursor-pointer hover:scale-105'
                  }`}
                  title={
                    isPastSlot ? 'Bu saat geçmiş zamanda' : 
                    slot.isBusy ? 'Bu saat dolu - Tıklayarak randevu detayını gör' : 
                    'Bu saati seç'
                  }
                >
                  <div className="font-bold">{slot.time}</div>
                  <div className="text-[10px]">
                    {isPastSlot ? 'Geçmiş' : slot.isBusy ? 'Dolu' : 'Boş'}
                  </div>
                </button>
              );
            })}
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
                    className={`bg-white/60 rounded-lg p-2 text-xs transition-all duration-500 ${
                      highlightedAppointmentId === apt.id 
                        ? 'ring-4 ring-yellow-400 ring-opacity-80 shadow-2xl scale-105 bg-yellow-50' 
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

      {/* Manuel Seçilen Gün Detayları */}
      {showCustomDate && customDateSlots.length > 0 && (
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
                setCustomDateSlots([]);
                setShowManualAppointment(false);
                setSelectedSlot('');
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Manuel Randevu Ekleme Butonu */}
          <div className="mb-3">
            <button
              onClick={() => {
                setShowManualAppointment(true);
                setSelectedSlot('');
                setManualAppointmentData({
                  customerName: '',
                  customerPhone: '',
                  serviceId: '',
                  employeeId: employees && employees.length === 1 ? employees[0].id : '',
                  notes: ''
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium shadow hover:shadow-lg transition-all"
            >
              <span>➕</span>
              Manuel Randevu Ekle
            </button>
          </div>

          {/* Slot Detayları - Boş slot'lara tıklanabilir */}
          <div className="grid grid-cols-4 gap-1 mb-3">
            {customDateSlots.map((slot: any, index: number) => {
              // Geçmiş saat kontrolü
              const isPastTime = customDate === new Date().toISOString().split('T')[0] && 
                (() => {
                  const now = new Date();
                  const bufferTime = new Date(now.getTime() + 15 * 60000);
                  const bufferTimeStr = bufferTime.getHours().toString().padStart(2, '0') + ':' + bufferTime.getMinutes().toString().padStart(2, '0');
                  return slot.time < bufferTimeStr;
                })();
              
              const isPastSlot = isPastTime && !slot.isBusy; // Sadece geçmiş saat (meşgul değil)
              const isDisabled = slot.isBusy || isPastTime;
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (isPastSlot) return; // Geçmiş saatler tıklanamaz
                    if (slot.isBusy) {
                      handleBusySlotClick(slot.time, customDate);
                    } else {
                      handleEmptySlotClick(slot.time, customDate);
                    }
                  }}
                  disabled={isPastSlot}
                  className={`p-2 rounded-lg text-center text-xs font-medium transition-all ${
                    isPastSlot
                      ? 'bg-orange-100 text-orange-600 border border-orange-200 cursor-not-allowed opacity-70'
                      : slot.isBusy
                      ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 cursor-pointer hover:scale-105'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 cursor-pointer hover:scale-105'
                  }`}
                  title={
                    isPastSlot ? 'Bu saat geçmiş zamanda' : 
                    slot.isBusy ? 'Bu saat dolu - Tıklayarak randevu detayını gör' : 
                    'Bu saati seç'
                  }
                >
                  <div className="font-bold">{slot.time}</div>
                  <div className="text-[10px]">
                    {isPastSlot ? 'Geçmiş' : slot.isBusy ? 'Dolu' : 'Boş'}
                  </div>
                </button>
              );
            })}
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
                    className={`bg-white/60 rounded-lg p-2 text-xs transition-all duration-500 ${
                      highlightedAppointmentId === apt.id 
                        ? 'ring-4 ring-yellow-400 ring-opacity-80 shadow-2xl scale-105 bg-yellow-50' 
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

      {/* Manuel Randevu Ekleme Modal */}
      {showManualAppointment && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setShowManualAppointment(false)} />
          <div className="relative mx-auto my-6 max-w-md w-[94%] bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Manuel Randevu Ekle</h3>
              <button 
                onClick={() => setShowManualAppointment(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Müşteri Bilgileri */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Müşteri Adı *</label>
                <input
                  type="text"
                  value={manualAppointmentData.customerName}
                  onChange={(e) => setManualAppointmentData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="Müşteri adını girin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                <input
                  type="tel"
                  value={manualAppointmentData.customerPhone}
                  onChange={(e) => setManualAppointmentData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="Telefon numarası (opsiyonel)"
                />
              </div>

              {/* Hizmet Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hizmet *</label>
                <select
                  value={manualAppointmentData.serviceId}
                  onChange={(e) => setManualAppointmentData(prev => ({ ...prev, serviceId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  <option value="">Hizmet seçin</option>
                  {services?.map((service: any) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - ₺{service.price} ({service.duration_minutes} dk)
                    </option>
                  ))}
                </select>
              </div>

              {/* Çalışan Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Çalışan *</label>
                <select
                  value={manualAppointmentData.employeeId}
                  onChange={(e) => setManualAppointmentData(prev => ({ ...prev, employeeId: e.target.value }))}
                  disabled={employees && employees.length === 1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:bg-gray-100"
                >
                  <option value="">Çalışan seçin</option>
                  {employees?.map((employee: any) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
                {employees && employees.length === 1 && (
                  <span className="text-xs text-blue-600 mt-1 block">
                    ⚡ Tek çalışan olduğu için otomatik seçildi
                  </span>
                )}
              </div>

              {/* Seçilen Slot Bilgisi */}
              {selectedSlot && (
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <div className="text-sm font-medium text-emerald-800">
                    Seçilen Slot: {selectedSlot}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">
                    {selectedDate || customDate} tarihinde {selectedSlot} saatinde randevu oluşturulacak
                  </div>
                </div>
              )}

              {/* Çalışan Müsaitlik Kontrolü */}
              {manualAppointmentData.employeeId && selectedSlot && (selectedDate || customDate) && (
                <div className="p-3 rounded-lg border">
                  <div className="text-sm font-medium text-gray-700 mb-2">Çalışan Müsaitlik Kontrolü</div>
                  <ManualAppointmentAvailabilityCheck
                    employeeId={manualAppointmentData.employeeId}
                    date={selectedDate || customDate}
                    time={selectedSlot}
                    serviceId={manualAppointmentData.serviceId}
                    services={services}
                  />
                </div>
              )}

              {/* Notlar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                <textarea
                  value={manualAppointmentData.notes}
                  onChange={(e) => setManualAppointmentData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="Randevu hakkında notlar (opsiyonel)"
                />
              </div>

              {/* Butonlar */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualAppointment(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleCreateManualAppointment}
                  disabled={createManualAppointmentMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50"
                >
                  {createManualAppointmentMutation.isPending ? 'Oluşturuluyor...' : 'Randevu Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    
    <style jsx global>{`
      @keyframes highlight-pulse {
        0%, 100% { 
          box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
          transform: scale(1);
        }
        50% { 
          box-shadow: 0 0 0 20px rgba(251, 191, 36, 0);
          transform: scale(1.05);
        }
      }
      
      .highlighted-appointment {
        animation: highlight-pulse 2s ease-in-out infinite;
      }
    `}</style>
    </>
  );
}