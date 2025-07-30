"use client";
import { trpc } from '../../../../../utils/trpcClient';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

export default function BusinessDetailPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params?.id as string;

  const { data: business, isLoading } = trpc.business.getBusinessById.useQuery({ businessId }, { enabled: !!businessId });
  const { data: services } = trpc.business.getServices.useQuery({ businessId }, { enabled: !!businessId });
  const { data: employees } = trpc.business.getEmployees.useQuery({ businessId }, { enabled: !!businessId });

  if (isLoading) return <div>Yükleniyor...</div>;
  if (!business) return <div>İşletme bulunamadı.</div>;

  return (
    <main className="max-w-2xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-2">{business.name}</h1>
      <div className="mb-2">{business.address}</div>
      <div className="mb-2">Telefon: {business.phone}</div>
      <div className="mb-2">E-posta: {business.email}</div>
      <div className="mb-4">Açıklama: {business.description}</div>
      <h2 className="text-xl font-semibold mt-6 mb-2">Hizmetler</h2>
      <ul className="space-y-2 mb-6">
        {services?.length === 0 && <li>Hizmet bulunamadı.</li>}
        {services?.map((s: any) => (
          <li key={s.id} className="border rounded p-3 flex flex-col gap-1">
            <span className="font-semibold">{s.name}</span>
            <span>{s.description}</span>
            <span>Süre: {s.duration_minutes} dk</span>
            <span>Fiyat: ₺{s.price}</span>
          </li>
        ))}
      </ul>
      <h2 className="text-xl font-semibold mb-2">Çalışanlar</h2>
      <ul className="space-y-2 mb-6">
        {employees?.length === 0 && <li>Çalışan bulunamadı.</li>}
        {employees?.map((e: any) => (
          <li key={e.id} className="border rounded p-3 flex flex-col gap-1">
            <span className="font-semibold">{e.name}</span>
            <span>{e.email}</span>
            <span>{e.phone}</span>
          </li>
        ))}
      </ul>
      <button
        className="fixed bottom-20 left-1/2 -translate-x-1/2 px-8 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition z-40"
        onClick={() => router.push(`/dashboard/user/businesses/${businessId}/book`)}
      >
        Randevu Al
      </button>
      <button className="mt-4 px-4 py-2 bg-gray-200 rounded" onClick={() => router.back()}>
        Geri Dön
      </button>
    </main>
  );
} 