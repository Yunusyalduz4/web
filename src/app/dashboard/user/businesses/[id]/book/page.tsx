"use client";
import { trpc } from '../../../../../../utils/trpcClient';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { skipToken } from '@tanstack/react-query';

function getDayOfWeek(dateStr: string) {
  // Pazartesi: 1, Pazar: 0
  return new Date(dateStr).getDay();
}

export default function BookAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params?.id as string;
  const { data: session } = useSession();
  const userId = session?.user.id;

  const { data: services } = trpc.business.getServices.useQuery({ businessId }, { enabled: !!businessId });
  const { data: employees } = trpc.business.getEmployees.useQuery({ businessId }, { enabled: !!businessId });
  const bookMutation = trpc.appointment.book.useMutation();

  const [serviceId, setServiceId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Çalışan uygunluk saatleri
  const { data: availability } = trpc.business.getEmployeeAvailability.useQuery(
    { employeeId },
    { enabled: !!employeeId }
  );

  // Seçilen hizmetin süresi
  const selectedService = services?.find((s: any) => s.id === serviceId);
  const durationMinutes = selectedService?.duration_minutes || 0;

  // Seçilen güne göre uygun saat aralıklarını hesapla
  const availableTimes = useMemo(() => {
    if (!availability || !date) return [];
    const dayOfWeek = getDayOfWeek(date);
    const daySlots = availability.filter((a: any) => a.day_of_week === dayOfWeek);
    // Her aralık için 15 dakikalık slotlar üret
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

  // Tüm slotlar için çakışma kontrolü (her slot için ayrı useQuery)
  const slotConflicts = availableTimes.map((t) => {
    const canCheck = !!employeeId && !!date && !!serviceId && typeof durationMinutes === 'number' && durationMinutes > 0;
    return trpc.appointment.checkEmployeeConflict.useQuery(
      canCheck
        ? {
            employeeId,
            appointmentDatetime: new Date(`${date}T${t}:00`).toISOString(),
            durationMinutes: Number(durationMinutes),
          }
        : skipToken,
      { enabled: canCheck }
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!userId || !serviceId || !employeeId || !date || !time) {
      setError('Tüm alanları doldurun.');
      return;
    }
    if (slotConflicts[availableTimes.indexOf(time)]?.data?.conflict) {
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
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Randevu Al</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white p-6 rounded shadow">
        <label className="flex flex-col gap-1">
          Hizmet
          <select value={serviceId} onChange={e => setServiceId(e.target.value)} required className="border rounded px-3 py-2">
            <option value="">Seçiniz</option>
            {services?.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} (₺{s.price})</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Çalışan
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} required className="border rounded px-3 py-2">
            <option value="">Seçiniz</option>
            {employees?.map((e: any) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Tarih
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="border rounded px-3 py-2" />
        </label>
        {employeeId && date && (
          <label className="flex flex-col gap-1">
            Saat
            <select value={time} onChange={e => setTime(e.target.value)} required className="border rounded px-3 py-2">
              <option value="">Seçiniz</option>
              {availableTimes.map((t, idx) => (
                <option
                  key={t}
                  value={t}
                  disabled={
                    slotConflicts[idx]?.data?.conflict || slotConflicts[idx]?.isLoading
                  }
                >
                  {t}
                  {slotConflicts[idx]?.data?.conflict ? ' (Dolu)' : ''}
                </option>
              ))}
            </select>
            {availableTimes.length === 0 && <span className="text-xs text-gray-500">Bu çalışan için seçilen gün uygun saat yok.</span>}
            {time && slotConflicts[availableTimes.indexOf(time)]?.data?.conflict && <span className="text-xs text-red-600">Seçilen saat dolu, lütfen başka bir saat seçin.</span>}
          </label>
        )}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Randevu Al</button>
      </form>
    </main>
  );
} 