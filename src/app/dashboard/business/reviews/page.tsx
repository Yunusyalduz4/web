"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { skipToken } from '@tanstack/react-query';
import { useRealTimeReviews } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto my-6 max-w-md w-[94%] bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl shadow-2xl p-3 sm:p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-sm sm:text-lg font-bold text-gray-900">{review?.business_reply ? 'Yanıtı Düzenle' : 'Yanıt Ver'}</div>
              <div className="text-[10px] sm:text-xs text-gray-600">Müşteri yorumuna yanıt verin</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Yanıtınız</label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Müşteri yorumuna yanıt verin..."
              className="w-full h-24 sm:h-32 px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none touch-manipulation"
              style={{ fontSize: '16px' }}
            />
          </div>
          
          <div className="flex gap-1.5 sm:gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!reply.trim() || isSubmitting}
              className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/></svg>
                  <span>Gönderiliyor...</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Gönder</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-white/90 transition-colors min-h-[44px]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>İptal</span>
            </button>
          </div>
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
  const isEmployee = session?.user?.role === 'employee';
  const [replyModal, setReplyModal] = useState<{ isOpen: boolean; review: any }>({ isOpen: false, review: null });
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photoSwiper, setPhotoSwiper] = useState<any>(null);
  const utils = trpc.useUtils();

  // İşletme yorumlarını getir - hook'ları her zaman çağır
  const { data: allReviewsData, error: reviewsError, isLoading: reviewsLoading } = trpc.review.getByBusiness.useQuery(
    businessId ? { businessId, page: currentPage, limit: 10 } : skipToken
  );

  // Backend'de filtreleme yapıldığı için frontend filtrelemesi kaldırıldı
  const reviewsData = allReviewsData;

  // İşletme puan özetini getir - hook'ları her zaman çağır
  const { data: ratingSummary, error: ratingError, isLoading: ratingLoading } = trpc.review.getBusinessRating.useQuery(
    businessId ? { businessId } : skipToken
  );

  // Yanıt verme mutation'ları - sadece business için
  const addReply = trpc.review.addBusinessReply.useMutation({
    onSuccess: () => {
      if (businessId) {
        utils.review.getByBusiness.invalidate({ businessId, page: currentPage, limit: 10 });
      }
    }
  });

  const updateReply = trpc.review.updateBusinessReply.useMutation({
    onSuccess: () => {
      if (businessId) {
        utils.review.getByBusiness.invalidate({ businessId, page: currentPage, limit: 10 });
      }
    }
  });

  const deleteReply = trpc.review.deleteBusinessReply.useMutation({
    onSuccess: () => {
      if (businessId) {
        utils.review.getByBusiness.invalidate({ businessId, page: currentPage, limit: 10 });
      }
    }
  });

  // Debug bilgisi ekle - hook'lardan sonra kontrol et
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

  // Yanıt verme fonksiyonları - sadece business için
  const handleReply = async (reply: string) => {
    if (isEmployee) return; // Employee'ler yanıt veremez
    const review = replyModal.review;
    if (review.business_reply) {
      await updateReply.mutateAsync({ reviewId: review.id, reply });
    } else {
      await addReply.mutateAsync({ reviewId: review.id, reply });
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    if (isEmployee) return; // Employee'ler yanıt silemez
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
    <main className="relative max-w-md mx-auto p-3 sm:p-4 pb-20 sm:pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/80 backdrop-blur-md border-b border-white/60 mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.push('/dashboard/business')} className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/70 border border-white/50 text-gray-900 shadow-sm hover:bg-white/90 transition-colors min-h-[44px]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
              <div className="text-[10px] sm:text-xs text-gray-600">Müşteri Yorumları</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
          </div>
        </div>
        
        {/* Yorumlar Sayısı */}
        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-white/50 text-xs sm:text-sm font-semibold text-gray-900">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-white flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold">Müşteri Yorumları</div>
              <div className="text-[10px] sm:text-xs text-gray-600">{pagination?.total || 0} yorum</div>
            </div>
          </div>
        </div>
      </div>
      {/* Loading State */}
      {(reviewsLoading || ratingLoading) && (
        <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <svg className="animate-spin w-4 h-4 sm:w-6 sm:h-6 text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
            </svg>
          </div>
          <div className="text-xs sm:text-sm font-medium text-gray-500">Yorumlar yükleniyor...</div>
        </div>
      )}

      {/* Puan Özeti */}
      {ratingSummary && !ratingLoading && (
        <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm mb-3 sm:mb-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-r from-yellow-500 to-yellow-600 text-white flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900">Genel Puan Özeti</h2>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            {/* Hizmet Puanı */}
            <div className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z"/></svg>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs font-semibold text-gray-900">Hizmet Kalitesi</div>
                  <StarRating rating={Number(ratingSummary.average_service_rating)} />
                </div>
              </div>
              <div className="text-sm sm:text-lg font-bold text-blue-800">
                {Number(ratingSummary.average_service_rating || 0).toFixed(1)}
              </div>
            </div>

            {/* Çalışan Puanı */}
            <div className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs font-semibold text-gray-900">Çalışan Performansı</div>
                  <StarRating rating={Number(ratingSummary.average_employee_rating)} />
                </div>
              </div>
              <div className="text-sm sm:text-lg font-bold text-emerald-800">
                {Number(ratingSummary.average_employee_rating || 0).toFixed(1)}
              </div>
            </div>

            {/* Genel Puan */}
            <div className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-rose-50 to-fuchsia-50 rounded-lg border border-rose-200">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs font-semibold text-gray-900">Genel Puan</div>
                  <StarRating rating={Number(ratingSummary.overall_rating)} />
                </div>
              </div>
              <div className="text-sm sm:text-lg font-bold text-rose-800">
                {Number(ratingSummary.overall_rating || 0).toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yorum Listesi */}
      {!reviewsLoading && (
        <div className="space-y-3 sm:space-y-4">
          {reviews.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="text-sm sm:text-lg font-medium text-gray-500 mb-2">Henüz yorum bulunmuyor</div>
            <div className="text-xs sm:text-sm text-gray-400">Müşterileriniz randevularını tamamladıktan sonra yorum yapabilir</div>
          </div>
        ) : (
          reviews.map((review: any) => (
            <div key={review.id} className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-md">
                    {review.user_name ? review.user_name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">{review.user_name}</div>
                    <div className="text-[10px] sm:text-xs text-gray-600">
                      {new Date(review.appointment_datetime).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {review.is_approved ? (
                    <span className="px-1.5 sm:px-2 py-1 rounded-lg bg-green-100 text-green-800 text-[10px] sm:text-xs font-semibold shadow-sm">
                      ✅ Onaylı
                    </span>
                  ) : (
                    <span className="px-1.5 sm:px-2 py-1 rounded-lg bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs font-semibold shadow-sm">
                      ⏳ Bekliyor
                    </span>
                  )}
                </div>
              </div>
              
              {/* Rating'ler */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-2 sm:p-3 border border-blue-200">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-blue-500 text-white flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z"/></svg>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-blue-600 font-semibold">Hizmet</div>
                    <StarRating rating={review.service_rating || 0} />
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-2 sm:p-3 border border-green-200">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-green-500 text-white flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-green-600 font-semibold">Çalışan</div>
                    <StarRating rating={review.employee_rating || 0} />
                  </div>
                </div>
              </div>
              
              {/* Yorum */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border-l-4 border-gray-400">
                <div className="flex items-start gap-2 mb-2 sm:mb-3">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gray-500 text-white flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-700">Yorum</span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-800 leading-relaxed pl-5 sm:pl-6">{review.comment}</p>
              </div>

              {/* Yorum Görselleri */}
              {review.photos && review.photos.length > 0 && (
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-purple-500 text-white flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-700">Müşteri Görselleri</span>
                    <span className="text-[10px] sm:text-xs text-gray-500 bg-gray-200 px-1.5 sm:px-2 py-1 rounded-full">{review.photos.length}</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {review.photos.slice(0, 4).map((photo: string, photoIndex: number) => (
                      <div
                        key={photoIndex}
                        className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer group"
                        onClick={() => {
                          setCurrentPhotos(review.photos);
                          setCurrentPhotoIndex(photoIndex);
                          setPhotoModalOpen(true);
                        }}
                      >
                        <img
                          src={photo}
                          alt={`Review photo ${photoIndex + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        {/* Fallback for failed images */}
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center hidden">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                            <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </div>
                    ))}
                    {review.photos.length > 4 && (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] sm:text-xs text-gray-500 font-medium">
                        +{review.photos.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* İşletme Yanıtı */}
              {review.business_reply && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-blue-500 text-white flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-blue-800">İşletme Yanıtı</span>
                      {review.business_reply_approved ? (
                        <span className="px-1.5 sm:px-2 py-1 rounded-md bg-green-100 text-green-800 text-[10px] sm:text-xs font-semibold">
                          ✅ Onaylı
                        </span>
                      ) : (
                        <span className="px-1.5 sm:px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs font-semibold">
                          ⏳ Bekliyor
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-xs text-blue-600 bg-blue-200 px-1.5 sm:px-2 py-1 rounded-md font-medium">
                      {new Date(review.business_reply_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-blue-800 leading-relaxed mb-2 sm:mb-3 pl-5 sm:pl-6">{review.business_reply}</div>
                  {!isEmployee && (
                    <div className="flex gap-1.5 sm:gap-2 pl-5 sm:pl-6">
                      <button
                        onClick={() => setReplyModal({ isOpen: true, review })}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-200 text-blue-800 rounded-md hover:bg-blue-300 text-[10px] sm:text-xs font-medium transition-colors min-h-[44px]"
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteReply(review.id)}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-200 text-red-800 rounded-md hover:bg-red-300 text-[10px] sm:text-xs font-medium transition-colors min-h-[44px]"
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Sil
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Yanıt Verme Butonu - Sadece Business için */}
              {!isEmployee && (
                <div className="flex justify-end">
                  {!review.business_reply ? (
                    <button
                      onClick={() => setReplyModal({ isOpen: true, review })}
                      className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-[10px] sm:text-xs font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 min-h-[44px]"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Yanıt Ver
                    </button>
                  ) : (
                    <button
                      onClick={() => setReplyModal({ isOpen: true, review })}
                      className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg text-[10px] sm:text-xs font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 min-h-[44px]"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Yanıtı Düzenle
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
          )}
        </div>
      )}

      {/* Sayfalama */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-3 sm:mt-4 flex justify-center">
          <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-lg p-2 sm:p-3 shadow-sm">
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-md text-[10px] sm:text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/80 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px]"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md text-[10px] sm:text-xs font-medium transition flex items-center justify-center min-h-[44px] ${
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
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-md text-[10px] sm:text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/80 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px]"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toplam Yorum Sayısı */}
      {pagination && (
        <div className="mt-3 sm:mt-4 text-center">
          <div className="inline-flex items-center gap-1 sm:gap-2 bg-white/70 backdrop-blur-md border border-white/50 rounded-full px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-gray-600">
            <span className="font-medium">📊</span>
            <span>Toplam <strong className="text-gray-800">{pagination.total}</strong> yorum</span>
            <span className="text-gray-400">•</span>
            <span>Sayfa <strong className="text-gray-800">{currentPage}</strong> / <strong className="text-gray-800">{pagination.totalPages}</strong></span>
          </div>
        </div>
      )}
      {/* Yanıt Verme Modal - Sadece Business için */}
      {!isEmployee && (
        <ReplyModal
          review={replyModal.review}
          isOpen={replyModal.isOpen}
          onClose={() => setReplyModal({ isOpen: false, review: null })}
          onSubmit={handleReply}
        />
      )}

      {/* Photo Modal - Swiper */}
      {photoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-2 sm:p-4">
          <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setPhotoModalOpen(false)}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors min-h-[44px]"
            >
              <span className="text-lg sm:text-xl">×</span>
            </button>

            {/* Photo Counter */}
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 bg-black/50 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 text-white text-xs sm:text-sm">
              {currentPhotoIndex + 1} / {currentPhotos.length}
            </div>

            {/* Swiper Container */}
            <div className="flex-1 w-full">
              <Swiper
                modules={[Navigation, Pagination, EffectFade]}
                spaceBetween={0}
                slidesPerView={1}
                initialSlide={currentPhotoIndex}
                onSwiper={setPhotoSwiper}
                onSlideChange={(swiper) => setCurrentPhotoIndex(swiper.activeIndex)}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                navigation={{
                  nextEl: '.swiper-button-next-custom',
                  prevEl: '.swiper-button-prev-custom',
                }}
                pagination={{
                  clickable: true,
                  bulletClass: 'swiper-pagination-bullet-custom',
                  bulletActiveClass: 'swiper-pagination-bullet-active-custom',
                }}
                className="w-full h-full"
              >
                {currentPhotos.map((photo, index) => (
                  <SwiperSlide key={index}>
                    <div className="flex items-center justify-center w-full h-full">
                      <img
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Custom Navigation Buttons */}
            {currentPhotos.length > 1 && (
              <>
                <button className="swiper-button-prev-custom absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10 min-h-[44px]">
                  <span className="text-xl sm:text-2xl">‹</span>
                </button>
                <button className="swiper-button-next-custom absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10 min-h-[44px]">
                  <span className="text-xl sm:text-2xl">›</span>
                </button>
              </>
            )}

            {/* Thumbnail Strip */}
            {currentPhotos.length > 1 && (
              <div className="flex justify-center gap-1 sm:gap-2 p-2 sm:p-4 overflow-x-auto">
                {currentPhotos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentPhotoIndex(index);
                      photoSwiper?.slideTo(index);
                    }}
                    className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all min-h-[44px] ${
                      index === currentPhotoIndex
                        ? 'border-white'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        html, body { font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
        
        :root {
          --primary-gradient: linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #3b82f6 100%);
          --glass-bg: rgba(255, 255, 255, 0.7);
          --glass-border: rgba(255, 255, 255, 0.5);
        }
        
        /* Mobile optimizations */
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        /* Touch optimizations */
        * {
          touch-action: manipulation;
        }
        
        /* Prevent zoom on input focus */
        input[type="text"],
        input[type="email"],
        input[type="password"],
        input[type="tel"],
        input[type="url"],
        input[type="search"],
        textarea,
        select {
          font-size: 16px !important;
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Overscroll behavior */
        body {
          overscroll-behavior: contain;
        }
        
        /* Custom breakpoint for extra small screens */
        @media (max-width: 475px) {
          .xs\\:text-\\[10px\\] { font-size: 10px !important; }
          .xs\\:text-xs { font-size: 12px !important; }
          .xs\\:text-sm { font-size: 14px !important; }
          .xs\\:text-base { font-size: 16px !important; }
          .xs\\:text-lg { font-size: 18px !important; }
          .xs\\:text-xl { font-size: 20px !important; }
          .xs\\:text-2xl { font-size: 24px !important; }
          .xs\\:text-3xl { font-size: 30px !important; }
          .xs\\:text-4xl { font-size: 36px !important; }
          .xs\\:text-5xl { font-size: 48px !important; }
          .xs\\:text-6xl { font-size: 60px !important; }
          .xs\\:text-7xl { font-size: 72px !important; }
          .xs\\:text-8xl { font-size: 96px !important; }
          .xs\\:text-9xl { font-size: 128px !important; }
          .xs\\:hidden { display: none !important; }
          .xs\\:inline { display: inline !important; }
          .xs\\:block { display: block !important; }
          .xs\\:flex { display: flex !important; }
          .xs\\:grid { display: grid !important; }
        }
        
        /* Animation keyframes */
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        /* Custom Swiper Styles */
        .swiper-pagination-bullet-custom {
          width: 6px !important;
          height: 6px !important;
          background: rgba(255, 255, 255, 0.3) !important;
          opacity: 1 !important;
          margin: 0 3px !important;
        }
        
        .swiper-pagination-bullet-active-custom {
          background: white !important;
        }
        
        .swiper-button-next-custom:after,
        .swiper-button-prev-custom:after {
          display: none !important;
        }
        
        .swiper-pagination {
          bottom: 10px !important;
        }
        
        @media (min-width: 640px) {
          .swiper-pagination-bullet-custom {
            width: 8px !important;
            height: 8px !important;
            margin: 0 4px !important;
          }
          .swiper-pagination {
            bottom: 20px !important;
          }
        }
      `}</style>
    </main>
  );
}
