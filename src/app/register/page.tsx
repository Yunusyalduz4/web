"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../../utils/trpcClient';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'business'>('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const registerMutation = trpc.auth.register.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await registerMutation.mutateAsync({ name, email, password, role });
      setSuccess('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız');
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm flex flex-col gap-4">
        <h2 className="text-2xl font-bold mb-2">Kayıt Ol</h2>
        <label className="flex flex-col gap-1">
          İsim
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          E-posta
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Şifre
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="border rounded px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Rol
          <select value={role} onChange={e => setRole(e.target.value as 'user' | 'business')} className="border rounded px-3 py-2">
            <option value="user">Müşteri</option>
            <option value="business">İşletme</option>
          </select>
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Kayıt Ol</button>
        <a href="/login" className="text-blue-600 hover:underline text-sm text-center">Zaten hesabınız var mı? Giriş yapın</a>
      </form>
    </main>
  );
} 