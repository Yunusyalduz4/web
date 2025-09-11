import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { NextApiRequest } from 'next';
import { getSession } from 'next-auth/react';
import { pool } from './db';

export interface SocketUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'business' | 'admin';
  businessId?: string;
}

export interface SocketData {
  user: SocketUser;
}

export class SocketServer {
  private io: SocketIOServer;
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private businessSockets: Map<string, string[]> = new Map(); // businessId -> socketIds[]

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          process.env.NEXTAUTH_URL || "http://localhost:3000", 
          "http://localhost:3001", 
          "http://localhost:3002",
          // VPS için ek origin'ler
          ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
          // Randevuo.com domain'i
          "https://randevuo.com",
          "http://randevuo.com",
          "https://www.randevuo.com",
          "http://www.randevuo.com"
        ],
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
      },
      transports: ['websocket', 'polling'], // Önce websocket, sonra polling
      allowEIO3: true,
      pingTimeout: 120000, // 2 dakika (daha uzun)
      pingInterval: 60000, // 1 dakika (daha uzun)
      upgradeTimeout: 20000, // 20 saniye
      maxHttpBufferSize: 1e6, // 1MB
      perMessageDeflate: false, // Compression'ı kapat (performance için)
      httpCompression: false // HTTP compression'ı kapat
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        // Auth token'dan user ID'yi al
        const authToken = socket.handshake.auth?.token;
        
        if (!authToken) {
          return next(new Error('No auth token provided'));
        }

        // Basit authentication - production'da JWT verify yapılmalı
        const user: SocketUser = {
          id: authToken,
          email: '',
          name: `User-${authToken.slice(0, 8)}`,
          role: 'user',
          businessId: undefined
        };

        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      if (!user) {
        return;
      }

      // Kullanıcıyı kendi odasına ekle
      socket.join(`user:${user.id}`);
      this.userSockets.set(user.id, socket.id);

      // İşletme sahibi ise işletme odasına ekle
      if (user.businessId) {
        socket.join(`business:${user.businessId}`);
        this.addBusinessSocket(user.businessId, socket.id);
      }

      // Admin ise admin odasına ekle
      if (user.role === 'admin') {
        socket.join('admin');
      }

      // Genel odaya ekle
      socket.join('public');

      // Disconnect event
      socket.on('disconnect', () => {
        this.userSockets.delete(user.id);
        if (user.businessId) {
          this.removeBusinessSocket(user.businessId, socket.id);
        }
      });

      // Join business room
      socket.on('join:business', (businessId: string) => {
        if (user.businessId === businessId || user.role === 'admin') {
          socket.join(`business:${businessId}`);
          this.addBusinessSocket(businessId, socket.id);
        }
      });

      // Leave business room
      socket.on('leave:business', (businessId: string) => {
        socket.leave(`business:${businessId}`);
        this.removeBusinessSocket(businessId, socket.id);
      });

      // Join employee room
      socket.on('join:employee', async (employeeId: string) => {
        if (user.role === 'admin' || (user.businessId && await this.isEmployeeInBusiness(employeeId, user.businessId))) {
          socket.join(`employee:${employeeId}`);
        }
      });

      // Leave employee room
      socket.on('leave:employee', (employeeId: string) => {
        socket.leave(`employee:${employeeId}`);
      });

      // Test event
      socket.on('test:message', (message: string) => {
        socket.emit('test:response', `Mesaj alındı: ${message}`);
      });
    });
  }

  // Business socket yönetimi
  private addBusinessSocket(businessId: string, socketId: string) {
    if (!this.businessSockets.has(businessId)) {
      this.businessSockets.set(businessId, []);
    }
    const sockets = this.businessSockets.get(businessId)!;
    if (!sockets.includes(socketId)) {
      sockets.push(socketId);
    }
  }

  private removeBusinessSocket(businessId: string, socketId: string) {
    const sockets = this.businessSockets.get(businessId);
    if (sockets) {
      const index = sockets.indexOf(socketId);
      if (index > -1) {
        sockets.splice(index, 1);
      }
      if (sockets.length === 0) {
        this.businessSockets.delete(businessId);
      }
    }
  }

  private async isEmployeeInBusiness(employeeId: string, businessId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT id FROM employees WHERE id = $1 AND business_id = $2',
        [employeeId, businessId]
      );
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Public methods for emitting events
  public emitToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public emitToBusiness(businessId: string, event: string, data: any) {
    this.io.to(`business:${businessId}`).emit(event, data);
  }

  public emitToEmployee(employeeId: string, event: string, data: any) {
    this.io.to(`employee:${employeeId}`).emit(event, data);
  }

  public emitToAdmin(event: string, data: any) {
    this.io.to('admin').emit(event, data);
  }

  public emitToPublic(event: string, data: any) {
    this.io.to('public').emit(event, data);
  }

  // Appointment events
  public emitAppointmentCreated(appointmentData: any) {
    const { businessId, userId, employeeId } = appointmentData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:appointment:created', appointmentData);
    
    // Müşteriye bildir
    if (userId) {
      this.emitToUser(userId, 'socket:appointment:created', appointmentData);
    }
    
    // Çalışana bildir
    if (employeeId) {
      this.emitToEmployee(employeeId, 'socket:appointment:assigned', appointmentData);
    }
  }

  public emitAppointmentStatusUpdated(appointmentData: any) {
    const { businessId, userId, employeeId, oldStatus, newStatus } = appointmentData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:appointment:status_updated', appointmentData);
    
    // Müşteriye bildir
    if (userId) {
      this.emitToUser(userId, 'socket:appointment:status_updated', appointmentData);
    }
    
    // Çalışana bildir
    if (employeeId) {
      this.emitToEmployee(employeeId, 'socket:appointment:status_updated', appointmentData);
    }
  }

  public emitManualAppointmentCreated(appointmentData: any) {
    const { businessId, employeeId } = appointmentData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:appointment:manual_created', appointmentData);
    
    // Çalışana bildir
    if (employeeId) {
      this.emitToEmployee(employeeId, 'socket:appointment:assigned', appointmentData);
    }
  }

  // Review events
  public emitReviewCreated(reviewData: any) {
    const { businessId, userId } = reviewData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:review:created', reviewData);
    
    // Müşteriye bildir
    if (userId) {
      this.emitToUser(userId, 'socket:review:created', reviewData);
    }
  }

  public emitReviewReplied(reviewData: any) {
    const { businessId, userId } = reviewData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:review:replied', reviewData);
    
    // Müşteriye bildir
    if (userId) {
      this.emitToUser(userId, 'socket:review:replied', reviewData);
    }
  }

  // Business events
  public emitBusinessUpdated(businessData: any) {
    const { businessId } = businessData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:business:updated', businessData);
    
    // Genel duyuru
    this.emitToPublic('socket:business:updated', businessData);
  }

  public emitServiceCreated(serviceData: any) {
    const { businessId } = serviceData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:service:created', serviceData);
  }

  public emitEmployeeCreated(employeeData: any) {
    const { businessId } = employeeData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:employee:created', employeeData);
  }

  // Notification events
  public emitNotificationSent(notificationData: any) {
    const { type, targetId } = notificationData;
    
    if (type === 'user') {
      this.emitToUser(targetId, 'socket:notification:sent', notificationData);
    } else if (type === 'business') {
      this.emitToBusiness(targetId, 'socket:notification:sent', notificationData);
    } else if (type === 'admin') {
      this.emitToAdmin('socket:notification:sent', notificationData);
    }
  }

  // Reschedule events
  public emitRescheduleRequested(rescheduleData: any) {
    const { businessId, userId, employeeId } = rescheduleData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:reschedule:requested', rescheduleData);
    
    // Müşteriye bildir
    if (userId) {
      this.emitToUser(userId, 'socket:reschedule:requested', rescheduleData);
    }
    
    // Çalışana bildir
    if (employeeId) {
      this.emitToEmployee(employeeId, 'socket:reschedule:requested', rescheduleData);
    }
  }

  public emitRescheduleApproved(rescheduleData: any) {
    const { businessId, userId, employeeId } = rescheduleData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:reschedule:approved', rescheduleData);
    
    // Müşteriye bildir
    if (userId) {
      this.emitToUser(userId, 'socket:reschedule:approved', rescheduleData);
    }
    
    // Çalışana bildir
    if (employeeId) {
      this.emitToEmployee(employeeId, 'socket:reschedule:approved', rescheduleData);
    }
  }

  public emitRescheduleRejected(rescheduleData: any) {
    const { businessId, userId, employeeId } = rescheduleData;
    
    // İşletmeye bildir
    this.emitToBusiness(businessId, 'socket:reschedule:rejected', rescheduleData);
    
    // Müşteriye bildir
    if (userId) {
      this.emitToUser(userId, 'socket:reschedule:rejected', rescheduleData);
    }
    
    // Çalışana bildir
    if (employeeId) {
      this.emitToEmployee(employeeId, 'socket:reschedule:rejected', rescheduleData);
    }
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.io.engine.clientsCount;
  }

  // Get business connections count
  public getBusinessConnectionsCount(businessId: string): number {
    const sockets = this.businessSockets.get(businessId);
    return sockets ? sockets.length : 0;
  }

  // Broadcast to all connected clients
  public broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }
}

// Singleton instance
let socketServer: SocketServer | null = null;

export function getSocketServer(): SocketServer | null {
  return socketServer;
}

export function setSocketServer(server: SocketServer) {
  socketServer = server;
}
