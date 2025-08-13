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
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-pulse">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">⏳</span>
        </div>
        <span className="text-lg text-gray-600 font-medium">Profil yükleniyor...</span>
      </main>
    );
  }

  return (
    <main className="relative max-w-2xl mx-auto p-4 pb-28 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 animate-fade-in">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">kuado</div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-white/40"
          >
            <span className="text-lg">←</span>
            <span className="font-medium text-gray-700">Geri</span>
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-xl p-8 mb-8 border border-white/40 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-rose-600 via-fuchsia-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-2xl mx-auto mb-4">
            {profile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none mb-2">
            Profilim
          </h1>
          <p className="text-gray-600 text-sm">
            Kişisel bilgilerinizi güncelleyin
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-xl p-8 border border-white/40 animate-fade-in">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-gray-800 font-semibold text-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center text-white text-sm">
                👤
              </div>
              Ad Soyad
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full border border-white/40 rounded-2xl px-6 py-4 text-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all duration-300 bg-white/60 backdrop-blur-md"
                autoComplete="name"
                aria-label="Ad Soyad"
                placeholder="Adınız ve soyadınız"
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-gray-800 font-semibold text-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center text-white text-sm">
                ✉️
              </div>
              E-posta
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-white/40 rounded-2xl px-6 py-4 text-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all duration-300 bg-white/60 backdrop-blur-md"
                autoComplete="email"
                aria-label="E-posta"
                placeholder="E-posta adresiniz"
              />
            </div>
          </div>

          {/* Phone Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-gray-700 font-semibold text-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-sm">
                📞
              </div>
              Telefon
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-white/40 rounded-2xl px-6 py-4 text-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-white/60 backdrop-blur-md"
                autoComplete="tel"
                aria-label="Telefon"
                placeholder="05xx xxx xx xx"
              />
            </div>
          </div>

          {/* Address Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-gray-700 font-semibold text-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center text-white text-sm">
                📍
              </div>
              Adres
            </label>
            <div className="relative">
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={3}
                className="w-full border border-white/40 rounded-2xl px-6 py-4 text-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all duration-300 bg-white/60 backdrop-blur-md"
                aria-label="Adres"
                placeholder="Adresinizi girin"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-gray-800 font-semibold text-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-600 to-fuchsia-700 rounded-lg flex items-center justify-center text-white text-sm">
                🔒
              </div>
              Yeni Şifre (Opsiyonel)
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-white/40 rounded-2xl px-6 py-4 text-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100 transition-all duration-300 bg-white/60 backdrop-blur-md"
                autoComplete="new-password"
                aria-label="Yeni Şifre"
                placeholder="Yeni şifrenizi girin"
              />
            </div>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 animate-shake">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">⚠️</div>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-600 animate-fade-in">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">✅</div>
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          {/* Update Button */}
          <button
            type="submit"
            disabled={updateMutation.isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-rose-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3"
          >
            {updateMutation.isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Güncelleniyor...</span>
              </>
            ) : (
              <>
                <span className="text-xl">💾</span>
                <span>Profili Güncelle</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Logout Section */}
      <div className="mt-8 bg-white/60 backdrop-blur-md rounded-3xl shadow-xl p-8 border border-white/40 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-600 to-rose-700 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
            🚪
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oturumu Kapat</h2>
          <p className="text-gray-600 text-sm">
            Güvenli bir şekilde çıkış yapın
          </p>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-rose-200 transform hover:scale-105 flex items-center justify-center gap-3"
        >
          <span className="text-xl">🚪</span>
          <span>Çıkış Yap</span>
        </button>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
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

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        html, body { font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
      `}</style>
    </main>
  );
} 