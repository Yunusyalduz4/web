"use client";
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

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
      router.push('/dashboard');
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 px-3">
      <div className="w-full max-w-md">
        <div className="mb-3 text-center text-sm font-bold text-gray-800 select-none">KUADO</div>
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
              className="rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
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
              className="rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
              autoComplete="current-password"
              placeholder="••••••"
              aria-label="Şifre"
            />
          </label>
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