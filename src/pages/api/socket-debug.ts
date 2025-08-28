import { NextApiRequest, NextApiResponse } from 'next';
import { getSocketServer } from '../../server/socket';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const socketServer = getSocketServer();
    
    if (!socketServer) {
      return res.status(200).json({ 
        status: 'not_initialized',
        message: 'Socket.io server henüz başlatılmamış'
      });
    }

    const connectedUsers = socketServer.getConnectedUsersCount();
    
    return res.status(200).json({
      status: 'running',
      message: 'Socket.io server çalışıyor',
      connectedUsers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Socket debug error:', error);
    return res.status(500).json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
}
