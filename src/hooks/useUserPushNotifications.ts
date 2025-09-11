import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function useUserPushNotifications() {
  const { data: session } = useSession();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      window.isSecureContext; // PWA için HTTPS gerekli
    
    // Push notification support check
    
    setIsSupported(isSupported);
  }, []);

  // Check subscription status when component mounts
  useEffect(() => {
    if (!isSupported) return;

    const checkStatus = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (err) {
        // Check subscription status error
      }
    };

    checkStatus();
  }, [isSupported]);

  const subscribeToPushNotifications = async () => {
    if (!isSupported || !session?.user?.id) {
      setError('Push notifications not supported or missing required data');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission denied');
        return false;
      }

      // Registering service worker for PWA
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      await navigator.serviceWorker.ready;
      // Service worker registered successfully

      // Convert VAPID public key to Uint8Array
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BG1LYEA21rncGSSNwQGDVz2XJf55gexHy0BIeoUhpXrMwcucDVYI6eBVPqVUvT29I__O7crCYqaXEp4ghNirZeY';
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not found in environment variables');
      }
      
      // VAPID Public Key processing

      const urlBase64ToUint8Array = (base64String: string) => {
        try {
          // VAPID key formatını kontrol et
          if (!base64String || typeof base64String !== 'string') {
            throw new Error('Invalid VAPID public key format');
          }

          // Original VAPID key processing

          // String'i temizle - tüm whitespace karakterlerini kaldır
          let cleanKey = base64String.replace(/\s+/g, '').trim();
          
          // Tırnak işaretlerini kaldır
          cleanKey = cleanKey.replace(/['"]/g, '');
          
          // URL-safe base64'i standart base64'e çevir
          cleanKey = cleanKey.replace(/-/g, '+').replace(/_/g, '/');
          
          // Padding ekle
          const padding = '='.repeat((4 - cleanKey.length % 4) % 4);
          cleanKey = cleanKey + padding;
          
          // Cleaned VAPID key processing
          
          // Base64 formatını kontrol et
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanKey)) {
            // Invalid base64 characters found
            throw new Error('Invalid base64 format in VAPID public key');
          }

          // atob ile decode etmeyi dene
          try {
            const rawData = window.atob(cleanKey);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i);
            }
            // VAPID key conversion successful
            return outputArray;
          } catch (atobError) {
            throw new Error('Failed to decode base64: ' + (atobError instanceof Error ? atobError.message : 'Unknown error'));
          }
        } catch (err) {
          throw new Error('Failed to convert VAPID public key: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      };

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      const response = await fetch('/api/push/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) {
        throw new Error('Failed to register subscription');
      }

      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to subscribe to push notifications';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    if (!isSupported) {
      setError('Push notifications not supported');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      setIsSubscribed(false);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to unsubscribe from push notifications';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe: subscribeToPushNotifications,
    unsubscribe: unsubscribeFromPushNotifications,
  };
}
