"use client";
import { trpc } from '../../../../utils/trpcClient';
import { useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useRouter } from "next/navigation";

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

export default function UserBusinessesPage() {
  const { data: businesses, isLoading } = trpc.business.getBusinesses.useQuery();
  const [selected, setSelected] = useState<any>(null);
  const router = useRouter();

  if (isLoading) return <div>Yükleniyor...</div>;

  const center = businesses && businesses.length > 0
    ? { lat: businesses[0].latitude, lng: businesses[0].longitude }
    : { lat: 41.015137, lng: 28.97953 }; // İstanbul default

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">İşletmeler</h1>
      <div className="mb-6">
        <Wrapper apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} render={renderMapStatus}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={12}
          >
            {businesses?.map((b: any) => (
              <Marker
                key={b.id}
                position={{ lat: b.latitude, lng: b.longitude }}
                onClick={() => setSelected(b)}
              />
            ))}
          </GoogleMap>
        </Wrapper>
      </div>
      <ul className="space-y-2">
        {businesses?.map((b: any) => (
          <li key={b.id} className="border rounded p-3 flex flex-col gap-1">
            <span className="font-semibold text-lg">{b.name}</span>
            <span>{b.address}</span>
            <span>{b.phone}</span>
            <span>{b.email}</span>
            <button
              className="mt-2 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => router.push(`/dashboard/user/businesses/${b.id}`)}
            >
              Detay
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">{selected.name}</h2>
            <div className="mb-2">{selected.address}</div>
            <div className="mb-2">Telefon: {selected.phone}</div>
            <div className="mb-2">E-posta: {selected.email}</div>
            <button className="mt-4 px-4 py-2 bg-gray-200 rounded" onClick={() => setSelected(null)}>Kapat</button>
          </div>
        </div>
      )}
    </main>
  );
}

function renderMapStatus(status: Status) {
  if (status === Status.LOADING) return <div>Harita yükleniyor...</div>;
  if (status === Status.FAILURE) return <div>Harita yüklenemedi.</div>;
  return <></>;
} 