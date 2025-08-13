"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';

export default function BusinessServicesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses, isLoading: loadingBusiness } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;
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
    <main className="relative max-w-3xl mx-auto p-4 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
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
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-gray-900">Hizmetler</h1>
        <button onClick={() => { setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 }); setEditing(false); setError(''); setSuccess(''); setFormOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow hover:shadow-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Yeni Hizmet
        </button>
      </div>

      {/* Create/Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setFormOpen(false)} />
          <div className="relative mx-auto my-8 max-w-lg w-[92%] bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{editing ? 'Hizmeti Güncelle' : 'Yeni Hizmet Ekle'}</h2>
            <form onSubmit={(e)=>{handleSubmit(e); if (!error) setFormOpen(false);}} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-gray-800 font-medium">
                  Adı
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="border border-white/40 bg-white/60 backdrop-blur-md rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-rose-100 transition" />
                </label>
                <label className="flex flex-col gap-1 text-gray-800 font-medium">
                  Süre (dk)
                  <input type="number" min={1} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} required className="border border-white/40 bg-white/60 backdrop-blur-md rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-rose-100 transition" />
                </label>
                <label className="flex flex-col gap-1 text-gray-800 font-medium">
                  Fiyat (₺)
                  <input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} required className="border border-white/40 bg-white/60 backdrop-blur-md rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-fuchsia-100 transition" />
                </label>
                <label className="flex flex-col gap-1 text-gray-800 font-medium md:col-span-2">
                  Açıklama
                  <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="border border-white/40 bg-white/60 backdrop-blur-md rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-rose-100 transition" />
                </label>
              </div>
              {error && <div className="text-red-600 text-sm text-center animate-shake">{error}</div>}
              {success && <div className="text-green-600 text-sm text-center animate-fade-in">{success}</div>}
              <div className="flex gap-2 mt-2">
                <button type="submit" className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-semibold text-base shadow-xl hover:shadow-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-rose-200">
                  {editing ? 'Güncelle' : 'Ekle'}
                </button>
                <button type="button" className="w-full py-3 rounded-2xl bg-white/70 border border-white/40 text-gray-800 font-semibold text-base shadow hover:shadow-md transition-all duration-200 focus:outline-none" onClick={() => { setFormOpen(false); setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 }); setError(''); setSuccess(''); }}>
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">Hizmetler yükleniyor...</span>
        </div>
      )}
      <ul className="grid grid-cols-1 gap-3">
        {services?.map((s: any) => (
          <li key={s.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow p-3 hover:shadow-md transition">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{s.name}</div>
                {s.description && <div className="text-xs text-gray-600 truncate">{s.description}</div>}
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] bg-white/70 border border-white/50 text-gray-900">₺{s.price}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] text-gray-600">Süre: {s.duration_minutes} dk</span>
              <div className="flex items-center gap-4 text-[13px]">
                <button className="text-gray-900 font-medium" onClick={() => handleEdit(s)}>Düzenle</button>
                <button className="text-rose-700 font-medium" onClick={() => handleDelete(s.id)}>Sil</button>
              </div>
            </div>
          </li>
        ))}
        {(!services || services.length === 0) && !isLoading && <li className="text-gray-400 text-center">Henüz hizmet eklenmedi.</li>}
      </ul>
      {/* Silme onay modalı */}
      {deleteId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative mx-auto my-8 max-w-sm w-[90%] bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl p-6 flex flex-col items-center gap-4">
            <span className="text-3xl mb-2">⚠️</span>
            <span className="text-lg font-semibold text-gray-700 text-center">Bu hizmeti silmek istediğinize emin misiniz?</span>
            <div className="flex gap-4 mt-4">
              <button className="px-6 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition" onClick={confirmDelete}>Evet, Sil</button>
              <button className="px-6 py-2 rounded-xl bg-white/70 border border-white/40 text-gray-800 font-semibold hover:bg-white transition" onClick={() => setDeleteId(null)}>Vazgeç</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 