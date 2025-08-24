import { ReactNode } from 'react';
import BusinessBottomNav from '../../../components/BusinessBottomNav';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useEffect } from 'react';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  const { isSupported, isSubscribed, requestPermission } = usePushNotifications();

  // Dashboard'a girdiğinde otomatik olarak bildirim izni iste
  useEffect(() => {
    if (isSupported && !isSubscribed) {
      // 2 saniye sonra izin iste (sayfa yüklendikten sonra)
      const timer = setTimeout(() => {
        requestPermission();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, requestPermission]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="pb-20">
        {children}
      </main>
      <BusinessBottomNav />
    </div>
  );
} 