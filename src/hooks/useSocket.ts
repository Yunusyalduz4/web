import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

export interface SocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface UseSocketReturn {
  socket: any | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  events: SocketEvent[];
  emit: (event: string, data: any) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  clearEvents: () => void;
  getConnectedUsersCount: () => number;
}

export function useSocket(): UseSocketReturn {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const socketRef = useRef<any | null>(null);

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
        transports: ['websocket', 'polling'], // Önce websocket, sonra polling
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
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      newSocket.on('connect_error', (err: any) => {
        setError(`Bağlantı hatası: ${err.message || 'Bilinmeyen hata'}`);
        setIsConnecting(false);
      });

      newSocket.on('error', (err: any) => {
        setError(`Socket hatası: ${err.message || 'Bilinmeyen hata'}`);
      });

      newSocket.on('disconnect', (reason: string) => {
        setIsConnected(false);
        if (reason === 'io server disconnect') {
          // Server tarafından bağlantı kesildi, yeniden bağlan
          setTimeout(() => {
            newSocket.connect();
          }, 1000);
        }
      });

      // Test events
      newSocket.on('test:response', (data: any) => {
        addEvent('test:response', data);
      });

      // Appointment events
      newSocket.on('socket:appointment:created', (data: any) => {
        addEvent('appointment:created', data);
      });

      newSocket.on('socket:appointment:status_updated', (data: any) => {
        addEvent('appointment:status_updated', data);
      });

      newSocket.on('socket:appointment:cancelled', (data: any) => {
        addEvent('appointment:cancelled', data);
      });

      newSocket.on('socket:appointment:completed', (data: any) => {
        addEvent('appointment:completed', data);
      });

      newSocket.on('socket:appointment:manual_created', (data: any) => {
        addEvent('appointment:manual_created', data);
      });

      newSocket.on('socket:appointment:assigned', (data: any) => {
        addEvent('appointment:assigned', data);
      });

      newSocket.on('socket:appointment:reminder', (data: any) => {
        addEvent('appointment:reminder', data);
      });

      // Review events
      newSocket.on('socket:review:created', (data: any) => {
        addEvent('review:created', data);
      });

      newSocket.on('socket:review:replied', (data: any) => {
        addEvent('review:status_updated', data);
      });

      newSocket.on('socket:review:status_updated', (data: any) => {
        addEvent('review:status_updated', data);
      });

      // Business events
      newSocket.on('socket:business:updated', (data: any) => {
        addEvent('business:updated', data);
      });

      newSocket.on('socket:business:approval_updated', (data: any) => {
        addEvent('business:approval_updated', data);
      });

      // Service events
      newSocket.on('socket:service:created', (data: any) => {
        addEvent('service:created', data);
      });

      newSocket.on('socket:service:updated', (data: any) => {
        addEvent('service:updated', data);
      });

      newSocket.on('socket:service:deleted', (data: any) => {
        addEvent('service:deleted', data);
      });

      // Employee events
      newSocket.on('socket:employee:created', (data: any) => {
        addEvent('employee:created', data);
      });

      newSocket.on('socket:employee:updated', (data: any) => {
        addEvent('employee:updated', data);
      });

      newSocket.on('socket:employee:deleted', (data: any) => {
        addEvent('employee:deleted', data);
      });

      newSocket.on('socket:employee:availability_updated', (data: any) => {
        addEvent('employee:availability_updated', data);
      });

      // Notification events
      newSocket.on('socket:notification:sent', (data: any) => {
        addEvent('notification:sent', data);
      });

      newSocket.on('socket:notification:read', (data: any) => {
        addEvent('notification:read', data);
      });

      // Reschedule events
      newSocket.on('socket:reschedule:requested', (data: any) => {
        addEvent('reschedule:requested', data);
      });

      newSocket.on('socket:reschedule:approved', (data: any) => {
        addEvent('reschedule:approved', data);
      });

      newSocket.on('socket:reschedule:rejected', (data: any) => {
        addEvent('reschedule:rejected', data);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

    } catch (err: any) {
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

  // Test message gönder
  useEffect(() => {
    if (socket && isConnected) {
      // Test mesajı gönder
      setTimeout(() => {
        emit('test:message', 'Merhaba Socket.io!');
      }, 1000);
    }
  }, [socket, isConnected, emit]);

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    events,
    emit,
    joinRoom,
    leaveRoom,
    clearEvents,
    getConnectedUsersCount
  };
}
