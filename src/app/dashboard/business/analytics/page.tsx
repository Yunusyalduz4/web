"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../../utils/trpcClient';
import { useState, useEffect } from 'react';

export default function BusinessAnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = session?.user.id;
  const { data: businesses } = trpc.business.getBusinesses.useQuery();
  const business = businesses?.find((b: any) => b.owner_user_id === userId);
  
  const { data: analytics, isLoading } = trpc.analytics.getBusinessAnalytics.useQuery(
    { businessId: business?.id || '' },
    { enabled: !!business?.id }
  );

  const { data: serviceAnalytics } = trpc.analytics.getServiceAnalytics.useQuery(
    { businessId: business?.id || '' },
    { enabled: !!business?.id }
  );

  const { data: employeeAnalytics } = trpc.analytics.getEmployeeAnalytics.useQuery(
    { businessId: business?.id || '' },
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
    <main className="relative max-w-7xl mx-auto p-4 pb-24 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent select-none">randevuo</div>
          <button 
            onClick={() => router.push('/dashboard/business')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 text-gray-900 shadow-sm hover:shadow-md transition"
          >
            <span className="text-base">←</span>
            <span className="hidden sm:inline text-sm font-medium">Geri</span>
          </button>
        </div>
        <div className="mt-3 text-sm font-semibold text-gray-800">{business.name} • Analitikler</div>
      </div>

      {analytics && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              label="Toplam Randevu" 
              value={analytics.overview.totalAppointments} 
              color="from-blue-500 to-blue-600" 
              icon="📅"
              subtitle={`${analytics.overview.completionRate}% tamamlanma`}
            />
            <StatCard 
              label="Toplam Gelir" 
              value={`₺${analytics.revenue.totalRevenue.toFixed(2)}`} 
              color="from-green-500 to-green-600" 
              icon="💸"
              subtitle={`₺${analytics.revenue.completedRevenue.toFixed(2)} gerçekleşen`}
            />
            <StatCard 
              label="Ortalama Randevu" 
              value={`₺${analytics.revenue.avgAppointmentValue.toFixed(2)}`} 
              color="from-purple-500 to-purple-600" 
              icon="📈"
              subtitle={`Min: ₺${analytics.revenue.minAppointmentValue} - Max: ₺${analytics.revenue.maxAppointmentValue}`}
            />
            <StatCard 
              label="Son 30 Gün" 
              value={analytics.recentActivity.appointments} 
              color="from-orange-500 to-orange-600" 
              icon="🔥"
              subtitle={`₺${analytics.recentActivity.revenue.toFixed(2)} gelir`}
            />
          </div>

          {/* Status Breakdown */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-8 mb-8 border border-white/20">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Randevu Durumu Dağılımı</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-8 mb-8 border border-white/20">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Bu Ay Haftalık Randevu Grafiği</h2>
            <div className="w-full h-64 flex items-end justify-center gap-4">
              {weekDaysShort.map((day, index) => {
                const dayData = analytics.weeklyAppointments.find(w => w.dayOfWeek === index) || { appointmentCount: 0 };
                const maxCount = Math.max(...analytics.weeklyAppointments.map(w => w.appointmentCount), 1);
                const height = (dayData.appointmentCount / maxCount) * 200;
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="text-sm text-gray-600 mb-2">{day}</div>
                    <div className="relative">
                      <div
                        className="w-12 rounded-t bg-gradient-to-b from-blue-400 to-blue-600 flex items-end justify-center min-h-[20px] transition-all duration-500"
                        style={{ height: `${Math.max(height, 20)}px` }}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Services */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-8 border border-white/20">
              <h2 className="text-xl font-bold text-gray-800 mb-6">En Popüler Hizmetler</h2>
              <div className="space-y-4">
                {analytics.topServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/50 to-blue-100/30 rounded-2xl border border-blue-100/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{service.name}</h3>
                        <p className="text-sm text-gray-600">₺{service.price} • {service.appointmentCount} randevu</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">₺{service.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Employees */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-8 border border-white/20">
              <h2 className="text-xl font-bold text-gray-800 mb-6">En Aktif Çalışanlar</h2>
              <div className="space-y-4">
                {analytics.topEmployees.map((employee, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50/50 to-purple-100/30 rounded-2xl border border-purple-100/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{employee.name}</h3>
                        <p className="text-sm text-gray-600">{employee.appointmentCount} randevu • {employee.completionRate}% tamamlanma</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">₺{employee.totalRevenue.toFixed(2)}</p>
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

function StatCard({ label, value, color, icon, subtitle }: { 
  label: string; 
  value: any; 
  color: string; 
  icon: string;
  subtitle?: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-3xl shadow-xl p-6 text-white animate-fade-in`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <div className="text-right">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm opacity-90">{label}</div>
        </div>
      </div>
      {subtitle && (
        <div className="text-xs opacity-75">{subtitle}</div>
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
    <div className={`bg-gradient-to-br ${color} rounded-2xl shadow-lg p-4 text-white`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-lg font-bold">{count}</div>
          <div className="text-sm opacity-90">{label}</div>
        </div>
      </div>
      <div className="text-xs opacity-75">{percentage}%</div>
    </div>
  );
} 