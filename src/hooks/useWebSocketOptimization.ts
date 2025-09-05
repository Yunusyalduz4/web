"use client";
import { useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

// WebSocket optimizasyonu için hook
export function useWebSocketOptimization() {
  const { socket, isConnected, joinRoom, leaveRoom } = useWebSocket();
  const joinedRooms = useRef<Set<string>>(new Set());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Odaya katılma optimizasyonu - duplicate join'leri engelle
  const optimizedJoinRoom = useCallback((room: string) => {
    if (!joinedRooms.current.has(room)) {
      joinRoom(room);
      joinedRooms.current.add(room);
      console.log(`🔗 Odaya katıldı: ${room}`);
    }
  }, [joinRoom]);

  // Odadan ayrılma optimizasyonu
  const optimizedLeaveRoom = useCallback((room: string) => {
    if (joinedRooms.current.has(room)) {
      leaveRoom(room);
      joinedRooms.current.delete(room);
      console.log(`🔗 Odadan ayrıldı: ${room}`);
    }
  }, [leaveRoom]);

  // Bağlantı kesildiğinde odaları temizle
  useEffect(() => {
    if (!isConnected) {
      joinedRooms.current.clear();
    }
  }, [isConnected]);

  // Reconnection logic
  useEffect(() => {
    if (socket) {
      const handleDisconnect = () => {
        console.log('🔌 WebSocket bağlantısı kesildi, yeniden bağlanmaya çalışılıyor...');
        reconnectAttempts.current += 1;
        
        if (reconnectAttempts.current <= maxReconnectAttempts) {
          setTimeout(() => {
            socket.connect();
          }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)); // Exponential backoff
        } else {
          console.error('❌ Maksimum yeniden bağlanma denemesi aşıldı');
        }
      };

      const handleConnect = () => {
        console.log('✅ WebSocket yeniden bağlandı');
        reconnectAttempts.current = 0;
      };

      socket.on('disconnect', handleDisconnect);
      socket.on('connect', handleConnect);

      return () => {
        socket.off('disconnect', handleDisconnect);
        socket.off('connect', handleConnect);
      };
    }
  }, [socket]);

  // Heartbeat - bağlantıyı canlı tut
  useEffect(() => {
    if (socket && isConnected) {
      const heartbeat = setInterval(() => {
        socket.emit('ping');
      }, 30000); // 30 saniyede bir ping

      return () => clearInterval(heartbeat);
    }
  }, [socket, isConnected]);

  return {
    optimizedJoinRoom,
    optimizedLeaveRoom,
    joinedRooms: Array.from(joinedRooms.current)
  };
}

// Debounced event handler hook
export function useDebouncedWebSocketEvent(
  event: string,
  callback: (data: any) => void,
  delay: number = 300
) {
  const { addEventListener, removeEventListener } = useWebSocket();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback((data: any) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(data);
    }, delay);
  }, [callback, delay]);

  useEffect(() => {
    addEventListener(event, debouncedCallback);
    
    return () => {
      removeEventListener(event, debouncedCallback);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [event, debouncedCallback, addEventListener, removeEventListener]);
}

// Throttled event handler hook
export function useThrottledWebSocketEvent(
  event: string,
  callback: (data: any) => void,
  limit: number = 1000
) {
  const { addEventListener, removeEventListener } = useWebSocket();
  const lastCallRef = useRef<number>(0);

  const throttledCallback = useCallback((data: any) => {
    const now = Date.now();
    
    if (now - lastCallRef.current >= limit) {
      lastCallRef.current = now;
      callback(data);
    }
  }, [callback, limit]);

  useEffect(() => {
    addEventListener(event, throttledCallback);
    
    return () => {
      removeEventListener(event, throttledCallback);
    };
  }, [event, throttledCallback, addEventListener, removeEventListener]);
}

// Batch event handler hook - birden fazla event'i toplu işle
export function useBatchedWebSocketEvents(
  events: string[],
  callback: (eventData: { event: string; data: any }[]) => void,
  batchSize: number = 10,
  batchDelay: number = 100
) {
  const { addEventListener, removeEventListener } = useWebSocket();
  const batchRef = useRef<{ event: string; data: any }[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const processBatch = useCallback(() => {
    if (batchRef.current.length > 0) {
      callback([...batchRef.current]);
      batchRef.current = [];
    }
  }, [callback]);

  const batchedCallback = useCallback((event: string, data: any) => {
    batchRef.current.push({ event, data });
    
    if (batchRef.current.length >= batchSize) {
      processBatch();
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(processBatch, batchDelay);
    }
  }, [processBatch, batchSize, batchDelay]);

  useEffect(() => {
    const handlers = events.map(event => {
      const handler = (data: any) => batchedCallback(event, data);
      addEventListener(event, handler);
      return { event, handler };
    });

    return () => {
      handlers.forEach(({ event, handler }) => {
        removeEventListener(event, handler);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [events, batchedCallback, addEventListener, removeEventListener]);
}
