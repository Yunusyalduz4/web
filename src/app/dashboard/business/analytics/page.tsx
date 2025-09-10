"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState, useEffect } from 'react';
import { useRealTimeBusiness } from '../../../../hooks/useRealTimeUpdates';
import { useWebSocketStatus } from '../../../../hooks/useWebSocketEvents';

export default function BusinessAnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses } = trpc.business.getBusinesses.useQuery();
  
  // Business'ı role'e göre bul
  const business = businesses?.find((b: any) => {
    if (session?.user?.role === 'business') {
      return b.owner_user_id === session?.user?.id;
    } else if (session?.user?.role === 'employee') {
      return b.id === session?.user?.businessId;
    }
    return false;
  });
  
  // Employee ise sadece kendi istatistiklerini göster
  const isEmployee = session?.user?.role === 'employee';
  const employeeId = isEmployee ? session?.user?.employeeId : null;

  const { data: analytics, isLoading } = trpc.analytics.getBusinessAnalytics.useQuery(
    undefined,
    { enabled: !!business?.id }
  );

  const { data: serviceAnalytics } = trpc.analytics.getServiceAnalytics.useQuery(
    undefined,
    { enabled: !!business?.id }
  );

  const { data: employeeAnalytics } = trpc.analytics.getEmployeeAnalytics.useQuery(
    undefined,
    { enabled: !!business?.id }
  );

  if (!business) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <span className="text-5xl mb-2">🏢</span>
        <span className="text-lg text-gray-500">İşletme bulunamadı.</span>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 animate-pulse">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">📊</span>
        </div>
        <span className="text-lg text-gray-600 font-medium">İstatistikler yükleniyor...</span>
      </main>
    );
  }

  const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const weekDaysShort = ['Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cmt'];

  return (
    <main className="relative max-w-md mx-auto p-3 sm:p-4 pb-20 sm:pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white/80 backdrop-blur-md border-b border-white/60 mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => router.push('/dashboard/business')}
              className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/70 border border-white/50 text-gray-900 shadow-sm hover:bg-white/90 transition-colors min-h-[44px]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div>
              <div className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
              <div className="text-[10px] sm:text-xs text-gray-600">İşletme Analitikleri</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
            <div className="text-[10px] sm:text-xs text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-1 rounded-lg">
              {business.name}
            </div>
          </div>
        </div>
      </div>

      {analytics && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <StatCard 
              label="Toplam Randevu" 
              value={analytics.overview.totalAppointments} 
              color="from-blue-500 to-blue-600" 
              icon="📅"
              subtitle={`${analytics.overview.completionRate}% tamamlanma`}
              trend="+12%"
            />
            <StatCard 
              label="Toplam Gelir" 
              value={`₺${analytics.revenue.totalRevenue.toFixed(2)}`} 
              color="from-green-500 to-green-600" 
              icon="💸"
              subtitle={`₺${analytics.revenue.completedRevenue.toFixed(2)} gerçekleşen`}
              trend="+8%"
            />
            <StatCard 
              label="Ortalama Randevu" 
              value={`₺${analytics.revenue.avgAppointmentValue.toFixed(2)}`} 
              color="from-purple-500 to-purple-600" 
              icon="📈"
              subtitle={`Min: ₺${analytics.revenue.minAppointmentValue} - Max: ₺${analytics.revenue.maxAppointmentValue}`}
              trend="+5%"
            />
            <StatCard 
              label="Son 30 Gün" 
              value={analytics.recentActivity.appointments} 
              color="from-orange-500 to-orange-600" 
              icon="🔥"
              subtitle={`₺${analytics.recentActivity.revenue.toFixed(2)} gelir`}
              trend="+15%"
            />
          </div>

          {/* Status Breakdown */}
          <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm mb-3 sm:mb-4">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-r from-indigo-500 to-indigo-600 text-white flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <h2 className="text-[10px] sm:text-xs font-semibold text-gray-900">Randevu Durumu Dağılımı</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <StatusCard 
                label="Tamamlanan" 
                count={analytics.overview.completedAppointments} 
                total={analytics.overview.totalAppointments}
                color="from-green-500 to-green-600" 
                icon="✅"
              />
              <StatusCard 
                label="Bekleyen" 
                count={analytics.overview.pendingAppointments} 
                total={analytics.overview.totalAppointments}
                color="from-yellow-500 to-yellow-600" 
                icon="⏳"
              />
              <StatusCard 
                label="Onaylanan" 
                count={analytics.overview.confirmedAppointments} 
                total={analytics.overview.totalAppointments}
                color="from-blue-500 to-blue-600" 
                icon="📋"
              />
              <StatusCard 
                label="İptal Edilen" 
                count={analytics.overview.cancelledAppointments} 
                total={analytics.overview.totalAppointments}
                color="from-red-500 to-red-600" 
                icon="❌"
              />
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm mb-3 sm:mb-4">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>
              </div>
              <h2 className="text-[10px] sm:text-xs font-semibold text-gray-900">Bu Ay Haftalık Randevu Grafiği</h2>
            </div>
            <div className="w-full h-32 sm:h-48 flex items-end justify-center gap-1 sm:gap-2">
              {weekDaysShort.map((day, index) => {
                const dayData = analytics.weeklyAppointments.find(w => w.dayOfWeek === index) || { appointmentCount: 0 };
                const maxCount = Math.max(...analytics.weeklyAppointments.map(w => w.appointmentCount), 1);
                const height = (dayData.appointmentCount / maxCount) * (window.innerWidth < 640 ? 100 : 150);
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2">{day}</div>
                    <div className="relative">
                      <div
                        className="w-6 sm:w-8 rounded-t bg-gradient-to-b from-blue-400 to-blue-600 flex items-end justify-center min-h-[12px] sm:min-h-[16px] transition-all duration-500 hover:from-blue-500 hover:to-blue-700 cursor-pointer"
                        style={{ height: `${Math.max(height, window.innerWidth < 640 ? 12 : 16)}px` }}
                        title={`${day}: ${dayData.appointmentCount} randevu`}
                      >
                        <span className="text-[10px] sm:text-xs text-white font-bold mb-0.5 sm:mb-1">{dayData.appointmentCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Services & Employees */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
            {/* Top Services */}
            <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z"/></svg>
                </div>
                <h2 className="text-[10px] sm:text-xs font-semibold text-gray-900">En Popüler Hizmetler</h2>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {analytics.topServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[10px] sm:text-xs font-semibold text-gray-800 truncate">{service.name}</h3>
                        <p className="text-[9px] sm:text-xs text-gray-600">₺{service.price} • {service.appointmentCount} randevu</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs font-bold text-blue-600">₺{service.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Employees */}
            <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
                </div>
                <h2 className="text-[10px] sm:text-xs font-semibold text-gray-900">En Aktif Çalışanlar</h2>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {analytics.topEmployees.map((employee, index) => (
                  <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[10px] sm:text-xs font-semibold text-gray-800 truncate">{employee.name}</h3>
                        <p className="text-[9px] sm:text-xs text-gray-600">{employee.appointmentCount} randevu • {employee.completionRate}% tamamlanma</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs font-bold text-purple-600">₺{employee.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Revenue Chart */}
          {analytics.monthlyRevenue.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl p-3 sm:p-6 md:p-8 mb-4 sm:mb-8 border border-white/20">
              <h2 className="text-sm sm:text-xl font-bold text-gray-800 mb-3 sm:mb-6">Son 6 Ay Gelir Grafiği</h2>
              <div className="w-full h-40 sm:h-64 flex items-end justify-center gap-2 sm:gap-6">
                {analytics.monthlyRevenue.map((month, index) => {
                  const maxRevenue = Math.max(...analytics.monthlyRevenue.map(m => m.revenue), 1);
                  const height = (month.revenue / maxRevenue) * (window.innerWidth < 640 ? 120 : 200);
                  const monthLabel = typeof window === 'undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(new Date(month.month));
                  
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-[10px] sm:text-sm text-gray-600 mb-1 sm:mb-2" suppressHydrationWarning>{monthLabel}</div>
                      <div className="relative">
                        <div
                          className="w-8 sm:w-16 rounded-t bg-gradient-to-b from-green-400 to-green-600 flex items-end justify-center min-h-[12px] sm:min-h-[20px] transition-all duration-500"
                          style={{ height: `${Math.max(height, window.innerWidth < 640 ? 12 : 20)}px` }}
                        >
                          <span className="text-[10px] sm:text-xs text-white font-bold mb-0.5 sm:mb-1">{month.appointmentCount}</span>
                        </div>
                      </div>
                      <div className="text-[9px] sm:text-xs text-gray-500 mt-1 sm:mt-2 text-center">
                        ₺{month.revenue.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Analytics Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Service Analytics */}
            {serviceAnalytics && serviceAnalytics.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl p-3 sm:p-6 md:p-8 border border-white/20">
                <h2 className="text-sm sm:text-xl font-bold text-gray-800 mb-3 sm:mb-6">Hizmet Detayları</h2>
                <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                  {serviceAnalytics.map((service) => (
                    <div key={service.id} className="p-3 sm:p-4 bg-gradient-to-r from-blue-50/30 to-blue-100/20 rounded-xl border border-blue-100/30">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{service.name}</h3>
                        <span className="text-[10px] sm:text-sm font-bold text-blue-600">₺{service.price}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-2 text-[10px] sm:text-sm">
                        <div>Randevu: {service.totalAppointments}</div>
                        <div>Tamamlanan: {service.completedAppointments}</div>
                        <div>Gelir: ₺{service.totalRevenue.toFixed(2)}</div>
                        <div>Ortalama: ₺{service.avgRevenuePerAppointment.toFixed(2)}</div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] sm:text-xs text-gray-600">Tamamlanma:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 sm:h-2">
                            <div 
                              className="bg-green-500 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                              style={{ width: `${service.completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-[9px] sm:text-xs font-semibold text-gray-700">{service.completionRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Employee Analytics */}
            {employeeAnalytics && employeeAnalytics.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl p-3 sm:p-6 md:p-8 border border-white/20">
                <h2 className="text-sm sm:text-xl font-bold text-gray-800 mb-3 sm:mb-6">Çalışan Detayları</h2>
                <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                  {employeeAnalytics.map((employee) => (
                    <div key={employee.id} className="p-3 sm:p-4 bg-gradient-to-r from-purple-50/30 to-purple-100/20 rounded-xl border border-purple-100/30">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{employee.name}</h3>
                        <span className="text-[10px] sm:text-sm font-bold text-purple-600">₺{employee.totalRevenue.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-2 text-[10px] sm:text-sm">
                        <div>Toplam: {employee.totalAppointments}</div>
                        <div>Tamamlanan: {employee.completedAppointments}</div>
                        <div>Bekleyen: {employee.pendingAppointments}</div>
                        <div>İptal: {employee.cancelledAppointments}</div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] sm:text-xs text-gray-600">Tamamlanma:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 sm:h-2">
                            <div 
                              className="bg-purple-500 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                              style={{ width: `${employee.completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-[9px] sm:text-xs font-semibold text-gray-700">{employee.completionRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        html, body { font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
        
        :root {
          --primary-gradient: linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #3b82f6 100%);
          --glass-bg: rgba(255, 255, 255, 0.7);
          --glass-border: rgba(255, 255, 255, 0.5);
        }
        
        /* Mobile optimizations */
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        /* Touch optimizations */
        * {
          touch-action: manipulation;
        }
        
        /* Prevent zoom on input focus */
        input[type="text"],
        input[type="email"],
        input[type="password"],
        input[type="tel"],
        input[type="url"],
        input[type="search"],
        textarea,
        select {
          font-size: 16px !important;
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Overscroll behavior */
        body {
          overscroll-behavior: contain;
        }
        
        /* Custom breakpoint for extra small screens */
        @media (max-width: 475px) {
          .xs\\:text-\\[10px\\] { font-size: 10px !important; }
          .xs\\:text-xs { font-size: 12px !important; }
          .xs\\:text-sm { font-size: 14px !important; }
          .xs\\:text-base { font-size: 16px !important; }
          .xs\\:text-lg { font-size: 18px !important; }
          .xs\\:text-xl { font-size: 20px !important; }
          .xs\\:text-2xl { font-size: 24px !important; }
          .xs\\:text-3xl { font-size: 30px !important; }
          .xs\\:text-4xl { font-size: 36px !important; }
          .xs\\:text-5xl { font-size: 48px !important; }
          .xs\\:text-6xl { font-size: 60px !important; }
          .xs\\:text-7xl { font-size: 72px !important; }
          .xs\\:text-8xl { font-size: 96px !important; }
          .xs\\:text-9xl { font-size: 128px !important; }
          .xs\\:hidden { display: none !important; }
          .xs\\:inline { display: inline !important; }
          .xs\\:block { display: block !important; }
          .xs\\:flex { display: flex !important; }
          .xs\\:grid { display: grid !important; }
        }
        
        /* Animation keyframes */
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </main>
  );
}

function StatCard({ label, value, color, icon, subtitle, trend }: { 
  label: string; 
  value: any; 
  color: string; 
  icon: string;
  subtitle?: string;
  trend?: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl shadow-md p-3 sm:p-4 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm sm:text-lg">{icon}</span>
        <div className="text-right">
          <div className="text-sm sm:text-lg font-bold">{value}</div>
          <div className="text-[10px] sm:text-xs opacity-90">{label}</div>
        </div>
      </div>
      {subtitle && (
        <div className="text-[9px] sm:text-xs opacity-75 mb-1">{subtitle}</div>
      )}
      {trend && (
        <div className="flex items-center gap-1 text-[9px] sm:text-xs opacity-90">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M7 14l3-3 3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

function StatusCard({ label, count, total, color, icon }: { 
  label: string; 
  count: number; 
  total: number;
  color: string; 
  icon: string;
}) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  
  return (
    <div className={`bg-gradient-to-br ${color} rounded-lg shadow-md p-2 sm:p-3 text-white`}>
      <div className="flex items-center gap-1 sm:gap-2 mb-1">
        <span className="text-xs sm:text-sm">{icon}</span>
        <div>
          <div className="text-xs sm:text-sm font-bold">{count}</div>
          <div className="text-[10px] sm:text-xs opacity-90">{label}</div>
        </div>
      </div>
      <div className="text-[9px] sm:text-xs opacity-75">{percentage}%</div>
    </div>
  );
} 