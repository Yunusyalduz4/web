"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { skipToken } from '@tanstack/react-query';
import { useState } from 'react';
import ReviewModal from '../../../components/ReviewModal';

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
  
  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    appointmentId: string;
    businessName: string;
    serviceName: string;
    employeeName: string;
  }>({
    isOpen: false,
    appointmentId: '',
    businessName: '',
    serviceName: '',
    employeeName: ''
  });

  const handleCancel = async (id: string) => {
    if (!userId) return;
    if (!confirm("Randevuyu iptal etmek istediğinize emin misiniz?")) return;
    await cancelMutation.mutateAsync({ id, userId });
    router.refresh();
  };

  const handleReviewClick = (appointment: any) => {
    setReviewModal({
      isOpen: true,
      appointmentId: appointment.id,
      businessName: appointment.business_name || 'Bilinmiyor',
      serviceName: appointment.service_name || 'Bilinmiyor',
      employeeName: appointment.employee_name || 'Bilinmiyor'
    });
  };

  const handleReviewSubmitted = () => {
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

              {/* Business, Service & Employee Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl">
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    🏢
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 font-medium">İşletme</p>
                    <p className="font-semibold text-gray-800">{a.business_name || 'Bilinmiyor'}</p>
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
                  <button
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                    onClick={() => handleCancel(a.id)}
                  >
                    <span>❌</span>
                    İptal Et
                  </button>
                )}
                {a.status === 'confirmed' && (
                  <div className="flex-1 text-center py-3 px-4 rounded-xl bg-green-100 text-green-700 font-medium border border-green-200">
                    ✅ Randevunuz onaylandı! Hazır olun.
                  </div>
                )}
                {a.status === 'completed' && (
                  <button
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                    onClick={() => handleReviewClick(a)}
                  >
                    <span>⭐</span>
                    Değerlendir
                  </button>
                )}
                {a.status === 'cancelled' && (
                  <div className="flex-1 text-center py-3 px-4 rounded-xl bg-gray-100 text-gray-600 font-medium border border-gray-200">
                    ❌ Randevu iptal edildi.
                  </div>
                )}
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
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

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
        appointmentId={reviewModal.appointmentId}
        businessName={reviewModal.businessName}
        serviceName={reviewModal.serviceName}
        employeeName={reviewModal.employeeName}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </main>
  );
} 