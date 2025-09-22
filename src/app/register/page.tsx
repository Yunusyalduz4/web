"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from 'next/link';
import { useUserCredentials } from '../../hooks/useLocalStorage';
import { trpc } from '../../utils/trpcClient';


export default function RegisterPage() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  
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
    if (registerData.password !== registerData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return false;
    }
    if (registerData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return false;
    }
    return true;
  };

  const validateRegisterStep2 = () => {
    if (registerData.role === 'business') {
      if (!registerData.businessName || !registerData.businessPhone) {
        setError('Lütfen işletme adı ve telefon numarasını doldurun');
        return false;
      }
    }
    return true;
  };

  const handleRegisterNext = () => {
    setError('');
    if (registerStep === 1 && validateRegisterStep1()) {
      if (registerData.role === 'business') {
        setRegisterStep(2);
      } else {
        // Müşteri için direkt kayıt tamamla
        handleRegisterSubmit();
      }
    } else if (registerStep === 2 && validateRegisterStep2()) {
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
              <Link
                href="/login"
                className="px-4 py-2 rounded-full bg-white/80 border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-white hover:shadow-md transition-all duration-200"
              >
                Giriş
              </Link>
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-sm font-semibold shadow-lg">
                Kayıt
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-md mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent mb-3">
            Hesap Oluştur
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Randevu dünyasına katılın ve işletmenizi büyütün
          </p>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`w-12 h-12 rounded-2xl grid place-items-center text-lg font-bold shadow-lg transition-all duration-300 ${registerStep>=1?'bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white scale-110':'bg-white/80 text-gray-500 border-2 border-gray-200'}`}>
            1
          </div>
          {registerData.role === 'business' && (
            <>
              <div className={`h-1 w-16 rounded-full transition-all duration-300 ${registerStep>=2?'bg-gradient-to-r from-rose-500 to-fuchsia-600':'bg-gray-200'}`}></div>
              <div className={`w-12 h-12 rounded-2xl grid place-items-center text-lg font-bold shadow-lg transition-all duration-300 ${registerStep>=2?'bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white scale-110':'bg-white/80 text-gray-500 border-2 border-gray-200'}`}>
                2
              </div>
            </>
          )}
        </div>

        {/* Step 1 - Basic Info */}
        {registerStep === 1 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {registerData.role === 'business' ? 'Temel Bilgiler' : 'Hesap Bilgileri'}
              </h2>
              <p className="text-gray-600">
                {registerData.role === 'business' 
                  ? 'Hesabınız için gerekli bilgileri girin' 
                  : 'Hesabınızı oluşturmak için bilgilerinizi girin'
                }
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Ad Soyad</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={registerData.name}
                    onChange={e => updateRegisterData('name', e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-base"
                    placeholder="Adınız ve soyadınız"
                    autoComplete="name"
                  />
                </div>
              </div>

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
                    value={registerData.email}
                    onChange={e => updateRegisterData('email', e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-base"
                    placeholder="ornek@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Telefon Numarası</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex items-center">
                    <div className="absolute left-12 text-gray-500 font-medium text-base pointer-events-none">+90</div>
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
                      className="w-full pl-20 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-base"
                      placeholder="555 123 45 67"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              {/* Password Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      value={registerData.password}
                      onChange={e => updateRegisterData('password', e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-base"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">Şifre Tekrar</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={e => updateRegisterData('confirmPassword', e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-base"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Hesap Türü</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateRegisterData('role', 'user')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      registerData.role === 'user' 
                        ? 'border-rose-500 bg-rose-50 text-rose-700' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div className="font-semibold">Müşteri</div>
                      <div className="text-xs text-gray-500">Randevu almak için</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRegisterData('role', 'business')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      registerData.role === 'business' 
                        ? 'border-rose-500 bg-rose-50 text-rose-700' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div className="font-semibold">İşletme</div>
                      <div className="text-xs text-gray-500">Randevu vermek için</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 - Additional Info */}
        {registerStep === 2 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {registerData.role === 'business' ? 'İşletme Bilgileri' : 'İletişim Bilgileri'}
              </h2>
              <p className="text-gray-600">
                {registerData.role === 'business' 
                  ? 'İşletmeniz hakkında detaylı bilgileri girin' 
                  : 'Size ulaşabileceğimiz bilgileri girin'
                }
              </p>
            </div>
            
            <div className="space-y-6">
              {registerData.role === 'business' ? (
                <>
                  {/* Business Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">İşletme Adı</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={registerData.businessName}
                        onChange={e => updateRegisterData('businessName', e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-base"
                        placeholder="İşletmenizin adı"
                      />
                    </div>
                  </div>

                  {/* Business Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">İşletme Açıklaması</label>
                    <textarea
                      value={registerData.businessDescription}
                      onChange={e => updateRegisterData('businessDescription', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 resize-none text-base"
                      placeholder="İşletmeniz hakkında kısa bir açıklama yazın..."
                    />
                  </div>

                  {/* Business Phone & Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 block">Telefon</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          type="tel"
                          value={registerData.businessPhone}
                          onChange={e => updateRegisterData('businessPhone', e.target.value)}
                          required
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-base"
                          placeholder="+90 212 123 45 67 veya 0555 123 45 67"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 block">E-posta (Opsiyonel)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          value={registerData.businessEmail}
                          onChange={e => updateRegisterData('businessEmail', e.target.value)}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-200 text-base"
                          placeholder="isletme@email.com"
                        />
                      </div>
                    </div>
                  </div>

                </>
              ) : (
                <>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Kayıt Tamamlandı!</h3>
                    <p className="text-gray-600">Temel bilgileriniz başarıyla kaydedildi. Şimdi hesabınızı aktifleştirebilirsiniz.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Remember Me */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-6">
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
            <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">Giriş bilgilerimi hatırla</span>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 rounded-2xl border border-red-200 bg-red-50/80 backdrop-blur-sm text-red-700 text-center font-medium flex items-center justify-center gap-2 mb-6">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mb-8">
          {registerStep > 1 && (
            <button
              type="button"
              onClick={() => setRegisterStep(registerStep - 1)}
              className="flex-1 py-4 rounded-2xl bg-white/80 border border-gray-200 text-gray-700 font-semibold hover:bg-white hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Geri
            </button>
          )}
          <button
            type="button"
            onClick={handleRegisterNext}
            disabled={registerMutation.isPending}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 relative overflow-hidden group disabled:opacity-60"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {registerMutation.isPending ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Kaydediliyor...
                </>
              ) : registerStep === 1 ? (
                <>
                  {registerData.role === 'business' ? (
                    <>
                      İleri
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Kayıt Ol
                    </>
                  )}
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
            <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </button>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <span className="text-gray-600 text-base">Zaten hesabınız var mı? </span>
          <Link
            href="/login"
            className="text-rose-600 hover:text-rose-700 font-bold text-base transition-colors hover:underline"
          >
            Giriş Yap
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>© 2024 RANDEVUO. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </main>
  );
}
