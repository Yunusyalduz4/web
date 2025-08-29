import { ReactNode } from 'react';
import BusinessBottomNavWrapper from '../../../components/BusinessBottomNavWrapper';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="pb-20">
        {children}
      </main>
      <BusinessBottomNavWrapper />
    </div>
  );
} 