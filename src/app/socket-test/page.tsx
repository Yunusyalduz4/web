"use client";

import { useSocket } from '../../hooks/useSocket';
import { useEffect } from 'react';

export default function SocketTestPage() {
  const { socket, isConnected, isConnecting, error, events } = useSocket();

  useEffect(() => {
    if (socket && isConnected) {
      // Test mesajı gönder
      socket.emit('test:message', 'Merhaba Socket.io!');
    }
  }, [socket, isConnected]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Socket.io Test Sayfası</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">
              Durum: {isConnected ? 'Bağlı' : isConnecting ? 'Bağlanıyor...' : 'Bağlı Değil'}
            </span>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Hata:</strong> {error}
            </div>
          )}
          
          <div className="bg-gray-50 rounded p-4">
            <h3 className="font-medium text-gray-900 mb-2">Socket Events:</h3>
            <div className="space-y-2">
              {events.length === 0 ? (
                <p className="text-gray-500">Henüz event yok</p>
              ) : (
                events.map((event, index) => (
                  <div key={index} className="text-sm bg-white p-2 rounded border">
                    <div className="font-medium">{event.type}</div>
                    <div className="text-gray-600">{JSON.stringify(event.data)}</div>
                    <div className="text-xs text-gray-400">{event.timestamp.toLocaleTimeString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {socket && (
            <div className="bg-blue-50 rounded p-4">
              <h3 className="font-medium text-blue-900 mb-2">Socket Bilgileri:</h3>
              <div className="text-sm text-blue-800">
                <div>ID: {socket.id}</div>
                <div>Connected: {socket.connected ? 'Evet' : 'Hayır'}</div>
                <div>Transport: {socket.io.engine.transport.name}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
