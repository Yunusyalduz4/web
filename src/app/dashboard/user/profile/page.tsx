"use client";
import { useSession } from 'next-auth/react';
import { trpc } from '../../../../utils/trpcClient';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function UserProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user.id;

  const [profileState, setProfileState] = useState<any>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const { data: profile, isLoading: profileLoading, refetch } = userId
    ? trpc.user.getProfile.useQuery({ userId })
    : { data: null, isLoading: true, refetch: () => {} };
  const updateProfile = trpc.user.updateProfile.useMutation();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name, email: profile.email, password: '' });
    }
  }, [profile]);

  if (status === 'loading') return <div>Yükleniyor...</div>;
  if (!session) {
    router.replace('/login');
    return null;
  }
  if (session.user.role !== 'user') {
    router.replace('/dashboard');
    return null;
  }
  if (!userId) return <div>Yükleniyor...</div>;

  const handleChange = (e: any) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await updateProfile.mutateAsync({ userId, name: form.name, email: form.email, password: form.password || undefined });
      setSuccess('Profil güncellendi!');
      setForm(f => ({ ...f, password: '' }));
      refetch();
    } catch (err: any) {
      if (err.data?.code === 'UNAUTHORIZED') {
        router.replace('/login');
        return;
      }
      if (err.data?.code === 'FORBIDDEN') {
        setError('Bu işlemi yapmaya yetkiniz yok.');
        return;
      }
      setError(err.message || 'Hata oluştu');
    }
  };

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Profilim</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 bg-white p-4 rounded shadow">
        <label className="flex flex-col gap-1">
          İsim
          <input name="name" value={form.name} onChange={handleChange} className="border rounded px-3 py-2" required />
        </label>
        <label className="flex flex-col gap-1">
          E-posta
          <input name="email" type="email" value={form.email} onChange={handleChange} className="border rounded px-3 py-2" required />
        </label>
        <label className="flex flex-col gap-1">
          Yeni Şifre (değiştirmek istemiyorsanız boş bırakın)
          <input name="password" type="password" value={form.password} onChange={handleChange} className="border rounded px-3 py-2" />
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Kaydet</button>
      </form>
    </main>
  );
} 