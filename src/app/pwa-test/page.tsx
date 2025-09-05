"use client";
import { useState, useEffect } from 'react';
import { useUserPushNotifications } from '../../hooks/useUserPushNotifications';

export default function PWATestPage() {
  const [isPWA, setIsPWA] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState('Unknown');
  
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe
  } = useUserPushNotifications();

  useEffect(() => {
    // PWA detection
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');
      
      const isPWA = isStandalone || window.location.protocol === 'https:';
      const isSecure = window.isSecureContext;
      
      setIsPWA(isPWA);
      setIsStandalone(isStandalone);
      setIsSecureContext(isSecure);
      
      // Service Worker status
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          setServiceWorkerStatus(registration ? 'Active' : 'Not Registered');
        });
      } else {
        setServiceWorkerStatus('Not Supported');
      }
    };

    checkPWA();
  }, []);

  const testNotification = async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Test Bildirimi', {
        body: 'PWA test bildirimi başarılı!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">PWA Push Notification Test</h1>
        
        {/* PWA Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">PWA Durumu</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>PWA Mode:</span>
              <span className={isPWA ? 'text-green-600' : 'text-red-600'}>
                {isPWA ? '✅ Aktif' : '❌ Pasif'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Standalone Mode:</span>
              <span className={isStandalone ? 'text-green-600' : 'text-red-600'}>
                {isStandalone ? '✅ Aktif' : '❌ Pasif'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Secure Context:</span>
              <span className={isSecureContext ? 'text-green-600' : 'text-red-600'}>
                {isSecureContext ? '✅ HTTPS' : '❌ HTTP'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Service Worker:</span>
              <span className={serviceWorkerStatus === 'Active' ? 'text-green-600' : 'text-red-600'}>
                {serviceWorkerStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Push Notification Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Push Notification Durumu</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Destekleniyor:</span>
              <span className={isSupported ? 'text-green-600' : 'text-red-600'}>
                {isSupported ? '✅ Evet' : '❌ Hayır'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Abone Olunmuş:</span>
              <span className={isSubscribed ? 'text-green-600' : 'text-yellow-600'}>
                {isSubscribed ? '✅ Evet' : '❌ Hayır'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Yükleniyor:</span>
              <span className={isLoading ? 'text-blue-600' : 'text-gray-600'}>
                {isLoading ? '⏳ Evet' : '❌ Hayır'}
              </span>
            </div>
            {error && (
              <div className="text-red-600 text-sm mt-2">
                Hata: {error}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test İşlemleri</h2>
          <div className="space-y-4">
            <button
              onClick={testNotification}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Test Bildirimi Gönder
            </button>
            
            {!isSubscribed ? (
              <button
                onClick={subscribe}
                disabled={isLoading || !isSupported}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Yükleniyor...' : 'Push Bildirimlerini Etkinleştir'}
              </button>
            ) : (
              <button
                onClick={unsubscribe}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Yükleniyor...' : 'Push Bildirimlerini Devre Dışı Bırak'}
              </button>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Test Talimatları:</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Bu sayfayı PWA olarak yükleyin (Chrome'da "Ana ekrana ekle")</li>
            <li>2. PWA modunda açın ve push bildirimlerini etkinleştirin</li>
            <li>3. Test bildirimi gönderin</li>
            <li>4. Uygulamayı kapatın ve bildirim gelip gelmediğini kontrol edin</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
