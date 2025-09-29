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
    if (!form.name || form.duration_minutes <= 0 || form.price < 0) {
      setError('Tüm zorunlu alanları doldurun ve geçerli değerler girin.');
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
            <div className="flex flex-col">
              <div className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
              <div className="text-[10px] sm:text-xs text-gray-600">Hizmet Yönetimi</div>
            </div>
          </div>
          <button 
            onClick={() => { setFormOpen(true); setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 }); setError(''); setSuccess(''); }}
            className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:bg-rose-700 transition-colors touch-manipulation min-h-[44px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14m7-7H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-green-50 text-green-800 text-[10px] sm:text-sm mb-3 sm:mb-4">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>{success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-red-50 text-red-800 text-[10px] sm:text-sm mb-3 sm:mb-4">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>{error}</span>
        </div>
      )}

      {/* Hizmet Ekleme/Düzenleme Modal */}
      {formOpen && (
        <div className="modal-container">
          <div className="modal-overlay-bg" onClick={() => { setFormOpen(false); setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 }); setError(''); setSuccess(''); }} />
          <div className="modal-wrapper">
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14m7-7H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="modal-header-text">
                  <h2 className="modal-header-title">{editing ? 'Hizmet Düzenle' : 'Yeni Hizmet'}</h2>
                  <p className="modal-header-subtitle">{editing ? 'Hizmet bilgilerini güncelleyin' : 'Yeni hizmet ekleyin'}</p>
                </div>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => { setFormOpen(false); setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 }); setError(''); setSuccess(''); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="modal-content">
              <form onSubmit={handleSubmit} className="modal-content-scroll">
                {/* Hizmet Adı Input - Login Style */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">Hizmet Adı</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="modal-input"
                      placeholder="Hizmet adı"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                {/* Süre ve Fiyat Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Süre Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">Süre (dakika)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <input
                        type="number"
                        value={form.duration_minutes}
                        onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                        className="modal-input"
                        placeholder="30"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  {/* Fiyat Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">Fiyat (₺)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 1v22m5-18H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <input
                        type="number"
                        value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                        className="modal-input"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Açıklama Input */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">Açıklama (opsiyonel)</label>
                  <div className="relative">
                    <div className="absolute top-4 left-4 pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="modal-textarea"
                      placeholder="Hizmet açıklaması (opsiyonel)"
                      autoComplete="off"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                  <button
                    type="submit"
                    className="modal-btn modal-btn-primary modal-btn-flex"
                    disabled={createService.isPending || updateService.isPending}
                  >
                    {createService.isPending || updateService.isPending ? (
                      <div className="modal-spinner" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                    <span>{editing ? 'Güncelle' : 'Ekle'}</span>
                  </button>
                  <button
                    type="button"
                    className="modal-btn modal-btn-secondary modal-btn-flex" 
                    onClick={() => { setFormOpen(false); setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 }); setError(''); setSuccess(''); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>İptal</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="text-lg font-medium">Hizmetler yükleniyor...</span>
        </div>
      )}

      {/* Services List */}
      {!isLoading && services && (
        <div className="space-y-3">
          {services.length === 0 ? (
            <div className="modal-empty">
              <div className="modal-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-gray-300"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="modal-empty-text">
                <h3 className="text-lg font-semibold text-gray-900">Henüz hizmet yok</h3>
                <p className="text-sm text-gray-500">İlk hizmetinizi ekleyerek başlayın</p>
              </div>
            </div>
          ) : (
            services.map((service: any) => (
              <div 
                key={service.id} 
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border-2"
                style={{
                  borderImage: 'linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) 1',
                  border: '2px solid transparent',
                  background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{service.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {service.duration_minutes} dk
                      </span>
                      <span className="flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 1v22m5-18H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ₺{service.price}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{service.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => handleEdit(service)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200 transition-colors touch-manipulation min-h-[44px]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 transition-colors touch-manipulation min-h-[44px]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="modal-container">
          <div className="modal-overlay-bg" onClick={() => setDeleteId(null)} />
          <div className="modal-wrapper">
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="modal-header-text">
                  <h2 className="modal-header-title">Hizmeti Sil</h2>
                  <p className="modal-header-subtitle">Bu işlem geri alınamaz</p>
                </div>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setDeleteId(null)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-content-scroll">
                <div className="modal-message modal-message-warning">
                  <p>Bu hizmeti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve hizmete ait tüm randevular etkilenebilir.</p>
                </div>
                <div className="modal-footer">
                  <button
                    onClick={confirmDelete}
                    className="modal-btn modal-btn-danger modal-btn-flex"
                    disabled={deleteService.isPending}
                  >
                    {deleteService.isPending ? (
                      <div className="modal-spinner" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                    <span>Sil</span>
                  </button>
                  <button
                    onClick={() => setDeleteId(null)}
                    className="modal-btn modal-btn-secondary modal-btn-flex"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>İptal</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
