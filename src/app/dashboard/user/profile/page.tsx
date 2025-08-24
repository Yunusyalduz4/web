"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';
import React from 'react';
import { handleLogout } from '../../../../utils/authUtils';
import { useUserPushNotifications } from '../../../../hooks/useUserPushNotifications';

export default function UserProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery(userId ? { userId } : skipToken);
  const { data: userReviews, isLoading: reviewsLoading } = trpc.review.getByUser.useQuery(
    userId ? { userId, page: 1, limit: 50 } : skipToken
  );
  const updateMutation = trpc.user.updateProfile.useMutation();
  const deleteReviewMutation = trpc.review.deleteUserReview.useMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'reviews'>('profile');
  
  // Push notification hook
  const { isSupported, isSubscribed, isLoading: pushLoading, error: pushError, subscribe, unsubscribe } = useUserPushNotifications();

  // Profil yüklendiğinde inputlara aktar
  React.useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!userId) return;
    try {
      await updateMutation.mutateAsync({ userId, name, email, password: password || undefined, phone, address });
      setSuccess('Profil başarıyla güncellendi!');
      setPassword('');
      setTimeout(() => router.refresh(), 1200);
    } catch (err: any) {
      setError(err.message || 'Profil güncellenemedi');
    }
  };

  const handleUserLogout = async () => {
    await handleLogout();
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Bu değerlendirmeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    
    try {
      await deleteReviewMutation.mutateAsync({ reviewId });
      // Sayfayı yenile
      router.refresh();
    } catch (error: any) {
      console.error('Review silme hatası:', error);
      alert('Değerlendirme silinirken bir hata oluştu: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-base text-gray-600">Profil yükleniyor…</span>
      </main>
    );
  }

  return (
    <main className="relative max-w-md mx-auto p-3 pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 bg-white/70 backdrop-blur-md border-b border-white/40">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/70 border border-white/50 text-gray-900 text-xs">
            <span>←</span>
            <span className="hidden sm:inline">Geri</span>
          </button>
          <div className="text-sm font-bold tracking-tight text-gray-800">Profil</div>
          <div className="w-6" />
        </div>
      </div>

      {/* Header Mini */}
      <section className="mt-3 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-bold grid place-items-center">
            {(profile?.name?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{profile?.name || 'Kullanıcı'}</div>
            <div className="text-xs text-gray-600 truncate">{profile?.email || ''}</div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="mt-3">
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/60 backdrop-blur-md border border-white/40">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-white/70'
            }`}
          >
            Profil Bilgileri
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'reviews'
                ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-white/70'
            }`}
          >
            Değerlendirmelerim
          </button>
        </div>
      </section>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <section className="mt-3 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">Ad Soyad</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
                autoComplete="name"
                placeholder="Adınız ve soyadınız"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                autoComplete="email"
                placeholder="E-posta adresiniz"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-200"
                autoComplete="tel"
                placeholder="05xx xxx xx xx"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">Adres</label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="Adresiniz"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">Yeni Şifre (opsiyonel)</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
                autoComplete="new-password"
                placeholder="Yeni şifreniz"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700">{error}</div>
            )}
            {success && (
              <div className="px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-[12px] text-green-700">{success}</div>
            )}

            <button
              type="submit"
              disabled={updateMutation.isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-60"
            >
              {updateMutation.isLoading ? 'Güncelleniyor…' : 'Kaydet'}
            </button>
          </form>
        </section>
      )}

      {/* Değerlendirmelerim Tab */}
      {activeTab === 'reviews' && (
        <section className="mt-3 space-y-3">
          {reviewsLoading ? (
            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-6 text-center">
              <div className="text-2xl mb-2">⏳</div>
              <div className="text-sm text-gray-600">Değerlendirmeleriniz yükleniyor...</div>
            </div>
          ) : !userReviews?.reviews || userReviews.reviews.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Henüz Değerlendirme Yapmadınız</h3>
              <p className="text-xs text-gray-600 mb-3">
                Tamamlanan randevularınız için değerlendirme yaparak deneyimlerinizi paylaşın.
              </p>
              <button
                onClick={() => router.push('/dashboard/user/reviews')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-medium"
              >
                Değerlendirme Yap
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {userReviews.reviews.map((review: any) => (
                <div key={review.id} className="bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{review.business_name}</h3>
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(review.appointment_datetime).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Onay Durumu Badge */}
                      {review.is_approved ? (
                        <div className="px-2 py-1 rounded-full bg-green-100 border border-green-200 text-green-800 text-[10px] font-semibold">
                          ✅ Onaylı
                        </div>
                      ) : (
                        <div className="px-2 py-1 rounded-full bg-yellow-100 border border-yellow-200 text-yellow-800 text-[10px] font-semibold">
                          ⏳ Onay Bekliyor
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-medium">{((review.service_rating + review.employee_rating) / 2).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-700 mb-2">
                    <div>Hizmet: {Array.isArray(review.service_names) ? review.service_names.join(', ') : '—'}</div>
                    {review.employee_names && review.employee_names.length > 0 && (
                      <div>Çalışan: {review.employee_names.join(', ')}</div>
                    )}
                  </div>

                  {review.comment && (
                    <div className="text-xs text-gray-800 bg-white/50 rounded-lg p-2 border border-white/30">
                      "{review.comment}"
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Hizmet: ⭐ {review.service_rating}/5</span>
                      <span>Çalışan: ⭐ {review.employee_rating}/5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString('tr-TR')}</span>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        disabled={deleteReviewMutation.isLoading}
                        className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-medium transition-colors disabled:opacity-50"
                        title="Bu değerlendirmeyi sil"
                      >
                        {deleteReviewMutation.isLoading ? 'Siliniyor...' : '🗑️ Sil'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Push Notification - Kullanıcı */}
      {isSupported && (
        <section className="mt-3 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Push Bildirimleri</div>
              <div className="text-[12px] text-gray-600">
                {isSubscribed 
                  ? 'Randevu güncellemeleri için bildirim alınıyor' 
                  : 'Randevu güncellemeleri için bildirim almak ister misiniz?'
                }
              </div>
            </div>
            <button 
              onClick={isSubscribed ? unsubscribe : subscribe} 
              disabled={pushLoading} 
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                isSubscribed ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
              } disabled:opacity-50`}
            >
              {pushLoading ? '⏳' : isSubscribed ? 'Kapat' : 'Aç'}
            </button>
          </div>
          {pushError && (
            <div className="mt-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-[12px] text-red-700">
              {pushError}
            </div>
          )}
        </section>
      )}

      {/* Logout */}
      <section className="mt-3">
        <button
          onClick={handleUserLogout}
          className="w-full py-2.5 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm"
        >
          Çıkış Yap
        </button>
      </section>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        html, body { font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
      `}</style>
    </main>
  );
} 