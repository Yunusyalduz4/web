import { t } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import { isBusiness } from '../trpc/trpc';

export const analyticsRouter = t.router({
  // Get business analytics overview
  getBusinessAnalytics: t.procedure
    .use(isBusiness)
    .query(async ({ ctx }) => {
      try {
        console.log('Analytics getBusinessAnalytics - ctx.user:', ctx.user);
        
        if (!ctx.user || !ctx.user.id) {
          throw new Error('Kullanıcı bilgisi bulunamadı');
        }

        // Get business ID from session
        const businessResult = await pool.query(
          'SELECT id FROM businesses WHERE owner_user_id = $1',
          [ctx.user.id]
        );
      
      if (businessResult.rows.length === 0) {
        throw new Error('İşletme bulunamadı');
      }
      
      const businessId = businessResult.rows[0].id;

      // Total appointments and status breakdown
      const appointmentsResult = await pool.query(
        `SELECT 
           COUNT(*) as total_appointments,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
           COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_appointments,
           COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_appointments
         FROM appointments 
         WHERE business_id = $1`,
        [businessId]
      );

      // Revenue calculations
      const revenueResult = await pool.query(
        `SELECT 
           COALESCE(SUM(aps.price), 0) as total_revenue,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN aps.price ELSE 0 END), 0) as completed_revenue,
           COALESCE(SUM(CASE WHEN a.status = 'cancelled' THEN aps.price ELSE 0 END), 0) as cancelled_revenue
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.business_id = $1`,
        [businessId]
      );

      // Top services by appointment count
      const topServicesResult = await pool.query(
        `SELECT 
           s.name as service_name,
           s.price as service_price,
           COUNT(*) as appointment_count,
           COALESCE(SUM(aps.price), 0) as total_revenue
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         JOIN services s ON aps.service_id = s.id
         WHERE a.business_id = $1
         GROUP BY s.id, s.name, s.price
         ORDER BY appointment_count DESC
         LIMIT 5`,
        [businessId]
      );

      // Top employees by appointment count
      const topEmployeesResult = await pool.query(
        `SELECT 
           e.name as employee_name,
           COUNT(*) as appointment_count,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_count,
           COALESCE(SUM(aps.price), 0) as total_revenue
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         JOIN employees e ON aps.employee_id = e.id
         WHERE a.business_id = $1
         GROUP BY e.id, e.name
         ORDER BY appointment_count DESC
         LIMIT 5`,
        [businessId]
      );

      // Monthly revenue for last 6 months
      const monthlyRevenueResult = await pool.query(
        `SELECT 
           DATE_TRUNC('month', a.appointment_datetime) as month,
           COUNT(*) as appointment_count,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN aps.price ELSE 0 END), 0) as revenue
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.business_id = $1 
         AND a.appointment_datetime >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', a.appointment_datetime)
         ORDER BY month DESC`,
        [businessId]
      );

      // Weekly appointments for current month
      const weeklyAppointmentsResult = await pool.query(
        `SELECT 
           EXTRACT(DOW FROM a.appointment_datetime) as day_of_week,
           COUNT(*) as appointment_count
         FROM appointments a
         WHERE a.business_id = $1 
         AND a.appointment_datetime >= DATE_TRUNC('month', NOW())
         GROUP BY EXTRACT(DOW FROM a.appointment_datetime)
         ORDER BY day_of_week`,
        [businessId]
      );

      // Average appointment value
      const avgAppointmentResult = await pool.query(
        `SELECT 
           COALESCE(AVG(aps.price), 0) as avg_appointment_value,
           COALESCE(MIN(aps.price), 0) as min_appointment_value,
           COALESCE(MAX(aps.price), 0) as max_appointment_value
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.business_id = $1`,
        [businessId]
      );

      // Recent activity (last 30 days)
      const recentActivityResult = await pool.query(
        `SELECT 
           COUNT(*) as recent_appointments,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as recent_completed,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN aps.price ELSE 0 END), 0) as recent_revenue
         FROM appointments a
         JOIN appointment_services aps ON a.id = aps.appointment_id
         WHERE a.business_id = $1 
         AND a.appointment_datetime >= NOW() - INTERVAL '30 days'`,
        [businessId]
      );

      const appointments = appointmentsResult.rows[0];
      const revenue = revenueResult.rows[0];
      const avgAppointment = avgAppointmentResult.rows[0];
      const recentActivity = recentActivityResult.rows[0];

      return {
        overview: {
          totalAppointments: parseInt(appointments.total_appointments || 0),
          completedAppointments: parseInt(appointments.completed_appointments || 0),
          cancelledAppointments: parseInt(appointments.cancelled_appointments || 0),
          pendingAppointments: parseInt(appointments.pending_appointments || 0),
          confirmedAppointments: parseInt(appointments.confirmed_appointments || 0),
          completionRate: appointments.total_appointments > 0 
            ? ((parseInt(appointments.completed_appointments || 0) / parseInt(appointments.total_appointments || 0)) * 100).toFixed(1)
            : '0.0'
        },
        revenue: {
          totalRevenue: parseFloat(revenue.total_revenue || 0),
          completedRevenue: parseFloat(revenue.completed_revenue || 0),
          cancelledRevenue: parseFloat(revenue.cancelled_revenue || 0),
          avgAppointmentValue: parseFloat(avgAppointment.avg_appointment_value || 0),
          minAppointmentValue: parseFloat(avgAppointment.min_appointment_value || 0),
          maxAppointmentValue: parseFloat(avgAppointment.max_appointment_value || 0)
        },
        topServices: topServicesResult.rows.map(row => ({
          name: row.service_name,
          price: parseFloat(row.service_price || 0),
          appointmentCount: parseInt(row.appointment_count || 0),
          totalRevenue: parseFloat(row.total_revenue || 0)
        })),
        topEmployees: topEmployeesResult.rows.map(row => ({
          name: row.employee_name,
          appointmentCount: parseInt(row.appointment_count || 0),
          completedCount: parseInt(row.completed_count || 0),
          totalRevenue: parseFloat(row.total_revenue || 0),
          completionRate: parseInt(row.appointment_count || 0) > 0 
            ? ((parseInt(row.completed_count || 0) / parseInt(row.appointment_count || 0)) * 100).toFixed(1)
            : '0.0'
        })),
        monthlyRevenue: monthlyRevenueResult.rows.map(row => ({
          month: row.month,
          appointmentCount: parseInt(row.appointment_count || 0),
          revenue: parseFloat(row.revenue || 0)
        })),
        weeklyAppointments: weeklyAppointmentsResult.rows.map(row => ({
          dayOfWeek: parseInt(row.day_of_week || 0),
          appointmentCount: parseInt(row.appointment_count || 0)
        })),
        recentActivity: {
          appointments: parseInt(recentActivity.recent_appointments || 0),
          completed: parseInt(recentActivity.recent_completed || 0),
          revenue: parseFloat(recentActivity.recent_revenue || 0)
        }
      };
      } catch (error) {
        console.error('Analytics getBusinessAnalytics error:', error);
        throw new Error(`Analytics verisi alınamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      }
    }),

  // Get detailed service analytics
  getServiceAnalytics: t.procedure
    .use(isBusiness)
    .query(async ({ ctx }) => {
      try {
        console.log('Analytics getServiceAnalytics - ctx.user:', ctx.user);
        
        if (!ctx.user || !ctx.user.id) {
          throw new Error('Kullanıcı bilgisi bulunamadı');
        }

        // Get business ID from session
        const businessResult = await pool.query(
          'SELECT id FROM businesses WHERE owner_user_id = $1',
          [ctx.user.id]
        );
      
      if (businessResult.rows.length === 0) {
        throw new Error('İşletme bulunamadı');
      }
      
      const businessId = businessResult.rows[0].id;

      const result = await pool.query(
        `SELECT 
           s.id,
           s.name as service_name,
           s.price as service_price,
           s.duration_minutes,
           COUNT(DISTINCT a.id) as total_appointments,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
           COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN aps.price ELSE 0 END), 0) as total_revenue,
           COALESCE(AVG(CASE WHEN a.status = 'completed' THEN aps.price ELSE NULL END), 0) as avg_revenue_per_appointment
         FROM services s
         LEFT JOIN appointment_services aps ON s.id = aps.service_id
         LEFT JOIN appointments a ON aps.appointment_id = a.id
         WHERE s.business_id = $1
         GROUP BY s.id, s.name, s.price, s.duration_minutes
         ORDER BY total_appointments DESC`,
        [businessId]
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.service_name,
        price: parseFloat(row.service_price || 0),
        durationMinutes: parseInt(row.duration_minutes || 0),
        totalAppointments: parseInt(row.total_appointments || 0),
        completedAppointments: parseInt(row.completed_appointments || 0),
        cancelledAppointments: parseInt(row.cancelled_appointments || 0),
        totalRevenue: parseFloat(row.total_revenue || 0),
        avgRevenuePerAppointment: parseFloat(row.avg_revenue_per_appointment || 0),
        completionRate: parseInt(row.total_appointments || 0) > 0 
          ? ((parseInt(row.completed_appointments || 0) / parseInt(row.total_appointments || 0)) * 100).toFixed(1)
          : '0.0'
      }));
      } catch (error) {
        console.error('Analytics getServiceAnalytics error:', error);
        throw new Error(`Hizmet analitikleri alınamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      }
    }),

  // Get detailed employee analytics
  getEmployeeAnalytics: t.procedure
    .use(isBusiness)
    .query(async ({ ctx }) => {
      try {
        console.log('Analytics getEmployeeAnalytics - ctx.user:', ctx.user);
        
        if (!ctx.user || !ctx.user.id) {
          throw new Error('Kullanıcı bilgisi bulunamadı');
        }

        // Get business ID from session
        const businessResult = await pool.query(
          'SELECT id FROM businesses WHERE owner_user_id = $1',
          [ctx.user.id]
        );
      
      if (businessResult.rows.length === 0) {
        throw new Error('İşletme bulunamadı');
      }
      
      const businessId = businessResult.rows[0].id;

      const result = await pool.query(
        `SELECT 
           e.id,
           e.name as employee_name,
           e.email,
           e.phone,
           COUNT(DISTINCT a.id) as total_appointments,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
           COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
           COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_appointments,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN aps.price ELSE 0 END), 0) as total_revenue,
           COALESCE(AVG(CASE WHEN a.status = 'completed' THEN aps.price ELSE NULL END), 0) as avg_revenue_per_completed
         FROM employees e
         LEFT JOIN appointment_services aps ON e.id = aps.employee_id
         LEFT JOIN appointments a ON aps.appointment_id = a.id
         WHERE e.business_id = $1
         GROUP BY e.id, e.name, e.email, e.phone
         ORDER BY total_appointments DESC`,
        [businessId]
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.employee_name,
        email: row.email,
        phone: row.phone,
        totalAppointments: parseInt(row.total_appointments || 0),
        completedAppointments: parseInt(row.completed_appointments || 0),
        cancelledAppointments: parseInt(row.cancelled_appointments || 0),
        pendingAppointments: parseInt(row.pending_appointments || 0),
        totalRevenue: parseFloat(row.total_revenue || 0),
        avgRevenuePerCompleted: parseFloat(row.avg_revenue_per_completed || 0),
        completionRate: parseInt(row.total_appointments || 0) > 0 
          ? ((parseInt(row.completed_appointments || 0) / parseInt(row.total_appointments || 0)) * 100).toFixed(1)
          : '0.0'
      }));
      } catch (error) {
        console.error('Analytics getEmployeeAnalytics error:', error);
        throw new Error(`Çalışan analitikleri alınamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      }
    })
}); 