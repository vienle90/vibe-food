import { ReactElement } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSetCartOpen, useCartSummary } from '@/stores/cart';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CartButtonProps {
  className?: string;
  variant?: 'floating' | 'inline';
}

export function CartButton({ 
  className, 
  variant = 'floating' 
}: CartButtonProps): ReactElement {
  const setIsOpen = useSetCartOpen();
  const { itemCount, subtotal } = useCartSummary();

  if (itemCount === 0 && variant === 'floating') {
    return <></>;
  }

  const handleClick = (): void => {
    setIsOpen(true);
  };

  if (variant === 'floating') {
    return (
      <Button
        onClick={handleClick}
        size="lg"
        className={cn(
          'fixed bottom-4 right-4 z-50 rounded-full shadow-lg',
          'md:bottom-8 md:right-8',
          'hover:scale-105 transition-transform',
          className
        )}
      >
        <ShoppingCart className="h-5 w-5 mr-2" />
        <span className="font-semibold">{formatCurrency(subtotal)}</span>
        <Badge 
          variant="secondary" 
          className="ml-2 bg-background/20 text-foreground"
        >
          {itemCount}
        </Badge>
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className={cn('relative', className)}
    >
      <ShoppingCart className="h-4 w-4" />
      {itemCount > 0 && (
        <>
          <span className="ml-2">{formatCurrency(subtotal)}</span>
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
          >
            {itemCount}
          </Badge>
        </>
      )}
    </Button>
  );
}