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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-pink-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-6 animate-fade-in"
        aria-label="Giriş Formu"
      >
        <h2 className="text-3xl font-extrabold text-center bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent mb-2 select-none">
          Giriş Yap
        </h2>
        <label className="flex flex-col gap-1 text-gray-700 font-medium">
          E-posta
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            autoComplete="email"
            aria-label="E-posta"
          />
        </label>
        <label className="flex flex-col gap-1 text-gray-700 font-medium">
          Şifre
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
            autoComplete="current-password"
            aria-label="Şifre"
          />
        </label>
        {error && <div className="text-red-600 text-sm text-center animate-shake">{error}</div>}
        <button
          type="submit"
          className="w-full py-3 rounded-full bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Giriş Yap
        </button>
        <button
          type="button"
          className="w-full py-3 rounded-full bg-pink-500 text-white font-semibold text-lg shadow-lg hover:bg-pink-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
          onClick={() => router.push('/register')}
        >
          Kayıt Ol
        </button>
      </form>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </main>
  );
} 