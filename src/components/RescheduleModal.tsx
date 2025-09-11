"use client";
import { useState, useEffect } from 'react';
import { trpc } from '../utils/trpcClient';
import Toast, { ToastType } from './Toast';
import { useSession } from 'next-auth/react';
import { skipToken } from '@tanstack/react-query';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: number;
    appointment_datetime: string;
    employee_id?: number;
    business_id: number;
    business_name?: string;
    employee_name?: string;
  } | null;
  userRole: 'user' | 'business' | 'employee';
  onRescheduleSubmitted?: () => void;
}

export default function RescheduleModal({ isOpen, onClose, appointment, userRole, onRescheduleSubmitted }: RescheduleModalProps) {
  const { data: session } = useSession();
  const [newDateTime, setNewDateTime] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: ToastType;
  }>({
    open: false,
    message: '',
    type: 'info'
  });

  // Çalışanları getir (işletme/çalışan için)
  const { data: employees } = trpc.business.getEmployees.useQuery(
    appointment?.business_id ? { businessId: appointment.business_id.toString() } : skipToken,
    { enabled: userRole !== 'user' && isOpen && !!appointment?.business_id }
  );

  // Mevcut erteleme isteklerini getir
  const { data: existingRequests } = trpc.reschedule.getPendingRescheduleRequests.useQuery(
    undefined,
    { enabled: isOpen && userRole === 'user' }
  );

  // Mevcut erteleme isteğini bul
  const existingRequest = existingRequests?.find(req => req.appointment_id === appointment?.id);

  // Mevcut randevu tarihini formatla
  useEffect(() => {
    if (appointment?.appointment_datetime) {
      const date = new Date(appointment.appointment_datetime);
      const formatted = date.toISOString().slice(0, 16);
      setNewDateTime(formatted);
    }
  }, [appointment?.appointment_datetime]);

  // Mevcut çalışanı seç
  useEffect(() => {
    if (appointment?.employee_id) {
      setNewEmployeeId(appointment.employee_id.toString());
    }
  }, [appointment?.employee_id]);

  const createRescheduleMutation = trpc.reschedule.createRescheduleRequest.useMutation({
    onSuccess: (data) => {
      setToast({
        open: true,
        message: '✅ Erteleme isteğiniz başarıyla gönderildi!',
        type: 'success'
      });
      setTimeout(() => {
        onClose();
        setRequestReason('');
        onRescheduleSubmitted?.();
      }, 1500);
    },
    onError: (error) => {
      
      // Özel hata mesajları için kullanıcı dostu uyarılar
      if (error.message.includes('zaten bekleyen bir erteleme isteği var')) {
        setToast({
          open: true,
          message: '⚠️ Bu randevu için zaten bekleyen bir erteleme isteğiniz bulunmaktadır. Lütfen mevcut isteğinizin onaylanmasını bekleyin.',
          type: 'warning'
        });
      } else if (error.message.includes('Randevu bulunamadı')) {
        setToast({
          open: true,
          message: '❌ Randevu bulunamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.',
          type: 'error'
        });
      } else if (error.message.includes('Bu randevu erteleyemezsiniz')) {
        setToast({
          open: true,
          message: '❌ Bu randevu erteleyemezsiniz. Lütfen işletme ile iletişime geçin.',
          type: 'error'
        });
      } else {
        setToast({
          open: true,
          message: `❌ Erteleme isteği gönderilirken bir hata oluştu: ${error.message}`,
          type: 'error'
        });
      }
    }
  });

  // Erteleme isteğini iptal et
  const cancelRescheduleMutation = trpc.reschedule.cancelRescheduleRequest.useMutation({
    onSuccess: () => {
      setToast({
        open: true,
        message: '✅ Erteleme isteğiniz iptal edildi!',
        type: 'success'
      });
      setTimeout(() => {
        onClose();
        onRescheduleSubmitted?.();
      }, 1500);
    },
    onError: (error) => {
      setToast({
        open: true,
        message: `❌ İptal işlemi başarısız: ${error.message}`,
        type: 'error'
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateTime || !appointment?.id) return;

    setIsSubmitting(true);
    try {
      // datetime-local input'u ISO formatına çevir
      const isoDateTime = new Date(newDateTime).toISOString();
      
      const mutationData = {
        appointmentId: appointment.id.toString(),
        newAppointmentDatetime: isoDateTime,
        newEmployeeId: newEmployeeId || undefined,
        requestReason: requestReason || undefined,
      };
      
      await createRescheduleMutation.mutateAsync(mutationData);
    } catch (error) {
      // Silent error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!existingRequest?.id) return;
    
    if (confirm('Erteleme isteğinizi iptal etmek istediğinizden emin misiniz?')) {
      await cancelRescheduleMutation.mutateAsync({ requestId: existingRequest.id });
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Randevu Ertelama
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Mevcut Randevu</h3>
          <p className="text-sm text-gray-600">
            <strong>İşletme:</strong> {appointment?.business_name || 'Bilinmiyor'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Çalışan:</strong> {appointment?.employee_name || 'Belirtilmemiş'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Tarih:</strong> {appointment?.appointment_datetime ? new Date(appointment.appointment_datetime).toLocaleString('tr-TR') : 'Bilinmiyor'}
          </p>
        </div>

        {/* Mevcut Erteleme İsteği */}
        {existingRequest && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-medium text-orange-900">Bekleyen Erteleme İsteği</h3>
            </div>
            <p className="text-sm text-orange-800 mb-2">
              <strong>Yeni Tarih:</strong> {new Date(existingRequest.new_appointment_datetime).toLocaleString('tr-TR')}
            </p>
            {existingRequest.request_reason && (
              <p className="text-sm text-orange-800 mb-3">
                <strong>Sebep:</strong> {existingRequest.request_reason}
              </p>
            )}
            <p className="text-xs text-orange-700 mb-3">
              İsteğiniz işletme tarafından onay bekliyor.
            </p>
            <button
              onClick={handleCancelRequest}
              disabled={cancelRescheduleMutation.isPending}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelRescheduleMutation.isPending ? 'İptal Ediliyor...' : 'İsteği İptal Et'}
            </button>
          </div>
        )}

        {/* Yeni Erteleme İsteği Formu - Sadece mevcut istek yoksa göster */}
        {!existingRequest && (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yeni Randevu Tarihi ve Saati
            </label>
            <input
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              required
            />
          </div>

          {userRole !== 'user' && employees && employees.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Çalışan Seçimi
              </label>
              <select
                value={newEmployeeId}
                onChange={(e) => setNewEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              >
                {employees.map((employee: any) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Erteleme Sebebi (Opsiyonel)
            </label>
            <textarea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="Erteleme sebebinizi belirtin..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {requestReason.length}/500 karakter
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newDateTime}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Erteleme İsteği Gönder'}
            </button>
          </div>
        </form>
        )}

        {/* Bilgi Kutusu - Sadece mevcut istek yoksa göster */}
        {!existingRequest && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Bilgi:</strong> Erteleme isteğiniz ilgili taraflara bildirilecek ve onay bekleyecektir.
            </p>
          </div>
        )}
      </div>
      
      {/* Toast Notification */}
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        duration={5000}
      />
    </div>
  );
}
