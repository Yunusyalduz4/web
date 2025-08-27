import { t, isApprovedBusiness } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';

export const slotsRouter = t.router({
  // 7 günlük slot görünümü - sadece görüntüleme
  getWeeklySlots: t.procedure.use(isApprovedBusiness)
    .input(z.object({
      businessId: z.string().uuid(),
      startDate: z.string(), // YYYY-MM-DD formatında
    }))
    .query(async ({ input }) => {
      // 7 günlük tarih aralığını hesapla - bugünden başlayarak
      const startDate = new Date(input.startDate + 'T00:00:00');
      
      // İşletmenin çalışanlarını ve müsaitlik bilgilerini al
      const employeesRes = await pool.query(
        `SELECT e.id, e.name, ea.day_of_week, ea.start_time, ea.end_time
         FROM employees e
         LEFT JOIN employee_availability ea ON e.id = ea.employee_id
         WHERE e.business_id = $1
         ORDER BY e.id, ea.day_of_week`,
        [input.businessId]
      );
      
      if (employeesRes.rows.length === 0) {
        return [];
      }
      
      // Çalışan müsaitlik verilerini grupla
      const employeeAvailability: Record<string, Array<{day_of_week: number, start_time: string, end_time: string}>> = {};
      const employeeIds: string[] = [];
      
      for (const row of employeesRes.rows) {
        if (!employeeIds.includes(row.id)) {
          employeeIds.push(row.id);
        }
        
        if (row.day_of_week !== null) {
          if (!employeeAvailability[row.id]) {
            employeeAvailability[row.id] = [];
          }
          employeeAvailability[row.id].push({
            day_of_week: row.day_of_week,
            start_time: row.start_time,
            end_time: row.end_time
          });
        }
      }
      
      // 7 günlük slot verilerini hesapla
      const weeklyData = [];
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD formatı
      
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = currentDate.toLocaleDateString('en-CA'); // YYYY-MM-DD formatı
        
        // O gün için randevuları al
        const utcCurrentDate = currentDate;
        const utcNextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        
        const appointmentsRes = await pool.query(
          `SELECT 
            a.appointment_datetime,
            a.status,
            SUM(aps.duration_minutes) AS total_duration
           FROM appointments a
           JOIN appointment_services aps ON a.id = aps.appointment_id
           WHERE a.business_id = $1 
             AND a.status IN ('pending', 'confirmed')
             AND aps.employee_id = ANY($2::uuid[])
             AND a.appointment_datetime >= $3 
             AND a.appointment_datetime < $4
           GROUP BY a.id, a.appointment_datetime, a.status`,
          [input.businessId, employeeIds, utcCurrentDate.toISOString(), utcNextDate.toISOString()]
        );
        
        // 15dk'lık slot'ları oluştur (08:00-20:00 arası)
        const slots: Array<{ time: string; isBusy: boolean; isPast: boolean; status: string }> = [];
        const busySlots: Record<string, boolean> = {};
        
        // Meşgul slot'ları hesapla
        for (const apt of appointmentsRes.rows) {
          const aptStart = new Date(apt.appointment_datetime);
          const aptEnd = new Date(aptStart.getTime() + Number(apt.total_duration) * 60000);
          
          // Her 15dk'lık slot için kontrol et
          for (let time = new Date(aptStart); time < aptEnd; time = new Date(time.getTime() + 15 * 60000)) {
            const hh = String(time.getHours()).padStart(2, '0');
            const mm = String(time.getMinutes()).padStart(2, '0');
            const slotKey = `${hh}:${mm}`;
            
            // Sadece 08:00-20:00 arası slot'ları kaydet
            if (time.getHours() >= 8 && time.getHours() < 20) {
              busySlots[slotKey] = true;
            }
          }
        }
        
        // O gün için çalışan müsaitlik bilgilerini al
        const dayOfWeek = currentDate.getDay();
        const availableSlots: Array<{start: number, end: number}> = [];
        
        // Tüm çalışanların o gün müsaitlik saatlerini topla
        for (const employeeId of employeeIds) {
          const empAvailability = employeeAvailability[employeeId] || [];
          const dayAvailability = empAvailability.filter(a => a.day_of_week === dayOfWeek);
          
          for (const avail of dayAvailability) {
            const [startHour, startMin] = avail.start_time.split(':').map(Number);
            const [endHour, endMin] = avail.end_time.split(':').map(Number);
            
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            
            availableSlots.push({ start: startMinutes, end: endMinutes });
          }
        }
        
        // Eğer hiç müsaitlik bilgisi yoksa boş döndür
        if (availableSlots.length === 0) {
          weeklyData.push({
            date: dateStr,
            dayName: currentDate.toLocaleDateString('tr-TR', { weekday: 'long' }),
            dayShort: currentDate.toLocaleDateString('tr-TR', { weekday: 'short' }),
            totalSlots: 0,
            busySlots: 0,
            availableSlots: 0,
            slots: [],
            isToday: dateStr === todayStr
          });
          continue;
        }
        
        // Müsaitlik saatlerine göre slot'ları oluştur
        for (const timeSlot of availableSlots) {
          const startHour = Math.floor(timeSlot.start / 60);
          const startMinute = timeSlot.start % 60;
          const endHour = Math.floor(timeSlot.end / 60);
          const endMinute = timeSlot.end % 60;
          
          // 15dk'lık slot'ları oluştur
          for (let totalMinutes = timeSlot.start; totalMinutes < timeSlot.end; totalMinutes += 15) {
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            const slotTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            
            // Geçmiş saat kontrolü (bugün için)
            let isPast = false;
            if (dateStr === todayStr) {
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();
              
              // 15 dakika buffer ekle
              const bufferTime = new Date(now.getTime() + 15 * 60000);
              const bufferHour = bufferTime.getHours();
              const bufferMinute = bufferTime.getMinutes();
              
              // Slot saati geçmiş zamandaysa geçmiş olarak işaretle
              if (h < bufferHour || (h === bufferHour && m < bufferMinute)) {
                isPast = true;
              }
            }
            
            // Slot durumunu belirle
            let status = 'available';
            if (isPast) {
              status = 'past';
            } else if (busySlots[slotTime]) {
              status = 'busy';
            }
            
            slots.push({
              time: slotTime,
              isBusy: !!busySlots[slotTime],
              isPast: isPast,
              status: status
            });
          }
        }
        
        // Günlük özet hesapla
        const totalSlots = slots.length;
        const busySlotsCount = slots.filter(slot => slot.isBusy).length;
        const pastSlotsCount = slots.filter(slot => slot.isPast).length;
        const availableSlotsCount = totalSlots - busySlotsCount - pastSlotsCount;
        
        weeklyData.push({
          date: dateStr,
          dayName: currentDate.toLocaleDateString('tr-TR', { weekday: 'long' }),
          dayShort: currentDate.toLocaleDateString('tr-TR', { weekday: 'short' }),
          totalSlots,
          busySlots: busySlotsCount,
          pastSlots: pastSlotsCount,
          availableSlots: availableSlotsCount,
          slots: slots,
          isToday: dateStr === todayStr
        });
      }
      
      return weeklyData;
    }),

  // Özel tarih için slot görünümü
  getCustomDateSlots: t.procedure.use(isApprovedBusiness)
    .input(z.object({
      businessId: z.string().uuid(),
      date: z.string(), // YYYY-MM-DD formatında
    }))
    .query(async ({ input }) => {
      // Tek gün için slot verilerini getir
      const result = await pool.query(
        `SELECT 
          a.appointment_datetime,
          a.status,
          SUM(aps.duration_minutes) AS total_duration
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.business_id = $1 
           AND a.status IN ('pending', 'confirmed')
           AND a.appointment_datetime >= $2 
           AND a.appointment_datetime < $3
         GROUP BY a.id, a.appointment_datetime, a.status`,
        [
          input.businessId, 
          new Date(input.date + 'T00:00:00').toISOString(),
          new Date(input.date + 'T23:59:59').toISOString()
        ]
      );
      
      // Çalışan müsaitlik bilgilerini al
      const employeesRes = await pool.query(
        `SELECT e.id, ea.day_of_week, ea.start_time, ea.end_time
         FROM employees e
         LEFT JOIN employee_availability ea ON e.id = ea.employee_id
         WHERE e.business_id = $1`,
        [input.businessId]
      );
      
      if (employeesRes.rows.length === 0) {
        return { date: input.date, slots: [] };
      }
      
      // O gün için çalışan müsaitlik saatlerini topla
      const targetDate = new Date(input.date);
      const dayOfWeek = targetDate.getDay();
      const availableSlots: Array<{start: number, end: number}> = [];
      
      for (const row of employeesRes.rows) {
        if (row.day_of_week === dayOfWeek) {
          const [startHour, startMin] = row.start_time.split(':').map(Number);
          const [endHour, endMin] = row.end_time.split(':').map(Number);
          
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          availableSlots.push({ start: startMinutes, end: endMinutes });
        }
      }
      
      // Meşgul slot'ları hesapla
      const busySlots: Record<string, boolean> = {};
      for (const apt of result.rows) {
        const aptStart = new Date(apt.appointment_datetime);
        const aptEnd = new Date(aptStart.getTime() + Number(apt.total_duration) * 60000);
        
        for (let time = new Date(aptStart); time < aptEnd; time = new Date(time.getTime() + 15 * 60000)) {
          const hh = String(time.getHours()).padStart(2, '0');
          const mm = String(time.getMinutes()).padStart(2, '0');
          const slotKey = `${hh}:${mm}`;
          
          if (time.getHours() >= 8 && time.getHours() < 20) {
            busySlots[slotKey] = true;
          }
        }
      }
      
      // Slot'ları oluştur
      const slots: Array<{ time: string; isBusy: boolean; isPast: boolean; status: string }> = [];
      
      for (const timeSlot of availableSlots) {
        for (let totalMinutes = timeSlot.start; totalMinutes < timeSlot.end; totalMinutes += 15) {
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          const slotTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          
          // Geçmiş saat kontrolü
          let isPast = false;
          const today = new Date();
          if (input.date === today.toLocaleDateString('en-CA')) {
            const now = new Date();
            const bufferTime = new Date(now.getTime() + 15 * 60000);
            const bufferHour = bufferTime.getHours();
            const bufferMinute = bufferTime.getMinutes();
            
            if (h < bufferHour || (h === bufferHour && m < bufferMinute)) {
              isPast = true;
            }
          }
          
          // Slot durumunu belirle
          let status = 'available';
          if (isPast) {
            status = 'past';
          } else if (busySlots[slotTime]) {
            status = 'busy';
          }
          
          slots.push({
            time: slotTime,
            isBusy: !!busySlots[slotTime],
            isPast: isPast,
            status: status
          });
        }
      }
      
      return {
        date: input.date,
        slots: slots
      };
    }),
});
