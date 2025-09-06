"use client";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';

export interface SocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  events: SocketEvent[];
  emit: (event: string, data: any) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  clearEvents: () => void;
  getConnectedUsersCount: () => number;
  addEventListener: (event: string, callback: (data: any) => void) => void;
  removeEventListener: (event: string, callback: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const eventListeners = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  // Socket bağlantısını başlat
  const initializeSocket = useCallback(async () => {
    if (!session?.user?.id || socketRef.current) return;

    try {
      setIsConnecting(true);
      setError(null);

      // Socket.io server'ı başlat
      const response = await fetch('/api/socket');
      if (!response.ok) {
        throw new Error('Socket.io server başlatılamadı');
      }

      // Client socket'i oluştur - VPS için dinamik URL
      const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 
                       process.env.NEXTAUTH_URL || 
                       (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:3000');
      
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: true,
        auth: {
          token: session.user.id
        }
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('🔌 Global Socket.io bağlandı');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Global Socket.io bağlantısı kesildi');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (err: any) => {
        console.error('Global Socket connection error:', err);
        setError(`Bağlantı hatası: ${err.message || 'Bilinmeyen hata'}`);
        setIsConnecting(false);
      });

      newSocket.on('error', (err: any) => {
        console.error('Global Socket error:', err);
        setError(`Socket hatası: ${err.message || 'Bilinmeyen hata'}`);
      });

      // Reconnection handling
      newSocket.on('disconnect', (reason: string) => {
        console.log('Global Socket disconnected:', reason);
        setIsConnected(false);
        if (reason === 'io server disconnect') {
          setTimeout(() => {
            newSocket.connect();
          }, 1000);
        }
      });

      // Global event listeners - tüm uygulama için
      const setupGlobalEventListeners = () => {
        // Test events
        newSocket.on('test:response', (data: any) => {
          console.log('🧪 Global Test response:', data);
          addEvent('test:response', data);
        });

        // Appointment events
        newSocket.on('socket:appointment:created', (data: any) => {
          console.log('📅 Global Randevu oluşturuldu:', data);
          addEvent('appointment:created', data);
          triggerEventListeners('appointment:created', data);
        });

        newSocket.on('socket:appointment:status_updated', (data: any) => {
          console.log('📅 Global Randevu durumu güncellendi:', data);
          addEvent('appointment:status_updated', data);
          triggerEventListeners('appointment:status_updated', data);
        });

        newSocket.on('socket:appointment:cancelled', (data: any) => {
          console.log('📅 Global Randevu iptal edildi:', data);
          addEvent('appointment:cancelled', data);
          triggerEventListeners('appointment:cancelled', data);
        });

        newSocket.on('socket:appointment:completed', (data: any) => {
          console.log('📅 Global Randevu tamamlandı:', data);
          addEvent('appointment:completed', data);
          triggerEventListeners('appointment:completed', data);
        });

        newSocket.on('socket:appointment:manual_created', (data: any) => {
          console.log('📅 Global Manuel randevu oluşturuldu:', data);
          addEvent('appointment:manual_created', data);
          triggerEventListeners('appointment:manual_created', data);
        });

        newSocket.on('socket:appointment:assigned', (data: any) => {
          console.log('📅 Global Randevu atandı:', data);
          addEvent('appointment:assigned', data);
          triggerEventListeners('appointment:assigned', data);
        });

        newSocket.on('socket:appointment:reminder', (data: any) => {
          console.log('⏰ Global Randevu hatırlatması:', data);
          addEvent('appointment:reminder', data);
          triggerEventListeners('appointment:reminder', data);
        });

        // Review events
        newSocket.on('socket:review:created', (data: any) => {
          console.log('⭐ Global Yeni yorum:', data);
          addEvent('review:created', data);
          triggerEventListeners('review:created', data);
        });

        newSocket.on('socket:review:replied', (data: any) => {
          console.log('💬 Global Yorum yanıtı:', data);
          addEvent('review:replied', data);
          triggerEventListeners('review:replied', data);
        });

        newSocket.on('socket:review:status_updated', (data: any) => {
          console.log('⭐ Global Yorum durumu güncellendi:', data);
          addEvent('review:status_updated', data);
          triggerEventListeners('review:status_updated', data);
        });

        // Business events
        newSocket.on('socket:business:updated', (data: any) => {
          console.log('🏢 Global İşletme güncellendi:', data);
          addEvent('business:updated', data);
          triggerEventListeners('business:updated', data);
        });

        newSocket.on('socket:business:approval_updated', (data: any) => {
          console.log('🏢 Global İşletme onay durumu güncellendi:', data);
          addEvent('business:approval_updated', data);
          triggerEventListeners('business:approval_updated', data);
        });

        // Service events
        newSocket.on('socket:service:created', (data: any) => {
          console.log('🔧 Global Yeni hizmet:', data);
          addEvent('service:created', data);
          triggerEventListeners('service:created', data);
        });

        newSocket.on('socket:service:updated', (data: any) => {
          console.log('🔧 Global Hizmet güncellendi:', data);
          addEvent('service:updated', data);
          triggerEventListeners('service:updated', data);
        });

        newSocket.on('socket:service:deleted', (data: any) => {
          console.log('🔧 Global Hizmet silindi:', data);
          addEvent('service:deleted', data);
          triggerEventListeners('service:deleted', data);
        });

        // Employee events
        newSocket.on('socket:employee:created', (data: any) => {
          console.log('👥 Global Yeni çalışan:', data);
          addEvent('employee:created', data);
          triggerEventListeners('employee:created', data);
        });

        newSocket.on('socket:employee:updated', (data: any) => {
          console.log('👥 Global Çalışan güncellendi:', data);
          addEvent('employee:updated', data);
          triggerEventListeners('employee:updated', data);
        });

        newSocket.on('socket:employee:deleted', (data: any) => {
          console.log('👥 Global Çalışan silindi:', data);
          addEvent('employee:deleted', data);
          triggerEventListeners('employee:deleted', data);
        });

        newSocket.on('socket:employee:availability_updated', (data: any) => {
          console.log('👥 Global Çalışan müsaitlik güncellendi:', data);
          addEvent('employee:availability_updated', data);
          triggerEventListeners('employee:availability_updated', data);
        });

        // Notification events
        newSocket.on('socket:notification:sent', (data: any) => {
          console.log('🔔 Global Bildirim gönderildi:', data);
          addEvent('notification:sent', data);
          triggerEventListeners('notification:sent', data);
        });

        newSocket.on('socket:notification:read', (data: any) => {
          console.log('🔔 Global Bildirim okundu:', data);
          addEvent('notification:read', data);
          triggerEventListeners('notification:read', data);
        });
      };

      setupGlobalEventListeners();
      socketRef.current = newSocket;
      setSocket(newSocket);

    } catch (err: any) {
      console.error('Global Socket initialization error:', err);
      setError(err.message || 'Socket başlatılamadı');
      setIsConnecting(false);
    }
  }, [session?.user?.id]);

  // Event ekle
  const addEvent = useCallback((type: string, data: any) => {
    const newEvent: SocketEvent = {
      type,
      data,
      timestamp: new Date()
    };
    setEvents(prev => [newEvent, ...prev.slice(0, 99)]); // Son 100 event'i tut
  }, []);

  // Event listener'ları tetikle
  const triggerEventListeners = useCallback((event: string, data: any) => {
    const listeners = eventListeners.current.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }, []);

  // Event listener ekle
  const addEventListener = useCallback((event: string, callback: (data: any) => void) => {
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, new Set());
    }
    eventListeners.current.get(event)!.add(callback);
  }, []);

  // Event listener kaldır
  const removeEventListener = useCallback((event: string, callback: (data: any) => void) => {
    const listeners = eventListeners.current.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        eventListeners.current.delete(event);
      }
    }
  }, []);

  // Event emit
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  }, [isConnected]);

  // Odaya katıl
  const joinRoom = useCallback((room: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(`join:${room.split(':')[0]}`, room.split(':')[1]);
    }
  }, [isConnected]);

  // Odadan ayrıl
  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(`leave:${room.split(':')[0]}`, room.split(':')[1]);
    }
  }, [isConnected]);

  // Event'leri temizle
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Bağlı kullanıcı sayısını al
  const getConnectedUsersCount = useCallback(() => {
    return socketRef.current?.connected ? 1 : 0;
  }, []);

  // Socket başlat
  useEffect(() => {
    if (session?.user?.id) {
      initializeSocket();
    }
  }, [session?.user?.id, initializeSocket]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    isConnecting,
    error,
    events,
    emit,
    joinRoom,
    leaveRoom,
    clearEvents,
    getConnectedUsersCount,
    addEventListener,
    removeEventListener
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
