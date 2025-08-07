import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ 
      message: 'API is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  } else if (req.method === 'POST') {
    res.status(200).json({ 
      message: 'POST request received!',
      body: req.body,
      timestamp: new Date().toISOString()
    });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
