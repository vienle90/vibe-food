import { Suspense } from 'react';
import { CheckoutClient } from './client';

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <Suspense fallback={<div>Loading checkout...</div>}>
        <CheckoutClient />
      </Suspense>
    </div>
  );
}