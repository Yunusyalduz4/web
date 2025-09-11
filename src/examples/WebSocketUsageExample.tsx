"use client";
import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useRealTimeAppointments, useRealTimeReviews, useWebSocketStatus } from '../hooks/useRealTimeUpdates';
import { useWebSocketOptimization } from '../hooks/useWebSocketOptimization';

// WebSocket kullanım örnekleri

// 1. Temel WebSocket kullanımı
export function BasicWebSocketExample() {
  const { socket, isConnected, isConnecting, error, emit, joinRoom, leaveRoom } = useWebSocket();

  const handleSendMessage = () => {
    emit('test:message', { message: 'Merhaba WebSocket!' });
  };

  const handleJoinRoom = () => {
    joinRoom('business:123');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Temel WebSocket Kullanımı</h2>
      
      <div className="mb-4">
        <p>Durum: {isConnecting ? 'Bağlanıyor...' : isConnected ? 'Bağlı' : 'Bağlı değil'}</p>
        {error && <p className="text-red-500">Hata: {error}</p>}
      </div>

      <div className="space-x-2">
        <button 
          onClick={handleSendMessage}
          disabled={!isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Mesaj Gönder
        </button>
        
        <button 
          onClick={handleJoinRoom}
          disabled={!isConnected}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Odaya Katıl
        </button>
      </div>
    </div>
  );
}

// 2. Gerçek zamanlı randevu güncellemeleri
export function RealTimeAppointmentsExample() {
  const { setCallbacks } = useRealTimeAppointments('user123', 'business456');
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    setCallbacks({
      onAppointmentCreated: (data) => {
        // Randevu listesini güncelle
        setAppointments(prev => [data, ...prev]);
      },
      onAppointmentUpdated: (data) => {
        // Randevu listesini güncelle
        setAppointments(prev => 
          prev.map(apt => apt.id === data.id ? { ...apt, ...data } : apt)
        );
      },
      onAppointmentCancelled: (data) => {
        // Randevu listesinden kaldır
        setAppointments(prev => prev.filter(apt => apt.id !== data.id));
      }
    });
  }, [setCallbacks]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Gerçek Zamanlı Randevu Güncellemeleri</h2>
      <p>Randevu sayısı: {appointments.length}</p>
    </div>
  );
}

// 3. WebSocket optimizasyonu
export function WebSocketOptimizationExample() {
  const { optimizedJoinRoom, optimizedLeaveRoom, joinedRooms } = useWebSocketOptimization();
  const [currentRoom, setCurrentRoom] = useState('');

  const handleJoinRoom = (room: string) => {
    optimizedJoinRoom(room);
    setCurrentRoom(room);
  };

  const handleLeaveRoom = (room: string) => {
    optimizedLeaveRoom(room);
    setCurrentRoom('');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">WebSocket Optimizasyonu</h2>
      
      <div className="mb-4">
        <p>Katıldığım odalar: {joinedRooms.join(', ') || 'Hiçbiri'}</p>
        <p>Mevcut oda: {currentRoom || 'Hiçbiri'}</p>
      </div>

      <div className="space-x-2">
        <button 
          onClick={() => handleJoinRoom('business:123')}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          İşletme Odasına Katıl
        </button>
        
        <button 
          onClick={() => handleLeaveRoom('business:123')}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          İşletme Odasından Ayrıl
        </button>
      </div>
    </div>
  );
}

// 4. WebSocket durumu göstergesi
export function WebSocketStatusIndicator() {
  const { isConnected, isConnecting, error } = useWebSocketStatus();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">WebSocket:</span>
      
      {isConnecting && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-yellow-600">Bağlanıyor...</span>
        </div>
      )}
      
      {isConnected && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-600">Canlı</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          <span className="text-sm text-red-600">Hata</span>
        </div>
      )}
    </div>
  );
}

// 5. Modal içinde WebSocket kullanımı
export function ModalWithWebSocket() {
  const [isOpen, setIsOpen] = useState(false);
  const { emit, isConnected } = useWebSocket();
  const { setCallbacks } = useRealTimeReviews('user123', 'business456');

  useEffect(() => {
    if (isOpen) {
      setCallbacks({
        onReviewCreated: (data) => {
          // Modal içinde yorum listesini güncelle
        },
        onReviewReplied: (data) => {
        }
      });
    }
  }, [isOpen, setCallbacks]);

  const handleSubmitReview = () => {
    if (isConnected) {
      emit('review:created', {
        businessId: 'business123',
        userId: 'user123',
        rating: 5,
        comment: 'Harika hizmet!',
        timestamp: new Date().toISOString()
      });
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Modal Aç
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">Yorum Modalı</h3>
        
        <div className="mb-4">
          <WebSocketStatusIndicator />
        </div>
        
        <button 
          onClick={handleSubmitReview}
          disabled={!isConnected}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Yorum Gönder
        </button>
        
        <button 
          onClick={() => setIsOpen(false)}
          className="ml-2 px-4 py-2 bg-gray-500 text-white rounded"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}

// Ana örnek component
export default function WebSocketUsageExamples() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">WebSocket Kullanım Örnekleri</h1>
      
      <BasicWebSocketExample />
      <RealTimeAppointmentsExample />
      <WebSocketOptimizationExample />
      <ModalWithWebSocket />
    </div>
  );
}
