'use client';

import { ReactElement, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Package, ChefHat, Truck, CheckCircle2, XCircle, Clock, AlertCircle, DollarSign, BarChart3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccessToken } from '@/stores/auth';
import { formatCurrency } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { GetOrdersResponse, OrderStatus, UpdateOrderStatusRequest } from '@vibe/shared';

// Reuse the same ORDER_STATUS_CONFIG from existing order client
const ORDER_STATUS_CONFIG: Record<OrderStatus, { 
  icon: any;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
  bgColor: string;
}> = {
  NEW: { 
    icon: Clock, 
    label: 'New', 
    variant: 'outline', 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  CONFIRMED: { 
    icon: CheckCircle2, 
    label: 'Confirmed', 
    variant: 'default', 
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200'
  },
  PREPARING: { 
    icon: ChefHat, 
    label: 'Preparing', 
    variant: 'default', 
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200'
  },
  READY: { 
    icon: Package, 
    label: 'Ready', 
    variant: 'default', 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200'
  },
  PICKED_UP: { 
    icon: Truck, 
    label: 'Picked Up', 
    variant: 'default', 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  DELIVERED: { 
    icon: CheckCircle2, 
    label: 'Delivered', 
    variant: 'default', 
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200'
  },
  CANCELLED: { 
    icon: XCircle, 
    label: 'Cancelled', 
    variant: 'destructive', 
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200'
  },
};

// Order status transitions for store owners
const STORE_OWNER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['PICKED_UP'],
  PICKED_UP: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

interface StoreOwnerOrdersClientProps {
  storeId: string;
  initialFilters?: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  };
}

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
}

/**
 * Store Owner Orders Management Client Component
 * 
 * Provides comprehensive order management interface for store owners including:
 * - Real-time order list with filtering
 * - Order status update controls
 * - Order statistics dashboard
 * - Optimistic UI updates
 * - WebSocket integration for live updates
 */
export function StoreOwnerOrdersClient({ 
  storeId, 
  initialFilters = {} 
}: StoreOwnerOrdersClientProps): ReactElement {
  const router = useRouter();
  const accessToken = useAccessToken();
  
  // State management
  const [orders, setOrders] = useState<GetOrdersResponse['orders']>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialFilters.page || 1);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(initialFilters.status);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());

  // Load orders with filtering
  const loadOrders = useCallback(async (pageNum = 1, status?: OrderStatus): Promise<void> => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
      });
      
      if (status) {
        params.set('status', status);
      }
      
      const response = await fetch(
        `/api/orders/store/${storeId}/orders?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
          return;
        }
        if (response.status === 403) {
          setError('You do not have access to manage orders for this store');
          return;
        }
        throw new Error(`Failed to load orders: ${response.status}`);
      }

      const data = await response.json();
      
      if (pageNum === 1) {
        setOrders(data.data.orders);
      } else {
        setOrders(prev => [...prev, ...data.data.orders]);
      }

      setHasMore(data.data.pagination.hasNextPage);
      setPage(pageNum);
    } catch (err: any) {
      // Error already set in setError above
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [accessToken, storeId, router]);

  // Load store statistics
  const loadStats = useCallback(async (): Promise<void> => {
    if (!accessToken) return;
    
    try {
      setLoadingStats(true);
      
      const response = await fetch(
        `/api/orders/store/${storeId}/stats`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      // Stats loading failure is non-critical, silently fail
    } finally {
      setLoadingStats(false);
    }
  }, [accessToken, storeId]);

  // Update order status with optimistic updates
  const updateOrderStatus = useCallback(async (
    orderId: string, 
    newStatus: OrderStatus,
    notes?: string
  ): Promise<void> => {
    if (!accessToken) return;

    // Add to updating set
    setUpdatingOrders(prev => new Set(prev).add(orderId));

    // Optimistic update
    const originalOrder = orders.find(o => o.id === orderId);
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus }
        : order
    ));

    try {
      const updateRequest: UpdateOrderStatusRequest = {
        status: newStatus,
        ...(notes && { notes }),
      };

      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to update order status: ${response.status}`);
      }

      // Reload stats after successful update
      loadStats();
    } catch (err: any) {
      // Error is displayed to user via setError below
      
      // Revert optimistic update on error
      if (originalOrder) {
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? originalOrder
            : order
        ));
      }
      
      setError(`Failed to update order: ${err.message}`);
    } finally {
      // Remove from updating set
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  }, [accessToken, orders, loadStats]);

  // WebSocket integration for real-time updates
  const { joinStoreRoom, onOrderStatusUpdate } = useWebSocket();

  // Initial load
  useEffect(() => {
    if (!accessToken) {
      router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    loadOrders(1, statusFilter);
    loadStats();
  }, [accessToken, statusFilter, router, loadOrders, loadStats]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!accessToken || !storeId) return;

    // Join store room for real-time updates
    joinStoreRoom(storeId);

    // Subscribe to order status updates
    const unsubscribe = onOrderStatusUpdate((update) => {
      // Update order in local state
      setOrders(prev => prev.map(order => 
        order.id === update.orderId 
          ? { 
              ...order, 
              status: update.status,
              ...(update.estimatedDeliveryTime && { 
                estimatedDeliveryTime: update.estimatedDeliveryTime 
              })
            }
          : order
      ));

      // Refresh stats when order status changes
      loadStats();
    });

    return unsubscribe;
  }, [accessToken, storeId, joinStoreRoom, onOrderStatusUpdate, loadStats]);

  // Load more orders
  const loadMore = (): void => {
    if (!loading && hasMore) {
      loadOrders(page + 1, statusFilter);
    }
  };

  // Filter by status
  const handleStatusFilter = (status?: OrderStatus): void => {
    setStatusFilter(status);
    setPage(1);
    // Update URL without page reload
    const url = new URL(window.location.href);
    if (status) {
      url.searchParams.set('status', status);
    } else {
      url.searchParams.delete('status');
    }
    url.searchParams.delete('page');
    window.history.replaceState({}, '', url.toString());
  };

  // Format date helper
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render status action buttons
  const renderStatusActions = (order: GetOrdersResponse['orders'][0]): ReactElement => {
    const availableTransitions = STORE_OWNER_TRANSITIONS[order.status];
    const isUpdating = updatingOrders.has(order.id);

    if (availableTransitions.length === 0) {
      return <span className="text-sm text-muted-foreground">No actions available</span>;
    }

    return (
      <div className="flex gap-2 flex-wrap">
        {availableTransitions.map((newStatus) => {
          const statusConfig = ORDER_STATUS_CONFIG[newStatus];
          const StatusIcon = statusConfig.icon;
          
          return (
            <Button
              key={newStatus}
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation();
                updateOrderStatus(order.id, newStatus);
              }}
              className="flex items-center gap-1"
            >
              <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
              {statusConfig.label}
            </Button>
          );
        })}
      </div>
    );
  };

  // Statistics Cards
  const statsCards = [
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Completed Orders',
      value: stats?.completedOrders || 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  // Status filter buttons
  const statusFilters = [
    { label: 'All Orders', value: undefined },
    { label: 'New', value: 'NEW' as OrderStatus },
    { label: 'Confirmed', value: 'CONFIRMED' as OrderStatus },
    { label: 'Preparing', value: 'PREPARING' as OrderStatus },
    { label: 'Ready', value: 'READY' as OrderStatus },
    { label: 'Picked Up', value: 'PICKED_UP' as OrderStatus },
    { label: 'Delivered', value: 'DELIVERED' as OrderStatus },
    { label: 'Cancelled', value: 'CANCELLED' as OrderStatus },
  ];

  // Loading skeleton
  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders skeleton */}
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
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Orders</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => {
          setError(null);
          loadOrders(1, statusFilter);
          loadStats();
        }}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const StatIcon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <StatIcon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">
                      {loadingStats ? (
                        <Skeleton className="h-6 w-16" />
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Filter Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Button
                key={filter.label}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter 
                ? `No ${statusFilter.toLowerCase()} orders at the moment`
                : 'No orders have been placed yet'
              }
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const statusConfig = ORDER_STATUS_CONFIG[order.status];
            const StatusIcon = statusConfig.icon;
            const isUpdating = updatingOrders.has(order.id);

            return (
              <Card 
                key={order.id} 
                className={`transition-all duration-200 ${statusConfig.bgColor} ${
                  isUpdating ? 'opacity-70' : 'hover:shadow-md cursor-pointer'
                }`}
                onClick={() => router.push(`/orders/${order.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        Order #{order.orderNumber}
                        {isUpdating && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        )}
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
                  <div className="space-y-4">
                    {/* Order Summary */}
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {order.itemCount} item{order.itemCount > 1 ? 's' : ''}
                        </div>
                        <div className="font-semibold text-lg">
                          {formatCurrency(order.total)}
                        </div>
                      </div>
                      
                      {/* Estimated Delivery */}
                      {order.estimatedDeliveryTime && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                        <div className="text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Est: {formatDate(order.estimatedDeliveryTime)}
                        </div>
                      )}
                    </div>

                    {/* Status Actions */}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          Actions:
                        </span>
                        {renderStatusActions(order)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

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
      </div>
    </div>
  );
}