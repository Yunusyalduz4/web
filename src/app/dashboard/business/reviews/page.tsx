"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';

// Yanıt verme modal component'i
function ReplyModal({ review, isOpen, onClose, onSubmit }: any) {
  const [reply, setReply] = useState(review?.business_reply || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reply.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(reply);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Yanıt Ver</h3>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Müşteri yorumuna yanıt verin..."
          className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reply.trim() || isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessReviewsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const businessId = session?.user?.businessId;
  const [replyModal, setReplyModal] = useState<{ isOpen: boolean; review: any }>({ isOpen: false, review: null });
  const utils = trpc.useUtils();

  // Debug bilgisi ekle
  if (!businessId) {
    return (
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8 text-gray-500">
            <span className="text-2xl mb-2 block">🔒</span>
            <span>İşletme hesabı gerekli</span>
            <div className="mt-2 text-sm text-gray-400">
              Session: {JSON.stringify(session?.user, null, 2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // İşletme yorumlarını getir
  const { data: reviewsData, error: reviewsError } = trpc.review.getByBusiness.useQuery(
    businessId ? { businessId, page: currentPage, limit: 10 } : skipToken
  );

  // İşletme puan özetini getir
  const { data: ratingSummary, error: ratingError } = trpc.review.getBusinessRating.useQuery(
    businessId ? { businessId } : skipToken
  );

  // Yanıt verme mutation'ları
  const addReply = trpc.review.addBusinessReply.useMutation({
    onSuccess: () => {
      utils.review.getByBusiness.invalidate({ businessId, page: currentPage, limit: 10 });
    }
  });

  const updateReply = trpc.review.updateBusinessReply.useMutation({
    onSuccess: () => {
      utils.review.getByBusiness.invalidate({ businessId, page: currentPage, limit: 10 });
    }
  });

  const deleteReply = trpc.review.deleteBusinessReply.useMutation({
    onSuccess: () => {
      utils.review.getByBusiness.invalidate({ businessId, page: currentPage, limit: 10 });
    }
  });

  // Debug bilgisi
  console.log('Business Reviews Debug:', {
    businessId,
    session: session?.user,
    reviewsData,
    ratingSummary,
    reviewsError,
    ratingError
  });

  // Yorumları getir
  const reviews = reviewsData?.reviews || [];
  const pagination = reviewsData?.pagination;

  // Yanıt verme fonksiyonları
  const handleReply = async (reply: string) => {
    const review = replyModal.review;
    if (review.business_reply) {
      await updateReply.mutateAsync({ reviewId: review.id, reply });
    } else {
      await addReply.mutateAsync({ reviewId: review.id, reply });
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    if (confirm('Yanıtı silmek istediğinizden emin misiniz?')) {
      await deleteReply.mutateAsync({ reviewId });
    }
  };

  // Yıldız rating component'i
  const StarRating = ({ rating }: { rating: number | null | undefined }) => {
    // Rating null/undefined ise 0 olarak kullan
    const safeRating = rating || 0;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-sm ${
              star <= safeRating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
        <span className="text-xs text-gray-600 ml-1">({safeRating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <div>
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">kuado</div>
          <button 
            onClick={() => router.push('/dashboard/business')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 text-gray-900 shadow-sm hover:shadow-md transition"
          >
            <span className="text-base">←</span>
            <span className="hidden sm:inline text-sm font-medium">Geri</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          {/* Başlık */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Müşteri Yorumları</h1>
            <p className="text-gray-600">Müşterilerinizin deneyimlerini ve değerlendirmelerini görün</p>
          </div>

          {/* Puan Özeti */}
          {ratingSummary && (
            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-4 md:p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center md:text-left">Genel Puan Özeti</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {/* Hizmet Puanı */}
                <div className="text-center p-3 md:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                  <div className="text-xl md:text-2xl font-bold text-blue-800 mb-2">
                    {Number(ratingSummary.average_service_rating || 0).toFixed(1)}
                  </div>
                  <StarRating rating={Number(ratingSummary.average_service_rating)} />
                  <div className="text-xs md:text-sm text-blue-600 mt-2 font-medium">Hizmet Kalitesi</div>
                </div>

                {/* Çalışan Puanı */}
                <div className="text-center p-3 md:p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 shadow-sm">
                  <div className="text-xl md:text-2xl font-bold text-emerald-800 mb-2">
                    {Number(ratingSummary.average_employee_rating || 0).toFixed(1)}
                  </div>
                  <StarRating rating={Number(ratingSummary.average_employee_rating)} />
                  <div className="text-xs md:text-sm text-emerald-600 mt-2 font-medium">Çalışan Performansı</div>
                </div>

                {/* Genel Puan */}
                <div className="text-center p-3 md:p-4 bg-gradient-to-r from-rose-50 to-fuchsia-50 rounded-xl border border-rose-200 shadow-sm sm:col-span-2 lg:col-span-1">
                  <div className="text-xl md:text-2xl font-bold text-rose-800 mb-2">
                    {Number(ratingSummary.overall_rating || 0).toFixed(1)}
                  </div>
                  <StarRating rating={Number(ratingSummary.overall_rating)} />
                  <div className="text-xs md:text-sm text-rose-600 mt-2 font-medium">Genel Puan</div>
                  <div className="text-xs text-rose-500 mt-1 opacity-75">
                    (Hizmet + Çalışan) / 2
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Yorum Listesi */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-8 text-center">
                <span className="text-4xl mb-4 block">📝</span>
                <p className="text-gray-600">Henüz yorum bulunmuyor</p>
                <p className="text-sm text-gray-500 mt-2">
                  Müşterileriniz randevularını tamamladıktan sonra yorum yapabilir
                </p>
              </div>
            ) : (
              reviews.map((review: any) => (
                <div key={review.id} className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Kullanıcı Bilgisi ve Tarih */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <h4 className="font-semibold text-gray-900 text-lg">{review.user_name}</h4>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {new Date(review.appointment_datetime).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      {/* Rating'ler - Responsive Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2">
                          <span className="text-sm text-blue-600 font-medium">Hizmet:</span>
                          <StarRating rating={review.service_rating || 0} />
                        </div>
                        
                        <div className="flex items-center gap-2 bg-green-50 rounded-lg p-2">
                          <span className="text-sm text-green-600 font-medium">Çalışan:</span>
                          <StarRating rating={review.employee_rating || 0} />
                        </div>
                      </div>
                      
                      {/* Yorum */}
                      <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-3 border-l-4 border-gray-300">
                        <p className="leading-relaxed">{review.comment}</p>
                      </div>

                      {/* İşletme Yanıtı */}
                      {review.business_reply && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-blue-800">🏢 İşletme Yanıtı</span>
                            </div>
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                              {new Date(review.business_reply_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <div className="text-sm text-blue-700 leading-relaxed mb-3">{review.business_reply}</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setReplyModal({ isOpen: true, review })}
                              className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition-colors"
                            >
                              ✏️ Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteReply(review.id)}
                              className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition-colors"
                            >
                              🗑️ Sil
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Yanıt Verme Butonu - Responsive */}
                    <div className="flex-shrink-0">
                      {!review.business_reply ? (
                        <button
                          onClick={() => setReplyModal({ isOpen: true, review })}
                          className="w-full lg:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          💬 Yanıt Ver
                        </button>
                      ) : (
                        <button
                          onClick={() => setReplyModal({ isOpen: true, review })}
                          className="w-full lg:w-auto px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          ✏️ Yanıtı Düzenle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sayfalama */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-2 shadow-sm">
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/80 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white shadow-md'
                            : 'hover:bg-white/80 text-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/80 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toplam Yorum Sayısı */}
          {pagination && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md border border-white/40 rounded-full px-4 py-2 text-sm text-gray-600">
                <span className="font-medium">📊</span>
                <span>Toplam <strong className="text-gray-800">{pagination.total}</strong> yorum</span>
                <span className="text-gray-400">•</span>
                <span>Sayfa <strong className="text-gray-800">{currentPage}</strong> / <strong className="text-gray-800">{pagination.totalPages}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Yanıt Verme Modal */}
      <ReplyModal
        review={replyModal.review}
        isOpen={replyModal.isOpen}
        onClose={() => setReplyModal({ isOpen: false, review: null })}
        onSubmit={handleReply}
      />
    </div>
  );
}
