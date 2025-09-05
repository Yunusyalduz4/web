"use client";
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useRealTimeAppointments, useRealTimeReviews, useRealTimeBusiness, useRealTimeNotifications } from '../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../hooks/useWebSocketEvents';

export default function WebSocketTestPage() {
  const { socket, isConnected, isConnecting, error, emit, joinRoom, leaveRoom, events } = useWebSocket();
  const { isConnected: statusConnected, isConnecting: statusConnecting, error: statusError } = useWebSocketStatus();
  
  // Test hooks
  const { setCallbacks: setAppointmentCallbacks } = useRealTimeAppointments();
  const { setCallbacks: setReviewCallbacks } = useRealTimeReviews();
  const { setCallbacks: setBusinessCallbacks } = useRealTimeBusiness();
  const { setCallbacks: setNotificationCallbacks } = useRealTimeNotifications();

  const [testMessage, setTestMessage] = useState('');
  const [testRoom, setTestRoom] = useState('business:123');

  // Test callback'leri ayarla
  useEffect(() => {
    setAppointmentCallbacks({
      onAppointmentCreated: (data) => {
        console.log('🧪 Test - Randevu oluşturuldu:', data);
      },
      onAppointmentUpdated: (data) => {
        console.log('🧪 Test - Randevu güncellendi:', data);
      },
      onAppointmentCancelled: (data) => {
        console.log('🧪 Test - Randevu iptal edildi:', data);
      }
    });

    setReviewCallbacks({
      onReviewCreated: (data) => {
        console.log('🧪 Test - Yorum oluşturuldu:', data);
      },
      onReviewReplied: (data) => {
        console.log('🧪 Test - Yorum yanıtlandı:', data);
      }
    });

    setBusinessCallbacks({
      onBusinessUpdated: (data) => {
        console.log('🧪 Test - İşletme güncellendi:', data);
      },
      onServiceUpdated: (data) => {
        console.log('🧪 Test - Hizmet güncellendi:', data);
      },
      onEmployeeUpdated: (data) => {
        console.log('🧪 Test - Çalışan güncellendi:', data);
      }
    });

    setNotificationCallbacks({
      onNotificationSent: (data) => {
        console.log('🧪 Test - Bildirim gönderildi:', data);
      }
    });
  }, [setAppointmentCallbacks, setReviewCallbacks, setBusinessCallbacks, setNotificationCallbacks]);

  const handleSendMessage = () => {
    if (testMessage.trim()) {
      emit('test:message', { message: testMessage, timestamp: new Date().toISOString() });
      setTestMessage('');
    }
  };

  const handleJoinRoom = () => {
    if (testRoom.trim()) {
      joinRoom(testRoom);
    }
  };

  const handleLeaveRoom = () => {
    if (testRoom.trim()) {
      leaveRoom(testRoom);
    }
  };

  const handleEmitTestEvents = () => {
    // Test event'lerini emit et
    emit('appointment:created', {
      id: 'test-123',
      businessId: 'business-123',
      userId: 'user-123',
      status: 'pending',
      timestamp: new Date().toISOString()
    });

    emit('review:created', {
      id: 'review-123',
      businessId: 'business-123',
      userId: 'user-123',
      rating: 5,
      comment: 'Test yorumu',
      timestamp: new Date().toISOString()
    });

    emit('business:updated', {
      id: 'business-123',
      name: 'Test İşletme',
      timestamp: new Date().toISOString()
    });

    emit('notification:sent', {
      id: 'notif-123',
      userId: 'user-123',
      message: 'Test bildirimi',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
          WebSocket Test Sayfası
        </h1>

        {/* WebSocket Durumu */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">🔌 WebSocket Durumu</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                isConnecting ? 'bg-yellow-400 animate-pulse' : 
                isConnected ? 'bg-green-400 animate-pulse' : 
                'bg-red-400'
              }`}></div>
              <p className="text-sm font-medium">
                {isConnecting ? 'Bağlanıyor...' : 
                 isConnected ? 'Bağlı' : 
                 'Bağlı değil'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Socket ID</p>
              <p className="text-sm font-mono">{socket?.id || 'N/A'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Event Sayısı</p>
              <p className="text-sm font-mono">{events.length}</p>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">Hata: {error}</p>
            </div>
          )}
        </div>

        {/* Test Kontrolleri */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">🧪 Test Kontrolleri</h2>
          
          <div className="space-y-4">
            {/* Mesaj Gönderme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Mesajı Gönder
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Test mesajı yazın..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!isConnected || !testMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Gönder
                </button>
              </div>
            </div>

            {/* Oda Yönetimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Oda Yönetimi
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testRoom}
                  onChange={(e) => setTestRoom(e.target.value)}
                  placeholder="business:123"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!isConnected}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  Katıl
                </button>
                <button
                  onClick={handleLeaveRoom}
                  disabled={!isConnected}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  Ayrıl
                </button>
              </div>
            </div>

            {/* Test Event'leri */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Event'leri Gönder
              </label>
              <button
                onClick={handleEmitTestEvents}
                disabled={!isConnected}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                Tüm Test Event'lerini Gönder
              </button>
            </div>
          </div>
        </div>

        {/* Event Geçmişi */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">📋 Event Geçmişi</h2>
          <div className="max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz event yok</p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 20).map((event, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{event.type}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        #{events.length - index}
                      </div>
                    </div>
                    <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
