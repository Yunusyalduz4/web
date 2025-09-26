"use client";
import { ReactNode } from 'react';
import BusinessBottomNavWrapper from '../../../components/BusinessBottomNavWrapper';
import PullToRefreshWrapper from '../../../components/PullToRefreshWrapper';
import { useRouter } from 'next/navigation';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

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
      <BusinessBottomNavWrapper />
    </div>
  );
} 