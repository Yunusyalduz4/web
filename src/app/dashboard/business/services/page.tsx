"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function BusinessServicesPage() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  // Kullanıcıya ait işletmeyi bul
  const { data: businesses } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;

  const servicesQuery = trpc.business.getServices.useQuery({ businessId }, { enabled: !!businessId });
  const createService = trpc.business.createService.useMutation();
  const updateService = trpc.business.updateService.useMutation();
  const deleteService = trpc.business.deleteService.useMutation();

  const [form, setForm] = useState({ id: '', name: '', description: '', duration_minutes: 30, price: 0 });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: any) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    if (!businessId) {
      setError('İşletme bulunamadı! Lütfen sayfayı yenileyin veya tekrar giriş yapın.');
      return;
    }
    console.log('businessId:', businessId);
    if (!form.name || !form.duration_minutes || !form.price) {
      setError('Tüm zorunlu alanları doldurun.');
      return;
    }
    try {
      if (editing) {
        await updateService.mutateAsync({ ...form, businessId, price: Number(form.price), duration_minutes: Number(form.duration_minutes) });
      } else {
        await createService.mutateAsync({ ...form, businessId, price: Number(form.price), duration_minutes: Number(form.duration_minutes) });
      }
      setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 });
      setEditing(false);
      servicesQuery.refetch();
    } catch (err: any) {
      setError(err.message || 'Hata oluştu');
    }
  };

  const handleEdit = (s: any) => {
    setForm(s);
    setEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await deleteService.mutateAsync({ id, businessId });
    servicesQuery.refetch();
  };

  if (!businessId) return <div>İşletmeniz yok veya yükleniyor...</div>;

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Hizmetlerim</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 bg-white p-4 rounded shadow mb-6">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Hizmet adı" className="border rounded px-3 py-2" required />
        <input name="description" value={form.description} onChange={handleChange} placeholder="Açıklama" className="border rounded px-3 py-2" />
        <input name="duration_minutes" type="number" value={form.duration_minutes} onChange={handleChange} placeholder="Süre (dk)" className="border rounded px-3 py-2" required min={1} />
        <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="Fiyat (₺)" className="border rounded px-3 py-2" required min={0} />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">{editing ? 'Güncelle' : 'Ekle'}</button>
        {editing && <button type="button" className="text-sm text-gray-600 mt-1" onClick={() => { setEditing(false); setForm({ id: '', name: '', description: '', duration_minutes: 30, price: 0 }); }}>Vazgeç</button>}
      </form>
      <ul className="space-y-2">
        {servicesQuery.data?.map((s: any) => (
          <li key={s.id} className="border rounded p-3 flex flex-col gap-1">
            <span className="font-semibold">{s.name}</span>
            <span>{s.description}</span>
            <span>Süre: {s.duration_minutes} dk</span>
            <span>Fiyat: ₺{s.price}</span>
            <div className="flex gap-2 mt-2">
              <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={() => handleEdit(s)}>Düzenle</button>
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => handleDelete(s.id)}>Sil</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
} 