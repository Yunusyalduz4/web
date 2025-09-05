import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  sendNewAppointmentNotification,
  sendReviewNotification,
  sendBusinessApprovalNotification,
  sendEmployeeAppointmentNotification,
  sendFavoriteBusinessNotification,
  sendSystemNotification
} from '../../../utils/pushNotification';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { notificationType, userId, businessId } = req.body;
    
    if (!notificationType || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let result;
    const now = new Date().toISOString();

    switch (notificationType) {
      case 'new_appointment':
        result = await sendNewAppointmentNotification(
          'test-appointment-id',
          businessId || 'test-business-id',
          userId,
          now,
          'Test İşletmesi',
          'Test Müşteri',
          ['Saç Kesimi', 'Sakal Tıraşı']
        );
        break;

      case 'new_review':
        result = await sendReviewNotification(
          'test-review-id',
          businessId || 'test-business-id',
          userId,
          5,
          'Test İşletmesi',
          'Test Müşteri'
        );
        break;

      case 'business_approval':
        result = await sendBusinessApprovalNotification(
          businessId || 'test-business-id',
          'approved',
          'Test İşletmesi',
          'Test onay mesajı'
        );
        break;

      case 'employee_appointment':
        result = await sendEmployeeAppointmentNotification(
          'test-employee-id',
          'test-appointment-id',
          businessId || 'test-business-id',
          now,
          'Test Müşteri',
          ['Saç Kesimi']
        );
        break;

      case 'favorite_business':
        result = await sendFavoriteBusinessNotification(
          businessId || 'test-business-id',
          userId,
          'new_service',
          'Test İşletmesi',
          'Yeni hizmet eklendi: Özel Saç Bakımı'
        );
        break;

      case 'system':
        result = await sendSystemNotification(
          userId,
          'Test Bildirimi',
          'Bu bir test sistem bildirimidir.',
          'general'
        );
        break;

      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }

    res.status(200).json({
      success: true,
      notificationType,
      result
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ 
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
