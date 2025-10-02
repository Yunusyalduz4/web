'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GuestOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  phone: string;
  businessName: string;
  onOTPVerified?: () => void;
}

export function GuestOTPModal({ isOpen, onClose, businessId, phone, businessName, onOTPVerified }: GuestOTPModalProps) {
  const router = useRouter();
  const [otpCode, setOtpCode] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // OTP gönder
  const sendOTP = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, businessId })
      });
      
      const data = await response.json();
      
      if (data.otpId) {
        setOtpId(data.otpId);
        setSuccess('OTP kodu WhatsApp ile gönderildi!');
        setCountdown(60); // 60 saniye countdown
      } else {
        setError(data.message || 'OTP gönderilemedi');
      }
    } catch (error) {
      setError('OTP gönderilirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP doğrula
  const verifyOTP = async () => {
    if (!otpId || !otpCode) {
      setError('OTP kodu gerekli');
      return;
    }

    setIsVerifying(true);
    setError('');
    
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpId, code: otpCode })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Telefon numaranız doğrulandı!');
        setTimeout(() => {
          onClose();
          if (onOTPVerified) {
            onOTPVerified();
          } else {
            router.push(`/dashboard/user/businesses/${businessId}/book`);
          }
        }, 1500);
      } else {
        setError(data.error || 'OTP doğrulanamadı');
      }
    } catch (error) {
      setError('OTP doğrulanırken bir hata oluştu');
    } finally {
      setIsVerifying(false);
    }
  };

  // Modal açıldığında otomatik OTP gönderme - kaldırıldı
  // useEffect(() => {
  //   if (isOpen && !otpId) {
  //     sendOTP();
  //   }
  // }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col border border-white/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200/50">
          <h3 className="font-semibold text-gray-900 text-lg">📱 Telefon Doğrulama</h3>
          <button 
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors" 
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-500">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h4 className="text-xl font-semibold text-gray-900 mb-2 text-center">WhatsApp Doğrulama</h4>
          <p className="text-gray-600 mb-4 text-center">
            <strong>{businessName}</strong> için randevu alabilmek için telefon numaranızı doğrulamanız gerekiyor.
          </p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 text-center">
              📱 <strong>{phone}</strong> numarasına WhatsApp ile doğrulama kodu gönderildi
            </p>
          </div>

          {/* OTP Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                6 Haneli Doğrulama Kodu
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 text-center">❌ {error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 text-center">✅ {success}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 touch-manipulation min-h-[44px]"
              >
                İptal
              </button>
              
              {countdown > 0 ? (
                <button
                  disabled
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-500 rounded-xl font-semibold cursor-not-allowed min-h-[44px]"
                >
                  Tekrar Gönder ({countdown}s)
                </button>
              ) : (
                <button
                  onClick={sendOTP}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 active:bg-blue-300 transition-all duration-200 touch-manipulation min-h-[44px] disabled:opacity-50"
                >
                  {isLoading ? 'Gönderiliyor...' : (otpId ? 'Tekrar Gönder' : 'Gönder')}
                </button>
              )}
              
              <button
                onClick={verifyOTP}
                disabled={!otpCode || otpCode.length !== 6 || isVerifying}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 transition-all duration-200 touch-manipulation min-h-[44px] disabled:opacity-50"
              >
                {isVerifying ? 'Doğrulanıyor...' : 'Doğrula'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
