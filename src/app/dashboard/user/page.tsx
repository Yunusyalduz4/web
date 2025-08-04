"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { skipToken } from '@tanstack/react-query';

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-800",
};

export default function UserDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: profile } = trpc.user.getProfile.useQuery(userId ? { userId } : skipToken);
  const { data: appointments, isLoading } = trpc.user.appointmentHistory.useQuery(userId ? { userId } : skipToken);
  const cancelMutation = trpc.appointment.cancelAppointment.useMutation();

  const handleCancel = async (id: string) => {
    if (!userId) return;
    if (!confirm("Randevuyu iptal etmek istediğinize emin misiniz?")) return;
    await cancelMutation.mutateAsync({ id, userId });
    router.refresh();
  };

  return (
    <main className="max-w-2xl mx-auto p-4 pb-24 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h1 className="text-3xl font-extrabold mb-6 text-center bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none animate-fade-in">
        Merhaba, {profile?.name} 👋
      </h1>
      <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">Randevularım</h2>
      <div className="space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
            <span className="text-5xl mb-2">⏳</span>
            <span className="text-lg">Randevular yükleniyor...</span>
          </div>
        )}
        {!isLoading && appointments?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 animate-fade-in">
            <span className="text-5xl mb-2">📭</span>
            <span className="text-lg">Henüz randevunuz yok.</span>
            <span className="text-sm mt-1">Hemen bir işletmeden randevu alabilirsiniz!</span>
          </div>
        )}
        {appointments?.map((a: any) => (
          <div
            key={a.id}
            className="rounded-2xl shadow bg-white p-5 flex flex-col gap-2 border hover:shadow-xl transition-shadow animate-fade-in"
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
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </main>
  );
} 