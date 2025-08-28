"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useSocket } from '../../../hooks/useSocket';
import { useState, useMemo, useEffect } from 'react';
import { skipToken } from '@tanstack/react-query';
import WeeklySlotView from '../../../components/WeeklySlotView';

export default function BusinessDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const businessId = session?.user?.businessId;

  // İşletme bilgilerini getir
  const { data: businesses } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === session?.user?.id);

  // Randevuları getir
  const { data: appointments, refetch: refetchAppointments } = trpc.appointment.getByBusiness.useQuery(
    businessId ? { businessId } : skipToken
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

  // Socket.io hook'u
  const { isConnected: socketConnected, events: socketEvents } = useSocket();

  // Appointments'ı yenileme event'ini dinle
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;

    const handleRefreshAppointments = (event: CustomEvent) => {
      if (event.detail.businessId === businessId) {
        // Debouncing - çok sık yenileme yapmasın
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          console.log('🔄 Appointments yenileniyor...');
          refetchAppointments();
        }, 200); // 200ms debounce
      }
    };

    window.addEventListener('refreshAppointments', handleRefreshAppointments as EventListener);

    return () => {
      clearTimeout(refreshTimer);
      window.removeEventListener('refreshAppointments', handleRefreshAppointments as EventListener);
    };
  }, [businessId, refetchAppointments]);

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
        businessId={businessId} 
        appointments={appointments || []} 
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

// WeeklySlotView component'i kaldırıldı - yeni sistem gelecek