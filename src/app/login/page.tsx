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
    <main className="flex flex-col items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-2xl font-bold mb-2">Giriş Yap</h2>
        <label className="flex flex-col gap-1">
          E-posta
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Şifre
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="border rounded px-3 py-2" />
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Giriş Yap</button>
        <a href="/register" className="text-blue-600 hover:underline text-sm text-center">Hesabınız yok mu? Kayıt olun</a>
      </form>
    </main>
  );
} 