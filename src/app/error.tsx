"use client";
import { useRouter } from "next/navigation";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-white to-blue-50 px-4 animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <span className="text-7xl md:text-9xl font-extrabold bg-gradient-to-r from-pink-600 to-blue-500 bg-clip-text text-transparent drop-shadow-lg select-none animate-bounce">500</span>
        <span className="text-2xl md:text-3xl font-bold text-gray-700 text-center">Bir Hata Oluştu</span>
        <span className="text-lg text-gray-500 text-center">Üzgünüz, bir şeyler ters gitti.<br />Lütfen daha sonra tekrar deneyin.</span>
        <button
          className="mt-6 px-8 py-3 rounded-full bg-pink-600 text-white font-semibold text-lg shadow-lg hover:bg-pink-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
          onClick={() => router.push("/")}
        >
          Ana Sayfaya Dön
        </button>
        <button
          className="mt-2 px-8 py-2 rounded-full bg-gray-200 text-gray-700 font-semibold text-lg shadow hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
          onClick={reset}
        >
          Sayfayı Yenile
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