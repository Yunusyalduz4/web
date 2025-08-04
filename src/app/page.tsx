"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-pink-50 px-4">
      <div className="max-w-2xl w-full flex flex-col items-center gap-8 py-16 animate-fade-in">
        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent drop-shadow-lg select-none">
            Kuaför Randevu Sistemi
          </span>
          <span className="text-lg md:text-xl text-gray-600 mt-2 text-center">
            Modern, hızlı ve kolay randevu yönetimi. En iyi kuaförler, en iyi deneyim!
          </span>
        </div>
        <div className="flex gap-4 mt-6">
          <button
            className="px-8 py-3 rounded-full bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => router.push("/login")}
          >
            Giriş Yap
          </button>
          <button
            className="px-8 py-3 rounded-full bg-pink-500 text-white font-semibold text-lg shadow-lg hover:bg-pink-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
            onClick={() => router.push("/register")}
          >
            Kayıt Ol
          </button>
        </div>
        <div className="mt-10 flex flex-col items-center gap-2">
          <span className="text-gray-400 text-sm">Powered by Next.js, tRPC, PostgreSQL, Tailwind CSS</span>
          <span className="text-xs text-gray-300">© {new Date().getFullYear()} KuaförApp</span>
        </div>
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
      </main>
  );
}
