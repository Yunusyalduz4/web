"use client";
import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserCredentials } from '../../hooks/useLocalStorage';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  
  const { credentials, saveCredentials, clearCredentials } = useUserCredentials();

  // Client-side hydration'ı bekle
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sayfa yüklendiğinde kayıtlı bilgileri yükle (sadece client-side'da)
  useEffect(() => {
    if (isClient && credentials.rememberMe && credentials.email && credentials.password) {
      setEmail(credentials.email);
      setPassword(credentials.password);
      setRememberMe(true);
    }
  }, [credentials, isClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    
    if (res?.error) {
      setError('E-posta veya şifre hatalı');
    } else {
      // Giriş başarılıysa bilgileri kaydet
      saveCredentials(email, password, rememberMe);
      router.push('/dashboard');
    }
  };

  const handleClearCredentials = () => {
    clearCredentials();
    setEmail('');
    setPassword('');
    setRememberMe(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 px-3">
      <div className="w-full max-w-md">
        <div className="mb-3 text-center text-sm font-bold text-gray-800 select-none">RANDEVUO</div>
        <form
          onSubmit={handleSubmit}
          className="w-full bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-3 flex flex-col gap-3 animate-fade-in"
          aria-label="Giriş Formu"
        >
          <h2 className="text-lg font-semibold text-center text-gray-900">Giriş Yap</h2>
          <label className="flex flex-col">
            <span className="text-[11px] text-gray-600 mb-1">E-posta</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="rounded-xl px-4 py-3 text-base bg-white/90 border-2 border-gradient-to-r from-rose-200 via-fuchsia-200 to-indigo-200 shadow-lg shadow-rose-100/50 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-rose-200/50 focus:border-rose-300 transition-all duration-300"
              style={{ fontSize: '16px' }}
              autoComplete="email"
              placeholder="ornek@mail.com"
              aria-label="E-posta"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-[11px] text-gray-600 mb-1">Şifre</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="rounded-xl px-4 py-3 text-base bg-white/90 border-2 border-gradient-to-r from-rose-200 via-fuchsia-200 to-indigo-200 shadow-lg shadow-rose-100/50 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-rose-200/50 focus:border-rose-300 transition-all duration-300"
              style={{ fontSize: '16px' }}
              autoComplete="current-password"
              placeholder="••••••"
              aria-label="Şifre"
            />
          </label>
          
          {/* Şifremi Unuttum Linki */}
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-[11px] text-rose-600 hover:text-rose-700 underline"
            >
              Şifremi Unuttum
            </Link>
          </div>
          
          {/* Beni Hatırla ve Bilgileri Temizle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-5 h-5 text-rose-600 bg-white/90 border-2 border-gradient-to-r from-rose-200 to-fuchsia-200 rounded-lg focus:ring-4 focus:ring-rose-200/50 focus:border-rose-300 transition-all duration-300 shadow-md"
                style={{ fontSize: '16px' }}
              />
              <span className="text-[11px] text-gray-700">Beni Hatırla</span>
            </label>
            {isClient && credentials.rememberMe && credentials.email && (
              <button
                type="button"
                onClick={handleClearCredentials}
                className="text-[10px] text-rose-600 hover:text-rose-700 underline"
              >
                Bilgileri Temizle
              </button>
            )}
          </div>
          
          {error && <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700 text-center">{error}</div>}
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition"
          >
            Giriş Yap
          </button>
          <button
            type="button"
            className="w-full py-2.5 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm"
            onClick={() => router.push('/register')}
          >
            Kayıt Ol
          </button>
        </form>
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in .5s cubic-bezier(0.4,0,0.2,1) both; }
      `}</style>
    </main>
  );
} 