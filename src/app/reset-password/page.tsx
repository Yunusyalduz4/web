"use client";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Geçersiz şifre sıfırlama bağlantısı');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Şifreniz başarıyla sıfırlandı! Giriş sayfasına yönlendiriliyorsunuz...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'Bir hata oluştu');
      }
    } catch (error) {
      setError('Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 px-3">
        <div className="w-full max-w-md text-center">
          <div className="mb-3 text-sm font-bold text-gray-800">RANDEVUO</div>
          <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Hata</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
              href="/forgot-password"
              className="inline-block px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
            >
              Tekrar Dene
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 px-3">
      <div className="w-full max-w-md">
        <div className="mb-3 text-center text-sm font-bold text-gray-800 select-none">RANDEVUO</div>
        <form
          onSubmit={handleSubmit}
          className="w-full bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-3 flex flex-col gap-3 animate-fade-in"
          aria-label="Şifre Sıfırlama Formu"
        >
          <h2 className="text-lg font-semibold text-center text-gray-900">Yeni Şifre Belirle</h2>
          <p className="text-sm text-gray-600 text-center">
            Yeni şifrenizi belirleyin.
          </p>
          
          <label className="flex flex-col">
            <span className="text-[11px] text-gray-600 mb-1">Yeni Şifre</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
              autoComplete="new-password"
              placeholder="••••••"
              aria-label="Yeni Şifre"
              disabled={isLoading}
            />
          </label>
          
          <label className="flex flex-col">
            <span className="text-[11px] text-gray-600 mb-1">Şifre Tekrar</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
              autoComplete="new-password"
              placeholder="••••••"
              aria-label="Şifre Tekrar"
              disabled={isLoading}
            />
          </label>
          
          {error && (
            <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700 text-center">
              {error}
            </div>
          )}
          
          {message && (
            <div className="px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-[12px] text-green-700 text-center">
              {message}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Şifre Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
          </button>
          
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Giriş sayfasına dön
            </Link>
          </div>
        </form>
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in .5s cubic-bezier(0.4,0,0.2,1) both; }
      `}      </style>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 px-3">
        <div className="w-full max-w-md text-center">
          <div className="mb-3 text-sm font-bold text-gray-800">RANDEVUO</div>
          <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Yükleniyor...</h2>
            <p className="text-gray-600">Şifre sıfırlama sayfası yükleniyor...</p>
          </div>
        </div>
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
