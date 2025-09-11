"use client";
import { useState } from 'react';
import { trpc } from '../utils/trpcClient';

interface RescheduleApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    appointment_id: string;
    requested_by_name: string;
    requested_by_role: string;
    old_appointment_datetime: string;
    new_appointment_datetime: string;
    request_reason?: string;
    business_name?: string;
    employee_name?: string;
  };
}

export default function RescheduleApprovalModal({ isOpen, onClose, request }: RescheduleApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approveMutation = trpc.reschedule.approveRescheduleRequest.useMutation({
    onSuccess: () => {
      onClose();
      setAction(null);
      setRejectionReason('');
    },
    onError: (error) => {
      // Silent error handling
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;

    setIsSubmitting(true);
    try {
      await approveMutation.mutateAsync({
        requestId: request.id,
        action,
        rejectionReason: action === 'reject' ? rejectionReason : undefined,
      });
    } catch (error) {
      // Silent error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Randevu Erteleme Onayı
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

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">İstek Detayları</h3>
            <p className="text-sm text-gray-600">
              <strong>İstek Yapan:</strong> {request.requested_by_name} ({request.requested_by_role})
            </p>
            <p className="text-sm text-gray-600">
              <strong>İşletme:</strong> {request.business_name}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Çalışan:</strong> {request.employee_name || 'Belirtilmemiş'}
            </p>
          </div>

          <div className="p-4 bg-red-50 rounded-lg">
            <h3 className="font-medium text-red-900 mb-2">Mevcut Randevu</h3>
            <p className="text-sm text-red-700">
              {new Date(request.old_appointment_datetime).toLocaleString('tr-TR')}
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Yeni Randevu</h3>
            <p className="text-sm text-green-700">
              {new Date(request.new_appointment_datetime).toLocaleString('tr-TR')}
            </p>
          </div>

          {request.request_reason && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Erteleme Sebebi</h3>
              <p className="text-sm text-blue-700">{request.request_reason}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Kararınız
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="approve"
                  checked={action === 'approve'}
                  onChange={(e) => setAction(e.target.value as 'approve')}
                  className="mr-3 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-green-700">✅ Onayla</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value="reject"
                  checked={action === 'reject'}
                  onChange={(e) => setAction(e.target.value as 'reject')}
                  className="mr-3 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-red-700">❌ Reddet</span>
              </label>
            </div>
          </div>

          {action === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Red Sebebi
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Red sebebinizi belirtin..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {rejectionReason.length}/500 karakter
              </p>
            </div>
          )}

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
              disabled={isSubmitting || !action || (action === 'reject' && !rejectionReason.trim())}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'İşleniyor...' : action === 'approve' ? 'Onayla' : 'Reddet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
