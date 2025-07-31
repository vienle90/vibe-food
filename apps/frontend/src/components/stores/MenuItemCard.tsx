import { ReactElement, useState } from 'react';
import Image from 'next/image';
import { Plus, Minus } from 'lucide-react';
import type { GetMenuResponse } from '@vibe/shared';

// Type alias for menu item from API response
type MenuItem = GetMenuResponse['menuItems'][0];
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAddToCart, useUpdateCartQuantity, useCartStore } from '@/stores/cart';
import { formatCurrency } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItem;
  storeId: string;
}

export function MenuItemCard({ item, storeId }: MenuItemCardProps): ReactElement {
  const addItem = useAddToCart();
  const updateQuantity = useUpdateCartQuantity();
  const cartQuantity = useCartStore((state) => state.getItemQuantity(item.id as any));
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (): Promise<void> => {
    setIsAdding(true);
    try {
      addItem({
        menuItemId: item.id as any,
        menuItem: {
          id: item.id as any,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          storeId,
        },
        quantity: 1,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateQuantity = (newQuantity: number): void => {
    if (newQuantity >= 0 && newQuantity <= 10) {
      updateQuantity(item.id as any, newQuantity);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-[4/3] bg-muted">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-3xl font-bold text-muted-foreground/20">
              {item.name.charAt(0)}
            </span>
          </div>
        )}
        
        {/* Availability badge */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="secondary" className="bg-background/90">
              Currently Unavailable
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Name and Price */}
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-lg line-clamp-2">{item.name}</h3>
          <span className="font-bold text-lg whitespace-nowrap">
            {formatCurrency(item.price)}
          </span>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Allergen info */}
        {item.allergens && item.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.allergens.map((allergen) => (
              <Badge key={allergen} variant="outline" className="text-xs">
                {allergen}
              </Badge>
            ))}
          </div>
        )}

        {/* Add to Cart / Quantity Controls */}
        <div className="pt-2">
          {cartQuantity === 0 ? (
            <Button
              onClick={handleAddToCart}
              disabled={!item.isAvailable || isAdding}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add to Cart
            </Button>
          ) : (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleUpdateQuantity(cartQuantity - 1)}
                className="h-8 w-8"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <span className="font-semibold px-4">
                {cartQuantity}
              </span>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleUpdateQuantity(cartQuantity + 1)}
                disabled={cartQuantity >= 10}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}