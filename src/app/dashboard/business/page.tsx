"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';

export default function BusinessDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses, isLoading } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;

  // Gerçek verileri çek
  const { data: services } = trpc.business.getServices.useQuery(
    businessId ? { businessId } : undefined,
    { enabled: !!businessId }
  );
  
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
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-pulse">
        <span className="text-5xl mb-2">⏳</span>
        <span className="text-lg text-gray-400">İşletme bilgileri yükleniyor...</span>
      </main>
    );
  }

  if (!business) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
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
    <main className="max-w-2xl mx-auto p-4 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 flex flex-col items-center animate-fade-in">
      <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 mb-6 w-full animate-fade-in border border-white/20 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-pink-400/10 to-orange-400/10 rounded-full translate-y-12 -translate-x-12"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header with Icon */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🏢</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent select-none">
                {business.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  Aktif
                </span>
              </div>
            </div>
          </div>
          
          {/* Business Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100/30">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📍</span>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Adres</p>
                <p className="text-sm text-gray-700 font-medium">{business.address}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100/30">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📞</span>
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Telefon</p>
                <p className="text-sm text-gray-700 font-medium">{business.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100/30">
              <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">✉️</span>
              </div>
              <div>
                <p className="text-xs text-pink-600 font-medium">E-posta</p>
                <p className="text-sm text-gray-700 font-medium">{business.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50/50 rounded-xl border border-green-100/30">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">ℹ️</span>
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Açıklama</p>
                <p className="text-sm text-gray-700 font-medium line-clamp-2">{business.description}</p>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{activeAppointments}</p>
              <p className="text-xs text-gray-500">Aktif Randevu</p>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{services?.length || 0}</p>
              <p className="text-xs text-gray-500">Toplam Hizmet</p>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{employees?.length || 0}</p>
              <p className="text-xs text-gray-500">Çalışan</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full mb-8">
        <DashboardCard
          title="İşletme Düzenle"
          icon="⚙️"
          onClick={() => router.push('/dashboard/business/edit')}
          color="from-purple-400 to-purple-600"
        />
        <DashboardCard
          title="Hizmetler"
          icon="💇‍♂️"
          onClick={() => router.push('/dashboard/business/services')}
          color="from-blue-400 to-blue-600"
        />
        <DashboardCard
          title="Çalışanlar"
          icon="✂️"
          onClick={() => router.push('/dashboard/business/employees')}
          color="from-pink-400 to-pink-600"
        />
        <DashboardCard
          title="Randevular"
          icon="📅"
          onClick={() => router.push('/dashboard/business/appointments')}
          color="from-green-400 to-green-600"
        />
        <DashboardCard
          title="İstatistikler"
          icon="📊"
          onClick={() => router.push('/dashboard/business/analytics')}
          color="from-yellow-400 to-yellow-600"
        />
        <DashboardCard
          title="Profil"
          icon="👤"
          onClick={() => router.push('/dashboard/business/profile')}
          color="from-indigo-400 to-indigo-600"
        />
        <DashboardCard
          title="Değerlendirmeler"
          icon="⭐"
          onClick={() => router.push('/dashboard/business/reviews')}
          color="from-yellow-400 to-orange-500"
        />
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </main>
  );
}

function DashboardCard({ title, icon, onClick, color }: { title: string; icon: string; onClick: () => void; color: string }) {
  return (
    <button
      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl shadow bg-gradient-to-br ${color} text-white font-bold text-xs hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 animate-fade-in`}
      onClick={onClick}
    >
      <span className="text-2xl select-none">{icon}</span>
      <span className="text-center leading-tight">{title}</span>
    </button>
  );
} 