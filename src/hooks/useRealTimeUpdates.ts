"use client";
import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { trpc } from '../utils/trpcClient';

// Gerçek zamanlı güncellemeler için hook'lar

// Randevu listesi için gerçek zamanlı güncelleme
export function useRealTimeAppointments(userId?: string, businessId?: string) {
  const { addEventListener, removeEventListener } = useWebSocket();
  const utils = trpc.useUtils();
  const callbacksRef = useRef<{
    onAppointmentCreated?: () => void;
    onAppointmentUpdated?: () => void;
    onAppointmentCancelled?: () => void;
    onAppointmentCompleted?: () => void;
  }>({});

  const setCallbacks = useCallback((callbacks: typeof callbacksRef.current) => {
    callbacksRef.current = callbacks;
  }, []);

  // Randevu listesini yenile
  const refreshAppointments = useCallback(() => {
    if (userId) {
      utils.user.appointmentHistory.invalidate({ userId });
    }
    if (businessId) {
      utils.business.getAppointments.invalidate({ businessId });
    }
  }, [utils, userId, businessId]);

  useEffect(() => {
    const handleAppointmentCreated = (data: any) => {
      // Sadece ilgili kullanıcı veya işletme için güncelle
      if ((userId && data.userId === userId) || (businessId && data.businessId === businessId)) {
        refreshAppointments();
        callbacksRef.current.onAppointmentCreated?.();
      }
    };

    const handleAppointmentUpdated = (data: any) => {
      if ((userId && data.userId === userId) || (businessId && data.businessId === businessId)) {
        refreshAppointments();
        callbacksRef.current.onAppointmentUpdated?.();
      }
    };

    const handleAppointmentCancelled = (data: any) => {
      if ((userId && data.userId === userId) || (businessId && data.businessId === businessId)) {
        refreshAppointments();
        callbacksRef.current.onAppointmentCancelled?.();
      }
    };

    const handleAppointmentCompleted = (data: any) => {
      if ((userId && data.userId === userId) || (businessId && data.businessId === businessId)) {
        refreshAppointments();
        callbacksRef.current.onAppointmentCompleted?.();
      }
    };

    // Event listener'ları ekle
    addEventListener('appointment:created', handleAppointmentCreated);
    addEventListener('appointment:status_updated', handleAppointmentUpdated);
    addEventListener('appointment:cancelled', handleAppointmentCancelled);
    addEventListener('appointment:completed', handleAppointmentCompleted);

    // Cleanup
    return () => {
      removeEventListener('appointment:created', handleAppointmentCreated);
      removeEventListener('appointment:status_updated', handleAppointmentUpdated);
      removeEventListener('appointment:cancelled', handleAppointmentCancelled);
      removeEventListener('appointment:completed', handleAppointmentCompleted);
    };
  }, [addEventListener, removeEventListener, refreshAppointments, userId, businessId]);

  return { setCallbacks, refreshAppointments };
}

// Yorum listesi için gerçek zamanlı güncelleme
export function useRealTimeReviews(userId?: string, businessId?: string) {
  const { addEventListener, removeEventListener } = useWebSocket();
  const utils = trpc.useUtils();
  const callbacksRef = useRef<{
    onReviewCreated?: () => void;
    onReviewReplied?: () => void;
    onReviewStatusUpdated?: () => void;
  }>({});

  const setCallbacks = useCallback((callbacks: typeof callbacksRef.current) => {
    callbacksRef.current = callbacks;
  }, []);

  // Yorum listesini yenile
  const refreshReviews = useCallback(() => {
    if (userId) {
      utils.review.getByUser.invalidate({ userId });
    }
    if (businessId) {
      utils.review.getByBusiness.invalidate({ businessId });
    }
  }, [utils, userId, businessId]);

  useEffect(() => {
    const handleReviewCreated = (data: any) => {
      if ((userId && data.userId === userId) || (businessId && data.businessId === businessId)) {
        refreshReviews();
        callbacksRef.current.onReviewCreated?.();
      }
    };

    const handleReviewReplied = (data: any) => {
      if ((userId && data.userId === userId) || (businessId && data.businessId === businessId)) {
        refreshReviews();
        callbacksRef.current.onReviewReplied?.();
      }
    };

    const handleReviewStatusUpdated = (data: any) => {
      if ((userId && data.userId === userId) || (businessId && data.businessId === businessId)) {
        refreshReviews();
        callbacksRef.current.onReviewStatusUpdated?.();
      }
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
  }, [addEventListener, removeEventListener, refreshReviews, userId, businessId]);

  return { setCallbacks, refreshReviews };
}

// İşletme bilgileri için gerçek zamanlı güncelleme
export function useRealTimeBusiness(businessId?: string) {
  const { addEventListener, removeEventListener } = useWebSocket();
  const utils = trpc.useUtils();
  const callbacksRef = useRef<{
    onBusinessUpdated?: () => void;
    onServiceUpdated?: () => void;
    onEmployeeUpdated?: () => void;
  }>({});

  const setCallbacks = useCallback((callbacks: typeof callbacksRef.current) => {
    callbacksRef.current = callbacks;
  }, []);

  // İşletme bilgilerini yenile
  const refreshBusiness = useCallback(() => {
    if (businessId) {
      utils.business.getById.invalidate({ businessId });
      utils.business.getServices.invalidate({ businessId });
      utils.business.getEmployees.invalidate({ businessId });
    }
  }, [utils, businessId]);

  useEffect(() => {
    const handleBusinessUpdated = (data: any) => {
      if (businessId && data.businessId === businessId) {
        refreshBusiness();
        callbacksRef.current.onBusinessUpdated?.();
      }
    };

    const handleServiceUpdated = (data: any) => {
      if (businessId && data.businessId === businessId) {
        refreshBusiness();
        callbacksRef.current.onServiceUpdated?.();
      }
    };

    const handleEmployeeUpdated = (data: any) => {
      if (businessId && data.businessId === businessId) {
        refreshBusiness();
        callbacksRef.current.onEmployeeUpdated?.();
      }
    };

    // Event listener'ları ekle
    addEventListener('business:updated', handleBusinessUpdated);
    addEventListener('service:created', handleServiceUpdated);
    addEventListener('service:updated', handleServiceUpdated);
    addEventListener('service:deleted', handleServiceUpdated);
    addEventListener('employee:created', handleEmployeeUpdated);
    addEventListener('employee:updated', handleEmployeeUpdated);
    addEventListener('employee:deleted', handleEmployeeUpdated);
    addEventListener('employee:availability_updated', handleEmployeeUpdated);

    // Cleanup
    return () => {
      removeEventListener('business:updated', handleBusinessUpdated);
      removeEventListener('service:created', handleServiceUpdated);
      removeEventListener('service:updated', handleServiceUpdated);
      removeEventListener('service:deleted', handleServiceUpdated);
      removeEventListener('employee:created', handleEmployeeUpdated);
      removeEventListener('employee:updated', handleEmployeeUpdated);
      removeEventListener('employee:deleted', handleEmployeeUpdated);
      removeEventListener('employee:availability_updated', handleEmployeeUpdated);
    };
  }, [addEventListener, removeEventListener, refreshBusiness, businessId]);

  return { setCallbacks, refreshBusiness };
}

// Bildirimler için gerçek zamanlı güncelleme
export function useRealTimeNotifications(userId?: string, businessId?: string) {
  const { addEventListener, removeEventListener } = useWebSocket();
  const utils = trpc.useUtils();
  const callbacksRef = useRef<{
    onNotificationSent?: () => void;
    onNotificationRead?: () => void;
  }>({});

  const setCallbacks = useCallback((callbacks: typeof callbacksRef.current) => {
    callbacksRef.current = callbacks;
  }, []);

  // Bildirimleri yenile
  const refreshNotifications = useCallback(() => {
    if (userId) {
      utils.notifications.getByUser.invalidate({ userId });
    }
    if (businessId) {
      utils.notifications.getByBusiness.invalidate({ businessId });
    }
  }, [utils, userId, businessId]);

  useEffect(() => {
    const handleNotificationSent = (data: any) => {
      if ((userId && data.userId === userId) || (businessId && data.businessId === businessId)) {
        refreshNotifications();
        callbacksRef.current.onNotificationSent?.();
      }
    };

    const handleNotificationRead = (data: any) => {
      if ((userId && data.userId === userId) || (businessId && data.businessId === businessId)) {
        refreshNotifications();
        callbacksRef.current.onNotificationRead?.();
      }
    };

    // Event listener'ları ekle
    addEventListener('notification:sent', handleNotificationSent);
    addEventListener('notification:read', handleNotificationRead);

    // Cleanup
    return () => {
      removeEventListener('notification:sent', handleNotificationSent);
      removeEventListener('notification:read', handleNotificationRead);
    };
  }, [addEventListener, removeEventListener, refreshNotifications, userId, businessId]);

  return { setCallbacks, refreshNotifications };
}
