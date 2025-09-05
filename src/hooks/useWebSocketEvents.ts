"use client";
import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

// Sayfa bazlı WebSocket event hooks'ları

// Randevu sayfaları için hook
export function useAppointmentEvents() {
  const { addEventListener, removeEventListener } = useWebSocket();
  const callbacksRef = useRef<{
    onAppointmentCreated?: (data: any) => void;
    onAppointmentUpdated?: (data: any) => void;
    onAppointmentCancelled?: (data: any) => void;
    onAppointmentCompleted?: (data: any) => void;
    onAppointmentAssigned?: (data: any) => void;
    onAppointmentReminder?: (data: any) => void;
  }>({});

  const setCallbacks = useCallback((callbacks: typeof callbacksRef.current) => {
    callbacksRef.current = callbacks;
  }, []);

  useEffect(() => {
    const handleAppointmentCreated = (data: any) => {
      callbacksRef.current.onAppointmentCreated?.(data);
    };

    const handleAppointmentUpdated = (data: any) => {
      callbacksRef.current.onAppointmentUpdated?.(data);
    };

    const handleAppointmentCancelled = (data: any) => {
      callbacksRef.current.onAppointmentCancelled?.(data);
    };

    const handleAppointmentCompleted = (data: any) => {
      callbacksRef.current.onAppointmentCompleted?.(data);
    };

    const handleAppointmentAssigned = (data: any) => {
      callbacksRef.current.onAppointmentAssigned?.(data);
    };

    const handleAppointmentReminder = (data: any) => {
      callbacksRef.current.onAppointmentReminder?.(data);
    };

    // Event listener'ları ekle
    addEventListener('appointment:created', handleAppointmentCreated);
    addEventListener('appointment:status_updated', handleAppointmentUpdated);
    addEventListener('appointment:cancelled', handleAppointmentCancelled);
    addEventListener('appointment:completed', handleAppointmentCompleted);
    addEventListener('appointment:assigned', handleAppointmentAssigned);
    addEventListener('appointment:reminder', handleAppointmentReminder);

    // Cleanup
    return () => {
      removeEventListener('appointment:created', handleAppointmentCreated);
      removeEventListener('appointment:status_updated', handleAppointmentUpdated);
      removeEventListener('appointment:cancelled', handleAppointmentCancelled);
      removeEventListener('appointment:completed', handleAppointmentCompleted);
      removeEventListener('appointment:assigned', handleAppointmentAssigned);
      removeEventListener('appointment:reminder', handleAppointmentReminder);
    };
  }, [addEventListener, removeEventListener]);

  return { setCallbacks };
}

// Yorum sayfaları için hook
export function useReviewEvents() {
  const { addEventListener, removeEventListener } = useWebSocket();
  const callbacksRef = useRef<{
    onReviewCreated?: (data: any) => void;
    onReviewReplied?: (data: any) => void;
    onReviewStatusUpdated?: (data: any) => void;
  }>({});

  const setCallbacks = useCallback((callbacks: typeof callbacksRef.current) => {
    callbacksRef.current = callbacks;
  }, []);

  useEffect(() => {
    const handleReviewCreated = (data: any) => {
      callbacksRef.current.onReviewCreated?.(data);
    };

    const handleReviewReplied = (data: any) => {
      callbacksRef.current.onReviewReplied?.(data);
    };

    const handleReviewStatusUpdated = (data: any) => {
      callbacksRef.current.onReviewStatusUpdated?.(data);
    };

    // Event listener'ları ekle
    addEventListener('review:created', handleReviewCreated);
    addEventListener('review:replied', handleReviewReplied);
    addEventListener('review:status_updated', handleReviewStatusUpdated);

    // Cleanup
    return () => {
      removeEventListener('review:created', handleReviewCreated);
      removeEventListener('review:replied', handleReviewReplied);
      removeEventListener('review:status_updated', handleReviewStatusUpdated);
    };
  }, [addEventListener, removeEventListener]);

  return { setCallbacks };
}

// İşletme sayfaları için hook
export function useBusinessEvents() {
  const { addEventListener, removeEventListener } = useWebSocket();
  const callbacksRef = useRef<{
    onBusinessUpdated?: (data: any) => void;
    onBusinessApprovalUpdated?: (data: any) => void;
    onServiceCreated?: (data: any) => void;
    onServiceUpdated?: (data: any) => void;
    onServiceDeleted?: (data: any) => void;
    onEmployeeCreated?: (data: any) => void;
    onEmployeeUpdated?: (data: any) => void;
    onEmployeeDeleted?: (data: any) => void;
    onEmployeeAvailabilityUpdated?: (data: any) => void;
  }>({});

  const setCallbacks = useCallback((callbacks: typeof callbacksRef.current) => {
    callbacksRef.current = callbacks;
  }, []);

  useEffect(() => {
    const handleBusinessUpdated = (data: any) => {
      callbacksRef.current.onBusinessUpdated?.(data);
    };

    const handleBusinessApprovalUpdated = (data: any) => {
      callbacksRef.current.onBusinessApprovalUpdated?.(data);
    };

    const handleServiceCreated = (data: any) => {
      callbacksRef.current.onServiceCreated?.(data);
    };

    const handleServiceUpdated = (data: any) => {
      callbacksRef.current.onServiceUpdated?.(data);
    };

    const handleServiceDeleted = (data: any) => {
      callbacksRef.current.onServiceDeleted?.(data);
    };

    const handleEmployeeCreated = (data: any) => {
      callbacksRef.current.onEmployeeCreated?.(data);
    };

    const handleEmployeeUpdated = (data: any) => {
      callbacksRef.current.onEmployeeUpdated?.(data);
    };

    const handleEmployeeDeleted = (data: any) => {
      callbacksRef.current.onEmployeeDeleted?.(data);
    };

    const handleEmployeeAvailabilityUpdated = (data: any) => {
      callbacksRef.current.onEmployeeAvailabilityUpdated?.(data);
    };

    // Event listener'ları ekle
    addEventListener('business:updated', handleBusinessUpdated);
    addEventListener('business:approval_updated', handleBusinessApprovalUpdated);
    addEventListener('service:created', handleServiceCreated);
    addEventListener('service:updated', handleServiceUpdated);
    addEventListener('service:deleted', handleServiceDeleted);
    addEventListener('employee:created', handleEmployeeCreated);
    addEventListener('employee:updated', handleEmployeeUpdated);
    addEventListener('employee:deleted', handleEmployeeDeleted);
    addEventListener('employee:availability_updated', handleEmployeeAvailabilityUpdated);

    // Cleanup
    return () => {
      removeEventListener('business:updated', handleBusinessUpdated);
      removeEventListener('business:approval_updated', handleBusinessApprovalUpdated);
      removeEventListener('service:created', handleServiceCreated);
      removeEventListener('service:updated', handleServiceUpdated);
      removeEventListener('service:deleted', handleServiceDeleted);
      removeEventListener('employee:created', handleEmployeeCreated);
      removeEventListener('employee:updated', handleEmployeeUpdated);
      removeEventListener('employee:deleted', handleEmployeeDeleted);
      removeEventListener('employee:availability_updated', handleEmployeeAvailabilityUpdated);
    };
  }, [addEventListener, removeEventListener]);

  return { setCallbacks };
}

// Bildirim sayfaları için hook
export function useNotificationEvents() {
  const { addEventListener, removeEventListener } = useWebSocket();
  const callbacksRef = useRef<{
    onNotificationSent?: (data: any) => void;
    onNotificationRead?: (data: any) => void;
  }>({});

  const setCallbacks = useCallback((callbacks: typeof callbacksRef.current) => {
    callbacksRef.current = callbacks;
  }, []);

  useEffect(() => {
    const handleNotificationSent = (data: any) => {
      callbacksRef.current.onNotificationSent?.(data);
    };

    const handleNotificationRead = (data: any) => {
      callbacksRef.current.onNotificationRead?.(data);
    };

    // Event listener'ları ekle
    addEventListener('notification:sent', handleNotificationSent);
    addEventListener('notification:read', handleNotificationRead);

    // Cleanup
    return () => {
      removeEventListener('notification:sent', handleNotificationSent);
      removeEventListener('notification:read', handleNotificationRead);
    };
  }, [addEventListener, removeEventListener]);

  return { setCallbacks };
}

// Genel WebSocket durumu için hook
export function useWebSocketStatus() {
  const { isConnected, isConnecting, error, events, clearEvents } = useWebSocket();
  
  return {
    isConnected,
    isConnecting,
    error,
    events,
    clearEvents
  };
}
