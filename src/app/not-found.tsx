"use client";
import { useRouter } from "next/navigation";

export default function NotFoundPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-pink-50 px-4 animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <span className="text-7xl md:text-9xl font-extrabold bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent drop-shadow-lg select-none animate-bounce">404</span>
        <span className="text-2xl md:text-3xl font-bold text-gray-700 text-center">Sayfa Bulunamadı</span>
        <span className="text-lg text-gray-500 text-center">Aradığınız sayfa burada yok.<br />Belki ana sayfaya dönmek istersiniz?</span>
        <button
          className="mt-6 px-8 py-3 rounded-full bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => router.push("/")}
        >
          Ana Sayfaya Dön
        </button>
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