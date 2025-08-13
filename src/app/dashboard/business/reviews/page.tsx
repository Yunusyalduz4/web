"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import StarRating from '../../../../components/StarRating';

export default function BusinessReviewsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');
  
  const { data: reviewsData, isLoading } = trpc.review.getByBusiness.useQuery(
    { businessId: business?.id || '', page: currentPage, limit: 10 },
    { enabled: !!business?.id }
  );
  
  const { data: businessRating } = trpc.review.getBusinessRating.useQuery(
    { businessId: business?.id || '' },
    { enabled: !!business?.id }
  );

  if (!business) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-5xl mb-2">🏢</span>
        <span className="text-lg text-gray-500">İşletme bulunamadı.</span>
      </main>
    );
  }

  const filteredReviews = reviewsData?.reviews?.filter((review: any) => {
    const overallRating = (review.service_rating + review.employee_rating) / 2;
    if (filter === 'positive') return overallRating >= 4;
    if (filter === 'negative') return overallRating <= 2;
    return true;
  }) || [];

  const totalPages = reviewsData?.pagination?.totalPages || 1;

  return (
    <main className="relative max-w-4xl mx-auto p-4 pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm mb-6">
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
        <div className="mt-3 text-sm font-semibold text-gray-800">Değerlendirmeler</div>
      </div>

      {/* Business Rating Summary */}
      {businessRating && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-8 mb-8 border border-white/20 animate-fade-in">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent select-none mb-4">
              {business.name} - Değerlendirmeler
            </h1>
            
            {/* Overall Rating */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <StarRating rating={parseFloat(businessRating.overall_rating || 0)} readonly size="lg" showValue />
                </div>
                <p className="text-sm text-gray-600">Genel Puan</p>
              </div>
              <div className="w-px h-12 bg-gray-300"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{businessRating.total_reviews}</p>
                <p className="text-sm text-gray-600">Toplam Değerlendirme</p>
              </div>
              <div className="w-px h-12 bg-gray-300"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{parseFloat(businessRating.last_6_months_rating || 0).toFixed(1)}</p>
                <p className="text-sm text-gray-600">Son 6 Ay</p>
              </div>
            </div>

            {/* Detailed Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/30">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                  💇‍♂️
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-600 font-medium">Hizmet Puanı</p>
                  <div className="flex items-center gap-2">
                    <StarRating rating={parseFloat(businessRating.average_service_rating || 0)} readonly size="sm" showValue />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100/30">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                  ✂️
                </div>
                <div className="flex-1">
                  <p className="text-sm text-purple-600 font-medium">Çalışan Puanı</p>
                  <div className="flex items-center gap-2">
                    <StarRating rating={parseFloat(businessRating.average_employee_rating || 0)} readonly size="sm" showValue />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-6 border border-white/20">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-300 ${
              filter === 'all' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tümü ({reviewsData?.reviews?.length || 0})
          </button>
          <button
            onClick={() => setFilter('positive')}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-300 ${
              filter === 'positive' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pozitif ({reviewsData?.reviews?.filter((r: any) => (r.service_rating + r.employee_rating) / 2 >= 4).length || 0})
          </button>
          <button
            onClick={() => setFilter('negative')}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-300 ${
              filter === 'negative' 
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Negatif ({reviewsData?.reviews?.filter((r: any) => (r.service_rating + r.employee_rating) / 2 <= 2).length || 0})
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">⏳</span>
            </div>
            <span className="text-lg">Değerlendirmeler yükleniyor...</span>
          </div>
        ) : filteredReviews.length > 0 ? (
          filteredReviews.map((review: any) => (
            <div key={review.id} className="group bg-white/80 backdrop-blur-sm rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-yellow-200/50">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm md:text-lg font-bold shadow-lg">
                    {review.user_name?.charAt(0).toUpperCase() || 'M'}
                  </div>
              <div>
                    <h3 className="text-base md:text-lg font-bold text-gray-800">
                      {review.user_name || 'Anonim'}
                    </h3>
                <p className="text-xs md:text-sm text-gray-500" suppressHydrationWarning>
                  {typeof window === 'undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(review.created_at))}
                </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <StarRating rating={review.service_rating} readonly size="sm" />
                    <span className="text-xs text-gray-500">Hizmet</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <StarRating rating={review.employee_rating} readonly size="sm" />
                    <span className="text-xs text-gray-500">Çalışan</span>
                  </div>
                </div>
              </div>

              {/* Review Comment */}
              <div className="bg-gradient-to-r from-yellow-50/30 to-orange-50/30 rounded-xl p-4 border border-yellow-100/30">
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  "{review.comment}"
                </p>
              </div>

              {/* Overall Rating */}
              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full">
                  <span className="text-sm font-semibold text-yellow-700">
                    Genel Puan:
                  </span>
                  <StarRating 
                    rating={(review.service_rating + review.employee_rating) / 2} 
                    readonly 
                    size="sm" 
                    showValue 
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">⭐</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Henüz Değerlendirme Yok</h3>
            <p className="text-gray-500 text-center">
              Bu filtreye uygun değerlendirme bulunamadı.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-white/30 hover:border-blue-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Önceki
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-xl font-medium transition-all duration-300 ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                      : 'bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-gray-100 border border-white/30'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-white/30 hover:border-blue-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sonraki →
          </button>
        </div>
      )}

    </main>
  );
} 