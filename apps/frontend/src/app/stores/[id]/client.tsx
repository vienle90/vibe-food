'use client';

import { useState, useMemo } from 'react';
import type { ReactElement } from 'react';
import { StoreHeader } from '@/components/stores/StoreHeader';
import { CategoryNavigation } from '@/components/stores/CategoryNavigation';
import { MenuSection } from '@/components/stores/MenuSection';
import { CartButton } from '@/components/cart/CartButton';
import { CartSheet } from '@/components/cart/CartSheet';
import type { GetStoreDetailsResponse, GetMenuResponse } from '@vibe/shared';

// Type alias for menu item from API response
type MenuItem = GetMenuResponse['menuItems'][0];

interface StoreDetailsClientProps {
  initialStoreData: GetStoreDetailsResponse;
  initialMenuData: GetMenuResponse;
  storeId: string;
}

export function StoreDetailsClient({
  initialStoreData,
  initialMenuData,
  storeId,
}: StoreDetailsClientProps): ReactElement {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Use the initial data directly to avoid hydration issues
  const store = initialStoreData;
  const menu = initialMenuData;

  // Filter menu items based on search and category
  const filteredMenuItems = useMemo(() => {
    let items = menu.menuItems;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item: MenuItem) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      items = items.filter((item: MenuItem) => item.category === selectedCategory);
    }

    return items;
  }, [menu.menuItems, searchQuery, selectedCategory]);

  // Group menu items by category
  const menuByCategory = useMemo(() => {
    const grouped = filteredMenuItems.reduce((acc: Record<string, MenuItem[]>, item: MenuItem) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category]!.push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);

    // Sort categories to maintain consistent order
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)) as [string, MenuItem[]][];
  }, [filteredMenuItems]);

  return (
      <div className="min-h-screen bg-background">
        <StoreHeader store={store} />
        
        <div className="container mx-auto px-4 py-6">
          <CategoryNavigation
            categories={menu.categories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            itemCounts={menu.menuItems.reduce((acc: Record<string, number>, item: MenuItem) => {
              acc[item.category] = (acc[item.category] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)}
          />

          <MenuSection
            categories={menuByCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            storeId={storeId}
          />

          {filteredMenuItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery
                  ? `No items found matching "${searchQuery}"`
                  : 'No menu items available'}
              </p>
            </div>
          )}
        </div>

        <CartButton />
        <CartSheet />
      </div>
  );
}