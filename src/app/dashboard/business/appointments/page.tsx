"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-800",
};

export default function BusinessAppointmentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses, isLoading: loadingBusiness } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;
  const appointmentsQuery = trpc.appointment.getByBusiness.useQuery(businessId ? { businessId } : skipToken);
  const { data: appointments, isLoading } = appointmentsQuery;
  const updateStatus = trpc.appointment.updateStatus.useMutation();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleStatus = async (id: string, status: string) => {
    setError('');
    setSuccess('');
    try {
      await updateStatus.mutateAsync({ id, status });
      setSuccess('Randevu güncellendi!');
      appointmentsQuery.refetch();
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      setError(err.message || 'Hata oluştu');
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-fade-in">
      <h1 className="text-2xl font-extrabold mb-6 text-center bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none">Randevular</h1>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">Randevular yükleniyor...</span>
        </div>
      )}
      <div className="flex flex-col gap-4">
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
              <span className="font-medium">Müşteri: <span className="font-normal">{a.user_id}</span></span>
              <span className="font-medium">Hizmet: <span className="font-normal">{a.service_id}</span></span>
              <span className="font-medium">Çalışan: <span className="font-normal">{a.employee_id}</span></span>
            </div>
            <div className="flex gap-2 mt-2">
              {a.status === 'pending' && (
                <>
                  <button
                    className="px-4 py-1 rounded bg-green-100 text-green-700 font-semibold hover:bg-green-200 transition"
                    onClick={() => handleStatus(a.id, 'confirmed')}
                  >
                    Onayla
                  </button>
                  <button
                    className="px-4 py-1 rounded bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition"
                    onClick={() => handleStatus(a.id, 'cancelled')}
                  >
                    İptal Et
                  </button>
                </>
              )}
              {a.status === 'confirmed' && (
                <button
                  className="px-4 py-1 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition"
                  onClick={() => handleStatus(a.id, 'completed')}
                >
                  Tamamlandı
                </button>
              )}
            </div>
          </div>
        ))}
        {(!appointments || appointments.length === 0) && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 animate-fade-in">
            <span className="text-5xl mb-2">📭</span>
            <span className="text-lg">Henüz randevu yok.</span>
          </div>
        )}
      </div>
      {error && <div className="text-red-600 text-sm text-center animate-shake mt-4">{error}</div>}
      {success && <div className="text-green-600 text-sm text-center animate-fade-in mt-4">{success}</div>}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </main>
  );
} 