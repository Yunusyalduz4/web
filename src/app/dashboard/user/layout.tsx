"use client";
import { ReactNode } from 'react';
import BottomNav from '../../../components/BottomNav';
import { useUserPushNotifications } from '../../../hooks/useUserPushNotifications';
import { useEffect } from 'react';
import NotificationsButton from '../../../components/NotificationsButton';

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
      {/* Header with notifications button */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold text-gray-900">KUADO</div>
          <NotificationsButton userType="user" />
        </div>
      </header>

      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
} 