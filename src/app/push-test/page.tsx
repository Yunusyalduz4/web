"use client";
import { useState, useEffect } from 'react';
import { useUserPushNotifications } from '../../hooks/useUserPushNotifications';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function PushTestPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // User push notifications
  const {
    isSupported: userSupported,
    isSubscribed: userSubscribed,
    isLoading: userLoading,
    error: userError,
    subscribe: userSubscribe,
    unsubscribe: userUnsubscribe
  } = useUserPushNotifications();

  // Business push notifications (test için)
  const {
    isSupported: businessSupported,
    isSubscribed: businessSubscribed,
    isLoading: businessLoading,
    error: businessError,
    subscribe: businessSubscribe,
    unsubscribe: businessUnsubscribe
  } = usePushNotifications('a0875152-3d2e-4d3e-b685-a7d2f480ab00');

  const testPushNotification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/push/test_dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: 'a0875152-3d2e-4d3e-b685-a7d2f480ab00'
        })
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Client-side check
  useEffect(() => {
    setIsClient(true);
  }, []);

  const testUserPush = async () => {
    try {
      const success = await userSubscribe();
      if (success) {
        alert('Kullanıcı push notification başarıyla aktif edildi!');
      } else {
        alert('Kullanıcı push notification aktif edilemedi!');
      }
    } catch (error) {
      alert('Hata: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const testBusinessPush = async () => {
    try {
      const success = await businessSubscribe();
      if (success) {
        alert('İşletme push notification başarıyla aktif edildi!');
      } else {
        alert('İşletme push notification aktif edilemedi!');
      }
    } catch (error) {
      alert('Hata: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Push Notification Test Sayfası
        </h1>

        {/* VAPID Key Bilgileri */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">🔑 VAPID Key Bilgileri</h2>
          <div className="space-y-2">
            <p><strong>Public Key:</strong> {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BG1LYEA21rncGSSNwQGDVz2XJf55gexHy0BIeoUhpXrMwcucDVYI6eBVPqVUvT29I__O7crCYqaXEp4ghNirZeY'}</p>
            <p><strong>Email:</strong> yalduzbey@gmail.com</p>
            <p><strong>HTTPS:</strong> {isClient && window.location.protocol === 'https:' ? '✅ Aktif' : '❌ Gerekli'}</p>
            <p><strong>Secure Context:</strong> {isClient && window.isSecureContext ? '✅ Aktif' : '❌ Gerekli'}</p>
          </div>
        </div>

        {/* Kullanıcı Push Notifications */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">👤 Kullanıcı Push Notifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                userLoading ? 'bg-yellow-400 animate-pulse' : 
                userSubscribed ? 'bg-green-400' : 
                'bg-red-400'
              }`}></div>
              <p className="text-sm font-medium">
                {userLoading ? 'Yükleniyor...' : 
                 userSubscribed ? 'Aktif' : 
                 'Pasif'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Destekleniyor</p>
              <p className="text-sm font-mono">{userSupported ? '✅' : '❌'}</p>
            </div>
          </div>
          {userError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">Hata: {userError}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={testUserPush}
              disabled={!userSupported || userLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Kullanıcı Push Aktif Et
            </button>
            <button
              onClick={userUnsubscribe}
              disabled={!userSupported || userLoading || !userSubscribed}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              Kullanıcı Push Deaktif Et
            </button>
          </div>
        </div>

        {/* İşletme Push Notifications */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">🏢 İşletme Push Notifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                businessLoading ? 'bg-yellow-400 animate-pulse' : 
                businessSubscribed ? 'bg-green-400' : 
                'bg-red-400'
              }`}></div>
              <p className="text-sm font-medium">
                {businessLoading ? 'Yükleniyor...' : 
                 businessSubscribed ? 'Aktif' : 
                 'Pasif'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Destekleniyor</p>
              <p className="text-sm font-mono">{businessSupported ? '✅' : '❌'}</p>
            </div>
          </div>
          {businessError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">Hata: {businessError}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={testBusinessPush}
              disabled={!businessSupported || businessLoading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              İşletme Push Aktif Et
            </button>
            <button
              onClick={businessUnsubscribe}
              disabled={!businessSupported || businessLoading || !businessSubscribed}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              İşletme Push Deaktif Et
            </button>
          </div>
        </div>

        {/* Test Push Notification */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">🧪 Test Push Notification</h2>
          <button
            onClick={testPushNotification}
            disabled={isLoading}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            {isLoading ? 'Test Ediliyor...' : 'Test Push Notification Gönder'}
          </button>
          
          {testResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Test Sonucu:</h3>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Sorun Giderme */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">🔧 Sorun Giderme</h2>
          <div className="space-y-2 text-sm text-yellow-700">
            <p><strong>1. HTTPS Gerekli:</strong> Push notifications sadece HTTPS'te çalışır</p>
            <p><strong>2. Service Worker:</strong> Tarayıcı service worker'ı desteklemeli</p>
            <p><strong>3. VAPID Keys:</strong> Doğru VAPID key'ler tanımlanmalı</p>
            <p><strong>4. Permission:</strong> Kullanıcı bildirim izni vermeli</p>
            <p><strong>5. PWA:</strong> Uygulama PWA olarak yüklenmeli (opsiyonel)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
