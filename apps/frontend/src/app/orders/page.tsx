import { Suspense } from 'react';
import { OrderHistoryClient } from './client';

export default function OrderHistoryPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Order History</h1>
      <Suspense fallback={<div>Loading orders...</div>}>
        <OrderHistoryClient />
      </Suspense>
    </div>
  );
}