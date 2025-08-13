"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../../utils/trpcClient';
import LocationPicker from '../../components/LocationPicker';


interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Temel bilgiler
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user' as 'user' | 'business',
    
    // İşletme bilgileri
    businessName: '',
    businessDescription: '',
    businessPhone: '',
    businessEmail: '',
    businessLocation: null as LocationData | null,
    
    // Müşteri bilgileri
    customerPhone: '',
    customerAddress: '',
    customerLocation: null as LocationData | null,
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const registerMutation = trpc.auth.register.useMutation();

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };



  const validateStep1 = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Lütfen tüm alanları doldurun');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (formData.role === 'business') {
      if (!formData.businessName || !formData.businessPhone) {
        setError('Lütfen işletme adı ve telefon numarasını doldurun');
        return false;
      }
    } else {
      if (!formData.customerPhone) {
        setError('Lütfen telefon numaranızı girin');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    
    try {
      // Önce test endpoint'ini kontrol et
      try {
        const testResponse = await fetch('/api/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true })
        });
        console.log('Test API response:', await testResponse.json());
      } catch (testErr) {
        console.error('Test API failed:', testErr);
      }

      const registerData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === 'business') {
        registerData.businessName = formData.businessName?.trim() || '';
        registerData.businessDescription = formData.businessDescription?.trim() || '';
        registerData.businessPhone = formData.businessPhone?.trim() || '';
        registerData.businessEmail = formData.businessEmail?.trim() || '';
        registerData.businessAddress = formData.businessLocation?.address?.trim() || 'Adres belirtilmedi';
        registerData.businessLatitude = formData.businessLocation?.latitude || 41.0082;
        registerData.businessLongitude = formData.businessLocation?.longitude || 28.9784;
      } else {
        registerData.customerPhone = formData.customerPhone?.trim() || '';
        registerData.customerAddress = formData.customerAddress?.trim() || '';
        registerData.customerLocation = formData.customerLocation;
      }

      console.log('Sending registration data:', registerData);
      await registerMutation.mutateAsync(registerData);
      setSuccess('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.message?.includes('pattern')) {
        setError('Geçersiz veri formatı. Lütfen tüm alanları doğru şekilde doldurun.');
      } else if (err.message?.includes('405')) {
        setError('API endpoint çalışmıyor. Lütfen daha sonra tekrar deneyin.');
      } else {
        setError(err.message || 'Kayıt başarısız. Lütfen tekrar deneyin.');
      }
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">Temel Bilgiler</h3>
      
      <label className="flex flex-col gap-1 text-gray-700 font-medium">
        Ad Soyad
        <input
          type="text"
          value={formData.name}
          onChange={e => updateFormData('name', e.target.value)}
          required
          className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          autoComplete="name"
        />
      </label>
      
      <label className="flex flex-col gap-1 text-gray-700 font-medium">
        E-posta
        <input
          type="email"
          value={formData.email}
          onChange={e => updateFormData('email', e.target.value)}
          required
          className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          autoComplete="email"
        />
      </label>
      
      <label className="flex flex-col gap-1 text-gray-700 font-medium">
        Şifre
        <input
          type="password"
          value={formData.password}
          onChange={e => updateFormData('password', e.target.value)}
          required
          className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
          autoComplete="new-password"
        />
      </label>
      
      <label className="flex flex-col gap-1 text-gray-700 font-medium">
        Şifre Tekrar
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={e => updateFormData('confirmPassword', e.target.value)}
          required
          className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
          autoComplete="new-password"
        />
      </label>
      
      <label className="flex flex-col gap-1 text-gray-700 font-medium">
        Hesap Türü
        <select
          value={formData.role}
          onChange={e => updateFormData('role', e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        >
          <option value="user">Müşteri</option>
          <option value="business">İşletme</option>
        </select>
      </label>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">
        {formData.role === 'business' ? 'İşletme Bilgileri' : 'Kişisel Bilgiler'}
      </h3>
      
      {formData.role === 'business' ? (
        <>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            İşletme Adı
            <input
              type="text"
              value={formData.businessName}
              onChange={e => updateFormData('businessName', e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </label>
          
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            İşletme Açıklaması
            <textarea
              value={formData.businessDescription}
              onChange={e => updateFormData('businessDescription', e.target.value)}
              rows={3}
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
              placeholder="İşletmeniz hakkında kısa bir açıklama..."
            />
          </label>
          
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            İşletme Telefonu
            <input
              type="tel"
              value={formData.businessPhone}
              onChange={e => updateFormData('businessPhone', e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </label>
          
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            İşletme E-posta (Opsiyonel)
            <input
              type="email"
              value={formData.businessEmail}
              onChange={e => updateFormData('businessEmail', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </label>
          
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            İşletme Konumu
            <LocationPicker
              onLocationSelect={(location) => {
                updateFormData('businessLocation', {
                  latitude: location.lat,
                  longitude: location.lng,
                  address: location.address
                });
              }}
              defaultLocation={formData.businessLocation ? {
                lat: formData.businessLocation.latitude,
                lng: formData.businessLocation.longitude,
                address: formData.businessLocation.address
              } : undefined}
              className="mt-2"
            />
          </label>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Telefon Numarası
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={e => updateFormData('customerPhone', e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </label>
          
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Adres (Opsiyonel)
            <textarea
              value={formData.customerAddress}
              onChange={e => updateFormData('customerAddress', e.target.value)}
              rows={3}
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
              placeholder="Ev adresiniz..."
            />
          </label>
          
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Konum (Opsiyonel)
            <LocationPicker
              onLocationSelect={(location) => {
                updateFormData('customerLocation', {
                  latitude: location.lat,
                  longitude: location.lng,
                  address: location.address
                });
              }}
              defaultLocation={formData.customerLocation ? {
                lat: formData.customerLocation.latitude,
                lng: formData.customerLocation.longitude,
                address: formData.customerLocation.address
              } : undefined}
              className="mt-2"
            />
          </label>
        </>
      )}
    </div>
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 px-3 py-8">
      <div className="w-full max-w-md">
        <div className="mb-3 text-center text-sm font-bold text-gray-800 select-none">kuado</div>
        <div className="w-full bg-white/60 backdrop-blur-md rounded-xl border border-white/40 p-3 animate-fade-in">
          <h2 className="text-lg font-semibold text-center text-gray-900 mb-2">Kayıt Ol</h2>
          {/* Steps */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold ${step>=1?'bg-rose-600 text-white':'bg-white/70 text-gray-600 border border-white/50'}`}>1</div>
            <div className={`h-0.5 w-8 ${step>=2?'bg-rose-600':'bg-white/50'}`}></div>
            <div className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-semibold ${step>=2?'bg-rose-600 text-white':'bg-white/70 text-gray-600 border border-white/50'}`}>2</div>
          </div>
          <div className="space-y-3">
            {step === 1 ? (
              <>
                <label className="block">
                  <span className="block text-[11px] text-gray-600 mb-1">Ad Soyad</span>
                  <input type="text" value={formData.name} onChange={e => updateFormData('name', e.target.value)} required className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
                </label>
                <label className="block">
                  <span className="block text-[11px] text-gray-600 mb-1">E-posta</span>
                  <input type="email" value={formData.email} onChange={e => updateFormData('email', e.target.value)} required className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
                </label>
                <label className="block">
                  <span className="block text-[11px] text-gray-600 mb-1">Şifre</span>
                  <input type="password" value={formData.password} onChange={e => updateFormData('password', e.target.value)} required className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
                </label>
                <label className="block">
                  <span className="block text-[11px] text-gray-600 mb-1">Şifre Tekrar</span>
                  <input type="password" value={formData.confirmPassword} onChange={e => updateFormData('confirmPassword', e.target.value)} required className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
                </label>
                <label className="block">
                  <span className="block text-[11px] text-gray-600 mb-1">Hesap Türü</span>
                  <select value={formData.role} onChange={e => updateFormData('role', e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-200">
                    <option value="user">Müşteri</option>
                    <option value="business">İşletme</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                {formData.role === 'business' ? (
                  <>
                    <label className="block">
                      <span className="block text-[11px] text-gray-600 mb-1">İşletme Adı</span>
                      <input type="text" value={formData.businessName} onChange={e => updateFormData('businessName', e.target.value)} required className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200" />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-gray-600 mb-1">İşletme Açıklaması</span>
                      <textarea value={formData.businessDescription} onChange={e => updateFormData('businessDescription', e.target.value)} rows={3} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none" />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-gray-600 mb-1">İşletme Telefonu</span>
                      <input type="tel" value={formData.businessPhone} onChange={e => updateFormData('businessPhone', e.target.value)} required className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-200" />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-gray-600 mb-1">İşletme E-posta (Opsiyonel)</span>
                      <input type="email" value={formData.businessEmail} onChange={e => updateFormData('businessEmail', e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-200" />
                    </label>
                    <div>
                      <span className="block text-[11px] text-gray-600 mb-1">İşletme Konumu</span>
                      <LocationPicker
                        onLocationSelect={(location) => updateFormData('businessLocation', { latitude: location.lat, longitude: location.lng, address: location.address })}
                        defaultLocation={formData.businessLocation ? { lat: formData.businessLocation.latitude, lng: formData.businessLocation.longitude, address: formData.businessLocation.address } : undefined}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block">
                      <span className="block text-[11px] text-gray-600 mb-1">Telefon Numarası</span>
                      <input type="tel" value={formData.customerPhone} onChange={e => updateFormData('customerPhone', e.target.value)} required className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-200" />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-gray-600 mb-1">Adres (Opsiyonel)</span>
                      <textarea value={formData.customerAddress} onChange={e => updateFormData('customerAddress', e.target.value)} rows={3} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none" />
                    </label>
                    <div>
                      <span className="block text-[11px] text-gray-600 mb-1">Konum (Opsiyonel)</span>
                      <LocationPicker
                        onLocationSelect={(location) => updateFormData('customerLocation', { latitude: location.lat, longitude: location.lng, address: location.address })}
                        defaultLocation={formData.customerLocation ? { lat: formData.customerLocation.latitude, lng: formData.customerLocation.longitude, address: formData.customerLocation.address } : undefined}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Messages */}
          {error && <div className="mt-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700 text-center">{error}</div>}
          {success && <div className="mt-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-[12px] text-green-700 text-center">{success}</div>}

          {/* Nav buttons */}
          <div className="flex gap-2 mt-3">
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="w-full py-2.5 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm">Geri</button>
            )}
            <button type="button" onClick={handleNext} disabled={registerMutation.isPending} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-60">
              {registerMutation.isPending ? 'Kaydediliyor…' : step === 1 ? 'İleri' : 'Kayıt Ol'}
            </button>
          </div>
          <button type="button" className="w-full py-2.5 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm mt-2" onClick={() => router.push('/login')}>
            Zaten hesabım var - Giriş Yap
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in .5s cubic-bezier(0.4,0,0.2,1) both; }
      `}</style>
    </main>
  );
} 