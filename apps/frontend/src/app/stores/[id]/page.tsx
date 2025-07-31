import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { storeService } from '@/lib/api-services';
import { StoreDetailsClient } from './client';
import type { ReactElement } from 'react';

interface StorePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    // Use the ID directly without strict CUID validation for now
    const store = await storeService.getStoreDetails(id);

    return {
      title: `${store.name} - Order Food Online | Vibe`,
      description: store.description || `Order from ${store.name} on Vibe. ${store.category} delivery available.`,
      openGraph: {
        title: store.name,
        description: store.description || `Order from ${store.name} on Vibe`,
      },
    };
  } catch (error) {
    return {
      title: 'Store Not Found - Vibe',
      description: 'The requested store could not be found.',
    };
  }
}

export default async function StorePage({ params }: StorePageProps): Promise<ReactElement> {
  try {
    const { id } = await params;
    // Use the ID directly without strict CUID validation for now
    
    // Fetch store details and menu in parallel
    const [storeDetails, menuData] = await Promise.all([
      storeService.getStoreDetails(id),
      storeService.getStoreMenu({ storeId: id }),
    ]);

    return (
      <StoreDetailsClient
        initialStoreData={storeDetails}
        initialMenuData={menuData}
        storeId={id as any}
      />
    );
  } catch (error) {
    console.error('Failed to load store:', error);
    notFound();
  }
}