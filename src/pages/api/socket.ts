import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { SocketServer, setSocketServer } from '../../server/socket';

interface SocketApiRequest extends NextApiRequest {
  socket: {
    server: HTTPServer & {
      io?: any;
    };
  } & any;
}

export default function handler(req: SocketApiRequest, res: NextApiResponse) {
  try {
    
    // Sadece GET isteklerini kabul et
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    
    if (req.socket.server.io) {
      res.json({ status: 'Socket.io already running' });
      return;
    }
    
    // Socket.io server'ı başlat
    const socketServer = new SocketServer(req.socket.server);
    req.socket.server.io = socketServer;
    
    setSocketServer(socketServer);
    
    res.json({ status: 'Socket.io server started successfully' });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Socket.io server başlatılamadı',
      details: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      }
    });
  }
}
