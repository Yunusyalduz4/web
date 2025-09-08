"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useUserCredentials } from '../../hooks/useLocalStorage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  
  const { credentials, saveCredentials, clearCredentials } = useUserCredentials();

  // Client-side hydration'ı bekle
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sayfa yüklendiğinde kayıtlı bilgileri yükle (sadece client-side'da)
  useEffect(() => {
    if (isClient && credentials.rememberMe && credentials.email && credentials.password) {
      setEmail(credentials.email);
      setPassword(credentials.password);
      setRememberMe(true);
    }
  }, [credentials, isClient]);

  // Hydration hatasını önlemek için client-side render'ı bekle
  if (!isClient) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/60">
          <div className="max-w-md mx-auto p-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-sm font-bold text-gray-800">RANDEVUO</Link>
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md">
                  Giriş
                </div>
                <Link
                  href="/register"
                  className="px-3 py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm font-semibold"
                >
                  Kayıt
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Giriş Yap</h1>
            <p className="text-gray-600 text-sm mt-2">Hesabınıza giriş yapın</p>
          </div>
        </div>
      </main>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
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
      // Giriş başarılıysa bilgileri kaydet
      saveCredentials(email, password, rememberMe);
      router.push('/dashboard');
    }
  };

  const handleClearCredentials = () => {
    clearCredentials();
    setEmail('');
    setPassword('');
    setRememberMe(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>
      
      {/* Header */}
      <div className="relative z-10 sticky top-0 bg-white/95 backdrop-blur-xl border-b border-gray-100/50 shadow-sm">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">RANDEVUO</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-sm font-semibold shadow-lg">
                Giriş
              </div>
              <Link
                href="/register"
                className="px-4 py-2 rounded-full bg-white/80 border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-white hover:shadow-md transition-all duration-200"
              >
                Kayıt
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-md mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-2xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent mb-3">
            Hoş Geldiniz
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Hesabınıza giriş yapın ve randevu dünyasına adım atın
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 mb-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block">E-posta Adresi</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-base"
                  placeholder="ornek@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 block">Şifre</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-base"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-5 h-5 text-rose-600 bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-rose-500/20 focus:ring-offset-0 transition-all duration-200"
                  />
                  {rememberMe && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">Beni Hatırla</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-rose-600 hover:text-rose-700 font-semibold text-sm transition-colors hover:underline"
              >
                Şifremi Unuttum
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-3 rounded-2xl border border-red-200 bg-red-50/80 backdrop-blur-sm text-red-700 text-center font-medium flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Giriş Yap
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">veya</span>
              </div>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <span className="text-gray-600 text-base">Hesabınız yok mu? </span>
              <Link
                href="/register"
                className="text-rose-600 hover:text-rose-700 font-bold text-base transition-colors hover:underline"
              >
                Hemen Kayıt Ol
              </Link>
            </div>

            {/* Clear Credentials */}
            {isClient && credentials.rememberMe && credentials.email && (
              <div className="text-center pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClearCredentials}
                  className="text-rose-600 hover:text-rose-700 font-medium text-sm transition-colors hover:underline"
                >
                  Kayıtlı Bilgileri Temizle
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>© 2024 RANDEVUO. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </main>
  );
}
