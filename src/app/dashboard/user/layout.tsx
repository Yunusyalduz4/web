"use client";
import { ReactNode } from 'react';
import BottomNav from '../../../components/BottomNav';
import PullToRefreshWrapper from '../../../components/PullToRefreshWrapper';
import { useUserPushNotifications } from '../../../hooks/useUserPushNotifications';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserLayout({ children }: { children: ReactNode }) {
  const { isSupported, isSubscribed, subscribe } = useUserPushNotifications();
  const router = useRouter();

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

  const handleRefresh = async () => {
    try {
      // Sayfayı yenile
      await router.refresh();
      
      // 500ms bekleyip sonra reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Refresh error:', error);
      // Fallback olarak direct reload
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <PullToRefreshWrapper onRefresh={handleRefresh}>
        <main className="pb-20">
          {children}
        </main>
      </PullToRefreshWrapper>
      <BottomNav />
    </div>
  );
} 