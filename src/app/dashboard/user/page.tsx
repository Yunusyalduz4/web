"use client";
import { useSession } from 'next-auth/react';
import { trpc } from '../../../utils/trpcClient';
import { useRouter } from 'next/navigation';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
};

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user.id;

  if (status === 'loading') return <div className="flex items-center justify-center min-h-[60vh] text-lg">Yükleniyor...</div>;
  if (!session) {
    router.replace('/login');
    return null;
  }
  if (session.user.role !== 'user') {
    router.replace('/dashboard');
    return null;
  }
  if (!userId) return <div className="flex items-center justify-center min-h-[60vh] text-lg">Yükleniyor...</div>;

  const { data: profile } = trpc.user.getProfile.useQuery({ userId });
  const { data: appointments, refetch } = trpc.user.appointmentHistory.useQuery({ userId });
  const cancelMutation = trpc.appointment.cancelAppointment.useMutation();

  const handleCancel = async (id: string) => {
    if (!confirm('Randevuyu iptal etmek istediğinize emin misiniz?')) return;
    await cancelMutation.mutateAsync({ id, userId });
    refetch();
  };

  return (
    <main className="max-w-2xl mx-auto p-4 pb-20">
      <h1 className="text-3xl font-bold mb-6 text-center">Merhaba, {profile?.name} 👋</h1>
      <h2 className="text-xl font-semibold mb-4 text-center">Randevularım</h2>
      <div className="space-y-4">
        {appointments?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <span className="text-5xl mb-2">📭</span>
            <span className="text-lg">Henüz randevunuz yok.</span>
            <span className="text-sm mt-1">Hemen bir işletmeden randevu alabilirsiniz!</span>
          </div>
        )}
        {appointments?.map((a: any) => (
          <div
            key={a.id}
            className="rounded-xl shadow bg-white p-4 flex flex-col gap-2 border hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[a.status] || 'bg-gray-100 text-gray-800'}`}>{a.status}</span>
              <span className="ml-auto text-sm text-gray-400">{new Date(a.appointment_datetime).toLocaleString('tr-TR')}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="font-medium">Hizmet: <span className="font-normal">{a.service_id}</span></span>
              <span className="font-medium">Çalışan: <span className="font-normal">{a.employee_id}</span></span>
            </div>
            <div className="flex gap-2 mt-2">
              {a.status === 'pending' && (
                <button
                  className="px-4 py-1 rounded bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition"
                  onClick={() => handleCancel(a.id)}
                >
                  İptal Et
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
} 