"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';

export default function BusinessReviewsPage() {
  const { data: session } = useSession();
  const [currentPage, setCurrentPage] = useState(1);
  const businessId = session?.user?.businessId;

  // Debug bilgisi ekle
  if (!businessId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-fuchsia-50 to-indigo-50 p-4">
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
    businessId ? { page: currentPage, limit: 10 } : skipToken
  );

  // İşletme puan özetini getir
  const { data: ratingSummary, error: ratingError } = trpc.review.getBusinessRating.useQuery(
    businessId ? {} : skipToken
  );

  // Debug bilgisi
  console.log('Business Reviews Debug:', {
    businessId,
    session: session?.user,
    reviewsError,
    ratingError
  });

  // Yorumları getir
  const reviews = reviewsData?.reviews || [];
  const pagination = reviewsData?.pagination;

  // Yıldız rating component'i
  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </span>
      ))}
      <span className="text-xs text-gray-600 ml-1">({rating.toFixed(1)})</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-fuchsia-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Başlık */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Müşteri Yorumları</h1>
          <p className="text-gray-600">Müşterilerinizin deneyimlerini ve değerlendirmelerini görün</p>
        </div>

        {/* Puan Özeti */}
        {ratingSummary && (
          <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Genel Puan Özeti</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Hizmet Puanı */}
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-800 mb-2">
                  {ratingSummary.average_service_rating?.toFixed(1) || '0.0'}
                </div>
                <StarRating rating={ratingSummary.average_service_rating || 0} />
                <div className="text-sm text-blue-600 mt-2">Hizmet Kalitesi</div>
              </div>

              {/* Çalışan Puanı */}
              <div className="text-center p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                <div className="text-2xl font-bold text-emerald-800 mb-2">
                  {ratingSummary.average_employee_rating?.toFixed(1) || '0.0'}
                </div>
                <StarRating rating={ratingSummary.average_employee_rating || 0} />
                <div className="text-sm text-emerald-600 mt-2">Çalışan Performansı</div>
              </div>

              {/* Genel Puan */}
              <div className="text-center p-4 bg-gradient-to-r from-rose-50 to-fuchsia-50 rounded-xl border border-rose-200">
                <div className="text-2xl font-bold text-rose-800 mb-2">
                  {ratingSummary.overall_rating?.toFixed(1) || '0.0'}
                </div>
                <StarRating rating={ratingSummary.overall_rating || 0} />
                <div className="text-sm text-rose-600 mt-2">Genel Puan</div>
                <div className="text-xs text-rose-500 mt-1">
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
              <div key={review.id} className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{review.user_name}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(review.appointment_datetime).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    {/* Rating'ler */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">Hizmet:</span>
                        <StarRating rating={review.service_rating} />
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">Çalışan:</span>
                        <StarRating rating={review.employee_rating} />
                      </div>
                    </div>
                    
                    {/* Yorum */}
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      {review.comment}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sayfalama */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/80"
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
                          ? 'bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white shadow'
                          : 'hover:bg-white/80'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/80"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toplam Yorum Sayısı */}
        {pagination && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Toplam {pagination.total} yorum • Sayfa {currentPage} / {pagination.totalPages}
          </div>
        )}
      </div>
    </div>
  );
} 