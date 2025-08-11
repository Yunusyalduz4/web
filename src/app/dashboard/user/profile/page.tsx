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
    <main className="max-w-2xl mx-auto p-4 pb-24 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-white/30 hover:border-blue-200/50"
        >
          <span className="text-lg">←</span>
          <span className="font-medium text-gray-700">Geri Dön</span>
        </button>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
          👤
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8 border border-white/20 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-2xl mx-auto mb-4">
            {profile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent select-none mb-2">
            Profilim
          </h1>
          <p className="text-gray-600 text-sm">
            Kişisel bilgilerinizi güncelleyin
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 animate-fade-in">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-gray-700 font-semibold text-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm">
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
                className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                autoComplete="name"
                aria-label="Ad Soyad"
                placeholder="Adınız ve soyadınız"
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-gray-700 font-semibold text-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-sm">
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
                className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all duration-300 bg-white/50 backdrop-blur-sm"
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
                className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-white/50 backdrop-blur-sm"
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
                className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                aria-label="Adres"
                placeholder="Adresinizi girin"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-gray-700 font-semibold text-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">
                🔒
              </div>
              Yeni Şifre (Opsiyonel)
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300 bg-white/50 backdrop-blur-sm"
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
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3"
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
      <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
            🚪
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oturumu Kapat</h2>
          <p className="text-gray-600 text-sm">
            Güvenli bir şekilde çıkış yapın
          </p>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-red-200 transform hover:scale-105 flex items-center justify-center gap-3"
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
    </main>
  );
} 