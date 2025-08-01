'use client';

import { ReactElement, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Package, ChefHat, Truck, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ReorderModal } from '@/components/orders/ReorderModal';
import { useAccessToken } from '@/stores/auth';
import { orderService } from '@/lib/api-services';
import { formatCurrency } from '@/lib/utils';
import type { GetOrdersResponse, OrderStatus } from '@vibe/shared';

const ORDER_STATUS_CONFIG: Record<OrderStatus, { 
  icon: any;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
}> = {
  NEW: { icon: Clock, label: 'New', variant: 'outline', color: 'text-blue-600' },
  CONFIRMED: { icon: CheckCircle, label: 'Confirmed', variant: 'default', color: 'text-green-600' },
  PREPARING: { icon: ChefHat, label: 'Preparing', variant: 'default', color: 'text-orange-600' },
  READY: { icon: Package, label: 'Ready', variant: 'default', color: 'text-purple-600' },
  PICKED_UP: { icon: Truck, label: 'Picked Up', variant: 'default', color: 'text-blue-600' },
  DELIVERED: { icon: CheckCircle, label: 'Delivered', variant: 'default', color: 'text-green-600' },
  CANCELLED: { icon: XCircle, label: 'Cancelled', variant: 'destructive', color: 'text-red-600' },
};

export function OrderHistoryClient(): ReactElement {
  const router = useRouter();
  const accessToken = useAccessToken();
  const [orders, setOrders] = useState<GetOrdersResponse['orders']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [reorderModal, setReorderModal] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);

  const loadOrders = useCallback(async (pageNum = 1): Promise<void> => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      const response = await orderService.getOrders({ 
        page: pageNum, 
        limit: 10 
      }, accessToken);

      if (pageNum === 1) {
        setOrders(response.orders);
      } else {
        setOrders(prev => [...prev, ...response.orders]);
      }

      setHasMore(response.pagination.hasNextPage);
      setPage(pageNum);
    } catch (err: any) {
      // console.error('Failed to load orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login?returnUrl=/orders');
      return;
    }
    loadOrders();
  }, [accessToken, router, loadOrders]);

  const loadMore = (): void => {
    if (!loading && hasMore) {
      loadOrders(page + 1);
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

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between items-center mt-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => loadOrders()}>Try Again</Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
        <p className="text-muted-foreground mb-4">
          When you place your first order, it will appear here
        </p>
        <Button onClick={() => router.push('/')}>Browse Restaurants</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const statusConfig = ORDER_STATUS_CONFIG[order.status];
        const StatusIcon = statusConfig.icon;

        return (
          <Card 
            key={order.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/orders/${order.id}`)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    Order #{order.orderNumber}
                  </CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(order.createdAt)}
                  </div>
                </div>
                <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                  <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                  {statusConfig.label}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {/* Store Info */}
                <div>
                  <h4 className="font-medium">{order.storeName}</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {order.storeCategory.toLowerCase().replace('_', ' ')}
                  </p>
                </div>

                {/* Order Summary */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {order.itemCount} item{order.itemCount > 1 ? 's' : ''}
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(order.total)}
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReorderModal({
                          orderId: order.id,
                          orderNumber: order.orderNumber,
                        });
                      }}
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reorder
                    </Button>
                  </div>
                </div>

                {/* Estimated Delivery */}
                {order.estimatedDeliveryTime && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                  <div className="text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Estimated delivery: {formatDate(order.estimatedDeliveryTime)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center pt-4">
          <Button 
            variant="outline" 
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More Orders'}
          </Button>
        </div>
      )}

      {/* Reorder Modal */}
      {reorderModal && (
        <ReorderModal
          orderId={reorderModal.orderId}
          orderNumber={reorderModal.orderNumber}
          isOpen={true}
          onClose={() => setReorderModal(null)}
        />
      )}
    </div>
  );
}