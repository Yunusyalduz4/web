"use client";
import { trpc } from '../../../../../../utils/trpcClient';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { skipToken } from '@tanstack/react-query';

function getDayOfWeek(dateStr: string) {
  return new Date(dateStr).getDay();
}

// Randevu alma adımları
type BookingStep = 'service' | 'employee' | 'availability' | 'confirmation';

export default function BookAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params?.id as string;
  const { data: session } = useSession();
  const userId = session?.user.id;

  const { data: services, isLoading: loadingServices } = trpc.business.getServices.useQuery({ businessId }, { enabled: !!businessId });
  const { data: employees, isLoading: loadingEmployees } = trpc.business.getEmployees.useQuery({ businessId }, { enabled: !!businessId });
  const bookMutation = trpc.appointment.book.useMutation();

  // Step-by-step state management
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [serviceEmployeeAssignments, setServiceEmployeeAssignments] = useState<{[serviceId: string]: any}>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState('');

  // Multi-service queries
  const { data: multiServiceData } = trpc.business.getEmployeesForMultipleServices.useQuery(
    { serviceIds: selectedServices.map(s => s.id), businessId },
    { enabled: selectedServices.length > 0 }
  );
  
  const { data: serviceEmployees } = trpc.business.getEmployeesByServices.useQuery(
    { serviceIds: selectedServices.map(s => s.id), businessId },
    { enabled: selectedServices.length > 0 && !multiServiceData?.canProvideAllServices }
  );

  // Sıralı müsaitlik için yeni query
  const { data: sequentialAvailability } = trpc.business.getSequentialAvailability.useQuery(
    {
      services: selectedServices.map(service => ({
        serviceId: service.id,
        employeeId: serviceEmployeeAssignments[service.id]?.id || '',
        duration: service.duration || service.duration_minutes || 30
      })),
      date: selectedDate || '',
      businessId: businessId
    },
    { 
      enabled: selectedServices.length > 1 && 
               !!selectedDate && 
               Object.keys(serviceEmployeeAssignments).length === selectedServices.length
    }
  );

  // Employee availability queries
  const employeeIdsForAvailability = useMemo(() => {
    if (multiServiceData?.canProvideAllServices && multiServiceData?.employees?.length > 0) {
      return multiServiceData.employees.map((emp: any) => emp.id);
    }
    
    if (Object.keys(serviceEmployeeAssignments).length > 0) {
      const assignedEmployees = Object.values(serviceEmployeeAssignments).filter(emp => emp && emp.id);
      // Duplicate'leri kaldır
      const uniqueIds = new Set(assignedEmployees.map(emp => emp.id));
      return Array.from(uniqueIds);
    }
    
    if (selectedServices.length > 0 && !multiServiceData?.canProvideAllServices) {
      const allEmployeeIds = new Set<string>();
      selectedServices.forEach(service => {
        const employeesForService = serviceEmployees?.[service.id] || [];
        employeesForService.forEach(emp => allEmployeeIds.add(emp.id));
      });
      return Array.from(allEmployeeIds);
    }
    
    return [];
  }, [multiServiceData, serviceEmployeeAssignments, selectedServices, serviceEmployees]);

  const { data: commonWeekdaysData } = trpc.business.getCommonWeekdaysForEmployees.useQuery(
    { employeeIds: employeeIdsForAvailability, businessId },
    { enabled: employeeIdsForAvailability.length > 0 }
  );

  const { data: commonAvailability } = trpc.business.getCommonAvailabilityForEmployees.useQuery(
    { 
      employeeIds: employeeIdsForAvailability, 
      date: selectedDate, 
      businessId,
      totalDuration: selectedServices.reduce((sum, service) => sum + (service.duration || 30), 0) || 60
    },
    { enabled: employeeIdsForAvailability.length > 0 && selectedDate !== '' }
  );

  const commonWeekdays = useMemo(() => {
    console.log('commonWeekdaysData:', commonWeekdaysData);
    console.log('employeeIdsForAvailability:', employeeIdsForAvailability);
    if (commonWeekdaysData) {
      return new Set(commonWeekdaysData);
    }
    return new Set([0, 1, 2, 3, 4, 5, 6]); // Fallback
  }, [commonWeekdaysData]);

  // Meşgul slotları al
  const { data: busySlots } = trpc.appointment.getBusySlotsForEmployees.useQuery(
    {
      employeeIds: employeeIdsForAvailability,
      date: selectedDate || new Date().toISOString().split('T')[0],
      durationMinutes: selectedServices.reduce((sum, service) => sum + (service.duration || 30), 0) || 60,
    },
    { enabled: !!selectedDate && employeeIdsForAvailability.length > 0 }
  );

  // Step navigation functions
  const goToStep = (step: BookingStep) => {
    setCurrentStep(step);
    setError('');
  };

  const goBack = () => {
    switch (currentStep) {
      case 'employee':
        setCurrentStep('service');
        setSelectedServices([]);
        setServiceEmployeeAssignments({});
        break;
      case 'availability':
        setCurrentStep('employee');
        setServiceEmployeeAssignments({});
        break;
      case 'confirmation':
        setCurrentStep('availability');
        setSelectedTime('');
        break;
      default:
        router.back();
    }
  };

  // Service selection
  const handleServiceToggle = (service: any) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
    setError('');
  };

  const handleServiceComplete = () => {
    if (selectedServices.length === 0) {
      setError('Lütfen en az bir hizmet seçin');
      return;
    }
    setCurrentStep('employee');
  };

  // Employee selection
  const handleServiceEmployeeSelect = (serviceId: string, employee: any) => {
    setServiceEmployeeAssignments(prev => ({
      ...prev,
      [serviceId]: employee
    }));
    setError('');
  };

  const handleEmployeeAssignmentsComplete = () => {
    // Tek çalışan tüm hizmetleri verebiliyorsa
    if (multiServiceData?.canProvideAllServices) {
      setCurrentStep('availability');
      return;
    }
    
    // Her hizmet için çalışan seçilmiş mi kontrol et
    const allServicesAssigned = selectedServices.every(service => 
      serviceEmployeeAssignments[service.id]
    );
    
    if (!allServicesAssigned) {
      setError('Tüm hizmetler için çalışan seçmelisiniz.');
      return;
    }
    
    setError('');
    setCurrentStep('availability');
  };

  // Özel tarih seçme fonksiyonu
  const handleCustomDateSelect = () => {
    if (!customDate) return;
    
    const selectedDate = new Date(customDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Geçmiş tarih kontrolü
    if (selectedDate < today) {
      setError('Geçmiş bir tarih seçemezsiniz. Lütfen bugün veya gelecek bir tarih seçin.');
      return;
    }
    
    // 6 ay sonrası kontrolü
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    if (selectedDate > sixMonthsLater) {
      setError('En fazla 6 ay sonrasına kadar randevu alabilirsiniz.');
      return;
    }
    
    setSelectedDate(customDate);
    setSelectedTime('');
    setShowCustomDatePicker(false);
    setError('');
  };

  // Müsait saatleri hesapla
  const availableTimes = useMemo(() => {
    if (!selectedDate) return [];
    
    // Çoklu hizmet ve farklı çalışanlar için sıralı müsaitlik kullan
    if (selectedServices.length > 1 && !multiServiceData?.canProvideAllServices && sequentialAvailability) {
      return sequentialAvailability.availableSlots?.map((slot: any) => slot.startTime) || [];
    }
    
    // Tek hizmet veya aynı çalışan için ortak müsaitlik kullan
    if (commonAvailability) {
      return commonAvailability.commonSlots || [];
    }
    
    // Fallback - basit saatler
    const slots: string[] = [];
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const token = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotDate = new Date(`${selectedDate}T${token}:00`);
        const isPast = slotDate.getTime() <= Date.now();
        if (!isPast) {
          slots.push(token);
        }
      }
    }
    return slots;
  }, [selectedDate, commonAvailability, sequentialAvailability, selectedServices.length, multiServiceData?.canProvideAllServices]);

  // Toplam süre hesaplama
  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, service) => sum + (service.duration || service.duration_minutes || 30), 0);
  }, [selectedServices]);

  // Meşgul slot kontrolü - Toplam süre kadar boşluk kontrolü
  const isSlotBusy = (timeSlot: string) => {
    if (selectedDate === new Date().toISOString().split('T')[0]) {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      const bufferTime = new Date(now.getTime() + 15 * 60000);
      const bufferTimeStr = bufferTime.getHours().toString().padStart(2, '0') + ':' + bufferTime.getMinutes().toString().padStart(2, '0');
      
      if (timeSlot < bufferTimeStr) {
        return true;
      }
    }
    
    // Toplam süre kadar boşluk kontrolü
    if (totalDuration > 0) {
      const startTime = timeSlot;
      const endTime = addMinutesToTime(startTime, totalDuration);
      
      // Başlangıç saati meşgul mu?
      if (busySlots?.[startTime]) {
        return true;
      }
      
      // Toplam süre boyunca herhangi bir slot meşgul mu?
      let currentTime = startTime;
      while (currentTime < endTime) {
        if (busySlots?.[currentTime]) {
          return true;
        }
        currentTime = addMinutesToTime(currentTime, 15); // 15 dakika aralıklarla kontrol et
      }
    }
    
    return false;
  };

  // Zaman ekleme helper fonksiyonu
  const addMinutesToTime = (timeStr: string, minutes: number): string => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  // Randevu oluşturma
  const handleCreateAppointment = async () => {
    if (!userId || selectedServices.length === 0 || !selectedDate || !selectedTime) {
      setError('Tüm alanları doldurun.');
      return;
    }

    if (isSlotBusy(selectedTime)) {
      setError('Seçilen saat dolu. Lütfen başka bir saat seçiniz.');
      return;
    }

    // Services array oluştur
    let servicesToBook: any[] = [];
    
    if (multiServiceData?.canProvideAllServices) {
      // Tek çalışan tüm hizmetleri veriyor
      const employee = multiServiceData.employees?.[0];
      if (!employee) {
        setError('Çalışan bulunamadı.');
        return;
      }
      servicesToBook = selectedServices.map(service => ({
        serviceId: service.id,
        employeeId: employee.id
      }));
    } else {
      // Her hizmet için ayrı çalışan - Sıralı randevu sistemi
      const allServicesAssigned = selectedServices.every(service => 
        serviceEmployeeAssignments[service.id]
      );
      
      if (!allServicesAssigned) {
        setError('Tüm hizmetler için çalışan seçmelisiniz.');
        return;
      }
      
      // Sıralı randevu için zamanlamayı hesapla
      if (sequentialAvailability && sequentialAvailability.hasAvailability) {
        // Sıralı randevu bulundu, zamanlamayı kullan
        const selectedSlot = sequentialAvailability.availableSlots?.find((slot: any) => 
          slot.startTime === selectedTime
        );
        
        if (selectedSlot) {
          servicesToBook = selectedSlot.services.map((serviceSchedule: any) => ({
            serviceId: serviceSchedule.service.serviceId,
            employeeId: serviceSchedule.service.employeeId,
            appointmentDatetime: `${selectedDate}T${serviceSchedule.startTime}:00`
          }));
        } else {
          setError('Seçilen saat için sıralı randevu bulunamadı.');
          return;
        }
      } else {
        // Fallback: Aynı saatte tüm hizmetler
        servicesToBook = selectedServices.map(service => ({
          serviceId: service.id,
          employeeId: serviceEmployeeAssignments[service.id].id
        }));
      }
    }

    // Tek çalışan veya fallback için
    const appointmentDatetime = `${selectedDate}T${selectedTime}:00`;
    
    try {
      // Sıralı randevu için her hizmet için ayrı randevu oluştur
      if (servicesToBook.length > 1 && servicesToBook[0].appointmentDatetime) {
        // Sıralı randevu - her hizmet için ayrı randevu
        for (const service of servicesToBook) {
          await bookMutation.mutateAsync({
            userId,
            businessId,
            appointmentDatetime: service.appointmentDatetime,
            services: [{
              serviceId: service.serviceId,
              employeeId: service.employeeId
            }]
          });
        }
      } else {
        // Tek çalışan veya aynı saatte tüm hizmetler
        await bookMutation.mutateAsync({
          userId,
          businessId,
          appointmentDatetime,
          services: servicesToBook
        });
      }
      
      setSuccess('Randevu başarıyla oluşturuldu!');
      setTimeout(() => router.push(`/dashboard/user`), 1500);
    } catch (err: any) {
      setError(err.message || 'Randevu oluşturulamadı');
    }
  };

  // Takvim: önümüzdeki 14 gün için slot butonları
  const nextDays = useMemo(() => {
    const days: { dateStr: string; label: string; weekday: string }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short' });
      const weekday = d.toLocaleDateString('tr-TR', { weekday: 'short' });
      days.push({ dateStr, label, weekday });
    }
    return days;
  }, []);

  const availableWeekdays = useMemo(() => {
    return commonWeekdays;
  }, [commonWeekdays]);

  // Step 1: Service Selection Component
  const ServiceSelectionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hizmetleri Seçin</h2>
        <p className="text-gray-600">Randevu almak istediğiniz hizmetleri seçin (birden fazla seçebilirsiniz)</p>
      </div>

      <div className="space-y-3">
        {services?.map((service: any) => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          return (
            <button
              key={service.id}
              onClick={() => handleServiceToggle(service)}
              className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                isSelected 
                  ? 'border-red-500 bg-red-50 shadow-lg' 
                  : 'border-transparent bg-white/80 backdrop-blur-md hover:border-red-300 hover:shadow-lg'
              }`}
              style={!isSelected ? {
                background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box',
                border: '2px solid transparent'
              } : {}}
            >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.name}</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className="text-sm text-gray-600 font-medium">{service.duration_minutes} dk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-600">₺{service.price}</span>
                  </div>
                </div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isSelected 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white border-2 border-gray-200'
              }`}>
                {isSelected && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </button>
          );
        })}
      </div>

      {selectedServices.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Seçilen Hizmetler:</h3>
          <div className="space-y-2">
            {selectedServices.map((service: any) => (
              <div key={service.id} className="flex items-center justify-between text-sm">
                <span className="text-blue-800">{service.name}</span>
                <span className="font-semibold text-blue-600">₺{service.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleServiceComplete}
        disabled={selectedServices.length === 0}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-blue-500 text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Devam Et ({selectedServices.length} hizmet seçildi)
      </button>
    </div>
  );

  // Step 2: Employee Selection Component
  const EmployeeSelectionStep = () => {
    const canProvideAllServices = multiServiceData?.canProvideAllServices;
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Çalışanları Seçin</h2>
          <p className="text-gray-600">
            {canProvideAllServices 
              ? 'Tek çalışan tüm hizmetleri verebiliyor' 
              : 'Her hizmet için ayrı çalışan seçin'
            }
          </p>
        </div>

        {/* Seçilen Hizmetler Bilgisi */}
        {selectedServices.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-blue-50 border border-red-200">
            <h3 className="font-semibold text-gray-900 mb-3">Seçilen Hizmetler:</h3>
            <div className="space-y-2">
              {selectedServices.map((service: any) => (
                <div key={service.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800">{service.name}</span>
                  <span className="font-semibold text-blue-600">₺{service.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {canProvideAllServices ? (
          // Tek çalışan tüm hizmetleri veriyor
          <div className="space-y-3">
            {multiServiceData?.employees?.length > 0 ? multiServiceData.employees.map((employee: any) => (
              <button
                key={employee.id}
                onClick={() => {
                  // Tüm hizmetler için aynı çalışanı ata
                  const assignments: {[key: string]: any} = {};
                  selectedServices.forEach(service => {
                    assignments[service.id] = employee;
                  });
                  setServiceEmployeeAssignments(assignments);
                  setCurrentStep('availability');
                }}
                className="w-full p-4 rounded-2xl border-2 border-transparent bg-white/80 backdrop-blur-md hover:border-red-300 hover:shadow-lg transition-all duration-200 text-left"
                style={{
                  background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box',
                  border: '2px solid transparent'
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-red-500 to-blue-500 text-white flex items-center justify-center">
                    <span className="text-lg font-bold">{employee.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                    <p className="text-sm text-gray-600">{employee.email}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-blue-500 text-white flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            )) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Bu hizmetleri verebilecek çalışan bulunamadı.</p>
              </div>
            )}
          </div>
        ) : (
          // Her hizmet için ayrı çalışan seçimi
          <div className="space-y-6">
            {selectedServices.map((service: any) => (
              <div key={service.id} className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{service.name}</h3>
                <div className="space-y-2">
                  {serviceEmployees && serviceEmployees[service.id]?.length > 0 ? (serviceEmployees[service.id] || []).map((employee: any) => (
                    <button
                      key={employee.id}
                      onClick={() => handleServiceEmployeeSelect(service.id, employee)}
                      className={`w-full p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                        serviceEmployeeAssignments[service.id]?.id === employee.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-transparent bg-gray-50 hover:border-red-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                          {employee.profile_image_url ? (
                            <img src={employee.profile_image_url} alt={employee.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                              {employee.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{employee.name}</h4>
                          <p className="text-xs text-gray-600">{employee.email}</p>
                        </div>
                        {serviceEmployeeAssignments[service.id]?.id === employee.id && (
                          <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  )) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">Bu hizmet için çalışan bulunamadı.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!canProvideAllServices && (
          <button
            onClick={handleEmployeeAssignmentsComplete}
            disabled={!selectedServices.every(service => serviceEmployeeAssignments[service.id])}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-blue-500 text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Devam Et
          </button>
        )}
      </div>
    );
  };

  // Step 3: Availability Selection Component
  const AvailabilitySelectionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tarih ve Saat Seçin</h2>
        <p className="text-gray-600">Müsait olan tarih ve saatleri görüntüleyin</p>
      </div>

      {/* Seçilen Bilgiler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seçilen Hizmetler */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-blue-50 border border-red-200">
          <h3 className="font-semibold text-gray-900 mb-3">Seçilen Hizmetler:</h3>
          <div className="space-y-2">
            {selectedServices.map((service: any) => (
              <div key={service.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">{service.name}</span>
                <span className="font-semibold text-blue-600">₺{service.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Seçilen Çalışanlar */}
        {Object.keys(serviceEmployeeAssignments).length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
            <h3 className="font-semibold text-gray-900 mb-3">Seçilen Çalışanlar:</h3>
            <div className="space-y-2">
              {Object.entries(serviceEmployeeAssignments).map(([serviceId, employee]) => {
                const service = selectedServices.find(s => s.id === serviceId);
                return (
                  <div key={serviceId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{service?.name} - {employee?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tarih Seçimi */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Tarih Seçin</h3>
          <button
            onClick={() => setShowCustomDatePicker(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-gray-200 text-sm text-gray-700 hover:border-red-300 hover:shadow-md transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>Özel Tarih</span>
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {nextDays.map((d) => {
            const enabled = availableWeekdays.has(getDayOfWeek(d.dateStr));
            const selected = selectedDate === d.dateStr;
            const isToday = d.dateStr === new Date().toISOString().split('T')[0];
            
            return (
              <button
                key={d.dateStr}
                onClick={() => { 
                  if (enabled) {
                    setSelectedDate(d.dateStr); 
                    setSelectedTime(''); 
                  } 
                }}
                className={`shrink-0 px-4 py-3 rounded-xl text-sm transition border relative ${
                  selected 
                    ? 'bg-gradient-to-r from-red-500 to-blue-500 text-white border-transparent shadow-lg' 
                    : enabled 
                      ? 'bg-white/80 text-gray-800 border-gray-200 hover:border-red-300 hover:shadow-md' 
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
                disabled={!enabled}
              >
                {d.label}
                {isToday && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-red-500 to-blue-500 rounded-full border-2 border-white"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Saat Seçimi */}
      {selectedDate && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Saat Seçin</h3>
          
          {/* Sıralı müsaitlik yoksa uyarı mesajı */}
          {selectedServices.length > 1 && !multiServiceData?.canProvideAllServices && sequentialAvailability && !sequentialAvailability.hasAvailability && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-100 to-orange-100 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-red-500">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Uygun Müsaitlik Bulunamadı</h4>
              <p className="text-gray-600 mb-4">
                Seçtiğiniz hizmetler için ardışık randevu bulunamadı.
              </p>
              <p className="text-sm text-gray-500">
                Lütfen her hizmet için ayrı randevu oluşturun veya farklı bir tarih deneyin.
              </p>
            </div>
          )}
          
          {availableTimes.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availableTimes.map((timeSlot: string) => {
                const selected = selectedTime === timeSlot;
                const isBusy = isSlotBusy(timeSlot);
                
                return (
                  <button
                    key={timeSlot}
                    onClick={() => {
                      if (!isBusy) {
                        setSelectedTime(timeSlot);
                        setError('');
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm transition border ${
                      selected ? 'bg-gradient-to-r from-red-500 to-blue-500 text-white border-transparent shadow-lg' 
                      : isBusy ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed opacity-60' 
                      : 'bg-white/80 text-gray-800 border-gray-200 hover:border-red-300 hover:shadow-md'
                    }`}
                    disabled={isBusy}
                  >
                    {timeSlot}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Bu tarih için müsait saat bulunmuyor.</p>
            </div>
          )}
        </div>
      )}

      {/* Randevu Oluştur Butonu */}
      {selectedDate && selectedTime && (
        <button
          onClick={handleCreateAppointment}
          disabled={bookMutation.isPending}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-blue-500 text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bookMutation.isPending ? 'Randevu Oluşturuluyor...' : 'Randevu Oluştur'}
        </button>
      )}
    </div>
  );

  // Progress indicator
  const getStepNumber = (step: BookingStep) => {
    switch (step) {
      case 'service': return 1;
      case 'employee': return 2;
      case 'availability': return 3;
      case 'confirmation': return 4;
      default: return 1;
    }
  };

  const getStepTitle = (step: BookingStep) => {
    switch (step) {
      case 'service': return 'Hizmet Seçimi';
      case 'employee': return 'Çalışan Seçimi';
      case 'availability': return 'Tarih & Saat';
      case 'confirmation': return 'Onay';
      default: return 'Hizmet Seçimi';
    }
  };

  return (
    <main className="relative max-w-2xl mx-auto p-4 min-h-screen pb-20 bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-2 pb-3 bg-white/80 backdrop-blur-md border-b border-white/60 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="w-10 h-10 rounded-xl bg-white/70 border border-white/50 text-gray-900 shadow-sm hover:bg-white/90 active:bg-white transition-colors flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div>
              <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">randevuo</div>
              <div className="text-xs text-gray-600">Randevu Al</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Adım {getStepNumber(currentStep)}/3</span>
            <span className="text-sm text-gray-600">{getStepTitle(currentStep)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-red-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(getStepNumber(currentStep) / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-center animate-shake">
          <div className="flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl shadow-xl p-6">
        {currentStep === 'service' && <ServiceSelectionStep />}
        {currentStep === 'employee' && <EmployeeSelectionStep />}
        {currentStep === 'availability' && <AvailabilitySelectionStep />}
      </div>

      {/* Özel Tarih Seçme Modal */}
      {showCustomDatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Özel Tarih Seçin</h3>
                <button
                  onClick={() => {
                    setShowCustomDatePicker(false);
                    setCustomDate('');
                    setError('');
                  }}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">İstediğiniz tarihi seçin (bugünden 6 ay sonrasına kadar)</p>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarih Seçin
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-300 transition"
                  />
                </div>
                
                {customDate && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-blue-50 border border-red-200">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-600">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <span className="text-sm font-medium text-gray-800">
                        Seçilen Tarih: {new Date(customDate).toLocaleDateString('tr-TR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCustomDatePicker(false);
                    setCustomDate('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleCustomDateSelect}
                  disabled={!customDate}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-blue-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                >
                  Tarihi Seç
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        :root { 
          --randevuo-radius: 16px; 
          --randevuo-shadow: 0 8px 24px -12px rgba(0,0,0,0.25);
        }
        html, body { 
          font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; 
        }
        
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
