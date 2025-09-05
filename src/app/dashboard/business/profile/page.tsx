"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';
import React from 'react';
import { usePushNotifications } from '../../../../hooks/usePushNotifications';
import { handleLogout } from '../../../../utils/authUtils';
import { useRealTimeBusiness } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';

export default function BusinessProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: business, isLoading: businessLoading } = trpc.business.getBusinessByUserId.useQuery(userId ? { userId } : skipToken);
  const updateMutation = trpc.business.updateBusinessProfile.useMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Push notification hook - her zaman çağır, business null olsa bile
  const {
    isSupported,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe
  } = usePushNotifications(business?.id || null);

  // Profil yüklendiğinde inputlara aktar
  React.useEffect(() => {
    if (business) {
      setName(business.name || '');
      setEmail(business.email || '');
    }
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!business?.id) return;
    try {
      await updateMutation.mutateAsync({ 
        businessId: business.id, 
        name, 
        email, 
        password: password || undefined 
      });
      setSuccess('Profil başarıyla güncellendi!');
      setPassword('');
      setTimeout(() => router.refresh(), 1200);
    } catch (err: any) {
      setError(err.message || 'Profil güncellenemedi');
    }
  };

  const handleBusinessLogout = async () => {
    await handleLogout();
  };

  // Show loading if business is still loading
  if (businessLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-pulse">
        <span className="text-5xl mb-2">⏳</span>
        <span className="text-lg text-gray-400">İşletme bilgileri yükleniyor...</span>
      </main>
    );
  }



  return (
    <main className="relative max-w-md mx-auto p-3 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 bg-white/70 backdrop-blur-md border-b border-white/40">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/dashboard/business')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/70 border border-white/50 text-gray-900 text-xs">
            <span>←</span>
            <span className="hidden sm:inline">Geri</span>
          </button>
          <div className="text-sm font-bold tracking-tight text-gray-800">İşletme Profili</div>
          <div className="w-6" />
        </div>
      </div>

      {/* Form - Minimal */}
      <section className="mt-3 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">Ad Soyad</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">E-posta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">Yeni Şifre (opsiyonel)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
          </div>
          {error && <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700">{error}</div>}
          {success && <div className="px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-[12px] text-green-700">{success}</div>}
          <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition">Kaydet</button>
        </form>
      </section>

      {/* Push Notification - Minimal */}
      {isSupported && business && (
        <section className="mt-3 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Push Bildirimleri</div>
              <div className="text-[12px] text-gray-600">{isSubscribed ? 'Yeni randevular için bildirim alınıyor' : 'Yeni randevular için bildirim almak ister misiniz?'}</div>
            </div>
            <button onClick={isSubscribed ? unsubscribe : subscribe} disabled={pushLoading} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${isSubscribed ? 'bg-red-500 text-white' : 'bg-green-500 text-white'} disabled:opacity-50`}>{pushLoading ? '⏳' : isSubscribed ? 'Kapat' : 'Aç'}</button>
          </div>
          {pushError && <div className="mt-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700">{pushError}</div>}
        </section>
      )}

      {/* Logout */}
      <section className="mt-3">
        <button onClick={handleBusinessLogout} className="w-full py-2.5 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm">Çıkış Yap</button>
      </section>
    </main>
  );
} 