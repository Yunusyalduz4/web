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
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 w-full flex flex-col gap-2 animate-fade-in">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none mb-1">{business.name}</h1>
        <span className="text-gray-500 text-sm">{business.address}</span>
        <span className="text-gray-400 text-xs">{business.phone}</span>
        <span className="text-gray-400 text-xs">{business.email}</span>
        <span className="text-gray-600 text-sm mt-2">{business.description}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
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
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </main>
  );
}

function DashboardCard({ title, icon, onClick, color }: { title: string; icon: string; onClick: () => void; color: string }) {
  return (
    <button
      className={`flex flex-col items-center justify-center gap-2 p-6 rounded-2xl shadow bg-gradient-to-br ${color} text-white font-bold text-lg hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 animate-fade-in`}
      onClick={onClick}
    >
      <span className="text-4xl select-none">{icon}</span>
      <span>{title}</span>
    </button>
  );
} 