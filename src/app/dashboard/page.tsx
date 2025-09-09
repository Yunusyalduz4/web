"use client";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.replace('/login');
    else if (session.user.role === 'business') router.replace('/dashboard/business');
    else if (session.user.role === 'user') router.replace('/dashboard/user');
    else if (session.user.role === 'admin') router.replace('/dashboard/admin');
    else if (session.user.role === 'employee') router.replace('/dashboard/business');
    else router.replace('/unauthorized');
  }, [session, status, router]);

  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Yükleniyor...</div>
    </main>
  );
} 