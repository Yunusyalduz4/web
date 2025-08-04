"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';

export default function BusinessEmployeesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses, isLoading: loadingBusiness } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;
  const employeesQuery = trpc.business.getEmployees.useQuery(businessId ? { businessId } : skipToken);
  const { data: employees, isLoading } = employeesQuery;
  const createEmployee = trpc.business.createEmployee.useMutation();
  const updateEmployee = trpc.business.updateEmployee.useMutation();
  const deleteEmployee = trpc.business.deleteEmployee.useMutation();
  const getAvailability = trpc.business.getEmployeeAvailability.useQuery;
  const createAvailability = trpc.business.createEmployeeAvailability.useMutation();
  const updateAvailability = trpc.business.updateEmployeeAvailability.useMutation();
  const deleteAvailability = trpc.business.deleteEmployeeAvailability.useMutation();

  const [form, setForm] = useState({ id: '', name: '', email: '', phone: '' });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [availabilityForm, setAvailabilityForm] = useState({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' });
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [deleteAvailabilityId, setDeleteAvailabilityId] = useState<string | null>(null);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!businessId) {
      setError('İşletme bulunamadı! Lütfen sayfayı yenileyin veya tekrar giriş yapın.');
      return;
    }
    if (!form.name) {
      setError('Çalışan adı zorunlu.');
      return;
    }
    try {
      if (editing) {
        await updateEmployee.mutateAsync({ ...form, businessId });
        setSuccess('Çalışan güncellendi!');
      } else {
        await createEmployee.mutateAsync({ ...form, businessId });
        setSuccess('Çalışan eklendi!');
      }
      setForm({ id: '', name: '', email: '', phone: '' });
      setEditing(false);
      employeesQuery.refetch();
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      setError(err.message || 'Hata oluştu');
    }
  };

  const handleEdit = (e: any) => {
    setForm({ ...e });
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
      await deleteEmployee.mutateAsync({ id: deleteId, businessId });
      setDeleteId(null);
      setSuccess('Çalışan silindi!');
      employeesQuery.refetch();
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      setError(err.message || 'Silme işlemi başarısız');
    }
  };

  // Uygunluk işlemleri
  const handleAvailabilitySubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedEmployee) return;
    try {
      if (editingAvailability) {
        await updateAvailability.mutateAsync({ ...availabilityForm, employeeId: selectedEmployee.id });
        setSuccess('Uygunluk güncellendi!');
      } else {
        await createAvailability.mutateAsync({ ...availabilityForm, employeeId: selectedEmployee.id });
        setSuccess('Uygunluk eklendi!');
      }
      setAvailabilityForm({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' });
      setEditingAvailability(false);
      getAvailability({ employeeId: selectedEmployee.id }).refetch();
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      setError(err.message || 'Hata oluştu');
    }
  };

  const handleEditAvailability = (a: any) => {
    setAvailabilityForm({ ...a });
    setEditingAvailability(true);
    setError('');
    setSuccess('');
  };

  const handleDeleteAvailability = (id: string) => {
    setDeleteAvailabilityId(id);
  };

  const confirmDeleteAvailability = async () => {
    if (!deleteAvailabilityId || !selectedEmployee) return;
    try {
      await deleteAvailability.mutateAsync({ id: deleteAvailabilityId, employeeId: selectedEmployee.id });
      setDeleteAvailabilityId(null);
      setSuccess('Uygunluk silindi!');
      getAvailability({ employeeId: selectedEmployee.id }).refetch();
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      setError(err.message || 'Silme işlemi başarısız');
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-4 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-fade-in">
      <h1 className="text-2xl font-extrabold mb-6 text-center bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none">Çalışanlar</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-xl mb-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Adı
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </label>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            E-posta
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </label>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Telefon
            <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </label>
        </div>
        {error && <div className="text-red-600 text-sm text-center animate-shake">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center animate-fade-in">{success}</div>}
        <div className="flex gap-2 mt-2">
          <button type="submit" className="w-full py-3 rounded-full bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
            {editing ? 'Güncelle' : 'Ekle'}
          </button>
          {editing && (
            <button type="button" className="w-full py-3 rounded-full bg-gray-200 text-gray-700 font-semibold text-lg shadow hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400" onClick={() => { setEditing(false); setForm({ id: '', name: '', email: '', phone: '' }); setError(''); setSuccess(''); }}>
              İptal
            </button>
          )}
        </div>
      </form>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">⏳</span>
          <span className="text-lg">Çalışanlar yükleniyor...</span>
        </div>
      )}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {employees?.map((e: any) => (
          <li key={e.id} className="bg-white rounded-2xl shadow p-5 flex flex-col gap-2 border hover:shadow-xl transition-shadow animate-fade-in">
            <span className="font-bold text-lg text-pink-700">{e.name}</span>
            <span className="text-gray-500 text-sm">{e.email}</span>
            <span className="text-gray-400 text-xs">{e.phone}</span>
            <div className="flex gap-2 mt-2">
              <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold hover:bg-blue-200 transition" onClick={() => handleEdit(e)}>Düzenle</button>
              <button className="px-4 py-2 bg-red-100 text-red-700 rounded-full font-semibold hover:bg-red-200 transition" onClick={() => handleDelete(e.id)}>Sil</button>
              <button className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold hover:bg-green-200 transition" onClick={() => setSelectedEmployee(e)}>Uygunluk</button>
            </div>
          </li>
        ))}
        {(!employees || employees.length === 0) && !isLoading && <li className="text-gray-400 text-center col-span-2">Henüz çalışan eklenmedi.</li>}
      </ul>
      {/* Silme onay modalı */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full flex flex-col items-center gap-4">
            <span className="text-3xl mb-2">⚠️</span>
            <span className="text-lg font-semibold text-gray-700 text-center">Bu çalışanı silmek istediğinize emin misiniz?</span>
            <div className="flex gap-4 mt-4">
              <button className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition" onClick={confirmDelete}>Evet, Sil</button>
              <button className="px-6 py-2 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition" onClick={() => setDeleteId(null)}>Vazgeç</button>
            </div>
          </div>
        </div>
      )}
      {/* Uygunluk yönetimi modalı */}
      {selectedEmployee && (
        <EmployeeAvailabilityModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          getAvailability={getAvailability}
          availabilityForm={availabilityForm}
          setAvailabilityForm={setAvailabilityForm}
          editingAvailability={editingAvailability}
          setEditingAvailability={setEditingAvailability}
          handleAvailabilitySubmit={handleAvailabilitySubmit}
          handleEditAvailability={handleEditAvailability}
          handleDeleteAvailability={handleDeleteAvailability}
          deleteAvailabilityId={deleteAvailabilityId}
          confirmDeleteAvailability={confirmDeleteAvailability}
        />
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

function EmployeeAvailabilityModal({ employee, onClose, getAvailability, availabilityForm, setAvailabilityForm, editingAvailability, setEditingAvailability, handleAvailabilitySubmit, handleEditAvailability, handleDeleteAvailability, deleteAvailabilityId, confirmDeleteAvailability }: any) {
  const { data: availability, isLoading } = getAvailability({ employeeId: employee.id });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-2 text-pink-700">{employee.name} - Uygunluk</h2>
        <form onSubmit={handleAvailabilitySubmit} className="flex flex-col gap-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-gray-700 font-medium">
              Gün
              <select value={availabilityForm.day_of_week} onChange={e => setAvailabilityForm((f: any) => ({ ...f, day_of_week: Number(e.target.value) }))} className="border border-gray-300 rounded-lg px-3 py-2">
                <option value={1}>Pazartesi</option>
                <option value={2}>Salı</option>
                <option value={3}>Çarşamba</option>
                <option value={4}>Perşembe</option>
                <option value={5}>Cuma</option>
                <option value={6}>Cumartesi</option>
                <option value={0}>Pazar</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-gray-700 font-medium">
              Başlangıç
              <input type="time" value={availabilityForm.start_time} onChange={e => setAvailabilityForm((f: any) => ({ ...f, start_time: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-gray-700 font-medium">
              Bitiş
              <input type="time" value={availabilityForm.end_time} onChange={e => setAvailabilityForm((f: any) => ({ ...f, end_time: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2" />
            </label>
          </div>
          <div className="flex gap-2 mt-2">
            <button type="submit" className="w-full py-2 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition">{editingAvailability ? 'Güncelle' : 'Ekle'}</button>
            {editingAvailability && <button type="button" className="w-full py-2 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition" onClick={() => { setEditingAvailability(false); setAvailabilityForm({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' }); }}>İptal</button>}
          </div>
        </form>
        <ul className="space-y-2">
          {isLoading && <li className="text-gray-400">Yükleniyor...</li>}
          {availability?.map((a: any) => (
            <li key={a.id} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
              <span className="font-semibold text-blue-700">{['Pazar','Pzt','Salı','Çrş','Prş','Cuma','Cmt'][a.day_of_week]}</span>
              <span className="text-gray-600 text-sm">{a.start_time} - {a.end_time}</span>
              <button className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold hover:bg-green-200 transition" onClick={() => handleEditAvailability(a)}>Düzenle</button>
              <button className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold hover:bg-red-200 transition" onClick={() => handleDeleteAvailability(a.id)}>Sil</button>
            </li>
          ))}
          {(!availability || availability.length === 0) && !isLoading && <li className="text-gray-400 text-center">Henüz uygunluk eklenmedi.</li>}
        </ul>
        {/* Uygunluk silme onay modalı */}
        {deleteAvailabilityId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs w-full flex flex-col items-center gap-4">
              <span className="text-2xl mb-2">⚠️</span>
              <span className="text-base font-semibold text-gray-700 text-center">Bu uygunluğu silmek istediğinize emin misiniz?</span>
              <div className="flex gap-4 mt-4">
                <button className="px-4 py-1 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition" onClick={confirmDeleteAvailability}>Evet, Sil</button>
                <button className="px-4 py-1 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition" onClick={() => handleDeleteAvailability(null)}>Vazgeç</button>
              </div>
            </div>
          </div>
        )}
        <button className="mt-6 px-6 py-2 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition" onClick={onClose}>Kapat</button>
      </div>
    </div>
  );
} 