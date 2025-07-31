import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { OrderStatus } from '@prisma/client';
import { logger } from '../monitoring/logger';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  estimatedDeliveryTime?: string;
  message?: string;
  timestamp: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, AuthenticatedSocket>();
  
  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('WebSocket service initialized');
  }

  /**
   * Set up authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        (socket as AuthenticatedSocket).userId = decoded.sub;
        (socket as AuthenticatedSocket).userRole = decoded.role;
        
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      logger.info(`User ${authSocket.userId} connected via WebSocket`);
      
      // Store the connection
      this.connectedUsers.set(authSocket.userId, authSocket);

      // Join user to their personal room for order updates
      authSocket.join(`user:${authSocket.userId}`);

      // If user is a store owner, join them to their store rooms
      if (authSocket.userRole === 'STORE_OWNER') {
        // Note: In production, you'd query the database to get the stores this user owns
        // For now, we'll rely on the client to join specific store rooms
        authSocket.on('join-store-room', (storeId: string) => {
          authSocket.join(`store:${storeId}`);
          logger.info(`Store owner ${authSocket.userId} joined store room: ${storeId}`);
        });
      }

      // Handle order status subscriptions
      authSocket.on('subscribe-order', (orderId: string) => {
        authSocket.join(`order:${orderId}`);
        logger.info(`User ${authSocket.userId} subscribed to order: ${orderId}`);
      });

      authSocket.on('unsubscribe-order', (orderId: string) => {
        authSocket.leave(`order:${orderId}`);
        logger.info(`User ${authSocket.userId} unsubscribed from order: ${orderId}`);
      });

      // Handle client-side heartbeat
      authSocket.on('ping', () => {
        authSocket.emit('pong');
      });

      // Handle disconnection
      authSocket.on('disconnect', (reason) => {
        logger.info(`User ${authSocket.userId} disconnected: ${reason}`);
        this.connectedUsers.delete(authSocket.userId);
      });
    });
  }

  /**
   * Broadcast order status update to relevant clients
   */
  public broadcastOrderUpdate(update: OrderStatusUpdate, customerId: string, storeId: string): void {
    try {
      // Send to customer
      this.io.to(`user:${customerId}`).emit('order-status-update', update);
      
      // Send to order-specific room (for order tracking pages)
      this.io.to(`order:${update.orderId}`).emit('order-status-update', update);
      
      // Send to store owners in the store room
      this.io.to(`store:${storeId}`).emit('order-status-update', update);

      logger.info(`Broadcasted order update for order ${update.orderId} to customer ${customerId} and store ${storeId}`);
    } catch (error) {
      logger.error('Failed to broadcast order update:', error);
    }
  }

  /**
   * Send notification to specific user
   */
  public sendNotificationToUser(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }): void {
    try {
      this.io.to(`user:${userId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });

      logger.info(`Sent notification to user ${userId}: ${notification.title}`);
    } catch (error) {
      logger.error('Failed to send notification:', error);
    }
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Broadcast system message to all connected clients
   */
  public broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system-message', {
      type,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get Socket.IO instance for advanced usage
   */
  public getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Close WebSocket server
   */
  public close(): void {
    this.io.close();
    logger.info('WebSocket service closed');
  }
}

// Singleton instance
let webSocketService: WebSocketService | null = null;

export const initializeWebSocketService = (httpServer: HttpServer): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(httpServer);
  }
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    throw new Error('WebSocket service not initialized. Call initializeWebSocketService first.');
  }
  return webSocketService;
};