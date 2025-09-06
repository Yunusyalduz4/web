import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications(businessId?: string) {
  const { data: session } = useSession();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if push notifications are supported
  useEffect(() => {
    if (!isClient) return;
    
    const isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      window.isSecureContext; // PWA için HTTPS gerekli
    
    console.log('Push notification support check (business):', {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notification: 'Notification' in window,
      secureContext: window.isSecureContext,
      isSupported
    });
    
    setIsSupported(isSupported);
  }, [isClient]);

  // Check subscription status when component mounts
  useEffect(() => {
    if (!isClient || !isSupported) return;

    const checkStatus = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (err) {
        console.error('Check subscription status error:', err);
      }
    };

    checkStatus();
  }, [isClient, isSupported]);

  const subscribeToPushNotifications = async () => {
    if (!isClient || !isSupported || !businessId || !session?.user?.id) {
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

      console.log('Registering service worker for PWA (business)...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      await navigator.serviceWorker.ready;
      console.log('Service worker registered successfully (business):', registration);

      // Convert VAPID public key to Uint8Array
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BG1LYEA21rncGSSNwQGDVz2XJf55gexHy0BIeoUhpXrMwcucDVYI6eBVPqVUvT29I__O7crCYqaXEp4ghNirZeY';
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not found in environment variables');
      }
      
      console.log('VAPID Public Key:', vapidPublicKey);
      console.log('VAPID Key Length:', vapidPublicKey.length);

      const urlBase64ToUint8Array = (base64String: string) => {
        try {
          // VAPID key formatını kontrol et
          if (!base64String || typeof base64String !== 'string') {
            throw new Error('Invalid VAPID public key format');
          }

          console.log('Original VAPID key:', base64String);
          console.log('Key length:', base64String.length);

          // String'i temizle - tüm whitespace karakterlerini kaldır
          let cleanKey = base64String.replace(/\s+/g, '').trim();
          
          // Tırnak işaretlerini kaldır
          cleanKey = cleanKey.replace(/['"]/g, '');
          
          // URL-safe base64'i standart base64'e çevir
          cleanKey = cleanKey.replace(/-/g, '+').replace(/_/g, '/');
          
          // Padding ekle
          const padding = '='.repeat((4 - cleanKey.length % 4) % 4);
          cleanKey = cleanKey + padding;
          
          console.log('Cleaned VAPID key:', cleanKey);
          console.log('Cleaned key length:', cleanKey.length);
          
          // Base64 formatını kontrol et
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanKey)) {
            console.error('Invalid base64 characters found:', cleanKey);
            console.error('Invalid characters at positions:', 
              [...cleanKey].map((char, i) => !/^[A-Za-z0-9+/=]$/.test(char) ? `${char}(${i})` : null).filter(Boolean)
            );
            throw new Error('Invalid base64 format in VAPID public key');
          }

          // atob ile decode etmeyi dene
          try {
            const rawData = window.atob(cleanKey);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i);
            }
            console.log('VAPID key conversion successful, output length:', outputArray.length);
            return outputArray;
          } catch (atobError) {
            console.error('atob error:', atobError);
            console.error('Failed to decode key:', cleanKey);
            throw new Error('Failed to decode base64: ' + (atobError instanceof Error ? atobError.message : 'Unknown error'));
          }
        } catch (err) {
          console.error('VAPID key conversion error:', err);
          console.error('Original key:', base64String);
          throw new Error('Failed to convert VAPID public key: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      };

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode.apply(null, 
                Array.from(new Uint8Array(subscription.getKey('p256dh')!))
              )),
              auth: btoa(String.fromCharCode.apply(null, 
                Array.from(new Uint8Array(subscription.getKey('auth')!))
              ))
            }
          },
          businessId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register push subscription');
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscription error:', err);
      setError(err instanceof Error ? err.message : 'Subscription failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    if (!isClient || !isSupported) return false;

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
    } catch (err) {
      console.error('Push unsubscription error:', err);
      setError(err instanceof Error ? err.message : 'Unsubscription failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    if (!isClient || !isSupported) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (err) {
      console.error('Check subscription status error:', err);
    }
  };

  // Return default values during SSR
  if (!isClient) {
    return {
      isSupported: false,
      isSubscribed: false,
      isLoading: false,
      error: null,
      subscribe: async () => false,
      unsubscribe: async () => false,
      checkStatus: async () => {}
    };
  }

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe: subscribeToPushNotifications,
    unsubscribe: unsubscribeFromPushNotifications,
    checkStatus: checkSubscriptionStatus
  };
}
