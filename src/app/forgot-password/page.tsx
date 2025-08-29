"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setEmail('');
      } else {
        setError(data.error || 'Bir hata oluştu');
      }
    } catch (error) {
      setError('Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 px-3">
      <div className="w-full max-w-md">
        <div className="mb-3 text-center text-sm font-bold text-gray-800 select-none">RANDEVUO</div>
        <form
          onSubmit={handleSubmit}
          className="w-full bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-3 flex flex-col gap-3 animate-fade-in"
          aria-label="Şifre Sıfırlama Formu"
        >
          <h2 className="text-lg font-semibold text-center text-gray-900">Şifremi Unuttum</h2>
          <p className="text-sm text-gray-600 text-center">
            E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
          </p>
          
          <label className="flex flex-col">
            <span className="text-[11px] text-gray-600 mb-1">E-posta</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
              style={{ fontSize: '16px' }}
              autoComplete="email"
              placeholder="ornek@mail.com"
              aria-label="E-posta"
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
            {isLoading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Bağlantısı Gönder'}
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
      `}</style>
    </main>
  );
}
