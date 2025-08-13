"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';
import React from 'react';

export default function UserProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery(userId ? { userId } : skipToken);
  const updateMutation = trpc.user.updateProfile.useMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profil yüklendiğinde inputlara aktar
  React.useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!userId) return;
    try {
      await updateMutation.mutateAsync({ userId, name, email, password: password || undefined, phone, address });
      setSuccess('Profil başarıyla güncellendi!');
      setPassword('');
      setTimeout(() => router.refresh(), 1200);
    } catch (err: any) {
      setError(err.message || 'Profil güncellenemedi');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-base text-gray-600">Profil yükleniyor…</span>
      </main>
    );
  }

  return (
    <main className="relative max-w-md mx-auto p-3 pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 bg-white/70 backdrop-blur-md border-b border-white/40">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/70 border border-white/50 text-gray-900 text-xs">
            <span>←</span>
            <span className="hidden sm:inline">Geri</span>
          </button>
          <div className="text-sm font-bold tracking-tight text-gray-800">Profil</div>
          <div className="w-6" />
        </div>
      </div>

      {/* Header Mini */}
      <section className="mt-3 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-bold grid place-items-center">
            {(profile?.name?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{profile?.name || 'Kullanıcı'}</div>
            <div className="text-xs text-gray-600 truncate">{profile?.email || ''}</div>
          </div>
        </div>
      </section>

      {/* Form - Minimal */}
      <section className="mt-3 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">Ad Soyad</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
              autoComplete="name"
              placeholder="Adınız ve soyadınız"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              autoComplete="email"
              placeholder="E-posta adresiniz"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">Telefon</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-200"
              autoComplete="tel"
              placeholder="05xx xxx xx xx"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">Adres</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
              placeholder="Adresiniz"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">Yeni Şifre (opsiyonel)</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
              autoComplete="new-password"
              placeholder="Yeni şifreniz"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700">{error}</div>
          )}
          {success && (
            <div className="px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-[12px] text-green-700">{success}</div>
          )}

          <button
            type="submit"
            disabled={updateMutation.isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-60"
          >
            {updateMutation.isLoading ? 'Güncelleniyor…' : 'Kaydet'}
          </button>
        </form>
      </section>

      {/* Logout */}
      <section className="mt-3">
        <button
          onClick={handleLogout}
          className="w-full py-2.5 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm"
        >
          Çıkış Yap
        </button>
      </section>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        html, body { font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
      `}</style>
    </main>
  );
} 