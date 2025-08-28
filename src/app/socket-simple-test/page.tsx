"use client";
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export default function SocketSimpleTestPage() {
  const [status, setStatus] = useState('Başlatılıyor...');
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const testSocket = async () => {
      try {
        setStatus('Socket.io server başlatılıyor...');
        
        // Önce server'ı başlat
        await fetch('/api/socket');
        setStatus('Server başlatıldı, socket bağlantısı kuruluyor...');
        
        // Socket bağlantısı kur
        const newSocket = io('http://localhost:3002', {
          transports: ['polling', 'websocket'],
          auth: {
            token: 'test-user-123'
          }
        });

        console.log('🔌 Socket oluşturuldu, auth token:', 'test-user-123');

        newSocket.on('connect', () => {
          setStatus('✅ Bağlandı! Socket ID: ' + newSocket.id);
          setSocket(newSocket);
        });

        newSocket.on('connect_error', (err: any) => {
          setStatus('❌ Bağlantı hatası: ' + err.message);
        });

        newSocket.on('error', (err: any) => {
          setStatus('❌ Socket hatası: ' + err.message);
        });

        newSocket.on('disconnect', () => {
          setStatus('🔌 Bağlantı kesildi');
        });

      } catch (error) {
        setStatus('❌ Hata: ' + (error as Error).message);
      }
    };

    testSocket();
  }, []);

  const sendTestMessage = () => {
    if (socket) {
      socket.emit('test:message', 'Merhaba Socket.io!');
      setStatus('🧪 Test mesajı gönderildi');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🧪 Socket.io Basit Test
        </h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="font-semibold text-gray-700 mb-2">Durum:</h2>
            <p className="text-sm text-gray-600">{status}</p>
          </div>

          {socket && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h2 className="font-semibold text-green-700 mb-2">Bağlantı Bilgileri:</h2>
              <p className="text-sm text-green-600">
                Socket ID: {socket.id}<br/>
                Connected: {socket.connected ? 'Evet' : 'Hayır'}<br/>
                Transport: {socket.io.engine.transport.name}
              </p>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={sendTestMessage}
              disabled={!socket}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
            >
              Test Mesajı Gönder
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Yenile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
