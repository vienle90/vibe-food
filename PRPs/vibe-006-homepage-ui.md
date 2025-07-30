# PRP-006: Vibe Food Ordering - Homepage & Store Listing UI

## Goal

Build the homepage and store listing interface as the main entry point for food ordering:
- Responsive homepage with store discovery features
- Store cards displaying key information (name, category, rating, image)
- Category filtering with visual feedback
- Search functionality with instant results
- Pagination for smooth browsing experience
- Loading states and error handling for all interactions
- Mobile-first responsive design using Shadcn/ui components

## Why

- **First Impression**: Homepage drives user engagement and conversion
- **Store Discovery**: Users need intuitive ways to find relevant restaurants
- **Performance Critical**: Fast loading and smooth interactions retain users
- **Mobile Experience**: Most users will access on mobile devices
- **Brand Foundation**: Clean, modern UI establishes trust and quality

## What

### User-Visible Behavior
- Users land on homepage with immediate store listings
- Category filters (lunch, dinner, coffee, etc.) work instantly
- Search box provides real-time store filtering
- Store cards show essential info: name, category, rating, delivery time
- Pagination allows browsing through many stores
- Loading spinners show during API calls
- Error messages guide users when issues occur

### Technical Requirements
- Next.js 15 App Router with React 19 features
- Shadcn/ui components for consistent design
- TanStack Query for API state management
- Responsive design with Tailwind CSS
- Type-safe API integration using shared contracts
- Optimistic updates for better UX
- Image optimization with Next.js Image component

### Success Criteria
- [ ] Homepage loads and displays stores within 2 seconds
- [ ] Category filtering updates results instantly
- [ ] Search provides results as user types (debounced)
- [ ] Mobile interface works smoothly on all screen sizes
- [ ] Loading states prevent layout shift
- [ ] Error handling provides clear user guidance
- [ ] Store cards display all essential information

## All Needed Context

### Documentation & References

```yaml
- file: /Users/vienle2/code_projects/vibe-food/PRD.md
  why: Product Requirement Document

- url: https://nextjs.org/docs/app/building-your-application/routing
  why: App Router patterns for page structure and navigation

- url: https://ui.shadcn.com/docs/components/card
  why: Card component patterns for store listings

- url: https://tanstack.com/query/latest/docs/framework/react/overview
  why: Server state management patterns and caching

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Frontend Development Guidelines - TypeScript Configuration"
  critical: "Component documentation, ReactElement types, proper TypeScript"

- file: /Users/vienle2/code_projects/vibe-food/PRPs/vibe-003-shared-types.md
  section: "API Request/Response Contracts - Store APIs"
  critical: "GetStoresRequest/Response types for API integration"

- file: /Users/vienle2/code_projects/vibe-food/PRPs/vibe-004-store-listing-api.md
  section: "Store listing endpoints and filtering"
  critical: "API endpoints and query parameters structure"
```

### Design Context

**Visual Hierarchy:**
1. **Hero Section**: Search bar + category filters (prominent)
2. **Store Grid**: 2-3 columns on desktop, 1 column on mobile
3. **Store Cards**: Image, name, category badge, rating, delivery info
4. **Pagination**: Bottom of page with page numbers

**Category Design:**
- Visual category badges with icons (🍕 Lunch, ☕ Coffee, 🍰 Dessert)
- Active/inactive states with color changes
- Horizontal scroll on mobile for many categories

**Store Card Layout:**
```
[Store Image - 16:9 ratio]
[Store Name - Bold, large]
[Category Badge] [Rating ⭐ 4.5]
[Delivery: 25-35 min] [Fee: $2.99]
```

### Technical Patterns

**State Management Strategy:**
- **Server State**: TanStack Query for API data (stores, filters)
- **Client State**: useState for search input, selected filters
- **URL State**: Search params for shareable filtering state
- **No Global State**: Keep state local to homepage feature

**Performance Optimizations:**
- Debounced search (300ms delay)
- Infinite scroll or cursor-based pagination
- Image lazy loading with Next.js Image
- Query caching with stale-while-revalidate
- Skeleton loading for better perceived performance

### Critical Gotchas

1. **Search Debouncing**: Prevent API calls on every keystroke
2. **Filter State**: Keep URL in sync with active filters for sharing
3. **Image Optimization**: Use Next.js Image with proper sizes
4. **Loading States**: Prevent layout shift during transitions
5. **Mobile Touch**: Ensure adequate touch targets (44px minimum)

## Implementation Blueprint

### Page Structure (App Router)
```
app/
  page.tsx                 # Homepage (main store listing)
  stores/
    [storeId]/
      page.tsx            # Store details page
  components/
    store-list/
      StoreCard.tsx       # Individual store card
      StoreGrid.tsx       # Grid layout component
      StoreFilters.tsx    # Category and search filters
      StorePagination.tsx # Pagination controls
  hooks/
    useStores.tsx         # TanStack Query hook
    useSearchFilters.tsx  # Filter state management
```

### Component Architecture

**Homepage Component Flow:**
```
HomePage
├── StoreFilters (search + categories)
├── StoreGrid
│   ├── StoreCard (repeated)
│   ├── StoreCardSkeleton (loading)
│   └── EmptyState (no results)
└── StorePagination
```

### Key Component Patterns

**Store Card Component Pattern:**
- **Props Interface**: Define clear TypeScript interfaces with proper branded types
- **Image Optimization**: Use Next.js Image component with priority loading for above-fold cards
- **User Interactions**: Handle click events for navigation with proper accessibility
- **Visual Design**: Display rating with stars, delivery info, and category badges
- **Performance**: Implement lazy loading for images and proper memoization

**Store Filters Component Pattern:**
- **Debounced Search**: Implement 300ms debouncing to prevent excessive API calls
- **Active State Management**: Visual feedback for selected categories with proper contrast
- **Mobile Responsive**: Horizontal scrolling for categories on mobile devices
- **Clear Functionality**: Reset all filters with single action and URL update
- **Accessibility**: Proper ARIA labels and keyboard navigation support

### API Integration Pattern

**TanStack Query Hook Pattern:**
- **Query Key Strategy**: Include all filter parameters for proper cache invalidation
- **Stale Time Configuration**: Set appropriate stale time (5 minutes) for store data
- **Smooth Transitions**: Use keepPreviousData to prevent loading flickers during filtering
- **Error Handling**: Implement retry logic and error boundary integration
- **Cache Management**: Configure proper garbage collection and cache persistence

**URL State Management Pattern:**
- **Shareable State**: Sync all filter state with URL parameters for bookmarking
- **History Navigation**: Support browser back/forward buttons properly
- **Parameter Validation**: Validate URL parameters with Zod schemas
- **Default Values**: Handle missing or invalid URL parameters gracefully
- **Performance**: Use useMemo and useCallback to prevent unnecessary re-renders

### Responsive Design Strategy

**Breakpoint Usage:**
- **Mobile (< 768px)**: Single column, horizontal category scroll
- **Tablet (768px - 1024px)**: Two columns, visible category grid
- **Desktop (> 1024px)**: Three columns, full category display

**Responsive Design Pattern:**
- **Mobile First**: Start with single column, expand for larger screens
- **Breakpoint Strategy**: Use md: for tablet (768px) and lg: for desktop (1024px)
- **Touch Interactions**: Horizontal scroll on mobile with momentum scrolling
- **Grid Layout**: Responsive grid that adapts to screen size and content
- **Spacing**: Consistent gap and padding using Tailwind spacing scale

### Loading and Error States

**Loading Strategy:**
- Show skeleton cards during initial load
- Show spinner overlay during filter changes
- Maintain existing cards during pagination

**Error Handling:**
- Network errors: Retry button with offline message
- No results: Empty state with search suggestions
- Server errors: Generic error message with support contact

## Validation Loop

### Level 1: Component Development
```bash
# Start frontend development server
cd apps/frontend && npm run dev

# Test homepage loads
curl -I http://localhost:3000
# Should return 200 OK

# Check component compilation
cd apps/frontend && npm run build
# Should build without TypeScript errors
```

### Level 2: Store Display
```bash
# Test store data fetching (with backend running)
# Open browser dev tools → Network tab
# Navigate to http://localhost:3000
# Should see API call to /api/stores with 200 response
# Should render store cards with images, names, ratings

# Test empty state
# Temporarily stop backend or return empty array
# Should show "No stores found" message with helpful suggestions
```

### Level 3: Filtering Functionality
```bash
# Test category filtering
# Click different category buttons
# URL should update: /?category=LUNCH
# API should be called with category parameter
# Results should update to show only selected category

# Test search functionality
# Type in search box (wait for debounce)
# URL should update: /?search=pizza
# API should be called with search parameter
# Results should show matching stores
```

### Level 4: Responsive Design
```bash
# Test mobile layout
# Resize browser to 375px width (iPhone)
# Store cards should stack in single column
# Category filters should scroll horizontally
# Touch targets should be at least 44px

# Test tablet layout
# Resize to 768px width (iPad)
# Should show 2 columns of store cards
# Category filters should wrap properly

# Test desktop layout
# Full width (1200px+)
# Should show 3 columns of store cards
# All UI elements should be properly spaced
```

### Level 5: Performance Testing
```bash
# Test loading performance
# Open dev tools → Performance tab
# Record page load
# First contentful paint should be < 1.5s
# Largest contentful paint should be < 2.5s

# Test image optimization
# Check Network tab for image requests
# Images should be served in WebP format
# Lazy loading should work for below-fold images

# Test API caching
# Navigate away and back to homepage
# Second load should use cached data (check Network tab)
```

### Level 6: Error Handling
```bash
# Test network failure
# Disconnect internet/stop backend
# Should show error message with retry button
# Retry button should work when connection restored

# Test loading states
# Throttle network to slow 3G
# Should show skeleton loading cards
# Loading should be smooth without layout shift
```

## Task Checklist

### Core Page Structure
- [ ] Create homepage component with App Router
- [ ] Set up TanStack Query provider and configuration
- [ ] Implement responsive grid layout for store cards
- [ ] Add SEO metadata and Open Graph tags
- [ ] Configure TypeScript with strict settings

### Store Card Component
- [ ] Design store card with essential information
- [ ] Implement Next.js Image optimization
- [ ] Add rating display with stars/numbers
- [ ] Include delivery time and fee information
- [ ] Add click handler for navigation to store details

### Filtering System
- [ ] Build category filter buttons with active states
- [ ] Implement search input with debouncing (300ms)
- [ ] Add clear filters functionality
- [ ] Sync filter state with URL parameters
- [ ] Make filters mobile-responsive with horizontal scroll

### API Integration
- [ ] Create useStores hook with TanStack Query
- [ ] Implement proper error handling and retries
- [ ] Add loading states and caching configuration
- [ ] Handle empty results gracefully
- [ ] Add optimistic updates for better UX

### Responsive Design
- [ ] Implement mobile-first responsive layout
- [ ] Test on multiple device sizes and orientations
- [ ] Ensure adequate touch targets (44px minimum)
- [ ] Add horizontal scrolling for mobile categories
- [ ] Optimize typography and spacing for readability

### Performance Optimization
- [ ] Add image lazy loading and optimization
- [ ] Implement skeleton loading components
- [ ] Configure appropriate cache strategies
- [ ] Minimize layout shift during loading
- [ ] Add performance monitoring and analytics

### Error Handling & UX
- [ ] Design and implement error states
- [ ] Add empty state with helpful messaging
- [ ] Create loading skeletons that match content
- [ ] Add retry mechanisms for failed requests
- [ ] Provide clear feedback for all user actions

**Critical Success Metrics:**
1. **Performance**: Homepage loads and displays stores within 2 seconds
2. **Usability**: All filters work instantly with clear visual feedback
3. **Responsiveness**: Smooth experience on mobile, tablet, and desktop
4. **Accessibility**: Proper ARIA labels, keyboard navigation, color contrast
5. **Error Resilience**: Graceful handling of network issues and empty states

**Demo Scenario**: New user visits Vibe → immediately sees local restaurants → clicks "Coffee" filter → sees only coffee shops → searches "starbucks" → finds specific store → clicks to view details → entire flow is fast, smooth, and intuitive on both mobile and desktop.
