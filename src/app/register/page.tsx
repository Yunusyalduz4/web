"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../../utils/trpcClient';


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
            İşletme Adresi
            <textarea
              value={formData.businessLocation?.address || ''}
              onChange={e => {
                const address = e.target.value;
                updateFormData('businessLocation', {
                  latitude: 41.0082,
                  longitude: 28.9784,
                  address: address
                });
              }}
              rows={3}
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
              placeholder="İşletme adresinizi girin..."
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
            <textarea
              value={formData.customerLocation?.address || ''}
              onChange={e => {
                const address = e.target.value;
                updateFormData('customerLocation', {
                  latitude: 41.0082,
                  longitude: 28.9784,
                  address: address
                });
              }}
              rows={3}
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
              placeholder="Konum bilginizi girin..."
            />
          </label>
        </>
      )}
    </div>
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-pink-50 px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
        <h2 className="text-3xl font-extrabold text-center bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent mb-6 select-none">
          Kayıt Ol
        </h2>
        
        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 mx-2 ${
            step >= 2 ? 'bg-blue-500' : 'bg-gray-200'
          }`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            2
          </div>
        </div>
        
        {/* Form content */}
        {step === 1 ? renderStep1() : renderStep2()}
        
        {/* Error and success messages */}
        {error && <div className="text-red-600 text-sm text-center mt-4 animate-shake">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center mt-4 animate-fade-in">{success}</div>}
        
        {/* Navigation buttons */}
        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-full bg-gray-500 text-white font-semibold text-lg shadow-lg hover:bg-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Geri
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={registerMutation.isPending}
            className="flex-1 py-3 rounded-full bg-pink-500 text-white font-semibold text-lg shadow-lg hover:bg-pink-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {registerMutation.isPending ? 'Kaydediliyor...' : step === 1 ? 'İleri' : 'Kayıt Ol'}
          </button>
        </div>
        
        <button
          type="button"
          className="w-full py-3 rounded-full bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 mt-4"
          onClick={() => router.push('/login')}
        >
          Zaten hesabım var - Giriş Yap
        </button>
      </div>
      
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s cubic-bezier(0.4,0,0.2,1) both;
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