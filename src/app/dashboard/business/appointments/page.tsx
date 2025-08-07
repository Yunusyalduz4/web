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

  const handleStatus = async (id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
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
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => router.push('/dashboard/business')}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 font-semibold"
        >
          <span>←</span>
          <span>Geri Dön</span>
        </button>
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none">Randevular</h1>
        <div className="w-24"></div> {/* Spacer for centering */}
      </div>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">Randevular yükleniyor...</span>
        </div>
      )}
      <div className="grid gap-6">
        {appointments?.map((a: any) => (
          <div
            key={a.id}
            className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 animate-fade-in"
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                a.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                a.status === 'confirmed' ? 'bg-green-100 text-green-800 border border-green-200' :
                a.status === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {a.status === 'pending' && '⏳ Bekliyor'}
                {a.status === 'confirmed' && '✅ Onaylandı'}
                {a.status === 'cancelled' && '❌ İptal'}
                {a.status === 'completed' && '🎉 Tamamlandı'}
              </span>
            </div>

            {/* Main Content */}
            <div className="p-6">
              {/* Date & Time */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <span className="text-lg">📅</span>
                  <span className="font-semibold text-gray-800">
                    {new Date(a.appointment_datetime).toLocaleDateString('tr-TR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-lg">🕐</span>
                  <span className="font-semibold text-gray-800">
                    {new Date(a.appointment_datetime).toLocaleTimeString('tr-TR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>

              {/* Customer, Service & Employee Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    👤
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Müşteri</p>
                    <p className="font-semibold text-gray-800">{a.user_name || 'Bilinmiyor'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    💇‍♂️
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Hizmet</p>
                    <p className="font-semibold text-gray-800">{a.service_name || 'Bilinmiyor'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ✂️
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-medium">Çalışan</p>
                    <p className="font-semibold text-gray-800">{a.employee_name || 'Bilinmiyor'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {a.status === 'pending' && (
                  <>
                    <button
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                      onClick={() => handleStatus(a.id, 'confirmed')}
                    >
                      <span>✅</span>
                      Onayla
                    </button>
                    <button
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                      onClick={() => handleStatus(a.id, 'cancelled')}
                    >
                      <span>❌</span>
                      İptal Et
                    </button>
                  </>
                )}
                {a.status === 'confirmed' && (
                  <button
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                    onClick={() => handleStatus(a.id, 'completed')}
                  >
                    <span>🎉</span>
                    Tamamlandı
                  </button>
                )}
                {(a.status === 'completed' || a.status === 'cancelled') && (
                  <div className="flex-1 text-center py-3 px-4 rounded-xl bg-gray-100 text-gray-600 font-medium">
                    {a.status === 'completed' ? '✅ Randevu tamamlandı' : '❌ Randevu iptal edildi'}
                  </div>
                )}
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
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