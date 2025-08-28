"use client";
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export default function SocketNoAuthTestPage() {
  const [status, setStatus] = useState('Başlatılıyor...');
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const testSocket = async () => {
      try {
        setStatus('Socket.io server başlatılıyor...');
        
        // Önce server'ı başlat
        await fetch('/api/socket');
        setStatus('Server başlatıldı, socket bağlantısı kuruluyor...');
        
        // Socket bağlantısı kur - TOKEN OLMADAN
        const newSocket = io('http://localhost:3002', {
          transports: ['polling', 'websocket']
          // auth yok!
        });

        console.log('🔌 Socket oluşturuldu - TOKEN OLMADAN');

        newSocket.on('connect', () => {
          setStatus('✅ Bağlandı! Socket ID: ' + newSocket.id);
          setSocket(newSocket);
        });

        newSocket.on('connect_error', (err: any) => {
          setStatus('❌ Bağlantı hatası: ' + err.message);
          console.error('Connect error:', err);
        });

        newSocket.on('error', (err: any) => {
          setStatus('❌ Socket hatası: ' + err.message);
          console.error('Socket error:', err);
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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🧪 Socket.io No Auth Test
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

          <div className="p-4 bg-yellow-50 rounded-lg">
            <h2 className="font-semibold text-yellow-700 mb-2">Test Açıklaması:</h2>
            <p className="text-sm text-yellow-600">
              Bu test auth token olmadan Socket.io bağlantısı kurmaya çalışır.<br/>
              Server console'da authentication log'larını görebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
