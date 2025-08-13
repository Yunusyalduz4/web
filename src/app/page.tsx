"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 px-4">
      <div className="w-full max-w-md py-10 animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="text-xs font-semibold tracking-wide text-gray-700 select-none">KUADO</div>
        </div>

        {/* Hero */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">KUADO</h1>
          <p className="mt-3 text-gray-700 text-base leading-6 max-w-sm mx-auto">
            Kuaför randevunu saniyeler içinde oluştur. En yakın işletmeleri keşfet, favorilerine ekle, bildirimleri al.
          </p>
        </div>

        {/* Phone mock */}
        <div className="mt-7 mx-auto w-full">
          <div className="mx-auto w-[260px] h-[520px] rounded-[32px] border-2 border-white/60 bg-white/70 backdrop-blur-md shadow-[0_20px_50px_-20px_rgba(16,24,40,.25)] relative overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-2 w-24 h-5 rounded-full bg-black/20" />
            {/* Header */}
            <div className="px-3 pt-7 pb-2 bg-gradient-to-r from-rose-50/40 to-indigo-50/40 border-b border-white/60">
              <div className="text-[11px] font-semibold text-gray-800">Yakındaki İşletmeler</div>
            </div>
            {/* Cards mock */}
            <div className="p-3 space-y-2">
              <div className="rounded-xl border border-white/60 bg-white/80 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-400 to-indigo-400" />
                  <div className="min-w-0 flex-1">
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                    <div className="mt-1 h-2.5 w-36 bg-gray-100 rounded" />
                  </div>
                  <div className="text-[10px] px-2 py-0.5 rounded bg-white border border-white/60 text-gray-700">1.2 km</div>
                </div>
              </div>
              <div className="rounded-xl border border-white/60 bg-white/80 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
                  <div className="min-w-0 flex-1">
                    <div className="h-3 w-28 bg-gray-200 rounded" />
                    <div className="mt-1 h-2.5 w-24 bg-gray-100 rounded" />
                  </div>
                  <div className="text-[10px] px-2 py-0.5 rounded bg-white border border-white/60 text-gray-700">0.8 km</div>
                </div>
              </div>
              <div className="rounded-xl border border-white/60 bg-white/80 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-fuchsia-400 to-rose-400" />
                  <div className="min-w-0 flex-1">
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                    <div className="mt-1 h-2.5 w-40 bg-gray-100 rounded" />
                  </div>
                  <div className="text-[10px] px-2 py-0.5 rounded bg-white border border-white/60 text-gray-700">2.4 km</div>
                </div>
              </div>
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

        {/* CTAs */}
        <div className="mt-6 grid grid-cols-1 gap-2">
          <button
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition"
            onClick={() => router.push("/login")}
          >
            Giriş Yap
          </button>
          <button
            className="w-full py-2.5 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm"
            onClick={() => router.push("/register")}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="text-[11px] text-gray-500">© {new Date().getFullYear()} KUADO</div>
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
