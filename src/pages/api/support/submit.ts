import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { pool } from '../../../server/db';

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

    // Send email notification to support team (optional)
    try {
      // You can add email notification here if needed
      console.log('New support ticket created:', {
        id: ticket.id,
        user: userName,
        email: userEmail,
        subject,
        category,
        priority
      });
    } catch (emailError) {
      console.error('Email notification error:', emailError);
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
