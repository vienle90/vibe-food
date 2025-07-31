'use client';

import React, { ReactElement, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { orderService } from '@/lib/api-services';
import { useCartStore } from '@/stores/cart';

interface ReorderModalProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ReorderData {
  availableItems: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  unavailableItems: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    reason: string;
  }>;
  storeId: string;
  storeName: string;
}

export function ReorderModal({ 
  orderId, 
  orderNumber, 
  isOpen, 
  onClose 
}: ReorderModalProps): ReactElement | null {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reorderData, setReorderData] = useState<ReorderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { clearCart, addItem, items: cartItems } = useCartStore();

  // Load reorder data when modal opens
  React.useEffect(() => {
        if (isOpen && !reorderData && !loading) {
          loadReorderData();
        }
      },
      [isOpen, reorderData, loading]);

  const loadReorderData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.reorderOrder(orderId);
      setReorderData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to check item availability');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (): Promise<void> => {
    if (!reorderData) return;

    try {
      setLoading(true);

      // Check if cart has items from a different store
      const currentStoreId = cartItems.length > 0 ? cartItems[0]?.menuItem?.storeId : null;
      
      if (currentStoreId && currentStoreId !== reorderData.storeId) {
        const shouldClear = window.confirm(
          `Your cart contains items from a different restaurant. Clear cart and add items from ${reorderData.storeName}?`
        );
        
        if (!shouldClear) {
          setLoading(false);
          return;
        }
      }

      // Clear cart if needed
      if (currentStoreId !== reorderData.storeId) {
        clearCart();
      }

      // Add available items to cart
      for (const item of reorderData.availableItems) {
        addItem({
          menuItemId: item.menuItemId as any,
          menuItem: {
            id: item.menuItemId as any,
            name: item.name,
            price: item.price,
            storeId: reorderData.storeId as any,
            imageUrl: undefined,
          },
          quantity: item.quantity,
          specialInstructions: undefined,
        });
      }

      // Show success message
      const availableCount = reorderData.availableItems.length;
      const unavailableCount = reorderData.unavailableItems.length;
      
      let message = `${availableCount} item${availableCount > 1 ? 's' : ''} added to cart`;
      if (unavailableCount > 0) {
        message += `, ${unavailableCount} item${unavailableCount > 1 ? 's' : ''} unavailable`;
      }

      toast.success('Items added to cart!', {
        description: message,
        action: {
          label: 'View Cart',
          onClick: () => router.push('/cart')
        }
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to reorder:', err);
      toast.error('Failed to add items to cart', {
        description: err.message || 'Please try again'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Reorder Items</h2>
            <p className="text-sm text-muted-foreground">Order #{orderNumber}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading && !reorderData && (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Checking item availability...</p>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
                <Button 
                  variant="outline" 
                  onClick={loadReorderData}
                  className="mt-2"
                  disabled={loading}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {reorderData && (
            <div className="p-6 space-y-6">
              {/* Restaurant Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900">{reorderData.storeName}</h3>
                <p className="text-sm text-blue-700">Items will be added to your cart</p>
              </div>

              {/* Available Items */}
              {reorderData.availableItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      Available Items ({reorderData.availableItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reorderData.availableItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Unavailable Items */}
              {reorderData.unavailableItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <AlertTriangle className="w-5 h-5" />
                      Unavailable Items ({reorderData.unavailableItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reorderData.unavailableItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between opacity-60">
                        <div className="flex-1">
                          <h4 className="font-medium line-through">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          {item.reason}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              {reorderData.availableItems.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Total for available items:</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        reorderData.availableItems.reduce(
                          (sum, item) => sum + (item.price * item.quantity), 
                          0
                        )
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Prices shown are current and may differ from your original order
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {reorderData && (
          <div className="border-t p-6">
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {reorderData.availableItems.length > 0 && (
                <Button 
                  onClick={handleReorder} 
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {loading ? 'Adding to Cart...' : `Add ${reorderData.availableItems.length} Items to Cart`}
                </Button>
              )}
            </div>
            
            {reorderData.availableItems.length === 0 && (
              <p className="text-center text-muted-foreground mb-4">
                No items from this order are currently available for reordering.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}