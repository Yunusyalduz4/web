import { t } from '../trpc/trpc';
import { z } from 'zod';
import { pool } from '../db';
import { isBusiness } from '../trpc/trpc';

export const analyticsRouter = t.router({
  // Get business analytics overview
  getBusinessAnalytics: t.procedure
    .use(isBusiness)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { businessId } = input;

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
           COALESCE(SUM(s.price), 0) as total_revenue,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as completed_revenue,
           COALESCE(SUM(CASE WHEN a.status = 'cancelled' THEN s.price ELSE 0 END), 0) as cancelled_revenue
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         WHERE a.business_id = $1`,
        [businessId]
      );

      // Top services by appointment count
      const topServicesResult = await pool.query(
        `SELECT 
           s.name as service_name,
           s.price as service_price,
           COUNT(*) as appointment_count,
           COALESCE(SUM(s.price), 0) as total_revenue
         FROM appointments a
         JOIN services s ON a.service_id = s.id
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
           COALESCE(SUM(s.price), 0) as total_revenue
         FROM appointments a
         JOIN employees e ON a.employee_id = e.id
         JOIN services s ON a.service_id = s.id
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
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as revenue
         FROM appointments a
         JOIN services s ON a.service_id = s.id
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
           COALESCE(AVG(s.price), 0) as avg_appointment_value,
           COALESCE(MIN(s.price), 0) as min_appointment_value,
           COALESCE(MAX(s.price), 0) as max_appointment_value
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         WHERE a.business_id = $1`,
        [businessId]
      );

      // Recent activity (last 30 days)
      const recentActivityResult = await pool.query(
        `SELECT 
           COUNT(*) as recent_appointments,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as recent_completed,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as recent_revenue
         FROM appointments a
         JOIN services s ON a.service_id = s.id
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
    }),

  // Get detailed service analytics
  getServiceAnalytics: t.procedure
    .use(isBusiness)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { businessId } = input;

      const result = await pool.query(
        `SELECT 
           s.id,
           s.name as service_name,
           s.price as service_price,
           s.duration_minutes,
           COUNT(*) as total_appointments,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
           COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as total_revenue,
           COALESCE(AVG(s.price), 0) as avg_revenue_per_appointment
         FROM services s
         LEFT JOIN appointments a ON s.id = a.service_id
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
    }),

  // Get detailed employee analytics
  getEmployeeAnalytics: t.procedure
    .use(isBusiness)
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { businessId } = input;

      const result = await pool.query(
        `SELECT 
           e.id,
           e.name as employee_name,
           e.email,
           e.phone,
           COUNT(*) as total_appointments,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
           COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
           COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_appointments,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as total_revenue,
           COALESCE(AVG(CASE WHEN a.status = 'completed' THEN s.price ELSE NULL END), 0) as avg_revenue_per_completed
         FROM employees e
         LEFT JOIN appointments a ON e.id = a.employee_id
         LEFT JOIN services s ON a.service_id = s.id
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
    })
}); 