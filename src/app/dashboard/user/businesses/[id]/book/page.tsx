"use client";
import { trpc } from '../../../../../../utils/trpcClient';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { skipToken } from '@tanstack/react-query';

function getDayOfWeek(dateStr: string) {
  return new Date(dateStr).getDay();
}

interface ServiceSelection {
  serviceId: string;
  employeeId: string;
  service: any;
  employee: any;
}

export default function BookAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params?.id as string;
  const { data: session } = useSession();
  const userId = session?.user.id;

  const { data: services, isLoading: loadingServices } = trpc.business.getServices.useQuery({ businessId }, { enabled: !!businessId });
  const { data: employees, isLoading: loadingEmployees } = trpc.business.getEmployees.useQuery({ businessId }, { enabled: !!businessId });
  const bookMutation = trpc.appointment.book.useMutation();

  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Seçili hizmetlerin toplam süresini hesapla
  const totalDuration = useMemo(() => {
    return selectedServices.reduce((total, selection) => {
      return total + (selection.service?.duration_minutes || 0);
    }, 0);
  }, [selectedServices]);

  // Seçili hizmetlerin toplam fiyatını hesapla
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((total, selection) => {
      return total + (selection.service?.price || 0);
    }, 0);
  }, [selectedServices]);

  // Hizmet ekleme fonksiyonu
  const addService = () => {
    if (selectedServices.length >= 5) {
      setError('En fazla 5 hizmet seçebilirsiniz.');
      return;
    }
    setSelectedServices([...selectedServices, {
      serviceId: '',
      employeeId: '',
      service: null,
      employee: null
    }]);
    setError('');
  };

  // Hizmet kaldırma fonksiyonu
  const removeService = (index: number) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  // Hizmet seçimi güncelleme
  const updateServiceSelection = (index: number, serviceId: string) => {
    const service = services?.find((s: any) => s.id === serviceId);
    const newSelections = [...selectedServices];
    newSelections[index] = {
      ...newSelections[index],
      serviceId,
      service,
      employeeId: '', // Hizmet değişince çalışanı sıfırla
      employee: null
    };
    setSelectedServices(newSelections);
  };

  // Çalışan seçimi güncelleme
  const updateEmployeeSelection = (index: number, employeeId: string) => {
    const employee = employees?.find((e: any) => e.id === employeeId);
    const newSelections = [...selectedServices];
    newSelections[index] = {
      ...newSelections[index],
      employeeId,
      employee
    };
    setSelectedServices(newSelections);
  };

  // Seçili çalışanların uygunluk saatlerini al
  const allEmployeeIds = selectedServices.map(s => s.employeeId).filter(Boolean);
  const { data: allAvailability } = trpc.business.getEmployeeAvailability.useQuery(
    { employeeId: allEmployeeIds[0] || '' },
    { enabled: !!allEmployeeIds[0] }
  );

  const availableTimes = useMemo(() => {
    if (!allAvailability || !date || allEmployeeIds.length === 0) return [];
    const dayOfWeek = getDayOfWeek(date);
    const daySlots = allAvailability.filter((a: any) => a.day_of_week === dayOfWeek);
    const slots: string[] = [];
    daySlots.forEach((slot: any) => {
      let [h, m] = slot.start_time.split(":").map(Number);
      const [eh, em] = slot.end_time.split(":").map(Number);
      while (h < eh || (h === eh && m < em)) {
        slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
        m += 15;
        if (m >= 60) { h++; m = 0; }
      }
    });
    return slots;
  }, [allAvailability, date, allEmployeeIds]);

  // Hizmete göre çalışanları getir
  const { data: employeesByService } = trpc.business.getEmployeesByService.useQuery(
    { serviceId: selectedServices.find(s => s.serviceId)?.serviceId || '' },
    { enabled: !!selectedServices.find(s => s.serviceId)?.serviceId }
  );

  const getEmployeesForService = (serviceId: string) => {
    if (!serviceId) return [];
    // Eğer bu hizmet için özel çalışan listesi varsa onu kullan, yoksa tüm çalışanları göster
    return employeesByService || employees || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validasyon
    if (!userId || selectedServices.length === 0 || !date || !time) {
      setError('Tüm alanları doldurun.');
      return;
    }

    // Tüm hizmetler için çalışan seçilmiş mi kontrol et
    const incompleteSelections = selectedServices.some(s => !s.serviceId || !s.employeeId);
    if (incompleteSelections) {
      setError('Tüm hizmetler için çalışan seçin.');
      return;
    }

    const appointmentDatetime = new Date(`${date}T${time}:00`).toISOString();
    
    try {
      await bookMutation.mutateAsync({
        userId,
        businessId,
        appointmentDatetime,
        services: selectedServices.map(s => ({
          serviceId: s.serviceId,
          employeeId: s.employeeId
        }))
      });
      setSuccess('Randevu başarıyla oluşturuldu!');
      setTimeout(() => router.push(`/dashboard/user`), 1500);
    } catch (err: any) {
      setError(err.message || 'Randevu oluşturulamadı');
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-4 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-white p-8 rounded-2xl shadow-xl w-full animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none">
            Randevu Al
          </h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ← Geri
          </button>
        </div>

        {/* Hizmet Seçimi */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Hizmetler</h2>
            <button
              type="button"
              onClick={addService}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold hover:bg-blue-200 transition"
            >
              + Hizmet Ekle
            </button>
          </div>

          {selectedServices.map((selection, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-700">Hizmet {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeService(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-gray-700 font-medium">
                  Hizmet
                  <select
                    value={selection.serviceId}
                    onChange={(e) => updateServiceSelection(index, e.target.value)}
                    required
                    className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  >
                    <option value="">Seçiniz</option>
                    {services?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (₺{s.price} • {s.duration_minutes} dk)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-gray-700 font-medium">
                  Çalışan
                  <select
                    value={selection.employeeId}
                    onChange={(e) => updateEmployeeSelection(index, e.target.value)}
                    required
                    disabled={!selection.serviceId}
                    className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition disabled:bg-gray-100"
                  >
                    <option value="">Seçiniz</option>
                    {selection.serviceId && getEmployeesForService(selection.serviceId).map((e: any) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {selection.service && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>{selection.service.name}</strong> • ₺{selection.service.price || 0} • {selection.service.duration_minutes || 0} dk
                    {selection.employee && ` • ${selection.employee.name}`}
                  </p>
                </div>
              )}
            </div>
          ))}

          {selectedServices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Henüz hizmet seçilmedi. Yukarıdaki butona tıklayarak hizmet ekleyin.
            </div>
          )}
        </div>

        {/* Tarih ve Saat Seçimi */}
        {selectedServices.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Tarih ve Saat</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-gray-700 font-medium">
                Tarih
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                />
              </label>

              {date && (
                <label className="flex flex-col gap-1 text-gray-700 font-medium">
                  Saat
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  >
                    <option value="">Seçiniz</option>
                    {availableTimes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {availableTimes.length === 0 && date && (
              <span className="text-xs text-gray-500">Seçilen gün için uygun saat yok.</span>
            )}
          </div>
        )}

        {/* Özet */}
        {selectedServices.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-pink-50 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-gray-800 mb-2">Randevu Özeti</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Toplam Hizmet:</strong> {selectedServices.length}</p>
              <p><strong>Toplam Süre:</strong> {totalDuration} dakika</p>
              <p><strong>Toplam Fiyat:</strong> ₺{totalPrice.toFixed(2)}</p>
              {date && time && (
                <p><strong>Tarih:</strong> {new Date(`${date}T${time}`).toLocaleString('tr-TR')}</p>
              )}
            </div>
          </div>
        )}

        {error && <div className="text-red-600 text-sm text-center animate-shake">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center animate-fade-in">{success}</div>}

        <button
          type="submit"
          disabled={selectedServices.length === 0}
          className="w-full py-3 rounded-full bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Randevu Al
        </button>
      </form>

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