import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { pool } from '../../../server/db';
import { Resend } from 'resend';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subject, message, priority, category, userId, userEmail, userName, userType } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Ensure support_tickets table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('user', 'business')),
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('general', 'business', 'technical', 'billing')),
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create support ticket
    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, user_email, user_name, user_type, subject, message, category, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [userId, userEmail, userName, userType, subject, message, category, priority]
    );

    const ticket = result.rows[0];

    // Send email notification to support team
    try {
      console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
      console.log('RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length);
      
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const priorityEmoji: Record<string, string> = {
        low: '🟢',
        medium: '🟡', 
        high: '🔴'
      };

      const categoryText: Record<string, string> = {
        general: 'Genel Destek',
        business: 'İşletme Desteği',
        technical: 'Teknik Sorun',
        billing: 'Faturalandırma'
      };

      const userTypeText = userType === 'business' ? 'İşletme' : 'Kullanıcı';

      console.log('Sending email to:', 'yalduzbey@gmail.com');
      console.log('Email subject:', `[${priorityEmoji[priority]}] Yeni Destek Talebi - ${subject}`);

      // Try with a verified domain first, fallback to onboarding email
      const fromEmail = process.env.NODE_ENV === 'production' 
        ? 'Randevuo Destek <noreply@randevuo.com>'
        : 'onboarding@resend.dev';

      console.log('Using from email:', fromEmail);

      // First try a simple test email
      const testResult = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: ['yalduzbey@gmail.com'],
        subject: `TEST - Yeni Destek Talebi - ${subject}`,
        html: `
          <h2>Test Email - Destek Talebi</h2>
          <p><strong>Kullanıcı:</strong> ${userName} (${userEmail})</p>
          <p><strong>Konu:</strong> ${subject}</p>
          <p><strong>Mesaj:</strong> ${message}</p>
          <p><strong>Kategori:</strong> ${categoryText[category]}</p>
          <p><strong>Öncelik:</strong> ${priorityEmoji[priority]} ${priority.toUpperCase()}</p>
          <p><strong>Tarih:</strong> ${new Date(ticket.created_at).toLocaleString('tr-TR')}</p>
        `,
      });

      console.log('Test email result:', testResult);

      const emailResult = await resend.emails.send({
        from: fromEmail,
        to: ['yalduzbey@gmail.com'],
        subject: `[${priorityEmoji[priority]}] Yeni Destek Talebi - ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: linear-gradient(135deg, #e11d48, #d946ef, #6366f1); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">🎫 Yeni Destek Talebi</h1>
            </div>
            
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div style="background: #f3f4f6; padding: 12px; border-radius: 8px;">
                  <strong style="color: #374151;">Ticket ID:</strong><br>
                  <span style="color: #6b7280; font-family: monospace;">${ticket.id}</span>
                </div>
                <div style="background: #f3f4f6; padding: 12px; border-radius: 8px;">
                  <strong style="color: #374151;">Öncelik:</strong><br>
                  <span style="color: #6b7280;">${priorityEmoji[priority]} ${priority.toUpperCase()}</span>
                </div>
                <div style="background: #f3f4f6; padding: 12px; border-radius: 8px;">
                  <strong style="color: #374151;">Kategori:</strong><br>
                  <span style="color: #6b7280;">${categoryText[category]}</span>
                </div>
                <div style="background: #f3f4f6; padding: 12px; border-radius: 8px;">
                  <strong style="color: #374151;">Kullanıcı Tipi:</strong><br>
                  <span style="color: #6b7280;">${userTypeText}</span>
                </div>
              </div>

              <div style="margin-bottom: 20px;">
                <h3 style="color: #374151; margin-bottom: 8px; font-size: 18px;">👤 Kullanıcı Bilgileri</h3>
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #e11d48;">
                  <p style="margin: 0 0 8px 0;"><strong>Ad:</strong> ${userName}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${userEmail}</p>
                  <p style="margin: 0;"><strong>ID:</strong> ${userId}</p>
                </div>
              </div>

              <div style="margin-bottom: 20px;">
                <h3 style="color: #374151; margin-bottom: 8px; font-size: 18px;">📝 Konu</h3>
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #d946ef;">
                  <p style="margin: 0; font-size: 16px; font-weight: 500;">${subject}</p>
                </div>
              </div>

              <div style="margin-bottom: 20px;">
                <h3 style="color: #374151; margin-bottom: 8px; font-size: 18px;">💬 Mesaj</h3>
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1;">
                  <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
                </div>
              </div>

              <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #f59e0b; margin-top: 20px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⏰ Oluşturulma Tarihi:</strong> ${new Date(ticket.created_at).toLocaleString('tr-TR')}
                </p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p>Bu email Randevuo destek sistemi tarafından otomatik olarak gönderilmiştir.</p>
            </div>
          </div>
        `,
      });

      console.log('Email send result:', emailResult);
      console.log('Support ticket email sent successfully:', ticket.id);
    } catch (emailError: any) {
      console.error('Email notification error:', emailError);
      console.error('Email error details:', {
        message: emailError?.message,
        name: emailError?.name,
        stack: emailError?.stack
      });
      // Don't fail the request if email fails
    }

    res.status(200).json({ 
      success: true, 
      ticketId: ticket.id,
      message: 'Support ticket created successfully' 
    });
  } catch (error) {
    console.error('Support ticket creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
