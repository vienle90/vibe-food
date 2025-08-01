'use client';

import { ReactElement } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCartStore, useSetCartOpen, useUpdateCartQuantity, useRemoveFromCart, useClearCart, useCartIsOpen } from '@/stores/cart';
import { formatCurrency } from '@/lib/utils';

export function CartSheet(): ReactElement {
  const router = useRouter();
  const isOpen = useCartIsOpen();
  const setIsOpen = useSetCartOpen();
  const updateQuantity = useUpdateCartQuantity();
  const removeItem = useRemoveFromCart();
  const clearCart = useClearCart();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.getSubtotal());

  const handleCheckout = (): void => {
    setIsOpen(false);
    router.push('/checkout');
  };

  const handleQuantityChange = (menuItemId: string, delta: number): void => {
    const item = items.find((i) => i.menuItemId === menuItemId);
    if (item) {
      const newQuantity = item.quantity + delta;
      updateQuantity(item.menuItemId, newQuantity);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? 'Your cart is empty'
              : `${items.length} item${items.length > 1 ? 's' : ''} in your cart`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground mb-4">
                Add items from the menu to get started
              </p>
              <Button onClick={() => setIsOpen(false)}>Browse Menu</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.menuItemId} className="flex gap-4">
                  {/* Item Image */}
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.menuItem.imageUrl ? (
                      <Image
                        src={item.menuItem.imageUrl}
                        alt={item.menuItem.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-2xl font-bold text-muted-foreground/20">
                          {item.menuItem.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium line-clamp-1">{item.menuItem.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.menuItem.price)} each
                    </p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(item.menuItemId, -1)}
                        className="h-8 w-8"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(item.menuItemId, 1)}
                        disabled={item.quantity >= 10}
                        className="h-8 w-8"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.menuItemId)}
                        className="h-8 w-8 ml-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="flex-col space-y-4 pt-4">
            <Separator />
            
            {/* Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-base">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Delivery fee</span>
                <span>$2.99</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Service fee</span>
                <span>$1.50</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(subtotal + 2.99 + 1.50)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearCart}
                className="flex-1"
              >
                Clear Cart
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1"
                disabled={items.length === 0}
              >
                Checkout
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}