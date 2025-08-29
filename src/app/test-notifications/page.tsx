"use client";
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function TestNotificationsPage() {
  const { data: session } = useSession();
  const [message, setMessage] = useState('');
  const [type, setType] = useState('system');
  const [userType, setUserType] = useState<'user' | 'business'>('user');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const addTestNotification = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType, message, type })
      });
      
      const data = await response.json();
      if (response.ok) {
        setResult(`✅ Başarılı: ${JSON.stringify(data, null, 2)}`);
        setMessage('');
      } else {
        setResult(`❌ Hata: ${data.error}`);
      }
    } catch (error) {
      setResult(`❌ Hata: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Test Bildirimleri</h1>
          <p className="text-gray-600">Test etmek için giriş yapın</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Test Bildirimleri
        </h1>
        
        <div className="space-y-4">
          {/* User Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Tipi
            </label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as 'user' | 'business')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="user">Müşteri</option>
              <option value="business">İşletme</option>
            </select>
          </div>

          {/* Message Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bildirim Mesajı
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Test bildirim mesajını yazın..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bildirim Tipi
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="system">Sistem</option>
              <option value="appointment">Randevu</option>
              <option value="review">Değerlendirme</option>
              <option value="reminder">Hatırlatma</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            onClick={addTestNotification}
            disabled={loading || !message.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Ekleniyor...' : 'Test Bildirimi Ekle'}
          </button>

          {/* Result Display */}
          {result && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap">{result}</pre>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Nasıl Test Edilir:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Kullanıcı tipini seçin</li>
              <li>Bildirim mesajını yazın</li>
              <li>Bildirim tipini seçin</li>
              <li>"Test Bildirimi Ekle" butonuna tıklayın</li>
              <li>Dashboard'da bildirimler butonuna tıklayın</li>
              <li>Yeni bildirimi görün</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
