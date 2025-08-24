"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function TestPasswordResetPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const testForgotPassword = async () => {
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
        <div className="mb-3 text-center text-sm font-bold text-gray-800 select-none">RANDEVUO - Test</div>
        <div className="w-full bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-3 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-center text-gray-900">Şifre Sıfırlama Test</h2>
          
          <div className="space-y-3">
            <label className="flex flex-col">
              <span className="text-[11px] text-gray-600 mb-1">Test Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="test@example.com"
              />
            </label>
            
            <button
              onClick={testForgotPassword}
              disabled={isLoading || !email}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Test Ediliyor...' : 'Şifre Sıfırlama Test Et'}
            </button>
            
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
          </div>
          
          <div className="text-center space-y-2">
            <Link
              href="/forgot-password"
              className="block text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Gerçek Şifre Sıfırlama Sayfası
            </Link>
            <Link
              href="/login"
              className="block text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Giriş Sayfası
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
