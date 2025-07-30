"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useSession } from 'next-auth/react';

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
};

export default function BusinessAppointmentsPage() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  // Kullanıcıya ait işletmeyi bul
  const { data: businesses } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;

  const appointmentsQuery = trpc.appointment.getByBusiness.useQuery({ businessId }, { enabled: !!businessId });
  const updateStatus = trpc.appointment.updateStatus.useMutation();

  const handleStatus = async (id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    await updateStatus.mutateAsync({ id, status });
    appointmentsQuery.refetch();
  };

  if (!businessId) return <div>İşletmeniz yok veya yükleniyor...</div>;

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Randevularım</h1>
      <ul className="space-y-2">
        {appointmentsQuery.data?.map((a: any) => (
          <li key={a.id} className="border rounded p-3 flex flex-col gap-1">
            <span><b>Tarih:</b> {new Date(a.appointment_datetime).toLocaleString('tr-TR')}</span>
            <span><b>Durum:</b> {statusLabels[a.status]}</span>
            <span><b>Müşteri:</b> {a.user_id}</span>
            <span><b>Hizmet:</b> {a.service_id}</span>
            <span><b>Çalışan:</b> {a.employee_id}</span>
            <div className="flex gap-2 mt-2">
              {a.status === 'pending' && (
                <>
                  <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => handleStatus(a.id, 'confirmed')}>Onayla</button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => handleStatus(a.id, 'cancelled')}>İptal</button>
                </>
              )}
              {a.status === 'confirmed' && (
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => handleStatus(a.id, 'completed')}>Tamamlandı</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
} 