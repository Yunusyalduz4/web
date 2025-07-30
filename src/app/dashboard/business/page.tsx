"use client";
import { useSession } from 'next-auth/react';
import { trpc } from '../../../utils/trpcClient';
import { useRouter } from 'next/navigation';

export default function BusinessDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  // İşletme verisi: Kullanıcıya ait işletmeleri çek
  const { data: businesses } = trpc.business.getBusinesses.useQuery();
  // İleride: Sadece owner_user_id === userId olanlar filtrelenebilir

  if (status === 'loading') return <div>Yükleniyor...</div>;
  if (!session) {
    router.replace('/login');
    return null;
  }
  if (session.user.role !== 'business') {
    router.replace('/dashboard');
    return null;
  }

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">İşletme Paneli</h1>
      <h2 className="text-xl font-semibold mb-2">İşletmelerim</h2>
      <ul className="space-y-2">
        {businesses?.filter((b: any) => b.owner_user_id === userId).length === 0 && <li>Henüz işletmeniz yok.</li>}
        {businesses?.filter((b: any) => b.owner_user_id === userId).map((b: any) => (
          <li key={b.id} className="border rounded p-3 flex flex-col gap-1">
            <span><b>Ad:</b> {b.name}</span>
            <span><b>Adres:</b> {b.address}</span>
          </li>
        ))}
      </ul>
    </main>
  );
} 