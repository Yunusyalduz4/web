import { ReactNode } from 'react';
import BusinessBottomNavWrapper from '../../../components/BusinessBottomNavWrapper';
import NotificationsButton from '../../../components/NotificationsButton';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with notifications button */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold text-gray-900">KUADO İşletme</div>
          <NotificationsButton userType="business" />
        </div>
      </header>

      <main className="pb-20">
        {children}
      </main>
      <BusinessBottomNavWrapper />
    </div>
  );
} 