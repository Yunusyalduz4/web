"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';
import React from 'react';
import { usePushNotifications } from '../../../../hooks/usePushNotifications';

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

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Logout error:', error);
    }
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
    <main className="relative max-w-md mx-auto p-4 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 animate-fade-in">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">kuado</div>
          <button
            onClick={() => router.push('/dashboard/business')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 text-gray-900 shadow-sm hover:shadow-md transition"
          >
            <span className="text-base">←</span>
            <span className="hidden sm:inline text-sm font-medium">Geri</span>
          </button>
        </div>
        <div className="mt-3 text-sm font-semibold text-gray-800">İşletme Profili</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-white/60 backdrop-blur-md border border-white/40 p-6 rounded-2xl shadow w-full animate-fade-in">
        <h2 className="text-xl font-bold mb-2 text-center text-gray-800">Hesap Bilgileri</h2>
        
        <label className="flex flex-col gap-1 text-gray-700 font-medium">
          Ad Soyad
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="rounded-lg px-4 py-3 text-base bg-white/70 backdrop-blur-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
            autoComplete="name"
            aria-label="Ad Soyad"
          />
        </label>
        
        <label className="flex flex-col gap-1 text-gray-700 font-medium">
          E-posta
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="rounded-lg px-4 py-3 text-base bg-white/70 backdrop-blur-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
            autoComplete="email"
            aria-label="E-posta"
          />
        </label>
        
        <label className="flex flex-col gap-1 text-gray-700 font-medium">
          Yeni Şifre (Opsiyonel)
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="rounded-lg px-4 py-3 text-base bg-white/70 backdrop-blur-sm border border-white/40 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
            autoComplete="new-password"
            aria-label="Yeni Şifre"
          />
        </label>
        
        {error && <div className="text-red-600 text-sm text-center animate-shake">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center animate-fade-in">{success}</div>}
        
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-rose-200"
        >
          Profili Güncelle
        </button>
      </form>
      
      {/* Push Notification Settings */}
      {isSupported && business && (
        <div className="mt-6 w-full bg-white/60 backdrop-blur-md border border-white/40 p-6 rounded-2xl shadow">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Bildirim Ayarları</h3>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-700 font-medium">Push Bildirimleri</p>
              <p className="text-sm text-gray-500">
                {isSubscribed 
                  ? 'Yeni randevular için bildirim alıyorsunuz' 
                  : 'Yeni randevular için bildirim almak istiyor musunuz?'
                }
              </p>
            </div>
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={pushLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isSubscribed
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {pushLoading ? '⏳' : isSubscribed ? '❌ Kapat' : '🔔 Aç'}
            </button>
          </div>
          
          {pushError && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {pushError}
            </div>
          )}
          
          {!isSupported && (
            <div className="text-yellow-600 text-sm bg-yellow-50 p-3 rounded-lg">
              Bu tarayıcı push bildirimlerini desteklemiyor
            </div>
          )}
        </div>
      )}

      {/* No Business Warning */}
      {isSupported && !business && !businessLoading && (
        <div className="mt-6 w-full bg-yellow-50 p-6 rounded-2xl shadow-xl border border-yellow-200">
          <h3 className="text-lg font-bold mb-4 text-yellow-800">İşletme Hesabı Gerekli</h3>
          <p className="text-yellow-700 mb-4">
            Push bildirimleri sadece işletme hesapları için kullanılabilir. 
            Bu hesap bir işletme hesabı değil.
          </p>
          <button
            onClick={() => router.push('/dashboard/business/edit')}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-all"
          >
            İşletme Oluştur
          </button>
        </div>
      )}

      {/* Logout Button */}
      <div className="mt-6 w-full">
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-rose-200 flex items-center justify-center gap-2"
        >
          <span>🚪</span>
          Çıkış Yap
        </button>
      </div>
    </main>
  );
} 