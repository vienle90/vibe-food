'use client';

import { ReactElement, useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCartStore, useClearCart } from '@/stores/cart';
import { useAccessToken, useAuthUser } from '@/stores/auth';
import { LoginModal } from '@/components/auth/LoginModal';
import { RegisterModal } from '@/components/auth/RegisterModal';
import { formatCurrency } from '@/lib/utils';
import { orderService } from '@/lib/api-services';
import type { PaymentMethod } from '@vibe/shared';

// Form validation schema
const checkoutFormSchema = z.object({
  deliveryAddress: z.string().min(10, 'Please enter a complete delivery address'),
  customerPhone: z.string().regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number'),
  notes: z.string().optional(),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'CREDIT_CARD', 'DIGITAL_WALLET']).default('CASH_ON_DELIVERY'),
});

type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

export function CheckoutClient(): ReactElement {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.getSubtotal());
  const clearCart = useClearCart();
  const accessToken = useAccessToken();
  const user = useAuthUser();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<CheckoutFormData>({
    deliveryAddress: '',
    customerPhone: '',
    notes: '',
    paymentMethod: 'CASH_ON_DELIVERY',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Auto-fill form fields when user is authenticated
  useEffect(() => {
    if (user && user.phone && user.address) {
      setFormData(prev => ({
        ...prev,
        deliveryAddress: prev.deliveryAddress || user.address || '',
        customerPhone: prev.customerPhone || user.phone || '',
      }));
    }
  }, [user]);

  // Redirect if cart is empty (but only after hydration and not after order placement)
  useEffect(() => {
    if (!isHydrated || orderPlaced) return; // Don't redirect during hydration or after order placement
    
    if (items.length === 0) {
      router.push('/');
    }
  }, [items.length, router, isHydrated, orderPlaced]);

  // Get store ID from cart items (assuming single store)
  // Use a more robust method to get storeId
  const storeId = items.length > 0 ? items[0]?.menuItem?.storeId : undefined;
  const deliveryFee = 2.99;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + deliveryFee + tax;

  // Auth modal handlers
  const handleSwitchToRegister = (): void => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = (): void => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const handleCloseModals = (): void => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
  };
  

  const validateForm = (data: CheckoutFormData): boolean => {
    const result = checkoutFormSchema.safeParse(data);
    if (result.success) {
      setFormErrors({});
      return true;
    } else {
      const errors: Partial<Record<keyof CheckoutFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as keyof CheckoutFormData] = err.message;
        }
      });
      setFormErrors(errors);
      return false;
    }
  };

  const handleInputChange = (field: keyof CheckoutFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    
    // More robust validation
    if (!storeId || storeId === undefined || storeId === null || storeId === '') {
      setError('No store selected. Please add items to cart first.');
      return;
    }
    
    // Validate that cart has items and each item has required fields
    if (!items || items.length === 0) {
      setError('Your cart is empty. Please add items before checkout.');
      return;
    }
    
    // Validate each item has required fields
    for (const item of items) {
      if (!item.menuItemId || !item.quantity) {
        setError('Invalid cart data. Please refresh and try again.');
        return;
      }
    }
    
    if (!accessToken) {
      setError('Please login to place an order.');
      setShowLoginModal(true);
      return;
    }
    
    if (!validateForm(formData)) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      
      // Prepare order request - backend expects simplified items for validation
      const orderItems = items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions
      }));
      
      const orderRequest = {
        storeId: storeId as any, // Cast to bypass branded type check
        items: orderItems,
        paymentMethod: formData.paymentMethod as PaymentMethod,
        deliveryAddress: formData.deliveryAddress,
        customerPhone: formData.customerPhone,
        notes: formData.notes || '',
      };

      // Create order with authentication token
      const response = await orderService.createOrder(orderRequest, accessToken);
      
      // Set order placed flag to prevent empty cart redirect
      setOrderPlaced(true);
      
      // Clear cart and redirect to orders page
      clearCart();
      router.push('/orders');
      
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading cart...</p>
      </div>
    );
  }

  // Show empty state after hydration
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Your cart is empty</p>
        <Button onClick={() => router.push('/')}>Browse Restaurants</Button>
      </div>
    );
  }

  // Show loading if storeId is not available yet (cart not fully loaded)
  if (!storeId && isHydrated && items.length > 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading store information...</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Order Form */}
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                  placeholder="Enter your complete delivery address"
                  className={formErrors.deliveryAddress ? 'border-red-500' : ''}
                />
                {formErrors.deliveryAddress && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.deliveryAddress}
                  </p>
                )}
              </div>
              
              <div>
                <Input
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  placeholder="Phone number"
                  type="tel"
                  className={formErrors.customerPhone ? 'border-red-500' : ''}
                />
                {formErrors.customerPhone && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.customerPhone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value="CASH_ON_DELIVERY"
                    checked={formData.paymentMethod === 'CASH_ON_DELIVERY'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>Cash on Delivery</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer opacity-50">
                  <input
                    type="radio"
                    value="CREDIT_CARD"
                    disabled
                    className="w-4 h-4"
                  />
                  <span>Credit Card (Coming Soon)</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer opacity-50">
                  <input
                    type="radio"
                    value="DIGITAL_WALLET" 
                    disabled
                    className="w-4 h-4"
                  />
                  <span>Digital Wallet (Coming Soon)</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Order Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any special instructions for the restaurant or delivery driver"
              />
            </CardContent>
          </Card>

          {/* Place Order Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              `Place Order • ${formatCurrency(total)}`
            )}
          </Button>
        </form>
      </div>

      {/* Order Summary */}
      <div className="lg:sticky lg:top-8 h-fit">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.menuItemId} className="flex gap-3">
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.menuItem.imageUrl ? (
                      <Image
                        src={item.menuItem.imageUrl}
                        alt={item.menuItem.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-sm font-bold text-muted-foreground/20">
                          {item.menuItem.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-1">
                      {item.menuItem.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity} × {formatCurrency(item.menuItem.price)}
                    </p>
                    {item.specialInstructions && (
                      <p className="text-xs text-muted-foreground italic">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-sm font-medium">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Pricing Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {formData.paymentMethod === 'CASH_ON_DELIVERY' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  💰 You'll pay {formatCurrency(total)} in cash when your order arrives
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Auth Modals */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={handleCloseModals}
        onSwitchToRegister={handleSwitchToRegister}
      />

      <RegisterModal 
        isOpen={showRegisterModal}
        onClose={handleCloseModals}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  );
}