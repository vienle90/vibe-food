import { ReactElement, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CategoryNavigationProps {
  categories: string[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  itemCounts: Record<string, number>;
}

export function CategoryNavigation({
  categories,
  selectedCategory,
  onCategorySelect,
  itemCounts,
}: CategoryNavigationProps): ReactElement {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to selected category when it changes
  useEffect(() => {
    if (selectedCategory && scrollContainerRef.current) {
      const selectedButton = scrollContainerRef.current.querySelector(
        `[data-category="${selectedCategory}"]`
      );
      if (selectedButton) {
        selectedButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedCategory]);

  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide py-4 px-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* All Items button */}
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategorySelect(null)}
            className="flex-shrink-0 whitespace-nowrap"
          >
            All Items
            <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
              {Object.values(itemCounts).reduce((sum, count) => sum + count, 0)}
            </Badge>
          </Button>

          {/* Category buttons */}
          {categories.map((category) => (
            <Button
              key={category}
              data-category={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategorySelect(category)}
              className="flex-shrink-0 whitespace-nowrap capitalize"
            >
              {category}
              {itemCounts[category] && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {itemCounts[category]}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Fade edges for scroll indication */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
      </div>
    </div>
  );
}

// Add this CSS to your global styles or as a Tailwind plugin
// .scrollbar-hide {
//   -ms-overflow-style: none;
//   scrollbar-width: none;
// }
// .scrollbar-hide::-webkit-scrollbar {
//   display: none;
// }