import { ReactElement } from 'react';
import Image from 'next/image';
import { Star, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, formatDeliveryTime, getCategoryEmoji, getStarRating } from '@/lib/utils';
import { IMAGE_CONFIG } from '@/lib/constants';

/**
 * Store data interface for the card display
 * Using data from shared API contracts
 */
interface Store {
  id: string;
  name: string;
  description: string | null;
  category: string;
  rating: number | null;
  deliveryFee: number;
  estimatedDeliveryTime: number;
  minimumOrder: number;
  address: string;
  isActive: boolean;
}

/**
 * Props for the StoreCard component
 */
export interface StoreCardProps {
  /** Store data to display */
  store: Store;
  /** Callback when store is selected */
  onSelect?: (store: Store) => void;
  /** Optional className for styling customization */
  className?: string;
  /** Priority loading for above-the-fold cards */
  priority?: boolean;
}

/**
 * StoreCard component displays store information with clickable interaction.
 * 
 * Features:
 * - Next.js Image optimization with proper sizing
 * - Rating display with star visualization
 * - Category badge with emoji
 * - Delivery information display
 * - Hover effects and accessibility
 * - Click handler for navigation
 * 
 * @component
 * @example
 * ```tsx
 * <StoreCard 
 *   store={store} 
 *   onSelect={handleStoreSelect}
 *   priority={isAboveTheFold}
 * />
 * ```
 */
export const StoreCard = ({ 
  store, 
  onSelect, 
  className,
  priority = false 
}: StoreCardProps): ReactElement => {
  const { filled, empty, rating } = getStarRating(store.rating);
  const categoryEmoji = getCategoryEmoji(store.category);
  
  const handleClick = () => {
    if (onSelect && store.isActive) {
      onSelect(store);
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };
  
  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-300',
        'hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1',
        'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
        !store.isActive && 'opacity-60 cursor-not-allowed',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View menu for ${store.name}`}
    >
      <CardHeader className="p-0">
        {/* Store Image */}
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-lg bg-muted">
          <Image
            src={IMAGE_CONFIG.PLACEHOLDER}
            alt={`${store.name} restaurant`}
            fill
            className={cn(
              'object-cover transition-transform duration-300',
              'group-hover:scale-105'
            )}
            sizes={IMAGE_CONFIG.SIZES.CARD}
            priority={priority}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcFNzpFwItKeNFU6IyUYKNMOFqTHdGUNdyGf//Z"
          />
          
          {/* Status indicator */}
          {!store.isActive && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Badge variant="secondary" className="bg-white text-black">
                Closed
              </Badge>
            </div>
          )}
          
          {/* Category badge */}
          <div className="absolute top-3 left-3">
            <Badge 
              variant="secondary" 
              className="bg-white/90 text-black hover:bg-white"
            >
              {categoryEmoji} {store.category.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-3">
        {/* Store Name and Description */}
        <div className="space-y-1">
          <h3 className="font-semibold text-lg leading-tight line-clamp-1">
            {store.name}
          </h3>
          {store.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {store.description}
            </p>
          )}
        </div>
        
        {/* Rating and Reviews */}
        {store.rating !== null && (
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {/* Filled stars */}
              {Array.from({ length: filled }).map((_, i) => (
                <Star
                  key={`filled-${i}`}
                  className="h-4 w-4 fill-yellow-400 text-yellow-400"
                />
              ))}
              {/* Empty stars */}
              {Array.from({ length: empty }).map((_, i) => (
                <Star
                  key={`empty-${i}`}
                  className="h-4 w-4 text-gray-300"
                />
              ))}
            </div>
            <span className="text-sm font-medium">
              {rating.toFixed(1)}
            </span>
          </div>
        )}
        
        {/* Delivery Information */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDeliveryTime(store.estimatedDeliveryTime)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>{formatCurrency(store.deliveryFee)} delivery</span>
          </div>
        </div>
        
        {/* Minimum Order */}
        {store.minimumOrder > 0 && (
          <div className="text-xs text-muted-foreground">
            Min. order: {formatCurrency(store.minimumOrder)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};