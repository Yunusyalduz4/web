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
    console.log('🔌 Socket.io API endpoint çağrıldı');
    console.log('🔌 Request method:', req.method);
    console.log('🔌 Request URL:', req.url);
    
    // Sadece GET isteklerini kabul et
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    
    if (req.socket.server.io) {
      console.log('✅ Socket.io zaten çalışıyor');
      res.json({ status: 'Socket.io already running' });
      return;
    }

    console.log('🚀 Socket.io server başlatılıyor...');
    console.log('🚀 Server type:', typeof req.socket.server);
    
    // Socket.io server'ı başlat
    const socketServer = new SocketServer(req.socket.server);
    req.socket.server.io = socketServer;
    
    setSocketServer(socketServer);
    
    console.log('✅ Socket.io server başarıyla başlatıldı');
    res.json({ status: 'Socket.io server started successfully' });
  } catch (error) {
    console.error('❌ Socket.io server başlatma hatası:', error);
    console.error('❌ Error details:', error);
    res.status(500).json({ error: 'Socket.io server başlatılamadı' });
  }
}
