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
  const { credentials, saveCredentials, clearCredentials } = useUserCredentials();

  // Sayfa yüklendiğinde kayıtlı bilgileri yükle
  useEffect(() => {
    if (credentials.rememberMe && credentials.email && credentials.password) {
      setEmail(credentials.email);
      setPassword(credentials.password);
      setRememberMe(true);
    }
  }, [credentials]);

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
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-gradient-to-r from-rose-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-gradient-to-r from-indigo-400/20 to-blue-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        
        {/* Subtle Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.4'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
      </div>
      
      {/* Header */}
      <div className="relative z-10 sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-white/20 shadow-lg">
        <div className="max-w-md mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent group-hover:from-rose-600 group-hover:to-indigo-600 transition-all duration-300">RANDEVUO</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white text-sm font-bold shadow-xl">
                Giriş
              </div>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-2xl bg-white/90 border border-white/30 text-gray-700 text-sm font-semibold hover:bg-white hover:shadow-lg hover:scale-105 transition-all duration-300 backdrop-blur-sm"
              >
                Kayıt
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-md mx-auto px-6 py-8 min-h-screen">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/10 via-fuchsia-500/10 to-indigo-500/10 backdrop-blur-sm border border-white/20 mb-4 shadow-lg">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 via-rose-600 to-indigo-600 bg-clip-text text-transparent mb-2 leading-tight">
            Hoş Geldiniz
          </h1>
          <p className="text-gray-600 text-base font-medium">
            Hesabınıza giriş yapın
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/30 p-6 mb-6 hover:bg-white/80 transition-all duration-500 hover:shadow-3xl hover:scale-[1.02]">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800 block">E-posta</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-rose-500">
                  <svg className="h-4 w-4 text-gray-400 group-focus-within:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                  placeholder="ornek@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800 block">Şifre</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-rose-500">
                  <svg className="h-4 w-4 text-gray-400 group-focus-within:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-rose-600 bg-white/60 border-2 border-gray-300 rounded focus:ring-2 focus:ring-rose-500/20 focus:ring-offset-0 transition-all duration-300 hover:border-rose-400"
                  />
                  {rememberMe && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-gray-700 font-medium text-xs group-hover:text-gray-900 transition-colors duration-200">Beni Hatırla</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-rose-600 hover:text-rose-700 font-bold text-xs transition-all duration-200 hover:underline"
              >
                Şifremi Unuttum
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-3 rounded-xl border-2 border-red-200/50 bg-red-50/90 backdrop-blur-sm text-red-700 text-center font-semibold flex items-center justify-center gap-2 animate-shake text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white font-black text-base shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Giriş Yap
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white/70 backdrop-blur-sm text-gray-500 font-bold rounded-full border border-gray-200/50">veya</span>
              </div>
            </div>

            {/* Guest Login Button */}
            <Link
              href="/dashboard/user/businesses"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white font-black text-base shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Ziyaretçi Olarak Giriş
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>

            {/* Register Link */}
            <div className="text-center mt-4">
              <span className="text-gray-600 text-sm font-medium">Hesabınız yok mu? </span>
              <Link
                href="/register"
                className="text-rose-600 hover:text-rose-700 font-black text-sm transition-all duration-200 hover:underline"
              >
                Hemen Kayıt Ol
              </Link>
            </div>

            {/* Clear Credentials */}
            {credentials.rememberMe && credentials.email && (
              <div className="text-center pt-3 border-t border-gray-200/50">
                <button
                  type="button"
                  onClick={handleClearCredentials}
                  className="text-rose-600 hover:text-rose-700 font-semibold text-xs transition-all duration-200 hover:underline"
                >
                  Kayıtlı Bilgileri Temizle
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-xs font-medium mt-2">
          <p>© 2024 RANDEVUO. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </main>
  );
}
