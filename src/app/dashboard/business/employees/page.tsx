"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

const days = ['Pazar', 'Pzt', 'Salı', 'Çarş', 'Perş', 'Cuma', 'Ctesi'];

export default function BusinessEmployeesPage() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  // Kullanıcıya ait işletmeyi bul
  const { data: businesses } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;

  const employeesQuery = trpc.business.getEmployees.useQuery({ businessId }, { enabled: !!businessId });
  const createEmployee = trpc.business.createEmployee.useMutation();
  const updateEmployee = trpc.business.updateEmployee.useMutation();
  const deleteEmployee = trpc.business.deleteEmployee.useMutation();

  const [form, setForm] = useState({ id: '', name: '', email: '', phone: '' });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Uygunluk işlemleri
  const availabilityQuery = trpc.business.getEmployeeAvailability.useQuery(
    { employeeId: selectedEmployee?.id },
    { enabled: !!selectedEmployee?.id }
  );
  const createAvailability = trpc.business.createEmployeeAvailability.useMutation();
  const updateAvailability = trpc.business.updateEmployeeAvailability.useMutation();
  const deleteAvailability = trpc.business.deleteEmployeeAvailability.useMutation();
  const [avForm, setAvForm] = useState({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' });
  const [avEditing, setAvEditing] = useState(false);

  const handleChange = (e: any) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };
  const handleAvChange = (e: any) => {
    setAvForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    if (!form.name) {
      setError('İsim zorunlu.');
      return;
    }
    try {
      if (editing) {
        await updateEmployee.mutateAsync({ ...form, businessId });
      } else {
        await createEmployee.mutateAsync({ ...form, businessId });
      }
      setForm({ id: '', name: '', email: '', phone: '' });
      setEditing(false);
      employeesQuery.refetch();
    } catch (err: any) {
      setError(err.message || 'Hata oluştu');
    }
  };

  const handleEdit = (e: any) => {
    setForm(e);
    setEditing(true);
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await deleteEmployee.mutateAsync({ id, businessId });
    employeesQuery.refetch();
  };

  // Uygunluk işlemleri
  const handleAvSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (avEditing) {
      await updateAvailability.mutateAsync({ ...avForm, employeeId: selectedEmployee.id });
    } else {
      await createAvailability.mutateAsync({ ...avForm, employeeId: selectedEmployee.id });
    }
    setAvForm({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' });
    setAvEditing(false);
    availabilityQuery.refetch();
  };
  const handleAvEdit = (a: any) => {
    setAvForm(a);
    setAvEditing(true);
  };
  const handleAvDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await deleteAvailability.mutateAsync({ id, employeeId: selectedEmployee.id });
    availabilityQuery.refetch();
  };

  if (!businessId) return <div>İşletmeniz yok veya yükleniyor...</div>;

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Çalışanlarım</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 bg-white p-4 rounded shadow mb-6">
        <input name="name" value={form.name} onChange={handleChange} placeholder="İsim" className="border rounded px-3 py-2" required />
        <input name="email" value={form.email} onChange={handleChange} placeholder="E-posta" className="border rounded px-3 py-2" />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Telefon" className="border rounded px-3 py-2" />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">{editing ? 'Güncelle' : 'Ekle'}</button>
        {editing && <button type="button" className="text-sm text-gray-600 mt-1" onClick={() => { setEditing(false); setForm({ id: '', name: '', email: '', phone: '' }); }}>Vazgeç</button>}
      </form>
      <ul className="space-y-2">
        {employeesQuery.data?.map((e: any) => (
          <li key={e.id} className="border rounded p-3 flex flex-col gap-1">
            <span className="font-semibold">{e.name}</span>
            <span>{e.email}</span>
            <span>{e.phone}</span>
            <div className="flex gap-2 mt-2">
              <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={() => handleEdit(e)}>Düzenle</button>
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => handleDelete(e.id)}>Sil</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => setSelectedEmployee(e)}>Uygunluk Saatleri</button>
            </div>
            {selectedEmployee?.id === e.id && (
              <div className="mt-4 bg-gray-50 p-3 rounded">
                <h3 className="font-semibold mb-2">Uygunluk Saatleri</h3>
                <form onSubmit={handleAvSubmit} className="flex flex-col gap-2 mb-2">
                  <select name="day_of_week" value={avForm.day_of_week} onChange={handleAvChange} className="border rounded px-3 py-2">
                    {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                  <input name="start_time" type="time" value={avForm.start_time} onChange={handleAvChange} className="border rounded px-3 py-2" required />
                  <input name="end_time" type="time" value={avForm.end_time} onChange={handleAvChange} className="border rounded px-3 py-2" required />
                  <button type="submit" className="bg-blue-600 text-white py-1 rounded hover:bg-blue-700">{avEditing ? 'Güncelle' : 'Ekle'}</button>
                  {avEditing && <button type="button" className="text-sm text-gray-600 mt-1" onClick={() => { setAvEditing(false); setAvForm({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' }); }}>Vazgeç</button>}
                </form>
                <ul className="space-y-1">
                  {availabilityQuery.data?.map((a: any) => (
                    <li key={a.id} className="flex items-center gap-2">
                      <span>{days[a.day_of_week]} {a.start_time} - {a.end_time}</span>
                      <button className="text-xs px-2 py-1 bg-yellow-500 text-white rounded" onClick={() => handleAvEdit(a)}>Düzenle</button>
                      <button className="text-xs px-2 py-1 bg-red-600 text-white rounded" onClick={() => handleAvDelete(a.id)}>Sil</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
} 