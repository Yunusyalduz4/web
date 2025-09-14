"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { skipToken } from '@tanstack/react-query';
import { useRealTimeBusiness } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';
import { useWebSocket } from '../../../../contexts/WebSocketContext';

export default function BusinessEmployeesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses, isLoading: loadingBusiness } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  const businessId = business?.id;

  // Employee ise bu sayfaya erişim yok
  if (session?.user?.role === 'employee') {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-5xl mb-2">🔒</span>
        <span className="text-lg text-gray-500">Bu sayfaya erişim yetkiniz yok.</span>
      </main>
    );
  }
  
  const employeesQuery = trpc.business.getEmployees.useQuery(businessId ? { businessId } : skipToken);
  const { data: employees, isLoading } = employeesQuery;
  const createEmployee = trpc.business.createEmployee.useMutation();
  const updateEmployee = trpc.business.updateEmployee.useMutation();
  const deleteEmployee = trpc.business.deleteEmployee.useMutation();
  const createEmployeeAccount = trpc.auth.createEmployeeAccount.useMutation();
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

  const [form, setForm] = useState({ 
    id: '', 
    name: '', 
    email: '', 
    phone: '',
    // Hesap oluşturma için yeni alanlar
    createAccount: false,
    password: '',
    confirmPassword: '',
    permissions: {
      can_manage_appointments: true,
      can_view_analytics: true,
      can_manage_services: false,
      can_manage_employees: false,
      can_manage_business_settings: false
    }
  });
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
  const [showAddForm, setShowAddForm] = useState(false);

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
    
    // Email validation - eğer email varsa geçerli olmalı
    if (form.email && form.email.trim() !== '' && !form.email.includes('@')) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }

    // Hesap oluşturma validasyonu
    if (form.createAccount) {
      if (!form.email || !form.email.includes('@')) {
        setError('E-posta adresi geçerli olmalı.');
        return;
      }
      if (!form.password || form.password.length < 6) {
        setError('Şifre en az 6 karakter olmalı.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Şifreler eşleşmiyor.');
        return;
      }
    }
    
    try {
      // Boş string'leri null'a çevir
      const cleanForm = {
        ...form,
        email: form.email?.trim() === '' ? undefined : form.email?.trim(),
        phone: form.phone?.trim() === '' ? undefined : form.phone?.trim()
      };
      
      if (editing) {
        await updateEmployee.mutateAsync({ 
          ...cleanForm, 
          id: form.id,
          businessId: businessId! 
        });
        setSuccess('Çalışan güncellendi!');
      } else {
        // Önce çalışanı oluştur
        const employeeResult = await createEmployee.mutateAsync({ ...cleanForm, businessId: businessId! });
        
        // Eğer hesap oluşturma seçildiyse, hesap oluştur
        if (form.createAccount && employeeResult.id) {
          await createEmployeeAccount.mutateAsync({
            businessId: businessId!,
            employeeId: employeeResult.id,
            email: form.email,
            password: form.password,
            permissions: form.permissions
          });
          setSuccess('Çalışan ve hesabı başarıyla oluşturuldu!');
        } else {
          setSuccess('Çalışan eklendi!');
        }
      }
      
      // Formu sıfırla
      setForm({ 
        id: '', 
        name: '', 
        email: '', 
        phone: '',
        createAccount: false,
        password: '',
        confirmPassword: '',
        permissions: {
          can_manage_appointments: true,
          can_view_analytics: true,
          can_manage_services: false,
          can_manage_employees: false,
          can_manage_business_settings: false
        }
      });
      setEditing(false);
      employeesQuery.refetch();
      setTimeout(() => setSuccess(''), 1200);
    } catch (err: any) {
      
      // Daha detaylı hata mesajları
      if (err.data?.code === 'BAD_REQUEST') {
        setError(err.data.message || 'Geçersiz veri gönderildi. Lütfen tüm alanları kontrol edin.');
      } else if (err.data?.code === 'UNAUTHORIZED') {
        setError('Bu işlemi yapma yetkiniz yok.');
      } else if (err.data?.code === 'FORBIDDEN') {
        setError('Bu işletme için çalışan ekleyemezsiniz.');
      } else if (err.message?.includes('email')) {
        setError('Geçerli bir e-posta adresi girin.');
      } else if (err.message?.includes('name')) {
        setError('Çalışan adı en az 2 karakter olmalıdır.');
      } else {
        setError(err.message || 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  };

  const handleEdit = (e: any) => {
    setForm({ 
      id: e.id, // Employee ID'yi olduğu gibi kullan
      name: e.name || '',
      email: e.email || '',
      phone: e.phone || '',
      createAccount: false, // Edit modunda hesap oluşturma kapalı
      password: '',
      confirmPassword: '',
      permissions: e.permissions || {
        can_manage_appointments: true,
        can_view_analytics: true,
        can_manage_services: false,
        can_manage_employees: false,
        can_manage_business_settings: false
      }
    });
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
      await deleteEmployee.mutateAsync({ id: deleteId, businessId: businessId! });
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
    // Database field'larını frontend field'larına map et
    // end_time'ı HH:MM formatına çevir (HH:MM:SS'den)
    const endTime = a.end_time.includes(':') && a.end_time.split(':').length === 3 
      ? a.end_time.substring(0, 5)  // "22:00:00" -> "22:00"
      : a.end_time;
    
    // start_time'ı da kontrol et
    const startTime = a.start_time.includes(':') && a.start_time.split(':').length === 3 
      ? a.start_time.substring(0, 5)  // "09:00:00" -> "09:00"
      : a.start_time;
      
    setAvailabilityForm({ 
      id: a.id,
      day_of_week: a.day_of_week,
      start_time: startTime,
      end_time: endTime
    });
    setEditingAvailability(true);
    setError('');
    setSuccess('');
  };

  const handleDeleteAvailability = (id: string) => {
    setDeleteAvailabilityId(id);
  };

  const confirmDeleteAvailability = async () => {
    if (!deleteAvailabilityId) return;
    try {
      await deleteAvailability.mutateAsync({ id: deleteAvailabilityId, employeeId: employee.id });
      setDeleteAvailabilityId(null);
      setSuccess('Uygunluk silindi!');
      refetch();
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
      // Success mesajı modal içinde gösterilecek
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
      // Success mesajı modal içinde gösterilecek
    } catch (err: any) {
      setError(err.message || 'Hizmet kaldırma başarısız');
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
              <div className="text-[10px] sm:text-xs text-gray-600">Çalışan Yönetimi</div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
            <button 
              onClick={() => { 
                setEditing(false); 
                setForm({ 
                  id: '', 
                  name: '', 
                  email: '', 
                  phone: '',
                  createAccount: false,
                  password: '',
                  confirmPassword: '',
                  permissions: {
                    can_manage_appointments: true,
                    can_view_analytics: true,
                    can_manage_services: false,
                    can_manage_employees: false,
                    can_manage_business_settings: false
                  }
                }); 
                setError(''); 
                setSuccess(''); 
                setSelectedEmployee(null); 
                setShowServiceModal(false); 
                setAddOpen(true); 
              }} 
              className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl bg-white text-gray-900 text-[10px] sm:text-xs font-semibold shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px] border-2 border-transparent"
              style={{
                background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box',
                border: '2px solid transparent'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span className="hidden xs:inline">Yeni Çalışan</span>
            </button>
          </div>
        </div>
        
        {/* Çalışanlar Sayısı - Mobile Optimized */}
        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-white/50 text-xs sm:text-sm font-semibold text-gray-900">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold">Çalışanlar</div>
              <div className="text-[10px] sm:text-xs text-gray-600">{employees?.length || 0} çalışan</div>
            </div>
          </div>
        </div>
      </div>
      {/* Create/Edit Modal - Mobile Optimized */}
      {addOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
          <div className="relative mx-auto my-6 max-w-md w-[94%] bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl shadow-2xl p-3 sm:p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <div className="text-sm sm:text-lg font-bold text-gray-900">{editing ? 'Çalışanı Güncelle' : 'Yeni Çalışan Ekle'}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600">Çalışan bilgilerini doldurun</div>
                </div>
              </div>
              <button 
                onClick={() => setAddOpen(false)} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation min-h-[44px]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            
            <form onSubmit={(e)=>{handleSubmit(e); if (!error) setAddOpen(false);}} className="space-y-3 sm:space-y-4">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Çalışan Adı</label>
                  <input 
                    type="text" 
                    value={form.name} 
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                    required 
                    className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors touch-manipulation min-h-[44px]" 
                    placeholder="Çalışan adını girin"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">E-posta</label>
                  <input 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                    className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors touch-manipulation min-h-[44px]" 
                    placeholder="E-posta adresi (opsiyonel)"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">Telefon</label>
                  <input 
                    type="text" 
                    value={form.phone} 
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
                    className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors touch-manipulation min-h-[44px]" 
                    placeholder="Telefon numarası (opsiyonel)"
                    style={{ fontSize: '16px' }}
                  />
                </div>

                {/* Hesap Oluşturma Bölümü - Mobile Optimized */}
                {!editing && (
                  <>
                    <div className="border-t border-gray-200 pt-3 sm:pt-4">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <input
                          type="checkbox"
                          id="createAccount"
                          checked={form.createAccount}
                          onChange={e => setForm(f => ({ 
                            ...f, 
                            createAccount: e.target.checked,
                            permissions: f.permissions || {
                              can_manage_appointments: true,
                              can_view_analytics: true,
                              can_manage_services: false,
                              can_manage_employees: false,
                              can_manage_business_settings: false
                            }
                          }))}
                          className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 touch-manipulation"
                        />
                        <label htmlFor="createAccount" className="text-xs sm:text-sm font-semibold text-gray-900">
                          Çalışan için hesap oluştur
                        </label>
                      </div>
                    </div>

                    {form.createAccount && (
                      <div className="space-y-3 sm:space-y-4 bg-purple-50 rounded-xl p-3 sm:p-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-blue-600">ℹ️</span>
                            <span className="text-xs sm:text-sm font-medium text-blue-800">Hesap Bilgileri</span>
                          </div>
                          <p className="text-[10px] sm:text-xs text-blue-700">
                            Çalışan hesabı için yukarıdaki e-posta adresi kullanılacak. Aşağıdan şifre belirleyin.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">
                              Şifre
                            </label>
                            <input 
                              type="password" 
                              value={form.password || ''} 
                              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                              required={form.createAccount}
                              className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors touch-manipulation min-h-[44px]" 
                              placeholder="En az 6 karakter"
                              style={{ fontSize: '16px' }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">
                              Şifre Tekrar
                            </label>
                            <input 
                              type="password" 
                              value={form.confirmPassword || ''} 
                              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} 
                              required={form.createAccount}
                              className="w-full px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-colors touch-manipulation min-h-[44px]" 
                              placeholder="Şifreyi tekrar girin"
                              style={{ fontSize: '16px' }}
                            />
                          </div>
                        </div>

                        {/* İzinler - Mobile Optimized */}
                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                            Yetkiler
                          </label>
                          <div className="grid grid-cols-1 gap-2 sm:gap-3">
                            {[
                              { key: 'can_manage_appointments', label: 'Randevu Yönetimi', icon: '📅' },
                              { key: 'can_view_analytics', label: 'İstatistik Görüntüleme', icon: '📊' },
                              { key: 'can_manage_services', label: 'Hizmet Yönetimi', icon: '🔧' },
                              { key: 'can_manage_employees', label: 'Çalışan Yönetimi', icon: '👥' },
                              { key: 'can_manage_business_settings', label: 'İşletme Ayarları', icon: '⚙️' }
                            ].map((permission) => (
                              <div key={permission.key} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={permission.key}
                                  checked={form.permissions?.[permission.key as keyof typeof form.permissions] || false}
                                  onChange={e => setForm(f => ({
                                    ...f,
                                    permissions: {
                                      ...(f.permissions || {}),
                                      [permission.key]: e.target.checked
                                    }
                                  }))}
                                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 touch-manipulation"
                                />
                                <label htmlFor={permission.key} className="text-xs sm:text-sm text-gray-700 flex items-center gap-2">
                                  <span>{permission.icon}</span>
                                  {permission.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

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
                  className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>{editing ? 'Güncelle' : 'Ekle'}</span>
                </button>
                <button 
                  type="button" 
                  className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-white/90 active:bg-white transition-colors touch-manipulation min-h-[44px]" 
                  onClick={() => { 
                    setAddOpen(false); 
                    setEditing(false); 
                    setForm({ 
                      id: '', 
                      name: '', 
                      email: '', 
                      phone: '',
                      createAccount: false,
                      password: '',
                      confirmPassword: '',
                      permissions: {
                        can_manage_appointments: true,
                        can_view_analytics: true,
                        can_manage_services: false,
                        can_manage_employees: false,
                        can_manage_business_settings: false
                      }
                    }); 
                    setError(''); 
                    setSuccess(''); 
                  }}
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="text-lg font-medium">Çalışanlar yükleniyor...</span>
        </div>
      )}
      
      <div className="space-y-3">
        {employees?.map((e: any) => (
          <div key={e.id} className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm p-3 sm:p-4 hover:shadow-md active:shadow-lg transition-all border-2 border-transparent"
               style={{
                 background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box',
                 border: '2px solid transparent'
               }}>
            {/* Header - Mobile Optimized */}
            <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                  {e.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">{e.name}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600 truncate mt-1">{e.email || 'E-posta yok'}</div>
                  {/* Hesap Durumu - Mobile Optimized */}
                  <div className="flex items-center gap-1 sm:gap-2 mt-1">
                    {e.user_id ? (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500"></div>
                        Hesap Var
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400"></div>
                        Hesap Yok
                      </span>
                    )}
                    {e.is_active === false && (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-red-100 text-red-800">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500"></div>
                        Deaktif
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {e.phone && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] sm:text-xs text-gray-600">Telefon</div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-900">{e.phone}</div>
                </div>
              )}
            </div>

            {/* Detaylar - Mobile Optimized */}
            <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-600 mb-3 sm:mb-4">
              <div className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>{e.email || 'E-posta yok'}</span>
              </div>
              {e.phone && (
                <div className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>{e.phone}</span>
                </div>
              )}
            </div>

            {/* Aksiyon Butonları - Mobile Optimized */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleEdit(e)}
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl bg-blue-500 text-white text-[10px] sm:text-xs font-semibold hover:bg-blue-600 active:bg-blue-700 shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>Düzenle</span>
              </button>
              <button 
                onClick={() => { setSelectedEmployee(e); setShowAvailabilityModal(true); }}
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl bg-green-500 text-white text-[10px] sm:text-xs font-semibold hover:bg-green-600 active:bg-green-700 shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <span>Uygunluk</span>
              </button>
              <button 
                onClick={() => handleServiceModal(e)}
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl bg-indigo-500 text-white text-[10px] sm:text-xs font-semibold hover:bg-indigo-600 active:bg-indigo-700 shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>Hizmetler</span>
              </button>
              <button 
                onClick={() => handleDelete(e.id)}
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl bg-red-500 text-white text-[10px] sm:text-xs font-semibold hover:bg-red-600 active:bg-red-700 shadow-md hover:shadow-lg active:shadow-xl transition-all touch-manipulation min-h-[44px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>Sil</span>
              </button>
            </div>
          </div>
        ))}
        
        {(!employees || employees.length === 0) && !isLoading && (
          <div className="text-center py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="text-sm sm:text-lg font-medium text-gray-500 mb-2">Henüz çalışan eklenmedi</div>
            <div className="text-xs sm:text-sm text-gray-400">Yeni çalışan eklemek için yukarıdaki butona tıklayın</div>
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
                  <div className="text-sm sm:text-lg font-bold text-gray-900">Çalışanı Sil</div>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Bu çalışanı silmek istediğinize emin misiniz?</div>
              <div className="text-[10px] sm:text-xs text-gray-600">Silinen çalışan geri getirilemez ve mevcut randevular etkilenebilir.</div>
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
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
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
  const { data: employeeServices, refetch: refetchEmployeeServices } = trpc.business.getEmployeeServices.useQuery(
    { employeeId: employee.id },
    { enabled: !!employee.id }
  );
  
  const [successMessage, setSuccessMessage] = useState('');

  const assignedServiceIds = employeeServices?.map((s: any) => s.id) || [];
  const availableServices = services?.filter((s: any) => !assignedServiceIds.includes(s.id)) || [];

  // Hizmet atama fonksiyonu - modal içinde
  const handleAssignService = async (serviceId: string) => {
    try {
      await onAssign(serviceId);
      // Başarılı olduktan sonra verileri yenile
      await refetchEmployeeServices();
      setSuccessMessage('Hizmet başarıyla atandı!');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      // Hata zaten onAssign'da handle ediliyor
    }
  };

  // Hizmet kaldırma fonksiyonu - modal içinde
  const handleRemoveService = async (serviceId: string) => {
    try {
      await onRemove(serviceId);
      // Başarılı olduktan sonra verileri yenile
      await refetchEmployeeServices();
      setSuccessMessage('Hizmet başarıyla kaldırıldı!');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      // Hata zaten onRemove'da handle ediliyor
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto my-6 max-w-md w-[94%] bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{employee.name}</div>
              <div className="text-xs text-gray-600">Hizmet Yönetimi</div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        
        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-800 text-xs rounded-xl mb-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Atanmış Hizmetler */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Atanmış Hizmetler</h3>
            </div>
            {employeeServices && employeeServices.length > 0 ? (
              <div className="space-y-2">
                {employeeServices!.map((service: any) => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-white/80 border border-white/50 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{service.name}</p>
                      <p className="text-xs text-gray-600">₺{service.price} • {service.duration_minutes} dk</p>
                    </div>
                    <button 
                      onClick={() => handleRemoveService(service.id)} 
                      className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors"
                    >
                      Kaldır
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="text-xs text-gray-500">Henüz hizmet atanmamış</p>
              </div>
            )}
          </div>
          
          {/* Mevcut Hizmetler */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Mevcut Hizmetler</h3>
            </div>
            {availableServices.length > 0 ? (
              <div className="space-y-2">
                {availableServices.map((service: any) => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-white/80 border border-white/50 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{service.name}</p>
                      <p className="text-xs text-gray-600">₺{service.price} • {service.duration_minutes} dk</p>
                    </div>
                    <button 
                      onClick={() => handleAssignService(service.id)} 
                      className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-semibold hover:bg-indigo-600 transition-colors"
                    >
                      Ata
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="text-xs text-gray-500">Tüm hizmetler atanmış</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeAvailabilityModal({ employee, onClose, getAvailability, availabilityForm, setAvailabilityForm, editingAvailability, setEditingAvailability, handleAvailabilitySubmit, handleEditAvailability, handleDeleteAvailability, deleteAvailabilityId, confirmDeleteAvailability, showAddForm, setShowAddForm }: any) {
  const { data: availability, isLoading, refetch } = getAvailability({ employeeId: employee.id });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutation'ları modal içinde tanımla
  const createAvailability = trpc.business.createEmployeeAvailability.useMutation();
  const updateAvailability = trpc.business.updateEmployeeAvailability.useMutation();
  const deleteAvailability = trpc.business.deleteEmployeeAvailability.useMutation();

  // WebSocket entegrasyonu
  const { isConnected, emit } = useWebSocket();

  // Gün isimleri
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  
  // Mevcut günleri kontrol et (çakışma önleme)
  const existingDays = availability?.map((a: any) => a.day_of_week) || [];
  const isDayAlreadyExists = existingDays.includes(availabilityForm.day_of_week);
  const isEditingCurrentDay = editingAvailability && existingDays.includes(availabilityForm.day_of_week);
  
  // Güncelleme sırasında sadece diğer günleri kontrol et (kendi kaydı hariç)
  const otherDays = editingAvailability 
    ? availability?.filter((a: any) => a.id !== availabilityForm.id).map((a: any) => a.day_of_week) || []
    : existingDays;
  const isDayConflict = otherDays.includes(availabilityForm.day_of_week);

  // Form validation
  const isFormValid = availabilityForm.start_time && availabilityForm.end_time && 
    availabilityForm.start_time < availabilityForm.end_time &&
    !isDayConflict;

  // Gelişmiş form submit
  const handleAdvancedSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      // Çakışma kontrolü
      if (isDayConflict) {
        setError(`${dayNames[availabilityForm.day_of_week]} günü için zaten başka bir müsaitlik tanımlanmış.`);
        setIsSubmitting(false);
        return;
      }

      if (editingAvailability) {
        await updateAvailability.mutateAsync({ 
          id: availabilityForm.id,
          employeeId: employee.id,
          day_of_week: availabilityForm.day_of_week,
          start_time: availabilityForm.start_time,
          end_time: availabilityForm.end_time
        });
        setSuccess('Uygunluk güncellendi!');
      } else {
        await createAvailability.mutateAsync({ 
          employeeId: employee.id,
          day_of_week: availabilityForm.day_of_week,
          start_time: availabilityForm.start_time,
          end_time: availabilityForm.end_time
        });
        setSuccess('Uygunluk eklendi!');
      }
      
      // WebSocket ile güncelleme bildir
      if (isConnected) {
        emit('employee:availability_updated', {
          employeeId: employee.id,
          employeeName: employee.name,
          action: editingAvailability ? 'updated' : 'created',
          dayOfWeek: availabilityForm.day_of_week,
          dayName: dayNames[availabilityForm.day_of_week],
          startTime: availabilityForm.start_time,
          endTime: availabilityForm.end_time
        });
      }

      setSuccess(editingAvailability ? 'Müsaitlik güncellendi!' : 'Müsaitlik eklendi!');
      refetch();
      
      // Form'u temizle ve kapat
      setAvailabilityForm({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' });
      setEditingAvailability(false);
      setShowAddForm(false);
      
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gün seçimi değiştiğinde form'u temizle
  const handleDayChange = (dayOfWeek: number) => {
    setAvailabilityForm((f: any) => ({ ...f, day_of_week: dayOfWeek }));
    setError('');
    setSuccess('');
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto my-6 max-w-md w-[94%] bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl shadow-2xl p-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{employee.name}</div>
              <div className="text-xs text-gray-600">Müsaitlik Yönetimi</div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mb-4">
          <button 
            onClick={() => {
              setShowAddForm(true);
              setEditingAvailability(false);
              setAvailabilityForm({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' });
              setError('');
              setSuccess('');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <span>Yeni Müsaitlik Ekle</span>
          </button>
        </div>

        {/* Form Section - Sadece form açıkken göster */}
        {(showAddForm || editingAvailability) && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 mb-4 border border-green-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              {editingAvailability ? 'Müsaitliği Güncelle' : 'Yeni Müsaitlik Ekle'}
            </h3>
            
            <form onSubmit={handleAdvancedSubmit} className="space-y-3">
              <div className="space-y-3">
                {/* Gün Seçimi */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Gün</label>
                  <select 
                    value={availabilityForm.day_of_week} 
                    onChange={(e) => handleDayChange(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border-2 text-sm transition-all ${
                      isDayConflict 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-green-200 bg-white focus:border-green-400'
                    }`}
                  >
                    {dayNames.map((day, index) => {
                      const isOtherDayConflict = editingAvailability 
                        ? otherDays.includes(index)
                        : existingDays.includes(index);
                      return (
                        <option key={index} value={index} disabled={isOtherDayConflict}>
                          {day} {isOtherDayConflict ? '(Mevcut)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {isDayConflict && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Bu gün için zaten müsaitlik var
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Başlangıç Saati */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Başlangıç</label>
                    <input 
                      type="time" 
                      value={availabilityForm.start_time} 
                      onChange={(e) => setAvailabilityForm((f: any) => ({ ...f, start_time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border-2 border-green-200 bg-white focus:border-green-400 transition-all text-sm"
                    />
                  </div>

                  {/* Bitiş Saati */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Bitiş</label>
                    <input 
                      type="time" 
                      value={availabilityForm.end_time} 
                      onChange={(e) => setAvailabilityForm((f: any) => ({ ...f, end_time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border-2 border-green-200 bg-white focus:border-green-400 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="font-medium">{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-green-600 text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="font-medium">{success}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={!isFormValid || isSubmitting}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <span>{editingAvailability ? 'Güncelle' : 'Ekle'}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </>
                  )}
                </button>
                
                <button 
                  type="button" 
                  onClick={() => { 
                    setShowAddForm(false);
                    setEditingAvailability(false); 
                    setAvailabilityForm({ id: '', day_of_week: 1, start_time: '09:00', end_time: '18:00' }); 
                    setError('');
                    setSuccess('');
                  }}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-all"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Müsaitlik Listesi */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            Mevcut Müsaitlikler
          </h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600 text-sm">Yükleniyor...</span>
            </div>
          ) : availability && availability.length > 0 ? (
            <div className="space-y-2">
              {availability
                .sort((a: any, b: any) => a.day_of_week - b.day_of_week)
                .map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-white/80 border border-white/50 rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xs">
                      {dayNames[a.day_of_week].charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{dayNames[a.day_of_week]}</h4>
                      <p className="text-xs text-gray-600">{a.start_time} - {a.end_time}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleEditAvailability(a)}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                    >
                      Düzenle
                    </button>
                    <button 
                      onClick={() => handleDeleteAvailability(a.id)}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <p className="text-sm font-medium">Henüz müsaitlik eklenmemiş</p>
              <p className="text-xs">Yukarıdaki formu kullanarak müsaitlik ekleyebilirsiniz</p>
            </div>
          )}
        </div>

        {/* Silme Onay Modalı */}
        {deleteAvailabilityId && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative mx-auto my-6 max-w-sm w-[94%] bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl shadow-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">Müsaitliği Sil</div>
                    <div className="text-xs text-gray-600">Bu işlem geri alınamaz</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteAvailability(null)} 
                  className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-2">Bu müsaitliği silmek istediğinize emin misiniz?</div>
                <div className="text-xs text-gray-600">Silinen müsaitlik geri getirilemez ve mevcut randevular etkilenebilir.</div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={async () => {
                    if (!deleteAvailabilityId) return;
                    try {
                      await deleteAvailability.mutateAsync({ id: deleteAvailabilityId, employeeId: employee.id });
                      setDeleteAvailabilityId(null);
                      setSuccess('Uygunluk silindi!');
                      refetch();
                      setTimeout(() => setSuccess(''), 1200);
                    } catch (err: any) {
                      setError(err.message || 'Silme işlemi başarısız');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Evet, Sil</span>
                </button>
                <button 
                  onClick={() => handleDeleteAvailability(null)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/80 border border-white/50 text-gray-700 text-sm font-semibold hover:bg-white/90 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Vazgeç</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 