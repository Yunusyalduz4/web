"use client";
import { trpc } from '../../../../../../utils/trpcClient';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { skipToken } from '@tanstack/react-query';

function getDayOfWeek(dateStr: string) {
  return new Date(dateStr).getDay();
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

  const [serviceId, setServiceId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: availability, isLoading: loadingAvailability } = trpc.business.getEmployeeAvailability.useQuery(
    { employeeId },
    { enabled: !!employeeId }
  );

  const selectedService = services?.find((s: any) => s.id === serviceId);
  const durationMinutes = selectedService?.duration_minutes || 0;

  const availableTimes = useMemo(() => {
    if (!availability || !date) return [];
    const dayOfWeek = getDayOfWeek(date);
    const daySlots = availability.filter((a: any) => a.day_of_week === dayOfWeek);
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
  }, [availability, date]);

  // Her slot için çakışma kontrolü yerine toplu kontrol
  const canCheckConflicts = !!employeeId && !!date && !!serviceId && typeof durationMinutes === 'number' && durationMinutes > 0;
  const { data: slotConflicts, isLoading: loadingConflicts } = trpc.appointment.getEmployeeConflicts.useQuery(
    canCheckConflicts
      ? {
          employeeId,
          date,
          durationMinutes: Number(durationMinutes),
        }
      : skipToken,
    { enabled: canCheckConflicts }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!userId || !serviceId || !employeeId || !date || !time) {
      setError('Tüm alanları doldurun.');
      return;
    }
    if (slotConflicts?.[time]) {
      setError('Seçilen saat dolu, lütfen başka bir saat seçin.');
      return;
    }
    const appointmentDatetime = new Date(`${date}T${time}:00`).toISOString();
    try {
      await bookMutation.mutateAsync({ userId, businessId, serviceId, employeeId, appointmentDatetime });
      setSuccess('Randevu başarıyla oluşturuldu!');
      setTimeout(() => router.push(`/dashboard/user`), 1500);
    } catch (err: any) {
      setError(err.message || 'Randevu oluşturulamadı');
    }
  };

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 flex flex-col items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-white p-8 rounded-2xl shadow-xl w-full animate-fade-in">
        <h1 className="text-2xl font-extrabold mb-2 text-center bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none">Randevu Al</h1>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Hizmet
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} required className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
              <option value="">Seçiniz</option>
              {loadingServices && <option>Yükleniyor...</option>}
              {services?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} (₺{s.price})</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Çalışan
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} required className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition">
              <option value="">Seçiniz</option>
              {loadingEmployees && <option>Yükleniyor...</option>}
              {employees?.map((e: any) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Tarih
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </label>
          {employeeId && date && (
            <label className="flex flex-col gap-1 text-gray-700 font-medium">
              Saat
              <select value={time} onChange={e => setTime(e.target.value)} required className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
                <option value="">Seçiniz</option>
                {loadingAvailability && <option>Yükleniyor...</option>}
                {availableTimes.map((t, idx) => (
                  <option
                    key={t}
                    value={t}
                    disabled={slotConflicts?.[t] || loadingConflicts}
                  >
                    {t}
                    {slotConflicts?.[t] ? ' (Dolu)' : ''}
                  </option>
                ))}
              </select>
              {availableTimes.length === 0 && <span className="text-xs text-gray-500">Bu çalışan için seçilen gün uygun saat yok.</span>}
              {time && slotConflicts?.[time] && <span className="text-xs text-red-600">Seçilen saat dolu, lütfen başka bir saat seçin.</span>}
            </label>
          )}
        </div>
        {error && <div className="text-red-600 text-sm text-center animate-shake">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center animate-fade-in">{success}</div>}
        <button
          type="submit"
          className="w-full py-3 rounded-full bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Randevu Al
        </button>
        <button
          type="button"
          className="w-full py-3 rounded-full bg-gray-200 text-gray-700 font-semibold text-lg shadow hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
          onClick={() => router.back()}
        >
          Geri Dön
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