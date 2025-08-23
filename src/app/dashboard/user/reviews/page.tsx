"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';

// Star Rating Component
const StarRating = ({ rating, onRatingChange, disabled = false }: { rating: number; onRatingChange: (rating: number) => void; disabled?: boolean }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onRatingChange(star)}
          className={`text-2xl transition-colors ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          } ${!disabled ? 'hover:text-yellow-300' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

// Review Modal Component
const ReviewModal = ({ 
  appointment, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  appointment: any; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: { serviceRating: number; employeeRating: number; comment: string }) => void; 
}) => {
  const [serviceRating, setServiceRating] = useState(0);
  const [employeeRating, setEmployeeRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (serviceRating === 0 || employeeRating === 0 || comment.length < 20) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({ serviceRating, employeeRating, comment });
      setServiceRating(0);
      setEmployeeRating(0);
      setComment('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Değerlendirme Yap</h3>
          <p className="text-sm text-gray-600">
            {appointment?.business_name} - {appointment?.service_names?.join(', ')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hizmet Değerlendirmesi
            </label>
            <StarRating rating={serviceRating} onRatingChange={setServiceRating} />
          </div>

          {/* Employee Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Çalışan Değerlendirmesi
            </label>
            <StarRating rating={employeeRating} onRatingChange={setEmployeeRating} />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yorum (en az 20 karakter)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
              placeholder="Deneyiminizi paylaşın..."
              required
              minLength={20}
            />
            <div className="text-xs text-gray-500 mt-1">
              {comment.length}/20 karakter
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={serviceRating === 0 || employeeRating === 0 || comment.length < 20 || isSubmitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white rounded-lg hover:from-rose-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Component
function UserReviewsPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user?.id;
  
  // Get completed appointments that can be reviewed
  const { data: completedAppointments, refetch: refetchAppointments } = trpc.review.getCompletedAppointmentsForReview.useQuery(
    userId ? { userId } : skipToken
  );
  
  // Get user's existing reviews
  const { data: userReviews, refetch: refetchReviews } = trpc.review.getByUser.useQuery(
    userId ? { userId, page: 1, limit: 50 } : skipToken
  );
  
  // Create review mutation
  const createReviewMutation = trpc.review.create.useMutation();
  
  const [activeTab, setActiveTab] = useState<'write' | 'my-reviews'>('write');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateReview = async (reviewData: { serviceRating: number; employeeRating: number; comment: string }) => {
    if (!selectedAppointment || !userId) return;
    
    try {
      await createReviewMutation.mutateAsync({
        appointmentId: selectedAppointment.id,
        serviceRating: reviewData.serviceRating,
        employeeRating: reviewData.employeeRating,
        comment: reviewData.comment
      });
      
      setSuccess('Değerlendirmeniz başarıyla gönderildi!');
      refetchAppointments();
      refetchReviews();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message || 'Değerlendirme gönderilemedi');
      setTimeout(() => setError(''), 5000);
    }
  };

  const openReviewModal = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowReviewModal(true);
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 p-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Giriş Gerekli</h1>
          <p className="text-gray-600">Bu sayfayı görüntülemek için giriş yapmalısınız.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-md border-b border-white/30 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
              randevuo
            </div>
            <button
              onClick={() => router.push('/dashboard/user')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 text-gray-900 shadow-sm hover:shadow-md transition"
            >
              <span className="text-base">←</span>
              <span className="hidden sm:inline text-sm font-medium">Geri</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Tabs */}
        <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-1 mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('write')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition ${
                activeTab === 'write'
                  ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Yorum Yaz ({completedAppointments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('my-reviews')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition ${
                activeTab === 'my-reviews'
                  ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Yorumlarım ({userReviews?.reviews?.length || 0})
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-green-700 text-center">
            {success}
          </div>
        )}

        {/* Write Review Tab */}
        {activeTab === 'write' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Değerlendirilebilir Randevular</h2>
            
            {!completedAppointments || completedAppointments.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">⭐</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Değerlendirilebilir Randevu Yok</h3>
                <p className="text-gray-600">
                  Tamamlanan randevularınız henüz yok veya hepsi değerlendirilmiş.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedAppointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {appointment.business_name}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>📅 {new Date(appointment.appointment_datetime).toLocaleDateString('tr-TR')}</div>
                          <div>🕐 {new Date(appointment.appointment_datetime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                          <div>🛠️ {appointment.service_names?.join(', ')}</div>
                          {appointment.employee_names?.length > 0 && (
                            <div>👤 {appointment.employee_names.join(', ')}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openReviewModal(appointment)}
                        className="px-4 py-2 bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white rounded-lg hover:from-rose-700 hover:to-fuchsia-700 transition shadow-sm"
                      >
                        Değerlendir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Reviews Tab */}
        {activeTab === 'my-reviews' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Yorumlarım</h2>
            
            {!userReviews?.reviews || userReviews.reviews.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">💬</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz Yorum Yapmadınız</h3>
                <p className="text-gray-600">
                  Tamamlanan randevularınız için değerlendirme yaparak ilk yorumunuzu yazın.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userReviews.reviews.map((review: any) => (
                  <div
                    key={review.id}
                    className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {review.business_name}
                        </h3>
                        <div className="text-sm text-gray-600 mb-3">
                          📅 {new Date(review.created_at).toLocaleDateString('tr-TR')}
                        </div>
                        
                        {/* Ratings */}
                        <div className="flex items-center gap-6 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Hizmet:</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-lg ${
                                    star <= review.service_rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Çalışan:</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-lg ${
                                    star <= review.employee_rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Comment */}
                        {review.comment && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-800">{review.comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <ReviewModal
        appointment={selectedAppointment}
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleCreateReview}
      />
    </main>
  );
}

// Loading Fallback Component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">⏳</div>
        <p className="text-gray-600">Yükleniyor...</p>
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function UserReviewsPage() {
  return (
    <div>
      <UserReviewsPageContent />
    </div>
  );
}
