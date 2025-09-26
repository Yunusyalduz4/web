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
      // Synchronous refresh with better UX
      await router.refresh();
      
      // Add loading indicator delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Soft reload that preserves state
      window.location.reload();
    } catch (error) {
      console.error('Refresh error:', error);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <PullToRefreshWrapper 
        onRefresh={handleRefresh} 
        threshold={70}
        resistance={0.7}
        showVisualIndicator={true}
        refreshColor="blue"
      >
        <main className="pb-20">
          {children}
        </main>
      </PullToRefreshWrapper>
      <BottomNav />
    </div>
  );
} 