"use client";
import { ReactNode } from 'react';
import BusinessBottomNavWrapper from '../../../components/BusinessBottomNavWrapper';
import PullToRefreshWrapper from '../../../components/PullToRefreshWrapper';
import { useRouter } from 'next/navigation';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

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
        refreshColor="slate"
      >
        <main className="pb-20">
          {children}
        </main>
      </PullToRefreshWrapper>
      <BusinessBottomNavWrapper />
    </div>
  );
} 