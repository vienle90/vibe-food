'use client';

import { ReactElement } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  Package, 
  Truck, 
  PartyPopper,
  XCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@vibe/shared';

interface OrderProgressStep {
  status: OrderStatus;
  label: string;
  icon: any;
  description: string;
}

interface OrderProgressIndicatorProps {
  currentStatus: OrderStatus;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  createdAt: string;
  statusHistory?: Array<{
    status: OrderStatus;
    timestamp: string;
    notes?: string;
  }>;
  className?: string;
}

const ORDER_PROGRESS_STEPS: OrderProgressStep[] = [
  {
    status: 'NEW',
    label: 'Order Placed',
    icon: Clock,
    description: 'Your order has been received'
  },
  {
    status: 'CONFIRMED',
    label: 'Confirmed',
    icon: CheckCircle2,
    description: 'Restaurant confirmed your order'
  },
  {
    status: 'PREPARING',
    label: 'Preparing',
    icon: ChefHat,
    description: 'Your food is being prepared'
  },
  {
    status: 'READY',
    label: 'Ready',
    icon: Package,
    description: 'Order is ready for pickup'
  },
  {
    status: 'PICKED_UP',
    label: 'Out for Delivery',
    icon: Truck,
    description: 'Your order is on the way'
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    icon: PartyPopper,
    description: 'Enjoy your meal!'
  }
];

export function OrderProgressIndicator({
  currentStatus,
  estimatedDeliveryTime,
  actualDeliveryTime,
  createdAt,
  statusHistory,
  className
}: OrderProgressIndicatorProps): ReactElement {
  
  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStepStatus = (stepStatus: OrderStatus): 'completed' | 'current' | 'pending' | 'cancelled' => {
    if (currentStatus === 'CANCELLED') {
      return stepStatus === 'NEW' ? 'completed' : 'cancelled';
    }

    const currentIndex = ORDER_PROGRESS_STEPS.findIndex(step => step.status === currentStatus);
    const stepIndex = ORDER_PROGRESS_STEPS.findIndex(step => step.status === stepStatus);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStepTimestamp = (stepStatus: OrderStatus): string | null => {
    if (stepStatus === 'NEW') return createdAt;
    if (stepStatus === 'DELIVERED' && actualDeliveryTime) return actualDeliveryTime;
    
    // Look for timestamp in status history if provided
    if (statusHistory) {
      const historyItem = statusHistory.find(item => item.status === stepStatus);
      if (historyItem) return historyItem.timestamp;
    }
    
    return null;
  };

  // Handle cancelled orders
  if (currentStatus === 'CANCELLED') {
    return (
      <div className={cn("bg-red-50 border border-red-200 rounded-lg p-6", className)}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">Order Cancelled</h3>
            <p className="text-red-600">
              This order was cancelled and will not be delivered.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg p-6", className)}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Progress</h3>
        {estimatedDeliveryTime && currentStatus !== 'DELIVERED' && (
          <p className="text-sm text-gray-600">
            Estimated delivery: {formatTime(estimatedDeliveryTime)}
          </p>
        )}
        {actualDeliveryTime && currentStatus === 'DELIVERED' && (
          <p className="text-sm text-green-600">
            Delivered at: {formatTime(actualDeliveryTime)}
          </p>
        )}
      </div>

      <div className="relative">
        {ORDER_PROGRESS_STEPS.map((step, index) => {
          const stepStatus = getStepStatus(step.status);
          const timestamp = getStepTimestamp(step.status);
          const StepIcon = step.icon;
          const isLast = index === ORDER_PROGRESS_STEPS.length - 1;

          return (
            <div key={step.status} className="relative flex items-start pb-8">
              {/* Connecting line */}
              {!isLast && (
                <div className="absolute left-4 top-8 w-0.5 h-8 bg-gray-200">
                  <div 
                    className={cn(
                      "w-full transition-all duration-500",
                      stepStatus === 'completed' ? 'bg-green-500 h-full' : 'bg-gray-200 h-0'
                    )}
                  />
                </div>
              )}

              {/* Step indicator */}
              <div className="relative flex items-center justify-center">
                <div 
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                    {
                      'bg-green-500 border-green-500 text-white': stepStatus === 'completed',
                      'bg-blue-500 border-blue-500 text-white animate-pulse': stepStatus === 'current',
                      'bg-white border-gray-200 text-gray-400': stepStatus === 'pending',
                      'bg-gray-100 border-gray-200 text-gray-400': stepStatus === 'cancelled'
                    }
                  )}
                >
                  <StepIcon className="w-4 h-4" />
                </div>
              </div>

              {/* Step content */}
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 
                      className={cn(
                        "text-sm font-medium transition-colors duration-300",
                        {
                          'text-green-700': stepStatus === 'completed',
                          'text-blue-700': stepStatus === 'current',
                          'text-gray-500': stepStatus === 'pending' || stepStatus === 'cancelled'
                        }
                      )}
                    >
                      {step.label}
                    </h4>
                    <p 
                      className={cn(
                        "text-xs mt-1 transition-colors duration-300",
                        {
                          'text-green-600': stepStatus === 'completed',
                          'text-blue-600': stepStatus === 'current',
                          'text-gray-400': stepStatus === 'pending' || stepStatus === 'cancelled'
                        }
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Timestamp */}
                  {timestamp && (stepStatus === 'completed' || stepStatus === 'current') && (
                    <div className="text-xs text-gray-500 ml-2">
                      {formatTime(timestamp)}
                    </div>
                  )}
                </div>

                {/* Current step with pulse animation */}
                {stepStatus === 'current' && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-blue-600 font-medium">In progress</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary info */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Order placed: {formatTime(createdAt)}</span>
          {currentStatus === 'DELIVERED' && actualDeliveryTime && (
            <span className="text-green-600 font-medium">
              ✓ Delivered successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );
}