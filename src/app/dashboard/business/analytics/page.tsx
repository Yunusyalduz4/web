"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function BusinessAnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 p-4">
      {/* Bakım Modu İçeriği */}
      <div className="max-w-md mx-auto text-center">
        {/* İkon */}
        <div className="w-24 h-24 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
          <span className="text-4xl">🔧</span>
        </div>
        
        {/* Başlık */}
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Bakım Modu
        </h1>
        
        {/* Açıklama */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/60 mb-6">
          <p className="text-gray-600 leading-relaxed mb-4">
            📊 <strong>Analitik sayfası</strong> şu anda geliştirme aşamasında. 
            Daha iyi bir deneyim sunmak için sayfayı yeniden tasarlıyoruz.
          </p>
          
          <p className="text-sm text-gray-500 mb-4">
            Bu süreçte diğer tüm özellikler normal şekilde çalışmaya devam edecek.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              💡 <strong>Yakında:</strong> Detaylı istatistikler, grafikler ve raporlar
            </p>
          </div>
        </div>
        
        {/* Geri Dön Butonu */}
        <button
          onClick={() => router.push('/dashboard/business')}
          className="w-full bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          🏠 Ana Sayfaya Dön
        </button>
        
        {/* Alt Bilgi */}
        <p className="text-xs text-gray-400 mt-4">
          Bu sayfa geçici olarak bakım modundadır
        </p>
      </div>
    </main>
  );
}