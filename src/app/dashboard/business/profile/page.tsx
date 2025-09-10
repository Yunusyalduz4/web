"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';
import React from 'react';
import { usePushNotifications } from '../../../../hooks/usePushNotifications';
import { handleLogout } from '../../../../utils/authUtils';
import { useRealTimeBusiness } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';
import SupportButton from '../../../../components/SupportButton';

export default function BusinessProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  
  // Employee ise çalışan profilini getir, business ise işletme profilini getir
  const { data: business, isLoading: businessLoading, error: businessError } = trpc.business.getMyBusiness.useQuery(
    session?.user?.role === 'business' ? undefined : skipToken
  );
  
  const { data: employee, isLoading: employeeLoading } = trpc.business.getEmployeeById.useQuery(
    session?.user?.employeeId && session?.user?.role === 'employee' ? { employeeId: session.user.employeeId } : skipToken
  );
  
  const updateMutation = trpc.business.updateBusinessProfile.useMutation();
  const updateEmployeeMutation = trpc.business.updateEmployeeProfile.useMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Push notification hook - her zaman çağır, business null olsa bile
  const {
    isSupported,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe
  } = usePushNotifications(business?.id || null);

  // Profil yüklendiğinde inputlara aktar
  React.useEffect(() => {
    if (business) {
      setName(business.name || '');
      setEmail(business.email || '');
      setPhone(business.phone || '');
    }
  }, [business]);

  // Employee profil yüklendiğinde inputlara aktar
  React.useEffect(() => {
    if (employee) {
      setName(employee.name || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      if (session?.user?.role === 'business' && business?.id) {
        await updateMutation.mutateAsync({ 
          businessId: business.id, 
          name, 
          email, 
          phone,
          password: password || undefined 
        });
        setSuccess('İşletme profili başarıyla güncellendi!');
      } else if (session?.user?.role === 'employee' && employee?.id) {
        await updateEmployeeMutation.mutateAsync({ 
          employeeId: employee.id, 
          name, 
          email, 
          phone,
          password: password || undefined 
        });
        setSuccess('Çalışan profili başarıyla güncellendi!');
      } else {
        setError('Profil bilgisi bulunamadı');
        return;
      }
      
      setPassword('');
      setTimeout(() => router.refresh(), 1200);
    } catch (err: any) {
      setError(err.message || 'Profil güncellenemedi');
    }
  };

  const handleBusinessLogout = async () => {
    await handleLogout();
  };

  // Show loading if business or employee is still loading
  if (businessLoading || employeeLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-pulse">
        <span className="text-5xl mb-2">⏳</span>
        <span className="text-lg text-gray-400">
          {session?.user?.role === 'employee' ? 'Çalışan bilgileri yükleniyor...' : 'İşletme bilgileri yükleniyor...'}
        </span>
      </main>
    );
  }

  // Error handling
  if (businessError) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
        <span className="text-6xl mb-4">⚠️</span>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Profil Yüklenemedi</h2>
        <p className="text-gray-600 mb-4 text-center max-w-md">
          {businessError.message || 'Profil bilgileri yüklenirken bir hata oluştu.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium"
        >
          Sayfayı Yenile
        </button>
      </main>
    );
  }



  return (
    <main className="relative max-w-md mx-auto p-3 sm:p-4 pb-20 sm:pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/80 backdrop-blur-md border-b border-white/60 mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.push('/dashboard/business')} className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/70 border border-white/50 text-gray-900 shadow-sm hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
              <div className="text-[10px] sm:text-xs text-gray-600">
                {session?.user?.role === 'employee' ? 'Çalışan Profili' : 'İşletme Profili'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <SupportButton userType="business" />
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
          </div>
        </div>
      </div>

      {/* İşletme İstatistikleri - Mobile Optimized */}
      {business && session?.user?.role === 'business' && (
        <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm mb-3 sm:mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <h2 className="text-[10px] sm:text-xs font-semibold text-gray-900">İşletme Bilgileri</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-blue-600 font-semibold">Durum</div>
                <div className="text-[10px] sm:text-xs text-blue-800 font-bold">
                  {business.is_approved ? 'Onaylı' : 'Bekliyor'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"/></svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-green-600 font-semibold">Kategori</div>
                <div className="text-[10px] sm:text-xs text-green-800 font-bold truncate">
                  {business.category || 'Genel'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Çalışan Bilgileri - Mobile Optimized */}
      {employee && session?.user?.role === 'employee' && (
        <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm mb-3 sm:mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
            </div>
            <h2 className="text-[10px] sm:text-xs font-semibold text-gray-900">Çalışan Bilgileri</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-green-600 font-semibold">Durum</div>
                <div className="text-[10px] sm:text-xs text-green-800 font-bold">
                  {employee.is_active ? 'Aktif' : 'Pasif'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"/></svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-blue-600 font-semibold">Toplam Randevu</div>
                <div className="text-[10px] sm:text-xs text-blue-800 font-bold">
                  {employee.total_appointments || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form - Mobile Optimized */}
      <section className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm mb-3 sm:mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
          </div>
          <h2 className="text-[10px] sm:text-xs font-semibold text-gray-900">Profil Bilgileri</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2 font-medium">
              {session?.user?.role === 'employee' ? 'Ad Soyad' : 'İşletme Adı'}
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors touch-manipulation min-h-[44px]" 
              placeholder={session?.user?.role === 'employee' ? 'Adınız ve soyadınız' : 'İşletme adınız'}
              style={{ fontSize: '16px' }}
            />
          </div>
          
          <div>
            <label className="block text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2 font-medium">E-posta Adresi</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors touch-manipulation min-h-[44px]" 
              placeholder="ornek@email.com"
              style={{ fontSize: '16px' }}
            />
          </div>
          
          <div>
            <label className="block text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2 font-medium">Telefon Numarası</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors touch-manipulation min-h-[44px]" 
              placeholder="05xx xxx xx xx"
              style={{ fontSize: '16px' }}
            />
          </div>
          
          <div>
            <label className="block text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2 font-medium">Yeni Şifre (opsiyonel)</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full rounded-lg px-3 py-3 text-sm sm:text-base bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-200 transition-colors touch-manipulation min-h-[44px]" 
              placeholder="Yeni şifreniz"
              style={{ fontSize: '16px' }}
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[10px] sm:text-xs text-red-700">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-[10px] sm:text-xs text-green-700">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>{success}</span>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={updateMutation.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm sm:text-base font-semibold shadow-md hover:shadow-lg active:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
          >
            {updateMutation.isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Güncelleniyor...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Kaydet
              </>
            )}
          </button>
        </form>
      </section>

      {/* Push Notification - Mobile Optimized */}
      {isSupported && business && (
        <section className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm mb-3 sm:mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <h2 className="text-[10px] sm:text-xs font-semibold text-gray-900">Push Bildirimleri</h2>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-orange-600 font-semibold">Randevu Bildirimleri</div>
                <div className="text-[10px] sm:text-xs text-orange-800">
                  {isSubscribed ? 'Aktif - Yeni randevular için bildirim alınıyor' : 'Pasif - Bildirim almak için açın'}
                </div>
              </div>
            </div>
            <button 
              onClick={isSubscribed ? unsubscribe : subscribe} 
              disabled={pushLoading} 
              className={`px-2 sm:px-3 py-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors flex items-center gap-1 touch-manipulation min-h-[44px] ${
                isSubscribed 
                  ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white' 
                  : 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white'
              } disabled:opacity-50`}
            >
              {pushLoading ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ⏳
                </>
              ) : isSubscribed ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Kapat
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Aç
                </>
              )}
            </button>
          </div>
          
          {pushError && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[10px] sm:text-xs text-red-700">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>{pushError}</span>
            </div>
          )}
        </section>
      )}

      {/* Logout - Mobile Optimized */}
      <section className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </div>
          <h2 className="text-[10px] sm:text-xs font-semibold text-gray-900">Hesap İşlemleri</h2>
        </div>
        
        <button 
          onClick={handleBusinessLogout} 
          className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:from-red-700 active:to-red-800 text-white text-sm sm:text-base font-semibold shadow-md hover:shadow-lg active:shadow-xl transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Çıkış Yap
        </button>
      </section>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        :root { 
          --randevuo-radius: 16px; 
          --randevuo-shadow: 0 8px 24px -12px rgba(0,0,0,0.25);
          --mobile-safe-area: env(safe-area-inset-bottom, 0px);
        }
        html, body { 
          font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; 
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          
          /* Touch targets */
          button, input, select, textarea {
            touch-action: manipulation;
          }
          
          /* Prevent zoom on input focus */
          input[type="text"], input[type="email"], input[type="password"], input[type="date"], input[type="time"], textarea {
            font-size: 16px;
          }
          
          /* Smooth scrolling */
          .overscroll-contain {
            overscroll-behavior: contain;
          }
        }
        
        /* Custom breakpoint for extra small screens */
        @media (max-width: 475px) {
          .xs\\:inline {
            display: inline;
          }
        }
        
        /* Animation improvements */
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
} 