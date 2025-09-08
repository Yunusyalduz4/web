"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useUserCredentials } from '../hooks/useLocalStorage';
import { trpc } from '../utils/trpcClient';
import LocationPicker from '../components/LocationPicker';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
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
    businessLocation: null as LocationData | null,
    customerPhone: '',
    customerAddress: '',
    customerLocation: null as LocationData | null,
  });
  
  const { credentials, saveCredentials, clearCredentials } = useUserCredentials();
  const registerMutation = trpc.auth.register.useMutation();

  // Client-side hydration'ı bekle
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sayfa yüklendiğinde push notification izni iste
  useEffect(() => {
    const timer = setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Sayfa yüklendiğinde kayıtlı bilgileri yükle (sadece client-side'da)
  useEffect(() => {
    if (isClient && credentials.rememberMe && credentials.email && credentials.password) {
      setEmail(credentials.email);
      setPassword(credentials.password);
      setRememberMe(true);
      setShowLoginForm(true);
    }
  }, [credentials, isClient]);

  // Hydration hatasını önlemek için client-side render'ı bekle
  if (!isClient) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/60">
          <div className="max-w-md mx-auto p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-gray-800">RANDEVUO</div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md">
                  Giriş
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm font-semibold">
                  Kayıt
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-8 animate-fade-in">
          <div className="text-center mb-6">
            <div className="text-xs font-semibold tracking-wide text-gray-700 select-none">RANDEVUO</div>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">RANDEVUO</h1>
            <p className="mt-3 text-gray-700 text-base leading-6 max-w-sm mx-auto">
              Kuaför randevunu saniyeler içinde oluştur. En yakın işletmeleri keşfet, favorilerine ekle, bildirimleri al.
            </p>
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

  // Register functions
  const updateRegisterData = (field: string, value: any) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
  };

  const validateRegisterStep1 = () => {
    if (!registerData.name || !registerData.email || !registerData.password || !registerData.confirmPassword) {
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
      if (!registerData.businessLocation) {
        setError('Lütfen işletme konumunu seçin');
        return false;
      }
    } else {
      if (!registerData.customerPhone) {
        setError('Lütfen telefon numaranızı girin');
        return false;
      }
    }
    return true;
  };

  const handleRegisterNext = () => {
    setError('');
    if (registerStep === 1 && validateRegisterStep1()) {
      setRegisterStep(2);
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
        registerPayload.businessAddress = registerData.businessLocation?.address?.trim() || 'Adres belirtilmedi';
        registerPayload.businessLatitude = registerData.businessLocation?.latitude || 41.0082;
        registerPayload.businessLongitude = registerData.businessLocation?.longitude || 28.9784;
      } else {
        registerPayload.customerPhone = registerData.customerPhone?.trim() || '';
        registerPayload.customerAddress = registerData.customerAddress?.trim() || '';
        registerPayload.customerLocation = registerData.customerLocation;
      }

      await registerMutation.mutateAsync(registerPayload);
      
      if (rememberMe) {
        saveCredentials(registerData.email, registerData.password, true);
      }
      
      if (registerData.role === 'business') {
        setError('İşletme kaydınız başarıyla alındı! 🎉 Admin onayından sonra hesabınız aktif olacak.');
        setTimeout(() => {
          setShowRegisterForm(false);
          setRegisterStep(1);
          setRegisterData({
            name: '', email: '', password: '', confirmPassword: '', role: 'user',
            businessName: '', businessDescription: '', businessPhone: '', businessEmail: '', businessLocation: null,
            customerPhone: '', customerAddress: '', customerLocation: null
          });
        }, 3000);
      } else {
        setError('Kayıt başarılı! Giriş yapabilirsiniz.');
        setTimeout(() => {
          setShowRegisterForm(false);
          setShowLoginForm(true);
          setRegisterStep(1);
          setRegisterData({
            name: '', email: '', password: '', confirmPassword: '', role: 'user',
            businessName: '', businessDescription: '', businessPhone: '', businessEmail: '', businessLocation: null,
            customerPhone: '', customerAddress: '', customerLocation: null
          });
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız. Lütfen tekrar deneyin.');
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation desteklenmiyor');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          
          if (data.results && data.results[0]) {
            const address = data.results[0].formatted_address;
            const location = { latitude: lat, longitude: lng, address };
            updateRegisterData('customerLocation', location);
          } else {
            setError('Adres alınamadı');
          }
        } catch (err) {
          setError('Konum alınamadı. Lütfen tekrar deneyin.');
        }
      },
      (error) => {
        setError('Konum alınamadı. Lütfen tekrar deneyin.');
      }
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Auth Forms - Üstte */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/60">
        <div className="max-w-md mx-auto p-4">
          {!showLoginForm && !showRegisterForm ? (
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-gray-800">RANDEVUO</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLoginForm(true)}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition"
                >
                  Giriş
                </button>
                <button
                  onClick={() => setShowRegisterForm(true)}
                  className="px-3 py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm font-semibold hover:bg-white/90 transition"
                >
                  Kayıt
                </button>
              </div>
            </div>
          ) : showLoginForm ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Giriş Yap</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginForm(false);
                    setShowRegisterForm(false);
                  }}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                  placeholder="E-posta adresiniz"
                  autoComplete="email"
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                  placeholder="Şifreniz"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-rose-600 bg-white/90 border border-rose-200 rounded focus:ring-2 focus:ring-rose-200"
                  />
                  <span className="text-gray-700">Beni Hatırla</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-rose-600 hover:text-rose-700 underline"
                >
                  Şifremi Unuttum
                </Link>
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 text-center">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="submit"
                  className="py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition"
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginForm(false);
                    setShowRegisterForm(true);
                  }}
                  className="py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm font-semibold hover:bg-white/90 transition"
                >
                  Kayıt Ol
                </button>
              </div>

              {isClient && credentials.rememberMe && credentials.email && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleClearCredentials}
                    className="text-xs text-rose-600 hover:text-rose-700 underline"
                  >
                    Kayıtlı Bilgileri Temizle
                  </button>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Kayıt Ol</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginForm(false);
                    setShowRegisterForm(false);
                  }}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Steps */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold ${registerStep>=1?'bg-rose-600 text-white':'bg-white/70 text-gray-600 border border-white/50'}`}>1</div>
                <div className={`h-0.5 w-8 ${registerStep>=2?'bg-rose-600':'bg-white/50'}`}></div>
                <div className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold ${registerStep>=2?'bg-rose-600 text-white':'bg-white/70 text-gray-600 border border-white/50'}`}>2</div>
              </div>

              {/* Step 1 */}
              {registerStep === 1 && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={registerData.name}
                    onChange={e => updateRegisterData('name', e.target.value)}
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                    placeholder="Ad Soyad"
                    autoComplete="name"
                  />
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={e => updateRegisterData('email', e.target.value)}
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                    placeholder="E-posta adresiniz"
                    autoComplete="email"
                  />
                  <input
                    type="password"
                    value={registerData.password}
                    onChange={e => updateRegisterData('password', e.target.value)}
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                    placeholder="Şifreniz"
                    autoComplete="new-password"
                  />
                  <input
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={e => updateRegisterData('confirmPassword', e.target.value)}
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                    placeholder="Şifre tekrar"
                    autoComplete="new-password"
                  />
                  <select
                    value={registerData.role}
                    onChange={e => updateRegisterData('role', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                  >
                    <option value="user">Müşteri</option>
                    <option value="business">İşletme</option>
                  </select>
                </div>
              )}

              {/* Step 2 */}
              {registerStep === 2 && (
                <div className="space-y-3">
                  {registerData.role === 'business' ? (
                    <>
                      <input
                        type="text"
                        value={registerData.businessName}
                        onChange={e => updateRegisterData('businessName', e.target.value)}
                        required
                        className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                        placeholder="İşletme Adı"
                      />
                      <textarea
                        value={registerData.businessDescription}
                        onChange={e => updateRegisterData('businessDescription', e.target.value)}
                        rows={2}
                        className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors resize-none"
                        placeholder="İşletme Açıklaması"
                      />
                      <input
                        type="tel"
                        value={registerData.businessPhone}
                        onChange={e => updateRegisterData('businessPhone', e.target.value)}
                        required
                        className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                        placeholder="İşletme Telefonu"
                      />
                      <input
                        type="email"
                        value={registerData.businessEmail}
                        onChange={e => updateRegisterData('businessEmail', e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                        placeholder="İşletme E-posta (Opsiyonel)"
                      />
                      <div>
                        <div className="text-xs text-gray-600 mb-2">İşletme Konumu</div>
                        {registerData.businessLocation ? (
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                            {registerData.businessLocation.address}
                          </div>
                        ) : (
                          <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800">
                            Konum seçin
                          </div>
                        )}
                        <LocationPicker
                          onLocationSelect={(location) => updateRegisterData('businessLocation', {
                            latitude: location.lat,
                            longitude: location.lng,
                            address: location.address
                          })}
                          defaultLocation={registerData.businessLocation ? {
                            lat: registerData.businessLocation.latitude,
                            lng: registerData.businessLocation.longitude,
                            address: registerData.businessLocation.address
                          } : undefined}
                          className="mt-2"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="tel"
                        value={registerData.customerPhone}
                        onChange={e => updateRegisterData('customerPhone', e.target.value)}
                        required
                        className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
                        placeholder="Telefon Numarası"
                      />
                      <textarea
                        value={registerData.customerAddress}
                        onChange={e => updateRegisterData('customerAddress', e.target.value)}
                        rows={2}
                        className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors resize-none"
                        placeholder="Adres (Opsiyonel)"
                      />
                      <div>
                        <div className="text-xs text-gray-600 mb-2">Konum (Opsiyonel)</div>
                        {registerData.customerLocation ? (
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                            {registerData.customerLocation.address}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={getCurrentLocation}
                            className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
                          >
                            📍 Mevcut Konumu Al
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Beni Hatırla */}
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-rose-600 bg-white/90 border border-rose-200 rounded focus:ring-2 focus:ring-rose-200"
                />
                <span>Giriş bilgilerimi hatırla</span>
              </label>

              {/* Error Message */}
              {error && (
                <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 text-center">
                  {error}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-2">
                {registerStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setRegisterStep(registerStep - 1)}
                    className="flex-1 py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm font-semibold hover:bg-white/90 transition"
                  >
                    Geri
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRegisterNext}
                  disabled={registerMutation.isPending}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-60"
                >
                  {registerMutation.isPending ? 'Kaydediliyor...' : registerStep === 1 ? 'İleri' : 'Kayıt Ol'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRegisterForm(false);
                  setShowLoginForm(true);
                }}
                className="w-full py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm font-semibold hover:bg-white/90 transition"
              >
                Zaten hesabım var - Giriş Yap
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-8 animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="text-xs font-semibold tracking-wide text-gray-700 select-none">RANDEVUO</div>
        </div>

        {/* Hero */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">RANDEVUO</h1>
          <p className="mt-3 text-gray-700 text-base leading-6 max-w-sm mx-auto">
            Kuaför randevunu saniyeler içinde oluştur. En yakın işletmeleri keşfet, favorilerine ekle, bildirimleri al.
          </p>
        </div>

        {/* Phone mock with video */}
        <div className="mt-7 mx-auto w-full">
          <div className="mx-auto w-[260px] h-[520px] rounded-[32px] border-2 border-white/60 bg-white/70 backdrop-blur-md shadow-[0_20px_50px_-20px_rgba(16,24,40,.25)] relative overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-2 w-24 h-5 rounded-full bg-black/20 z-10" />
            {/* Video content */}
            <div className="w-full h-full rounded-[30px] overflow-hidden">
              <img 
                src="/mockup-demo.gif" 
                alt="RANDEVUO App Demo" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Feature chips */}
        <div className="mt-7 grid grid-cols-2 gap-2">
          <div className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-[12px] text-gray-800">⚡ Hızlı randevu</div>
          <div className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-[12px] text-gray-800">🗺️ Harita</div>
          <div className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-[12px] text-gray-800">🤍 Favoriler</div>
          <div className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-[12px] text-gray-800">🔔 Bildirim</div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="text-[11px] text-gray-500">© {new Date().getFullYear()} RANDEVUO</div>
        
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in .6s cubic-bezier(0.4,0,0.2,1) both; }
      `}</style>
    </main>
  );
}
