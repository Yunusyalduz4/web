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
  
  // Hizmet yönetimi için yeni query'ler
  const { data: services } = trpc.business.getServices.useQuery(
    businessId ? { businessId } : skipToken
  );
  const assignService = trpc.business.assignServiceToEmployee.useMutation();
  const removeService = trpc.business.removeServiceFromEmployee.useMutation();

  const [form, setForm] = useState({ id: '', name: '', email: '', phone: '' });
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [availabilityForm, setAvailabilityForm] = useState({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' });
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [deleteAvailabilityId, setDeleteAvailabilityId] = useState<string | null>(null);
  
  // Hizmet yönetimi için yeni state'ler
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

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
    setAddOpen(true);
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

  // Hizmet yönetimi fonksiyonları
  const handleServiceModal = (employee: any) => {
    setSelectedEmployee(employee);
    setShowServiceModal(true);
    setSelectedServices([]);
  };

  const handleAssignService = async (serviceId: string) => {
    if (!selectedEmployee || !businessId) return;
    try {
      await assignService.mutateAsync({ 
        employeeId: selectedEmployee.id, 
        serviceId, 
        businessId 
      });
      setSuccess('Hizmet çalışana atandı!');
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      setError(err.message || 'Hizmet atama başarısız');
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    if (!selectedEmployee || !businessId) return;
    try {
      await removeService.mutateAsync({ 
        employeeId: selectedEmployee.id, 
        serviceId, 
        businessId 
      });
      setSuccess('Hizmet çalışandan kaldırıldı!');
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      setError(err.message || 'Hizmet kaldırma başarısız');
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
        <h1 className="text-lg font-semibold text-gray-900">Çalışanlar</h1>
        <button onClick={() => { setEditing(false); setForm({ id: '', name: '', email: '', phone: '' }); setError(''); setSuccess(''); setSelectedEmployee(null); setShowServiceModal(false); setAddOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow hover:shadow-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Yeni Çalışan
        </button>
      </div>
      {/* Create/Edit Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
          <div className="relative mx-auto my-8 max-w-lg w-[92%] bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{editing ? 'Çalışanı Güncelle' : 'Yeni Çalışan Ekle'}</h2>
            <form onSubmit={(e)=>{handleSubmit(e); if (!error) setAddOpen(false);}} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-gray-800 font-medium">
                  Adı
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="border border-white/40 bg-white/60 backdrop-blur-md rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-rose-100 transition" />
                </label>
                <label className="flex flex-col gap-1 text-gray-800 font-medium">
                  E-posta
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="border border-white/40 bg-white/60 backdrop-blur-md rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-rose-100 transition" />
                </label>
                <label className="flex flex-col gap-1 text-gray-800 font-medium md:col-span-2">
                  Telefon
                  <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="border border-white/40 bg-white/60 backdrop-blur-md rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-rose-100 transition" />
                </label>
              </div>
              {error && <div className="text-red-600 text-sm text-center animate-shake">{error}</div>}
              {success && <div className="text-green-600 text-sm text-center animate-fade-in">{success}</div>}
              <div className="flex gap-2 mt-2">
                <button type="submit" className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white font-semibold text-base shadow-xl hover:shadow-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-rose-200">
                  {editing ? 'Güncelle' : 'Ekle'}
                </button>
                <button type="button" className="w-full py-3 rounded-2xl bg-white/70 border border-white/40 text-gray-800 font-semibold text-base shadow hover:shadow-md transition-all duration-200 focus:outline-none" onClick={() => { setAddOpen(false); setEditing(false); setForm({ id: '', name: '', email: '', phone: '' }); setError(''); setSuccess(''); }}>
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
          <span className="text-lg">Çalışanlar yükleniyor...</span>
        </div>
      )}
      <ul className="grid grid-cols-1 gap-3">
        {employees?.map((e: any) => (
          <li key={e.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{e.name}</div>
                <div className="text-[11px] text-gray-600 truncate">{e.email || '—'}</div>
              </div>
              {e.phone && <span className="shrink-0 text-[11px] text-gray-700">{e.phone}</span>}
            </div>
            <div className="mt-1 flex items-center gap-4 text-[13px] flex-wrap">
              <button className="text-gray-900 font-medium" onClick={() => handleEdit(e)}>Düzenle</button>
              <button className="text-gray-900 font-medium" onClick={() => { setSelectedEmployee(e); setShowAvailabilityModal(true); }}>Uygunluk</button>
              <button className="text-gray-900 font-medium" onClick={() => handleServiceModal(e)}>Hizmetler</button>
              <button className="text-rose-700 font-medium" onClick={() => handleDelete(e.id)}>Sil</button>
            </div>
          </li>
        ))}
        {(!employees || employees.length === 0) && !isLoading && <li className="text-gray-400 text-center">Henüz çalışan eklenmedi.</li>}
      </ul>
      {/* Silme onay modalı */}
      {deleteId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative mx-auto my-8 max-w-sm w-[90%] bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl p-6 flex flex-col items-center gap-4">
            <span className="text-3xl mb-2">⚠️</span>
            <span className="text-lg font-semibold text-gray-700 text-center">Bu çalışanı silmek istediğinize emin misiniz?</span>
            <div className="flex gap-4 mt-4">
              <button className="px-6 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition" onClick={confirmDelete}>Evet, Sil</button>
              <button className="px-6 py-2 rounded-xl bg-white/70 border border-white/40 text-gray-800 font-semibold hover:bg-white transition" onClick={() => setDeleteId(null)}>Vazgeç</button>
            </div>
          </div>
        </div>
      )}
      {/* Uygunluk yönetimi modalı */}
      {showAvailabilityModal && selectedEmployee && (
        <EmployeeAvailabilityModal
          employee={selectedEmployee}
          onClose={() => { setSelectedEmployee(null); setShowAvailabilityModal(false); }}
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

      {/* Hizmet yönetimi modalı */}
      {showServiceModal && selectedEmployee && (
        <EmployeeServiceModal
          employee={selectedEmployee}
          services={services}
          onClose={() => { setShowServiceModal(false); setSelectedEmployee(null); }}
          onAssign={handleAssignService}
          onRemove={handleRemoveService}
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

function EmployeeServiceModal({ employee, services, onClose, onAssign, onRemove }: any) {
  const { data: employeeServices } = trpc.business.getEmployeeServices.useQuery(
    { employeeId: employee.id },
    { enabled: !!employee.id }
  );

  const assignedServiceIds = employeeServices?.map((s: any) => s.id) || [];
  const availableServices = services?.filter((s: any) => !assignedServiceIds.includes(s.id)) || [];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto my-8 max-w-lg w-[92%] bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{employee.name} • Hizmetler</h2>
          <button onClick={onClose} className="px-2 py-1 rounded-md bg-rose-600 text-white text-xs">Kapat</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Atanmış</h3>
            {employeeServices && employeeServices.length > 0 ? (
              <div className="space-y-2">
                {employeeServices!.map((service: any) => (
                  <div key={service.id} className="flex items-center justify-between p-2 bg-white/80 border border-white/40 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-600">₺{service.price} • {service.duration_minutes} dk</p>
                    </div>
                    <button onClick={() => onRemove(service.id)} className="px-2 py-1 bg-rose-600 text-white rounded text-xs">Kaldır</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Henüz hizmet atanmamış</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Mevcut</h3>
            {availableServices.length > 0 ? (
              <div className="space-y-2">
                {availableServices.map((service: any) => (
                  <div key={service.id} className="flex items-center justify-between p-2 bg-white/80 border border-white/40 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-600">₺{service.price} • {service.duration_minutes} dk</p>
                    </div>
                    <button onClick={() => onAssign(service.id)} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">Ata</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Tüm hizmetler atanmış</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeAvailabilityModal({ employee, onClose, getAvailability, availabilityForm, setAvailabilityForm, editingAvailability, setEditingAvailability, handleAvailabilitySubmit, handleEditAvailability, handleDeleteAvailability, deleteAvailabilityId, confirmDeleteAvailability }: any) {
  const { data: availability, isLoading } = getAvailability({ employeeId: employee.id });
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto my-8 max-w-md w-[92%] bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">{employee.name} • Uygunluk</h2>
          <button onClick={onClose} className="px-2 py-1 rounded-md bg-rose-600 text-white text-xs">Kapat</button>
        </div>
        <form onSubmit={handleAvailabilitySubmit} className="flex flex-col gap-2 mb-2">
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
            <button type="submit" className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition">{editingAvailability ? 'Güncelle' : 'Ekle'}</button>
            {editingAvailability && <button type="button" className="w-full py-2 rounded-lg bg-white/80 border border-white/50 text-gray-800 text-sm font-semibold hover:bg-white transition" onClick={() => { setEditingAvailability(false); setAvailabilityForm({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' }); }}>İptal</button>}
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
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" />
            <div className="relative mx-auto my-8 max-w-xs w-[92%] bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-4 flex flex-col items-center gap-3">
              <span className="text-2xl mb-2">⚠️</span>
              <span className="text-sm font-semibold text-gray-700 text-center">Bu uygunluğu silmek istediğinize emin misiniz?</span>
              <div className="flex gap-2 mt-2">
                <button className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition" onClick={confirmDeleteAvailability}>Evet, Sil</button>
                <button className="px-3 py-1.5 rounded-lg bg-white/80 border border-white/50 text-gray-800 text-xs font-semibold hover:bg-white transition" onClick={() => handleDeleteAvailability(null)}>Vazgeç</button>
              </div>
            </div>
          </div>
        )}
       
      </div>
    </div>
  );
} 