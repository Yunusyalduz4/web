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
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  
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
    <main className="relative max-w-7xl mx-auto p-3 pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 bg-white/80 backdrop-blur-md border-b border-white/60 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/dashboard/business')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/70 border border-white/50 text-gray-900 shadow-sm hover:bg-white/90 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div>
              <div className="text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
              <div className="text-xs text-gray-600">İşletme Analitikleri</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Canlı bağlantı"></div>
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
              {business.name}
            </div>
          </div>
        </div>
      </div>

      {analytics && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
          <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 shadow-sm mb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md bg-gradient-to-r from-indigo-500 to-indigo-600 text-white flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <h2 className="text-xs font-semibold text-gray-900">Randevu Durumu Dağılımı</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
          <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 shadow-sm mb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>
              </div>
              <h2 className="text-xs font-semibold text-gray-900">Bu Ay Haftalık Randevu Grafiği</h2>
            </div>
            <div className="w-full h-48 flex items-end justify-center gap-2">
              {weekDaysShort.map((day, index) => {
                const dayData = analytics.weeklyAppointments.find(w => w.dayOfWeek === index) || { appointmentCount: 0 };
                const maxCount = Math.max(...analytics.weeklyAppointments.map(w => w.appointmentCount), 1);
                const height = (dayData.appointmentCount / maxCount) * 150;
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="text-xs text-gray-600 mb-2">{day}</div>
                    <div className="relative">
                      <div
                        className="w-8 rounded-t bg-gradient-to-b from-blue-400 to-blue-600 flex items-end justify-center min-h-[16px] transition-all duration-500 hover:from-blue-500 hover:to-blue-700 cursor-pointer"
                        style={{ height: `${Math.max(height, 16)}px` }}
                        title={`${day}: ${dayData.appointmentCount} randevu`}
                      >
                        <span className="text-xs text-white font-bold mb-1">{dayData.appointmentCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Services & Employees */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
            {/* Top Services */}
            <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z"/></svg>
                </div>
                <h2 className="text-xs font-semibold text-gray-900">En Popüler Hizmetler</h2>
              </div>
              <div className="space-y-2">
                {analytics.topServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-gray-800 truncate">{service.name}</h3>
                        <p className="text-xs text-gray-600">₺{service.price} • {service.appointmentCount} randevu</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue-600">₺{service.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Employees */}
            <div className="bg-white/70 backdrop-blur-md border border-white/50 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-10 1.66-10 5v3h20v-3c0-3.34-6.69-5-10-5z"/></svg>
                </div>
                <h2 className="text-xs font-semibold text-gray-900">En Aktif Çalışanlar</h2>
              </div>
              <div className="space-y-2">
                {analytics.topEmployees.map((employee, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-gray-800 truncate">{employee.name}</h3>
                        <p className="text-xs text-gray-600">{employee.appointmentCount} randevu • {employee.completionRate}% tamamlanma</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-purple-600">₺{employee.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Revenue Chart */}
          {analytics.monthlyRevenue.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-8 mb-8 border border-white/20">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Son 6 Ay Gelir Grafiği</h2>
              <div className="w-full h-64 flex items-end justify-center gap-6">
                {analytics.monthlyRevenue.map((month, index) => {
                  const maxRevenue = Math.max(...analytics.monthlyRevenue.map(m => m.revenue), 1);
                  const height = (month.revenue / maxRevenue) * 200;
                  const monthLabel = typeof window === 'undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(new Date(month.month));
                  
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-sm text-gray-600 mb-2" suppressHydrationWarning>{monthLabel}</div>
                      <div className="relative">
                        <div
                          className="w-16 rounded-t bg-gradient-to-b from-green-400 to-green-600 flex items-end justify-center min-h-[20px] transition-all duration-500"
                          style={{ height: `${Math.max(height, 20)}px` }}
                        >
                          <span className="text-xs text-white font-bold mb-1">{month.appointmentCount}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 text-center">
                        ₺{month.revenue.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Analytics Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Service Analytics */}
            {serviceAnalytics && serviceAnalytics.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-8 border border-white/20">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Hizmet Detayları</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {serviceAnalytics.map((service) => (
                    <div key={service.id} className="p-4 bg-gradient-to-r from-blue-50/30 to-blue-100/20 rounded-xl border border-blue-100/30">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">{service.name}</h3>
                        <span className="text-sm font-bold text-blue-600">₺{service.price}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Randevu: {service.totalAppointments}</div>
                        <div>Tamamlanan: {service.completedAppointments}</div>
                        <div>Gelir: ₺{service.totalRevenue.toFixed(2)}</div>
                        <div>Ortalama: ₺{service.avgRevenuePerAppointment.toFixed(2)}</div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">Tamamlanma:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${service.completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{service.completionRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Employee Analytics */}
            {employeeAnalytics && employeeAnalytics.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-8 border border-white/20">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Çalışan Detayları</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {employeeAnalytics.map((employee) => (
                    <div key={employee.id} className="p-4 bg-gradient-to-r from-purple-50/30 to-purple-100/20 rounded-xl border border-purple-100/30">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">{employee.name}</h3>
                        <span className="text-sm font-bold text-purple-600">₺{employee.totalRevenue.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Toplam: {employee.totalAppointments}</div>
                        <div>Tamamlanan: {employee.completedAppointments}</div>
                        <div>Bekleyen: {employee.pendingAppointments}</div>
                        <div>İptal: {employee.cancelledAppointments}</div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">Tamamlanma:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${employee.completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{employee.completionRate}%</span>
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
    <div className={`bg-gradient-to-br ${color} rounded-xl shadow-md p-3 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        <div className="text-right">
          <div className="text-lg font-bold">{value}</div>
          <div className="text-xs opacity-90">{label}</div>
        </div>
      </div>
      {subtitle && (
        <div className="text-xs opacity-75 mb-1">{subtitle}</div>
      )}
      {trend && (
        <div className="flex items-center gap-1 text-xs opacity-90">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 14l3-3 3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
    <div className={`bg-gradient-to-br ${color} rounded-lg shadow-md p-2 text-white`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{icon}</span>
        <div>
          <div className="text-sm font-bold">{count}</div>
          <div className="text-xs opacity-90">{label}</div>
        </div>
      </div>
      <div className="text-xs opacity-75">{percentage}%</div>
    </div>
  );
} 