"use client";
import { trpc } from '@utils/trpcClient';
import { useRouter, useParams } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

export default function BusinessDetailPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params?.id as string;

  const { data: business, isLoading } = trpc.business.getBusinessById.useQuery({ businessId }, { enabled: !!businessId });
  const { data: services } = trpc.business.getServices.useQuery({ businessId }, { enabled: !!businessId });
  const { data: employees } = trpc.business.getEmployees.useQuery({ businessId }, { enabled: !!businessId });

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-pulse">
        <span className="text-5xl mb-2">⏳</span>
        <span className="text-lg text-gray-400">İşletme bilgileri yükleniyor...</span>
      </main>
    );
  }
  if (!business) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
        <span className="text-5xl mb-2">😕</span>
        <span className="text-lg text-gray-500">İşletme bulunamadı.</span>
        <button className="mt-4 px-4 py-2 bg-gray-200 rounded-full" onClick={() => router.back()}>Geri Dön</button>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-4 pb-24 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-fade-in">
      {/* Image Slider */}
      <div className="mb-6 rounded-2xl overflow-hidden shadow-xl">
        <Swiper spaceBetween={10} slidesPerView={1} className="w-full h-64 md:h-80">
          {(business.images && business.images.length > 0
            ? business.images
            : [
                '/public/globe.svg',
                '/public/window.svg',
                '/public/file.svg',
              ]).map((img: string, idx: number) => (
            <SwiperSlide key={idx}>
              <img
                src={img}
                alt={`İşletme görseli ${idx + 1}`}
                className="object-cover w-full h-64 md:h-80 select-none"
                draggable={false}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      {/* Business Info */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 flex flex-col gap-3 animate-fade-in">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none mb-2">{business.name}</h1>
        <span className="text-gray-600 text-base mb-1">{business.description}</span>
        <div className="flex flex-wrap gap-4 text-gray-500 text-sm">
          <span>📍 {business.address}</span>
          <span>📞 {business.phone}</span>
          <span>✉️ {business.email}</span>
        </div>
      </div>
      {/* Services Table */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-3 text-blue-700">Hizmetler</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-blue-50 rounded-xl shadow">
            <thead>
              <tr className="text-blue-800 text-left">
                <th className="py-3 px-4">Hizmet</th>
                <th className="py-3 px-4">Açıklama</th>
                <th className="py-3 px-4">Süre</th>
                <th className="py-3 px-4">Fiyat</th>
              </tr>
            </thead>
            <tbody>
              {services?.map((s: any) => (
                <tr key={s.id} className="border-b last:border-none hover:bg-blue-100 transition">
                  <td className="py-3 px-4 font-semibold">{s.name}</td>
                  <td className="py-3 px-4">{s.description}</td>
                  <td className="py-3 px-4">{s.duration_minutes} dk</td>
                  <td className="py-3 px-4 text-pink-600 font-bold">₺{s.price}</td>
                </tr>
              ))}
              {(!services || services.length === 0) && (
                <tr><td colSpan={4} className="text-gray-400 text-center py-4">Hizmet bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Employees Table */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-3 text-pink-700">Çalışanlar</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-pink-50 rounded-xl shadow">
            <thead>
              <tr className="text-pink-800 text-left">
                <th className="py-3 px-4">İsim</th>
                <th className="py-3 px-4">E-posta</th>
                <th className="py-3 px-4">Telefon</th>
              </tr>
            </thead>
            <tbody>
              {employees?.map((e: any) => (
                <tr key={e.id} className="border-b last:border-none hover:bg-pink-100 transition">
                  <td className="py-3 px-4 font-semibold">{e.name}</td>
                  <td className="py-3 px-4">{e.email}</td>
                  <td className="py-3 px-4">{e.phone}</td>
                </tr>
              ))}
              {(!employees || employees.length === 0) && (
                <tr><td colSpan={3} className="text-gray-400 text-center py-4">Çalışan bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <button
        className="fixed bottom-20 left-1/2 -translate-x-1/2 px-8 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition z-40"
        onClick={() => router.push(`/dashboard/user/businesses/${businessId}/book`)}
      >
        Randevu Al
      </button>
      <button className="mt-4 px-4 py-2 bg-gray-200 rounded-full" onClick={() => router.back()}>
        Geri Dön
      </button>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </main>
  );
} 