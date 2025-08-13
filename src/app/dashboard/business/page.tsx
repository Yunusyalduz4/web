"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { usePushNotifications } from '../../../hooks/usePushNotifications';

export default function BusinessDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses, isLoading } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;
  const {
    isSupported,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe
  } = usePushNotifications(businessId || undefined);

  // Gerçek verileri çek
  const { data: services } = trpc.business.getServices.useQuery(businessId ? { businessId } : undefined, { enabled: !!businessId });
  
  const { data: employees } = trpc.business.getEmployees.useQuery(
    businessId ? { businessId } : undefined,
    { enabled: !!businessId }
  );
  
  const { data: appointments } = trpc.appointment.getByBusiness.useQuery(
    businessId ? { businessId } : undefined,
    { enabled: !!businessId }
  );

  // Aktif randevuları hesapla (pending + confirmed)
  const activeAppointments = appointments?.filter((a: any) => 
    a.status === 'pending' || a.status === 'confirmed'
  ).length || 0;

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 animate-pulse">
        <span className="text-5xl mb-2">⏳</span>
        <span className="text-lg text-gray-400">İşletme bilgileri yükleniyor...</span>
      </main>
    );
  }

  if (!business) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-5xl mb-2">🏢</span>
        <span className="text-lg text-gray-500">Henüz işletmeniz yok.</span>
        <span className="text-sm text-gray-400 mt-2">Kayıt olurken işletme oluşturulmadıysa, lütfen tekrar giriş yapın.</span>
        
        {/* Debug bilgileri */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
          <p><strong>Debug Bilgileri:</strong></p>
          <p>User ID: {userId}</p>
          <p>Businesses Count: {businesses?.length || 0}</p>
          <p>Businesses: {JSON.stringify(businesses, null, 2)}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative max-w-md mx-auto p-3 pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 bg-white/70 backdrop-blur-md border-b border-white/40 mb-3">
        <div className="flex items-center justify-between">
          <div className="text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">kuado</div>
          <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/70 border border-white/50 text-gray-900 text-xs shadow-sm">
            <span>←</span>
            <span className="hidden sm:inline">User</span>
          </button>
        </div>
      </div>

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
      <div className="grid grid-cols-3 gap-2">
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
    </main>
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