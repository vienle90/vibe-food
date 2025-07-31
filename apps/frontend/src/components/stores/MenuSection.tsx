import { ReactElement } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MenuItemCard } from './MenuItemCard';
import type { GetMenuResponse } from '@vibe/shared';

// Type alias for menu item from API response
type MenuItem = GetMenuResponse['menuItems'][0];
import { debounce } from '@/lib/utils';

interface MenuSectionProps {
  categories: Array<[string, MenuItem[]]>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  storeId: string;
}

export function MenuSection({
  categories,
  searchQuery,
  onSearchChange,
  storeId,
}: MenuSectionProps): ReactElement {
  // Debounce search input to avoid excessive re-renders
  const handleSearchChange = debounce((value: string) => {
    onSearchChange(value);
  }, 300);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search menu items..."
          defaultValue={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Menu Categories */}
      <div className="space-y-8">
        {categories.map(([category, items]) => (
          <section key={category} id={`category-${category}`}>
            <h2 className="text-xl font-semibold mb-4 capitalize">
              {category}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  storeId={storeId}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}