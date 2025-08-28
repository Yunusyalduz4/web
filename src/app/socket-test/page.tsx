'use client';

import { useSocket } from '../../hooks/useSocket';
import { useState } from 'react';

export default function SocketTestPage() {
  const { socket, isConnected, isConnecting, error, events, emit, clearEvents } = useSocket();
  const [testMessage, setTestMessage] = useState('');

  const sendTestMessage = () => {
    if (testMessage.trim()) {
      emit('test:message', testMessage);
      setTestMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Socket.IO Test Sayfası</h1>
        
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Bağlantı Durumu</h2>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">
                {isConnected ? 'Bağlı' : isConnecting ? 'Bağlanıyor...' : 'Bağlı Değil'}
              </span>
            </div>
            {error && (
              <div className="text-red-600 text-sm">
                Hata: {error}
              </div>
            )}
          </div>
        </div>

        {/* Test Message */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Mesajı Gönder</h2>
          <div className="flex space-x-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Test mesajınızı yazın..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendTestMessage}
              disabled={!isConnected || !testMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Gönder
            </button>
          </div>
        </div>

        {/* Events */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Socket Events</h2>
            <button
              onClick={clearEvents}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Temizle
            </button>
          </div>
          
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Henüz event yok</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{event.type}</span>
                    <span className="text-xs text-gray-500">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
