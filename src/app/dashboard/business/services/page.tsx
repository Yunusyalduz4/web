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
    <main className="max-w-2xl mx-auto p-4 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => router.push('/dashboard/business')}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 font-semibold"
        >
          <span>←</span>
          <span>Geri Dön</span>
        </button>
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none">Hizmetler</h1>
        <div className="w-24"></div> {/* Spacer for centering */}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-xl mb-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Adı
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </label>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Süre (dk)
            <input type="number" min={1} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} required className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </label>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Fiyat (₺)
            <input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} required className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition" />
          </label>
          <label className="flex flex-col gap-1 text-gray-700 font-medium md:col-span-2">
            Açıklama
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </label>
        </div>
        {error && <div className="text-red-600 text-sm text-center animate-shake">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center animate-fade-in">{success}</div>}
        <div className="flex gap-2 mt-2">
          <button type="submit" className="w-full py-3 rounded-full bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
            {editing ? 'Güncelle' : 'Ekle'}
          </button>
          {editing && (
            <button type="button" className="w-full py-3 rounded-full bg-gray-200 text-gray-700 font-semibold text-lg shadow hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400" onClick={() => { setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 }); setError(''); setSuccess(''); }}>
              İptal
            </button>
          )}
        </div>
      </form>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">Hizmetler yükleniyor...</span>
        </div>
      )}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services?.map((s: any) => (
          <li key={s.id} className="bg-white rounded-2xl shadow p-5 flex flex-col gap-2 border hover:shadow-xl transition-shadow animate-fade-in">
            <span className="font-bold text-lg text-blue-700">{s.name}</span>
            <span className="text-gray-500 text-sm">{s.description}</span>
            <span className="text-gray-400 text-xs">Süre: {s.duration_minutes} dk</span>
            <span className="text-pink-600 font-bold">₺{s.price}</span>
            <div className="flex gap-2 mt-2">
              <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold hover:bg-blue-200 transition" onClick={() => handleEdit(s)}>Düzenle</button>
              <button className="px-4 py-2 bg-red-100 text-red-700 rounded-full font-semibold hover:bg-red-200 transition" onClick={() => handleDelete(s.id)}>Sil</button>
            </div>
          </li>
        ))}
        {(!services || services.length === 0) && !isLoading && <li className="text-gray-400 text-center col-span-2">Henüz hizmet eklenmedi.</li>}
      </ul>
      {/* Silme onay modalı */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full flex flex-col items-center gap-4">
            <span className="text-3xl mb-2">⚠️</span>
            <span className="text-lg font-semibold text-gray-700 text-center">Bu hizmeti silmek istediğinize emin misiniz?</span>
            <div className="flex gap-4 mt-4">
              <button className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition" onClick={confirmDelete}>Evet, Sil</button>
              <button className="px-6 py-2 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition" onClick={() => setDeleteId(null)}>Vazgeç</button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </main>
  );
} 