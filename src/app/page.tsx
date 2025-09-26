"use client";
import { useEffect, useState } from "react";
import Link from 'next/link';

export default function LandingPage() {
  const [isClient, setIsClient] = useState(false);

  // Client-side hydration'ı bekle
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sayfa yüklendiğinde push notification izni iste
  useEffect(() => {
    const timer = setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);


  // Hydration hatasını önlemek için client-side render'ı bekle
  if (!isClient) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/60">
          <div className="max-w-md mx-auto p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-gray-800">RANDEVUO</div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md">
                  Giriş
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm font-semibold">
                  Kayıt
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 pt-6 pb-2">
          <div className="block w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white text-lg font-semibold text-center shadow-lg backdrop-blur-sm">
            İşletmeleri Keşfedin
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-8 animate-fade-in">
          <div className="text-center mb-6">
            <div className="text-xs font-semibold tracking-wide text-gray-700 select-none">RANDEVUO</div>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">RANDEVUO</h1>
            <p className="mt-3 text-gray-700 text-base leading-6 max-w-sm mx-auto">
              Kuaför randevunu saniyeler içinde oluştur. En yakın işletmeleri keşfet, favorilerine ekle, bildirimleri al.
            </p>
          </div>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/60">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-gray-800">RANDEVUO</div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition"
              >
                Giriş
              </Link>
              <Link
                href="/register"
                className="px-3 py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm font-semibold hover:bg-white/90 transition"
              >
                Kayıt
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero CTA Button */}
      <div className="max-w-md mx-auto px-4 pt-6 pb-2">
        <Link
          href="/dashboard/user/businesses"
          className="block w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white text-lg font-semibold text-center shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm"
        >
          İşletmeleri Keşfedin
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-8 animate-fade-in">


        {/* Hero */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">RANDEVUO</h1>
          <p className="mt-3 text-gray-700 text-base leading-6 max-w-sm mx-auto">
            Kuaför randevunu saniyeler içinde oluştur. En yakın işletmeleri keşfet, favorilerine ekle, bildirimleri al.
          </p>
        </div>

        {/* Phone mock with video */}
        <div className="mt-7 mx-auto w-full">
          <div className="mx-auto w-[260px] h-[520px] rounded-[32px] border-2 border-white/60 bg-white/70 backdrop-blur-md shadow-[0_20px_50px_-20px_rgba(16,24,40,.25)] relative overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-2 w-24 h-5 rounded-full bg-black/20 z-10" />
            {/* Video content */}
            <div className="w-full h-full rounded-[30px] overflow-hidden">
              <img 
                src="/mockup-demo.gif" 
                alt="RANDEVUO App Demo" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Feature chips */}
        <div className="mt-7 grid grid-cols-2 gap-2">
          <div className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-[12px] text-gray-800">⚡ Hızlı randevu</div>
          <div className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-[12px] text-gray-800">🗺️ Harita</div>
          <div className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-[12px] text-gray-800">🤍 Favoriler</div>
          <div className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-[12px] text-gray-800">🔔 Bildirim</div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center space-y-1">
          <div className="text-[11px] text-gray-500">© {new Date().getFullYear()} RANDEVUO</div>
          <div className="text-[12px]">
            <Link href="/gizlilik" className="text-gray-600 hover:text-gray-800 underline">Gizlilik ve Şartlar</Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in .6s cubic-bezier(0.4,0,0.2,1) both; }
      `}</style>
    </main>
  );
}
