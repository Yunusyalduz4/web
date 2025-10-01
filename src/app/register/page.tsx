"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from 'next/link';
import { useUserCredentials } from '../../hooks/useLocalStorage';
import { trpc } from '../../utils/trpcClient';


export default function RegisterPage() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [registerStep, setRegisterStep] = useState(0);
  
  // Register form data
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user' as 'user' | 'business',
    businessName: '',
    businessDescription: '',
    businessPhone: '',
    businessEmail: '',
    customerPhone: '',
  });
  
  const { saveCredentials } = useUserCredentials();
  const registerMutation = trpc.auth.register.useMutation();

  // Client-side hydration'ı bekle
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Hydration hatasını önlemek için client-side render'ı bekle
  if (!isClient) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/60">
          <div className="max-w-md mx-auto p-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-sm font-bold text-gray-800">RANDEVUO</Link>
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm font-semibold"
                >
                  Giriş
                </Link>
                <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md">
                  Kayıt
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Kayıt Ol</h1>
            <p className="text-gray-600 text-sm mt-2">Yeni hesap oluşturun</p>
          </div>
        </div>
      </main>
    );
  }

  // Register functions
  const updateRegisterData = (field: string, value: any) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
  };

  const validateRegisterStep1 = () => {
    if (!registerData.name || !registerData.email || !registerData.password || !registerData.confirmPassword || !registerData.customerPhone) {
      setError('Lütfen tüm alanları doldurun');
      return false;
    }
    if (!acceptedPrivacy) {
      setError('Kayıt için Gizlilik Politikası ve Kullanım Şartları\'nı kabul etmelisiniz');
      return false;
    }
    if (registerData.password !== registerData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return false;
    }
    if (registerData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return false;
    }

    // Business specific validation
    if (registerData.role === 'business') {
      if (!registerData.businessName?.trim()) {
        setError('İşletme adı gereklidir');
        return false;
      }
      if (!registerData.businessPhone?.trim()) {
        setError('İşletme telefon numarası gereklidir');
        return false;
      }
    }

    return true;
  };


  const handleRegisterNext = () => {
    setError('');
    if (validateRegisterStep1()) {
      // Both user and business registration in single step
      handleRegisterSubmit();
    }
  };

  const handleRegisterSubmit = async () => {
    setError('');
    
    try {
      const registerPayload: any = {
        name: registerData.name.trim(),
        email: registerData.email.trim().toLowerCase(),
        password: registerData.password,
        role: registerData.role,
      };

      if (registerData.role === 'business') {
        registerPayload.businessName = registerData.businessName?.trim() || '';
        registerPayload.businessDescription = registerData.businessDescription?.trim() || '';
        registerPayload.businessPhone = registerData.businessPhone?.trim() || '';
        registerPayload.businessEmail = registerData.businessEmail?.trim() || '';
        registerPayload.businessAddress = 'Adres belirtilmedi';
        registerPayload.businessLatitude = 41.0082;
        registerPayload.businessLongitude = 28.9784;
      } else {
        registerPayload.customerPhone = '+90' + registerData.customerPhone?.trim() || '';
        registerPayload.customerAddress = '';
        // customerLocation'ı göndermiyoruz çünkü backend'de optional
      }

      console.log('Register payload:', registerPayload);
      await registerMutation.mutateAsync(registerPayload);
      
      if (rememberMe) {
        saveCredentials(registerData.email, registerData.password, true);
      }
      
      if (registerData.role === 'business') {
        setError('İşletme kaydınız başarıyla alındı! 🎉 Admin onayından sonra hesabınız aktif olacak.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError('Kayıt başarılı! Giriş yapabilirsiniz.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız. Lütfen tekrar deneyin.');
    }
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
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-2xl bg-white/90 border border-white/30 text-gray-700 text-sm font-semibold hover:bg-white hover:shadow-lg hover:scale-105 transition-all duration-300 backdrop-blur-sm"
              >
                Giriş
              </Link>
              <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white text-sm font-bold shadow-xl">
                Kayıt
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-md mx-auto px-6 py-8 min-h-screen">
        {/* Hero Section */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/10 via-fuchsia-500/10 to-indigo-500/10 backdrop-blur-sm border border-white/20 mb-4 shadow-lg">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 via-rose-600 to-indigo-600 bg-clip-text text-transparent mb-2 leading-tight">
            Hesap Oluştur
          </h1>
          <p className="text-gray-600 text-base font-medium">
            Randevu dünyasına katılın
          </p>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className={`w-12 h-12 rounded-2xl grid place-items-center text-lg font-black shadow-xl transition-all duration-500 ${registerStep>=1?'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white scale-110':'bg-white/70 text-gray-500 border-2 border-gray-200/50 backdrop-blur-sm'}`}>
            {registerStep === 0 ? '1' : '2'}
          </div>
        </div>

        {/* Step 0 - Role Selection */}
        {registerStep === 0 && (
          <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/30 p-6 mb-4 hover:bg-white/80 transition-all duration-500 hover:shadow-3xl hover:scale-[1.02]">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Hesap Türü Seçin</h2>
              <p className="text-gray-600 text-sm">Hangi tür hesap oluşturmak istiyorsunuz?</p>
            </div>
            
            <div className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      updateRegisterData('role', 'user');
                      setRegisterStep(1);
                    }}
                    className="p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 border-rose-500 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-700 shadow-lg"
                  >
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto mb-2 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="font-bold text-sm">Müşteri</div>
                      <div className="text-xs text-gray-500">Randevu almak için</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateRegisterData('role', 'business');
                      setRegisterStep(1);
                    }}
                    className="p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 border-gray-200/50 bg-white/60 text-gray-700 hover:border-rose-300 hover:bg-white/80 backdrop-blur-sm"
                  >
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto mb-2 rounded-xl flex items-center justify-center transition-all duration-300 bg-gray-100 text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="font-bold text-sm">İşletme</div>
                      <div className="text-xs text-gray-500">Randevu vermek için</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Back Button for Step 0 */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="w-full py-3 rounded-xl bg-white/70 border-2 border-gray-200/50 text-gray-700 font-bold text-base hover:bg-white hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Geri
              </button>
            </div>
          </div>
        )}

        {/* Step 1 - Basic Info */}
        {registerStep === 1 && (
          <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/30 p-6 mb-4 hover:bg-white/80 transition-all duration-500 hover:shadow-3xl hover:scale-[1.02]">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {registerData.role === 'business' ? 'İşletme Bilgileri' : 'Hesap Bilgileri'}
              </h2>
              <p className="text-gray-600 text-sm">
                {registerData.role === 'business' 
                  ? 'İşletmeniz için gerekli bilgileri girin' 
                  : 'Hesabınızı oluşturmak için bilgilerinizi girin'
                }
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 block">Ad Soyad</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-rose-500">
                    <svg className="h-4 w-4 text-gray-400 group-focus-within:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={registerData.name}
                    onChange={e => updateRegisterData('name', e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                    placeholder="Adınız ve soyadınız"
                    autoComplete="name"
                  />
                </div>
              </div>

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
                    value={registerData.email}
                    onChange={e => updateRegisterData('email', e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                    placeholder="ornek@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 block">Telefon</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-rose-500">
                    <svg className="h-4 w-4 text-gray-400 group-focus-within:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex items-center">
                    <div className="absolute pl-11 pr-4 py-3 text-gray-900 font-medium text-m pointer-events-none">+90</div>
                    <input
                      type="tel"
                      value={registerData.customerPhone}  
                      onChange={e => {
                        let value = e.target.value.replace(/\D/g, ''); // Sadece rakamları al
                        if (value.length > 0 && !value.startsWith('5')) {
                          value = '5' + value; // 5 ile başlamıyorsa 5 ekle
                        }
                        if (value.length > 10) {
                          value = value.substring(0, 10); // Maksimum 10 hane
                        }
                        updateRegisterData('customerPhone', value);
                      }}
                      onKeyDown={e => {
                        // Backspace tuşu +90 kısmını silmeye çalışırsa engelle
                        if (e.key === 'Backspace' && registerData.customerPhone.length === 0) {
                          e.preventDefault();
                        }
                      }}
                      required
                      className="w-full pl-16 pr-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                      placeholder="  555 123 45 67"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              {/* Password Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      value={registerData.password}
                      onChange={e => updateRegisterData('password', e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 block">Şifre Tekrar</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-rose-500">
                      <svg className="h-4 w-4 text-gray-400 group-focus-within:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={e => updateRegisterData('confirmPassword', e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
              </div>
            </div>

              {/* Business Fields - Only for business role */}
              {registerData.role === 'business' && (
                <>
                  {/* Business Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-800 block">İşletme Adı</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-rose-500">
                        <svg className="h-4 w-4 text-gray-400 group-focus-within:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={registerData.businessName}
                        onChange={e => updateRegisterData('businessName', e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                        placeholder="İşletmenizin adı"
                      />
                    </div>
                  </div>

                  {/* Business Description */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-800 block">İşletme Açıklaması</label>
                    <textarea
                      value={registerData.businessDescription}
                      onChange={e => updateRegisterData('businessDescription', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 resize-none text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                      placeholder="İşletmeniz hakkında kısa bir açıklama yazın..."
                    />
                  </div>

                  {/* Business Phone & Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-800 block">İşletme Telefonu</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-rose-500">
                          <svg className="h-4 w-4 text-gray-400 group-focus-within:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          type="tel"
                          value={registerData.businessPhone}
                          onChange={e => updateRegisterData('businessPhone', e.target.value)}
                          required
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                          placeholder="+90"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-800 block">İşletme E-postası (Opsiyonel)</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-rose-500">
                          <svg className="h-4 w-4 text-gray-400 group-focus-within:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          value={registerData.businessEmail}
                          onChange={e => updateRegisterData('businessEmail', e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200/50 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 text-sm font-medium hover:bg-white/80 hover:border-gray-300/50"
                          placeholder="isletme@email.com"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        )}


        {/* Remember Me */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 mb-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-rose-600 bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-rose-500/20 focus:ring-offset-0 transition-all duration-200"
              />
              {rememberMe && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-gray-700 font-medium text-sm group-hover:text-gray-900 transition-colors">Giriş bilgilerimi hatırla</span>
          </label>
        </div>

        {/* Privacy Accept */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 mb-4">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={e => setAcceptedPrivacy(e.target.checked)}
              className="mt-1 w-4 h-4 text-rose-600 bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-rose-500/20 focus:ring-offset-0 transition-all duration-200"
            />
            <span className="text-gray-700 text-sm">
              <span className="font-medium">Kayıt olarak</span> {' '}
              <a href="/gizlilik" target="_blank" className="text-rose-600 hover:text-rose-700 font-semibold underline">Gizlilik Politikası ve Kullanım Şartları</a>
              {' '}kabul edilmiş sayılacağınızı onaylıyorum.
            </span>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 rounded-xl border-2 border-red-200/50 bg-red-50/90 backdrop-blur-sm text-red-700 text-center font-semibold flex items-center justify-center gap-2 mb-4 animate-shake text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        {registerStep > 0 && (
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => setRegisterStep(registerStep - 1)}
              className="flex-1 py-3 rounded-xl bg-white/70 border-2 border-gray-200/50 text-gray-700 font-bold text-base hover:bg-white hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Geri
            </button>
            <button
              type="button"
              onClick={handleRegisterNext}
              disabled={registerMutation.isPending}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white font-black text-base shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group disabled:opacity-60"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {registerMutation.isPending ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Kayıt Ol
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        )}

        {/* Login Link */}
        <div className="text-center">
          <span className="text-gray-600 text-sm font-medium">Zaten hesabınız var mı? </span>
          <Link
            href="/login"
            className="text-rose-600 hover:text-rose-700 font-black text-sm transition-all duration-200 hover:underline"
          >
            Giriş Yap
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-xs font-medium mt-2">
          <p>© 2024 RANDEVUO. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </main>
  );
}
