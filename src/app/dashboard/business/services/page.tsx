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

  const [form, setForm] = useState({ id: '', name: '', description: '', duration_minutes: '', price: '' });
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
    if (!form.name || !form.duration_minutes || Number(form.duration_minutes) <= 0 || !form.price || Number(form.price) < 0) {
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
      setForm({ id: '', name: '', description: '', duration_minutes: '', price: '' });
      setEditing(false);
      setFormOpen(false); // Modal'ı kapat
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
            onClick={() => { setFormOpen(true); setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: '', price: '' }); setError(''); setSuccess(''); }}
            className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white text-gray-900 shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation border-2 border-transparent"
            style={{
              background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box',
              border: '2px solid transparent'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
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

      {/* Hizmet Ekleme/Düzenleme Modal - Modern Mobile Design */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden animate-slide-up flex flex-col">
            {/* Modal Header - Gradient */}
            <div className="sticky top-0 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{editing ? 'Hizmet Düzenle' : 'Yeni Hizmet'}</h2>
                    <p className="text-sm text-white/90">{editing ? 'Hizmet bilgilerini güncelleyin' : 'Yeni hizmet ekleyin'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFormOpen(false); setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: '', price: '' }); setError(''); setSuccess(''); }}
                  className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all duration-200 flex items-center justify-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <form id="service-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                {/* Hizmet Adı Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm">
                      🎯
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Hizmet Bilgileri</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">Hizmet Adı <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-200 text-base text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                        placeholder="Hizmet adı"
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Süre ve Fiyat Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-sm">
                      ⏱️
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Süre ve Fiyat</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Süre Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block">Süre (dakika) <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <input
                          type="number"
                          value={form.duration_minutes}
                          onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                          className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-200 text-base text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                          placeholder="Süre giriniz"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    {/* Fiyat Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block">Fiyat (₺) <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 1v22m5-18H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <input
                          type="number"
                          value={form.price}
                          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                          className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-200 text-base text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                          placeholder="Fiyat giriniz"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Açıklama Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm">
                      📝
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Açıklama</h3>
                    <span className="text-gray-500 text-sm">(Opsiyonel)</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute top-4 left-4 pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <textarea
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-200 text-base text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
                        placeholder="Hizmet açıklaması (opsiyonel)"
                        autoComplete="off"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer - Fixed */}
            <div className="bg-white border-t border-gray-100 p-4 sm:p-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setFormOpen(false); setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: '', price: '' }); setError(''); setSuccess(''); }}
                  className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  form="service-form"
                  disabled={createService.isPending || updateService.isPending}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {createService.isPending || updateService.isPending ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
                      </svg>
                      {editing ? 'Güncelleniyor...' : 'Ekleniyor...'}
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                      </svg>
                      {editing ? 'Güncelle' : 'Ekle'}
                    </>
                  )}
                </button>
              </div>
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
            services.map((service: any, index: number) => {
              // Renkli gradient'ler için array
              const gradients = [
                'from-rose-500 to-pink-500',
                'from-blue-500 to-indigo-500', 
                'from-green-500 to-emerald-500',
                'from-purple-500 to-violet-500',
                'from-orange-500 to-amber-500',
                'from-cyan-500 to-blue-500'
              ];
              const currentGradient = gradients[index % gradients.length];
              
              return (
                <div 
                  key={service.id} 
                  className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border-2 hover:scale-[1.02]"
                  style={{
                    borderImage: 'linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) 1',
                    border: '2px solid transparent',
                    background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box'
                  }}
                >
                  {/* Hizmet Header - Renkli */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${currentGradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-800 transition-colors">{service.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-500"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              <span className="font-medium">{service.duration_minutes} dk</span>
                            </span>
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-500"><path d="M12 1v22m5-18H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              <span className="font-bold text-green-600">₺{service.price}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      {service.description && (
                        <div className="mt-3 p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                          <p className="text-sm text-gray-700 leading-relaxed">{service.description}</p>
                        </div>
                      )}
                    </div>
                  {/* Aksiyon Butonları - Küçük Kare Butonlar */}
                  <div className="flex items-center gap-2 ml-2 sm:ml-3">
                    <button
                      onClick={() => handleEdit(service)}
                      className="group flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 active:from-blue-700 active:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200 touch-manipulation"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="group-hover:scale-110 transition-transform sm:w-3 sm:h-3"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="group flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 active:from-red-700 active:to-rose-700 shadow-md hover:shadow-lg transition-all duration-200 touch-manipulation"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="group-hover:scale-110 transition-transform sm:w-3 sm:h-3"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </div>
              );
            })
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
