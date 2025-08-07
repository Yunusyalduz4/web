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

  // Check if push notifications are supported
  useEffect(() => {
    setIsSupported(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
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
        console.error('Check subscription status error:', err);
      }
    };

    checkStatus();
  }, [isSupported]);

  const subscribeToPushNotifications = async () => {
    if (!isSupported || !businessId || !session?.user?.id) {
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

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Convert VAPID public key to Uint8Array
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not found');
      }

      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
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
    if (!isSupported) return false;

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
    if (!isSupported) return;

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
