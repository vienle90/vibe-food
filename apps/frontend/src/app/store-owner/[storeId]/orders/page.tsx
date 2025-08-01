import { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { StoreOwnerOrdersClient } from './client';
import type { OrderStatus } from '@vibe/shared';

interface StoreOwnerOrdersPageProps {
  params: { storeId: string };
  searchParams: { 
    status?: OrderStatus;
    page?: string;
    limit?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

/**
 * Store Owner Orders Dashboard Page (Server Component)
 * 
 * This page provides store owners with a comprehensive order management interface.
 * It follows the established pattern of Server Component -> Client Component separation
 * for optimal performance and authentication handling.
 */
export default async function StoreOwnerOrdersPage({ 
  params, 
  searchParams 
}: StoreOwnerOrdersPageProps): Promise<ReactElement> {
  const { storeId } = params;

  // Basic storeId validation
  if (!storeId) {
    redirect('/');
  }

  // Parse and validate search params
  const initialFilters: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  } = {};

  if (searchParams.status) {
    initialFilters.status = searchParams.status;
  }
  if (searchParams.page) {
    initialFilters.page = parseInt(searchParams.page);
  }
  if (searchParams.limit) {
    initialFilters.limit = parseInt(searchParams.limit);
  }
  if (searchParams.dateFrom) {
    initialFilters.dateFrom = searchParams.dateFrom;
  }
  if (searchParams.dateTo) {
    initialFilters.dateTo = searchParams.dateTo;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Order Management</h1>
        <p className="text-muted-foreground">
          Manage your store orders, update status, and track performance
        </p>
      </div>

      <StoreOwnerOrdersClient 
        storeId={storeId} 
        initialFilters={initialFilters}
      />
    </div>
  );
}