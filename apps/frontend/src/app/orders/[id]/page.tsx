import { Suspense } from 'react';
import { OrderDetailsClient } from './client';

interface OrderDetailsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}

export default async function OrderDetailsPage({ params, searchParams }: OrderDetailsPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Suspense fallback={<div>Loading order details...</div>}>
        <OrderDetailsClient 
          orderId={resolvedParams.id} 
          isConfirmationPage={resolvedSearchParams.confirmed === 'true'} 
        />
      </Suspense>
    </div>
  );
}