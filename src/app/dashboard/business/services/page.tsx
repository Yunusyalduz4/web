"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';
import { useRealTimeBusiness } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';

export default function BusinessServicesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses, isLoading: loadingBusiness } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;

  // Employee ise yetki kontrolü
  if (session?.user?.role === 'employee' && !session?.user?.permissions?.can_manage_services) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-5xl mb-2">🔒</span>
        <span className="text-lg text-gray-500">Bu sayfaya erişim yetkiniz yok.</span>
      </main>
    );
  }
  const servicesQuery = trpc.business.getServices.useQuery(businessId ? { businessId } : skipToken);
  const { data: services, isLoading } = servicesQuery;
  const createService = trpc.business.createService.useMutation();
  const updateService = trpc.business.updateService.useMutation();
  const deleteService = trpc.business.deleteService.useMutation();

  const [form, setForm] = useState({ id: '', name: '', description: '', duration_minutes: 30, price: 0 });
  const [editing, setEditing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!businessId) {
      setError('İşletme bulunamadı! Lütfen sayfayı yenileyin veya tekrar giriş yapın.');
      return;
    }
    if (!form.name || !form.duration_minutes || !form.price) {
      setError('Tüm zorunlu alanları doldurun.');
      return;
    }
    try {
      if (editing) {
        await updateService.mutateAsync({ ...form, businessId, price: Number(form.price), duration_minutes: Number(form.duration_minutes) });
        setSuccess('Hizmet güncellendi!');
      } else {
        await createService.mutateAsync({ ...form, businessId, price: Number(form.price), duration_minutes: Number(form.duration_minutes) });
        setSuccess('Hizmet eklendi!');
      }
      setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 });
      setEditing(false);
      servicesQuery.refetch();
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      setError(err.message || 'Hata oluştu');
    }
  };

  const handleEdit = (s: any) => {
    setForm({ ...s });
    setEditing(true);
    setError('');
    setSuccess('');
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId || !businessId) return;
    try {
      await deleteService.mutateAsync({ id: deleteId, businessId });
      setDeleteId(null);
      setSuccess('Hizmet silindi!');
      servicesQuery.refetch();
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      setError(err.message || 'Silme işlemi başarısız');
    }
  };

  return (
    <main className="relative max-w-md mx-auto p-3 sm:p-4 pb-20 sm:pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/80 backdrop-blur-md border-b border-white/60 mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.push('/dashboard/business')} className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/70 border border-white/50 text-gray-900 shadow-sm hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
              <div className="text-[10px] sm:text-xs text-gray-600">Hizmet Yönetimi</div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
            <button 
              onClick={() => { setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 }); setEditing(false); setError(''); setSuccess(''); setFormOpen(true); }} 
              className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl bg-white text-gray-900 text-[10px] sm:text-xs font-semibold shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px] border-2 border-transparent bg-gradient-to-r from-red-500 via-blue-500 to-white bg-clip-border"
              style={{
                background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box',
                border: '2px solid transparent'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span className="hidden xs:inline">Yeni Hizmet</span>
            </button>
          </div>
        </div>
        
        {/* Hizmetler Sayısı - Mobile Optimized */}
        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-white/50 text-xs sm:text-sm font-semibold text-gray-900">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z"/></svg>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold">Hizmetler</div>
              <div className="text-[10px] sm:text-xs text-gray-600">{services?.length || 0} hizmet</div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal - Mobile Optimized */}
      {formOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFormOpen(false)} />
          <div className="relative mx-auto my-6 max-w-md w-[94%] bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl shadow-2xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <div className="text-sm sm:text-lg font-bold text-gray-900">{editing ? 'Hizmeti Güncelle' : 'Yeni Hizmet Ekle'}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600">Hizmet bilgilerini doldurun</div>
                </div>
              </div>
              <button 
                onClick={() => setFormOpen(false)} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation min-h-[44px]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            
            <form onSubmit={(e)=>{handleSubmit(e); if (!error) setFormOpen(false);}} className="space-y-3 sm:space-y-4">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Hizmet Adı</label>
                  <input 
                    type="text" 
                    value={form.name} 
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                    required 
                    className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors touch-manipulation min-h-[44px]" 
                    placeholder="Hizmet adını girin"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Süre (dk)</label>
                    <input 
                      type="number" 
                      min={1} 
                      value={form.duration_minutes} 
                      onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} 
                      required 
                      className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors touch-manipulation min-h-[44px]" 
                      placeholder="30"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Fiyat (₺)</label>
                    <input 
                      type="number" 
                      min={0} 
                      value={form.price} 
                      onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} 
                      required 
                      className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors touch-manipulation min-h-[44px]" 
                      placeholder="0"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Açıklama</label>
                  <input 
                    type="text" 
                    value={form.description} 
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                    className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors touch-manipulation min-h-[44px]" 
                    placeholder="Hizmet açıklaması (opsiyonel)"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>
              
              {error && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-red-50 text-red-800 text-[10px] sm:text-sm">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-green-50 text-green-800 text-[10px] sm:text-sm">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>{success}</span>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>{editing ? 'Güncelle' : 'Ekle'}</span>
                </button>
                <button 
                  type="button" 
                  className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]" 
                  onClick={() => { setFormOpen(false); setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 }); setError(''); setSuccess(''); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>İptal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="text-lg font-medium">Hizmetler yükleniyor...</span>
        </div>
      )}
      
      <div className="space-y-3">
        {services?.map((s: any) => (
          <div key={s.id} className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm p-3 sm:p-4 hover:shadow-md active:shadow-lg transition-all border-2 border-transparent"
               style={{
                 background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box',
                 border: '2px solid transparent'
               }}>
            {/* Header - Mobile Optimized */}
            <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">{s.name}</div>
                  {s.description && <div className="text-[10px] sm:text-xs text-gray-600 truncate mt-1">{s.description}</div>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm sm:text-lg font-bold text-gray-900">₺{s.price}</div>
                <div className="text-[10px] sm:text-xs text-gray-600">{s.duration_minutes} dk</div>
              </div>
            </div>

            {/* Detaylar - Mobile Optimized */}
          

            {/* Aksiyon Butonları - Mobile Optimized */}
            <div className="flex gap-2">
              <button 
                onClick={() => handleEdit(s)}
                className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-blue-500 text-white text-[10px] sm:text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>Düzenle</span>
              </button>
              <button 
                onClick={() => handleDelete(s.id)}
                className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-red-500 text-white text-[10px] sm:text-sm font-semibold hover:bg-red-600 active:bg-red-700 shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>Sil</span>
              </button>
            </div>
          </div>
        ))}
        
        {(!services || services.length === 0) && !isLoading && (
          <div className="text-center py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="text-sm sm:text-lg font-medium text-gray-500 mb-2">Henüz hizmet eklenmedi</div>
            <div className="text-xs sm:text-sm text-gray-400">Yeni hizmet eklemek için yukarıdaki butona tıklayın</div>
          </div>
        )}
      </div>
      {/* Silme Onay Modalı - Mobile Optimized */}
      {deleteId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative mx-auto my-6 max-w-sm w-[94%] bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl shadow-2xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <div className="text-sm sm:text-lg font-bold text-gray-900">Hizmeti Sil</div>
                  <div className="text-[10px] sm:text-xs text-gray-600">Bu işlem geri alınamaz</div>
                </div>
              </div>
              <button 
                onClick={() => setDeleteId(null)} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation min-h-[44px]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            
            <div className="text-center py-3 sm:py-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Bu hizmeti silmek istediğinize emin misiniz?</div>
              <div className="text-[10px] sm:text-xs text-gray-600">Silinen hizmet geri getirilemez ve mevcut randevular etkilenebilir.</div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button 
                onClick={confirmDelete}
                className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-red-500 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>Evet, Sil</span>
              </button>
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>Vazgeç</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
    </main>
  );
} 