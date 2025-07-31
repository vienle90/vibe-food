import { ReactElement } from 'react';
import { Star, MapPin, Phone, Clock, Info, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { GetStoreDetailsResponse } from '@vibe/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StoreHeaderProps {
  store: GetStoreDetailsResponse;
}

export function StoreHeader({ store }: StoreHeaderProps): ReactElement {
  const router = useRouter();
  const isOpen = isStoreOpen(store.operatingHours);
  const currentHours = getCurrentDayHours(store.operatingHours);

  const handleClose = (): void => {
    router.push('/');
  };

  return (
    <div className="relative w-full">
      {/* Hero Image */}
      <div className="relative h-[200px] md:h-[300px] w-full overflow-hidden bg-muted">
        <div className="flex items-center justify-center h-full">
          <span className="text-4xl font-bold text-muted-foreground/20">
            {store.name.charAt(0)}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4 h-10 w-10 bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Store Info */}
      <div className="container mx-auto px-4">
        <div className="relative -mt-16 bg-background rounded-lg shadow-lg p-6 md:p-8">
          <div className="space-y-4">
            {/* Name and Category */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{store.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize">
                    {store.category}
                  </Badge>
                  {store.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{store.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground text-sm">
                        ({store._count.orders} orders)
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Open/Closed Status */}
              <Badge
                variant={isOpen ? 'default' : 'secondary'}
                className={`px-3 py-1 ${
                  isOpen ? 'bg-green-500 hover:bg-green-600' : ''
                }`}
              >
                {isOpen ? 'Open' : 'Closed'}
              </Badge>
            </div>

            {/* Description */}
            {store.description && (
              <p className="text-muted-foreground">{store.description}</p>
            )}

            {/* Contact and Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Address */}
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Address</p>
                  <p className="text-muted-foreground">{store.address}</p>
                </div>
              </div>

              {/* Phone */}
              {store.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Phone</p>
                    <p className="text-muted-foreground">{store.phone}</p>
                  </div>
                </div>
              )}

              {/* Hours */}
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Hours Today</p>
                  <p className="text-muted-foreground">
                    {currentHours || 'Closed'}
                  </p>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Delivery</p>
                  <p className="text-muted-foreground">
                    25-35 min • $2.99 fee • $15 min
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function isStoreOpen(hours: GetStoreDetailsResponse['operatingHours']): boolean {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof hours;
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const dayHours = hours[day];
  if (!dayHours) return false;

  return currentTime >= dayHours.open && currentTime <= dayHours.close;
}

function getCurrentDayHours(hours: GetStoreDetailsResponse['operatingHours']): string | null {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof hours;
  
  const dayHours = hours[day];
  if (!dayHours) return null;

  // Format time to 12-hour format
  const formatTime = (time: string | undefined): string => {
    if (!time) return 'Closed';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours || '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`;
}