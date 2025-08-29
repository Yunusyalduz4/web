"use client";
import { ReactNode } from 'react';
import BottomNav from '../../../components/BottomNav';
import { useUserPushNotifications } from '../../../hooks/useUserPushNotifications';
import { useEffect } from 'react';

export default function UserLayout({ children }: { children: ReactNode }) {
  const { isSupported, isSubscribed, subscribe } = useUserPushNotifications();

  // Dashboard'a girdiğinde otomatik olarak bildirim izni iste
  useEffect(() => {
    if (isSupported && !isSubscribed) {
      // 2 saniye sonra izin iste (sayfa yüklendikten sonra)
      const timer = setTimeout(() => {
        subscribe();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, subscribe]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
} 