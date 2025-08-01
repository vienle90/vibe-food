'use client';

import { ReactElement, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  CreditCard,
  Package,
  Clock,
  AlertCircle,
  PartyPopper,
  Wifi,
  WifiOff,
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderProgressIndicator } from '@/components/orders/OrderProgressIndicator';
import { ReorderModal } from '@/components/orders/ReorderModal';
import { useAccessToken } from '@/stores/auth';
import { orderService } from '@/lib/api-services';
import { formatCurrency } from '@/lib/utils';
import { useWebSocket, OrderStatusUpdate } from '@/hooks/useWebSocket';
import type { GetOrderDetailsResponse, OrderStatus } from '@vibe/shared';

interface OrderDetailsClientProps {
  orderId: string;
  isConfirmationPage?: boolean;
}


export function OrderDetailsClient({ orderId, isConfirmationPage = false }: OrderDetailsClientProps): ReactElement {
  const router = useRouter();
  const accessToken = useAccessToken();
  const [order, setOrder] = useState<GetOrderDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  // WebSocket for real-time updates
  const {
    isConnected,
    subscribeToOrder,
    unsubscribeFromOrder,
    onOrderStatusUpdate,
    error: wsError
  } = useWebSocket({ autoConnect: true });

  const loadOrderDetails = useCallback(async (): Promise<void> => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      const orderDetails = await orderService.getOrderDetails(orderId, accessToken);
      setOrder(orderDetails);
    } catch (err: any) {
      // console.error('Failed to load order details:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId, accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login?returnUrl=/orders/' + orderId);
      return;
    }
    loadOrderDetails();
  }, [orderId, accessToken, router, loadOrderDetails]);

  // Set up WebSocket subscription when order is loaded
  useEffect(() => {
    if (order?.id && isConnected) {
      subscribeToOrder(order.id);
      
      return () => {
        unsubscribeFromOrder(order.id);
      };
    }
    return undefined;
  }, [order?.id, isConnected, subscribeToOrder, unsubscribeFromOrder]);

  // Handle real-time order status updates
  useEffect(() => {
    const unsubscribe = onOrderStatusUpdate((update: OrderStatusUpdate) => {
      if (update.orderId === orderId) {
        // Update the order status in real-time
        setOrder(prevOrder => {
          if (!prevOrder) return null;
          
          return {
            ...prevOrder,
            status: update.status,
            estimatedDeliveryTime: update.estimatedDeliveryTime || prevOrder.estimatedDeliveryTime,
            updatedAt: update.timestamp
          };
        });

        // Update last update timestamp
        setLastUpdate(new Date().toISOString());

        // Show toast notification for status updates
        if (update.message) {
          toast.success(update.message, {
            description: `Order #${order?.orderNumber}`,
            action: {
              label: 'View',
              onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          });
        }
      }
    });

    return unsubscribe;
  }, [orderId, order?.orderNumber, onOrderStatusUpdate]);

  const handleCancelOrder = async (): Promise<void> => {
    if (!order || !window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    if (!accessToken) {
      router.push('/login?returnUrl=/orders/' + orderId);
      return;
    }
    try {
      setCancelling(true);
      await orderService.cancelOrder(order.id, accessToken);
      // Reload order details to get updated status
      await loadOrderDetails();
    } catch (err: any) {
      // console.error('Failed to cancel order:', err);
      alert(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canCancelOrder = (status: OrderStatus): boolean => {
    return ['NEW', 'CONFIRMED'].includes(status);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-12 w-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load order</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button onClick={loadOrderDetails}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Order not found</h3>
        <p className="text-muted-foreground mb-4">
          The order you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={() => router.push('/orders')}>View All Orders</Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground">{formatDate(order.createdAt)}</p>
          </div>
        </div>

        {canCancelOrder(order.status) && (
          <Button
            variant="outline"
            onClick={handleCancelOrder}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Order'}
          </Button>
        )}
      </div>

      {/* Confirmation Alert */}
      {isConfirmationPage && (
        <Alert className="border-green-200 bg-green-50">
          <PartyPopper className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Order Placed Successfully!</AlertTitle>
          <AlertDescription className="text-green-700">
            Your order has been received and will be processed shortly. You'll receive updates as your order progresses.
          </AlertDescription>
        </Alert>
      )}

      {/* Order Progress Indicator */}
      <OrderProgressIndicator
        currentStatus={order.status}
        {...(order.estimatedDeliveryTime && { estimatedDeliveryTime: order.estimatedDeliveryTime })}
        {...(order.actualDeliveryTime && { actualDeliveryTime: order.actualDeliveryTime })}
        createdAt={order.createdAt}
      />

      {/* Connection Status */}
      {wsError && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Connection Issue</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Real-time updates are currently unavailable. Order information may not be up to date.
            <Button 
              variant="link" 
              size="sm"
              onClick={loadOrderDetails}
              className="ml-2 h-auto p-0 text-yellow-700 underline"
            >
              Refresh manually
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isConnected && !wsError && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <Wifi className="w-4 h-4" />
          <span>Live updates connected</span>
          <div className="ml-auto flex items-center gap-1 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Active</span>
            {lastUpdate && (
              <span className="ml-2 text-green-500">
                Last update: {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}

      {!isConnected && !wsError && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          <Clock className="w-4 h-4" />
          <span>Connecting to live updates...</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Details */}
        <div className="space-y-6">
          {/* Store Info */}
          <Card>
            <CardHeader>
              <CardTitle>Restaurant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold">{order.store.name}</h4>
                <p className="text-sm text-muted-foreground capitalize">
                  {order.store.category.toLowerCase().replace('_', ' ')}
                </p>
              </div>
              {order.store.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4" />
                  <span>{order.store.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-medium">Delivery Address</p>
                  <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <div>
                  <p className="font-medium">Contact Number</p>
                  <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-medium">Payment Method</p>
                  <p className="text-sm text-muted-foreground">
                    {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : order.paymentMethod}
                  </p>
                </div>
              </div>

              {order.notes && (
                <div>
                  <p className="font-medium">Order Notes</p>
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Items & Summary */}
        <div className="space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-muted-foreground/40">
                      {item.menuItemName.charAt(0)}
                    </span>
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium text-sm line-clamp-1">
                      {item.menuItemName}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                    {item.specialInstructions && (
                      <p className="text-xs text-muted-foreground italic">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-sm font-medium">
                    {formatCurrency(item.totalPrice)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>

              {order.paymentMethod === 'CASH_ON_DELIVERY' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-800">
                    💰 You'll pay {formatCurrency(order.total)} in cash when your order arrives
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" onClick={() => router.push('/orders')}>
          View All Orders
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowReorderModal(true)}
          className="flex items-center gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          Reorder
        </Button>
        <Button variant="outline" onClick={() => router.push('/')}>
          Browse Restaurants
        </Button>
      </div>

      {/* Reorder Modal */}
      <ReorderModal
        orderId={order.id}
        orderNumber={order.orderNumber}
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
      />
    </div>
  );
}