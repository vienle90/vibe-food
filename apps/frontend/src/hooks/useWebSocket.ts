'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { OrderStatus } from '@vibe/shared';

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  estimatedDeliveryTime?: string;
  message?: string;
  timestamp: string;
}

export interface NotificationMessage {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

export interface SystemMessage {
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionAttempts?: number;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribeToOrder: (orderId: string) => void;
  unsubscribeFromOrder: (orderId: string) => void;
  joinStoreRoom: (storeId: string) => void;
  onOrderStatusUpdate: (callback: (update: OrderStatusUpdate) => void) => () => void;
  onNotification: (callback: (notification: NotificationMessage) => void) => () => void;
  onSystemMessage: (callback: (message: SystemMessage) => void) => () => void;
  error: Error | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionDelay = 1000,
    reconnectionAttempts = 5
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const getAuthToken = useCallback(() => {
    // Get token from localStorage or your auth state management
    // For development/testing, use a mock token if no real token is available
    const token = localStorage.getItem('auth_token') || 
                  sessionStorage.getItem('auth_token') ||
                  process.env.NEXT_PUBLIC_MOCK_TOKEN;
    
    // For development, create a mock JWT token if none exists
    if (!token && process.env.NODE_ENV === 'development') {
      const mockToken = 'mock-jwt-token-for-development';
      return mockToken;
    }
    
    return token;
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError(new Error('No authentication token available'));
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: {
          token
        },
        reconnection,
        reconnectionDelay,
        reconnectionAttempts
      });

      // Connection event handlers
      socket.on('connect', () => {
        // console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
      });

      socket.on('disconnect', (reason) => {
        // console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Handle automatic reconnection
        if (reconnection && reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          if (reconnectAttemptsRef.current < reconnectionAttempts) {
            reconnectAttemptsRef.current++;
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectionDelay * reconnectAttemptsRef.current);
          }
        }
      });

      socket.on('connect_error', (error) => {
        // console.error('WebSocket connection error:', error);
        setError(error);
        setIsConnecting(false);
        setIsConnected(false);
      });

      // Handle authentication errors
      socket.on('error', (error) => {
        // console.error('WebSocket error:', error);
        setError(new Error(error));
        setIsConnecting(false);
      });

      // Heartbeat mechanism
      socket.on('pong', () => {
        // Server responded to ping
      });

      socketRef.current = socket;
    } catch (error) {
      // console.error('Failed to create WebSocket connection:', error);
      setError(error as Error);
      setIsConnecting(false);
    }
  }, [getAuthToken, reconnection, reconnectionDelay, reconnectionAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const subscribeToOrder = useCallback((orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe-order', orderId);
    }
  }, []);

  const unsubscribeFromOrder = useCallback((orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe-order', orderId);
    }
  }, []);

  const joinStoreRoom = useCallback((storeId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-store-room', storeId);
    }
  }, []);

  const onOrderStatusUpdate = useCallback((callback: (update: OrderStatusUpdate) => void) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on('order-status-update', callback);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('order-status-update', callback);
      }
    };
  }, []);

  const onNotification = useCallback((callback: (notification: NotificationMessage) => void) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on('notification', callback);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('notification', callback);
      }
    };
  }, []);

  const onSystemMessage = useCallback((callback: (message: SystemMessage) => void) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on('system-message', callback);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('system-message', callback);
      }
    };
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Set up heartbeat
  useEffect(() => {
    if (!isConnected || !socketRef.current) return;

    const heartbeatInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 30000); // Ping every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    subscribeToOrder,
    unsubscribeFromOrder,
    joinStoreRoom,
    onOrderStatusUpdate,
    onNotification,
    onSystemMessage,
    error
  };
}