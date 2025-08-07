"use client";
import { useState } from 'react';
import { trpc } from '../utils/trpcClient';
import StarRating from './StarRating';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  businessName: string;
  serviceName: string;
  employeeName: string;
  onReviewSubmitted: () => void;
}

export default function ReviewModal({
  isOpen,
  onClose,
  appointmentId,
  businessName,
  serviceName,
  employeeName,
  onReviewSubmitted
}: ReviewModalProps) {
  const [serviceRating, setServiceRating] = useState(0);
  const [employeeRating, setEmployeeRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const createReviewMutation = trpc.review.create.useMutation({
    onSuccess: () => {
      onReviewSubmitted();
      onClose();
      // Reset form
      setServiceRating(0);
      setEmployeeRating(0);
      setComment('');
      setError('');
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (serviceRating === 0) {
      setError('Lütfen hizmet puanını seçin');
      return;
    }

    if (employeeRating === 0) {
      setError('Lütfen çalışan puanını seçin');
      return;
    }

    if (comment.length < 20) {
      setError('Yorum en az 20 karakter olmalıdır');
      return;
    }

    createReviewMutation.mutate({
      appointmentId,
      serviceRating,
      employeeRating,
      comment
    });
  };

  const isFormValid = serviceRating > 0 && employeeRating > 0 && comment.length >= 20;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Değerlendirme Yap</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 text-sm mt-2">
            {businessName} - {serviceName}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Service Rating */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Hizmet Puanı
            </label>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm">
                💇‍♂️
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{serviceName}</p>
                <StarRating
                  rating={serviceRating}
                  onRatingChange={setServiceRating}
                  size="lg"
                />
              </div>
            </div>
          </div>

          {/* Employee Rating */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Çalışan Puanı
            </label>
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">
                ✂️
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{employeeName}</p>
                <StarRating
                  rating={employeeRating}
                  onRatingChange={setEmployeeRating}
                  size="lg"
                />
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Yorumunuz
            </label>
            <div className="relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Deneyiminizi paylaşın (en az 20 karakter)"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {comment.length}/500
              </div>
            </div>
            {comment.length > 0 && comment.length < 20 && (
              <p className="text-xs text-red-500">
                En az 20 karakter gerekli ({20 - comment.length} karakter daha)
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">⚠️</div>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || createReviewMutation.isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3"
          >
            {createReviewMutation.isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Gönderiliyor...</span>
              </>
            ) : (
              <>
                <span className="text-xl">⭐</span>
                <span>Değerlendirmeyi Gönder</span>
              </>
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </div>
  );
} 