"use client";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-red-50 px-4 animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <span className="text-7xl md:text-9xl font-extrabold bg-gradient-to-r from-yellow-500 to-red-500 bg-clip-text text-transparent drop-shadow-lg select-none animate-bounce">403</span>
        <span className="text-2xl md:text-3xl font-bold text-gray-700 text-center">Yetkisiz Erişim</span>
        <span className="text-lg text-gray-500 text-center">Bu sayfaya erişim izniniz yok.<br />Giriş yaparak tekrar deneyebilirsiniz.</span>
        <div className="flex gap-4 mt-6">
          <button
            className="px-8 py-3 rounded-full bg-yellow-500 text-white font-semibold text-lg shadow-lg hover:bg-yellow-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            onClick={() => router.push("/")}
          >
            Ana Sayfaya Dön
          </button>
          <button
            className="px-8 py-3 rounded-full bg-red-500 text-white font-semibold text-lg shadow-lg hover:bg-red-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            onClick={() => router.push("/login")}
          >
            Giriş Yap
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        .animate-bounce {
          animation: bounce 1.2s infinite cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </main>
  );
} 