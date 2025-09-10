"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';
import ReviewModal from '../../../../components/ReviewModal';
import { useRealTimeReviews } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';

// Star Rating Component - Mobile Optimized
const StarRating = ({ rating, onRatingChange, disabled = false }: { rating: number; onRatingChange: (rating: number) => void; disabled?: boolean }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onRatingChange(star)}
          className={`text-lg sm:text-2xl transition-colors touch-manipulation min-h-[44px] min-w-[44px] ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          } ${!disabled ? 'hover:text-yellow-300 active:text-yellow-500' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

// Main Component
function UserReviewsPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user?.id;
  
  // WebSocket entegrasyonu
  const { isConnected, isConnecting, error: socketError } = useWebSocketStatus();
  const { setCallbacks: setReviewCallbacks } = useRealTimeReviews(userId);
  
  // Get completed appointments that can be reviewed
  const { data: completedAppointments, refetch: refetchAppointments } = trpc.review.getCompletedAppointmentsForReview.useQuery(
    userId ? { userId } : skipToken
  );
  
  // Get user's existing reviews
  const { data: userReviews, refetch: refetchReviews } = trpc.review.getByUser.useQuery(
    userId ? { userId, page: 1, limit: 50 } : skipToken
  );
  

  
  const [activeTab, setActiveTab] = useState<'write' | 'my-reviews'>('write');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');



  const openReviewModal = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowReviewModal(true);
  };

  const handleReviewSubmitted = () => {
    refetchAppointments();
    refetchReviews();
    setSuccess('Değerlendirmeniz başarıyla gönderildi!');
    setTimeout(() => setSuccess(''), 3000);
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
      {/* Header - Mobile Optimized */}
      <div className="bg-white/60 backdrop-blur-md border-b border-white/30 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
              randevuo
            </div>
            <button
              onClick={() => router.push('/dashboard/user')}
              className="inline-flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 text-gray-900 shadow-sm hover:shadow-md active:shadow-lg transition touch-manipulation min-h-[44px]"
            >
              <span className="text-base">←</span>
              <span className="hidden xs:inline text-sm font-medium">Geri</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 sm:p-4 pb-20 sm:pb-24">
        {/* Tabs - Mobile Optimized */}
        <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-1 mb-4 sm:mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('write')}
              className={`flex-1 px-3 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition touch-manipulation min-h-[44px] ${
                activeTab === 'write'
                  ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-800 active:text-gray-900'
              }`}
            >
              <span className="hidden xs:inline">Yorum Yaz ({completedAppointments?.length || 0})</span>
              <span className="xs:hidden">Yorum Yaz ({completedAppointments?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('my-reviews')}
              className={`flex-1 px-3 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition touch-manipulation min-h-[44px] ${
                activeTab === 'my-reviews'
                  ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow'
                  : 'text-gray-600 hover:text-gray-800 active:text-gray-900'
              }`}
            >
              <span className="hidden xs:inline">Yorumlarım ({userReviews?.reviews?.length || 0})</span>
              <span className="xs:hidden">Yorumlarım ({userReviews?.reviews?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* Error/Success Messages - Mobile Optimized */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-red-700 text-center text-sm sm:text-base">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-green-700 text-center text-sm sm:text-base">
            {success}
          </div>
        )}

        {/* Write Review Tab - Mobile Optimized */}
        {activeTab === 'write' && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Değerlendirilebilir Randevular</h2>
            
            {!completedAppointments || completedAppointments.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-6 sm:p-8 text-center">
                <div className="text-4xl sm:text-5xl mb-4">⭐</div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Değerlendirilebilir Randevu Yok</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  Tamamlanan randevularınız henüz yok veya hepsi değerlendirilmiş.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {completedAppointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base truncate">
                          {appointment.business_name}
                        </h3>
                        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
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
                        className="px-3 sm:px-4 py-2 bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white rounded-lg hover:from-rose-700 hover:to-fuchsia-700 active:from-rose-800 active:to-fuchsia-800 transition shadow-sm touch-manipulation min-h-[44px] text-xs sm:text-sm shrink-0 ml-2"
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

        {/* My Reviews Tab - Mobile Optimized */}
        {activeTab === 'my-reviews' && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Yorumlarım</h2>
            
            {!userReviews?.reviews || userReviews.reviews.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-6 sm:p-8 text-center">
                <div className="text-4xl sm:text-5xl mb-4">💬</div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Henüz Yorum Yapmadınız</h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  Tamamlanan randevularınız için değerlendirme yaparak ilk yorumunuzu yazın.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {userReviews.reviews.map((review: any) => (
                  <div
                    key={review.id}
                    className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base truncate">
                          {review.business_name}
                        </h3>
                        <div className="text-xs sm:text-sm text-gray-600 mb-3">
                          📅 {new Date(review.created_at).toLocaleDateString('tr-TR')}
                        </div>
                        
                        {/* Ratings - Mobile Optimized */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-gray-600">Hizmet:</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-sm sm:text-lg ${
                                    star <= review.service_rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-gray-600">Çalışan:</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-sm sm:text-lg ${
                                    star <= review.employee_rating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Comment - Mobile Optimized */}
                        {review.comment && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs sm:text-sm text-gray-800">{review.comment}</p>
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
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        appointmentId={selectedAppointment?.id || ''}
        businessName={selectedAppointment?.business_name || ''}
        serviceName={selectedAppointment?.service_names?.join(', ') || ''}
        employeeName={selectedAppointment?.employee_names?.join(', ') || ''}
        onReviewSubmitted={handleReviewSubmitted}
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
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        :root { 
          --randevuo-radius: 16px; 
          --randevuo-shadow: 0 8px 24px -12px rgba(0,0,0,0.25);
          --mobile-safe-area: env(safe-area-inset-bottom, 0px);
        }
        html, body { 
          font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; 
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          
          /* Touch targets */
          button, input, select, textarea {
            touch-action: manipulation;
          }
          
          /* Prevent zoom on input focus */
          input[type="text"], input[type="email"], input[type="password"], input[type="date"], input[type="time"], textarea {
            font-size: 16px;
          }
          
          /* Smooth scrolling */
          .overscroll-contain {
            overscroll-behavior: contain;
          }
        }
        
        /* Custom breakpoint for extra small screens */
        @media (max-width: 475px) {
          .xs\\:inline {
            display: inline;
          }
        }
        
        /* Animation improvements */
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
