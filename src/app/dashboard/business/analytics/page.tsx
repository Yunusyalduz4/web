"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState, useEffect } from 'react';

export default function BusinessAnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  // TODO: Burada gerçek backend analytics verisiyle entegre et

  return (
    <main className="max-w-3xl mx-auto p-4 min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 animate-fade-in">
      <h1 className="text-2xl font-extrabold mb-6 text-center bg-gradient-to-r from-blue-600 to-pink-500 bg-clip-text text-transparent select-none">İstatistikler</h1>
      {/* loading && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
          <span className="text-5xl mb-2">📊</span>
          <span className="text-lg">İstatistikler yükleniyor...</span>
        </div>
      ) */}
      {/* {!loading && stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard label="Toplam Randevu" value={stats.totalAppointments} color="from-blue-400 to-blue-600" icon="📅" />
            <StatCard label="Toplam Gelir" value={`₺${stats.totalRevenue}`} color="from-pink-400 to-pink-600" icon="💸" />
            <StatCard label="En Popüler Hizmet" value={`${stats.topService.name} (${stats.topService.count})`} color="from-green-400 to-green-600" icon="💇‍♂️" />
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center animate-fade-in">
            <h2 className="text-lg font-bold mb-4 text-blue-700">Haftalık Randevu Grafiği</h2>
            <div className="w-full h-40 flex items-end gap-2">
              {stats.weekData.map((v: number, i: number) => (
                <div key={i} className="flex flex-col items-center justify-end h-full">
                  <div
                    className="w-8 rounded-t bg-gradient-to-b from-blue-400 to-blue-600 flex items-end justify-center"
                    style={{ height: `${v * 6}px`, minHeight: '12px' }}
                  >
                    <span className="text-xs text-white font-bold select-none">{v}</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 select-none">{['Pzt','Sal','Çrş','Prş','Cum','Cmt','Paz'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )} */}
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

function StatCard({ label, value, color, icon }: { label: string; value: any; color: string; icon: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 p-6 rounded-2xl shadow bg-gradient-to-br ${color} text-white font-bold text-lg animate-fade-in`}>
      <span className="text-3xl select-none">{icon}</span>
      <span className="text-2xl">{value}</span>
      <span className="text-sm font-normal text-white/80">{label}</span>
    </div>
  );
} 