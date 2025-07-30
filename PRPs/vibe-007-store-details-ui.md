# PRP-007: Vibe Food Ordering - Store Details & Menu UI

## Goal

Build the store details page where users can view complete store information and browse the menu to add items to their cart:
- Store header with essential details (name, rating, hours, contact)
- Categorized menu display with search and filtering
- Menu item cards with descriptions, prices, and customization options
- Add to cart functionality with quantity selection
- Cart preview/summary component
- Mobile-optimized menu browsing experience
- Loading states and error handling for menu data

## Why

- **Conversion Critical**: This page is where users decide to place orders
- **Menu Discovery**: Users need clear, attractive menu presentation
- **Cart Building**: Smooth add-to-cart flow drives order completion
- **Store Trust**: Professional store page builds customer confidence
- **Mobile Experience**: Most ordering happens on mobile devices

## What

### User-Visible Behavior
- Users see complete store information (hours, rating, contact)
- Menu items are organized by categories (appetizers, mains, drinks)
- Users can search/filter menu items within the store
- Each menu item shows photo, description, price, and dietary info
- Add to cart button with quantity selector
- Cart summary updates in real-time as items are added
- Back navigation to store listing works smoothly

### Technical Requirements
- Dynamic route: /stores/[storeId] using Next.js App Router
- Server-side rendering for SEO and performance
- TanStack Query for menu data management
- Optimistic cart updates for immediate user feedback
- Image optimization for menu item photos
- Responsive design with mobile-first approach
- Type-safe API integration with shared contracts

### Success Criteria
- [ ] Store page loads with full menu in <2 seconds
- [ ] Menu categories and items display correctly
- [ ] Add to cart functionality works smoothly
- [ ] Cart state persists across page navigation
- [ ] Mobile interface provides excellent UX
- [ ] Loading states prevent layout shift
- [ ] Error handling guides users appropriately

## All Needed Context

### Documentation & References

```yaml
- file: /Users/vienle2/code_projects/vibe-food/PRD.md
  why: Product Requirement Document

- url: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
  why: Dynamic routing patterns for store pages

- url: https://ui.shadcn.com/docs/components/sheet
  why: Mobile cart drawer/sheet component patterns

- url: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
  why: Optimistic updates for cart operations

- file: /Users/vienle2/code_projects/vibe-food/PRPs/vibe-005-store-menu-api.md
  section: "Store details and menu APIs"
  critical: "API endpoints for store data and menu items"

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Frontend Development Guidelines - State Management Hierarchy"
  critical: "React Context for cart state management"

- file: /Users/vienle2/code_projects/vibe-food/PRPs/vibe-003-shared-types.md
  section: "Entity Types - CartItem interface"
  critical: "CartItem type for frontend cart management"
```

### Design Context

**Store Header Layout:**
```
[Store Hero Image - full width]
[Store Name - large, bold]
[Category Badge] [Rating ⭐ 4.5 (234 reviews)]
[📍 Address] [📞 Phone] [🕒 Open until 10:00 PM]
[Delivery: 25-35 min] [Fee: $2.99] [Min: $15.00]
```

**Menu Structure:**
- **Category Navigation**: Sticky horizontal tabs (Appetizers, Mains, Drinks)
- **Menu Items**: Grid layout with photos, names, prices
- **Item Details**: Description, ingredients, dietary tags (vegan, gluten-free)
- **Add to Cart**: Quantity selector + customization options

**Cart Component:**
- **Mobile**: Bottom sheet that slides up
- **Desktop**: Right sidebar or modal overlay
- **Content**: Item list, quantities, subtotal, checkout button

### Technical Patterns

**Server-Side Data Fetching Pattern:**
- **SEO Optimization**: Use Next.js App Router for server-side rendering
- **Data Prefetching**: Fetch store and menu data on server for better performance
- **Error Handling**: Handle invalid store IDs with proper 404 responses
- **Type Safety**: Use proper TypeScript types for params and data
- **Metadata Generation**: Create dynamic meta tags for each store

**Cart State Management Pattern:**
- **Context Design**: Create typed context with clear action methods
- **Persistence**: Store cart state in localStorage for session persistence
- **Calculations**: Implement real-time totals and item count calculations
- **Validation**: Validate quantities and handle edge cases properly
- **Performance**: Use useMemo for expensive calculations and prevent re-renders

**Category Navigation Pattern:**
- **Scroll Spy**: Use IntersectionObserver to track visible categories
- **Sticky Navigation**: Keep category tabs visible during scrolling
- **Smooth Scrolling**: Implement smooth scroll to category sections
- **Visual Feedback**: Highlight active category with proper contrast
- **Mobile UX**: Horizontal scroll for categories on smaller screens

### Performance Optimizations

**Image Loading Strategy:**
- Hero image: Priority loading with Next.js Image
- Menu item images: Lazy loading with placeholder
- Image sizes: Responsive sizes for different breakpoints
- Format optimization: WebP with JPEG fallback

**Menu Rendering:**
- Virtual scrolling for large menus (>100 items)
- Category-based code splitting
- Skeleton loading for menu sections
- Debounced menu search (300ms)

### Critical Gotchas

1. **Cart Persistence**: Save cart state in localStorage/sessionStorage
2. **Price Formatting**: Handle decimal precision for currency display
3. **Image Aspect Ratios**: Maintain consistent ratios to prevent layout shift
4. **Category Scrolling**: Handle edge cases with scroll-spy navigation
5. **Mobile Touch**: Ensure smooth scrolling and touch interactions

## Implementation Blueprint

### Component Architecture

**Store Page Structure:**
```
StorePage
├── StoreHeader (info, rating, hours)
├── CategoryNavigation (sticky tabs)
├── MenuSection
│   ├── CategorySection (repeated for each category)
│   │   ├── MenuItemCard (repeated)
│   │   └── MenuItemSkeleton (loading)
│   └── MenuSearch (filter within store)
├── CartButton (floating action button)
└── CartSheet (mobile) / CartSidebar (desktop)
```

### Key Component Patterns

**Menu Item Card Pattern:**
- **Visual Design**: Display image, name, description, and price clearly
- **Dietary Information**: Show dietary restrictions with recognizable icons
- **Quantity Selection**: Implement intuitive +/- controls with validation
- **Cart Integration**: Show current cart quantity and update indicators
- **Accessibility**: Proper ARIA labels and keyboard navigation support

**Store Header Pattern:**
- **Hero Design**: Attractive hero image with proper aspect ratio and overlay
- **Essential Info**: Display name, category, rating, and operating status prominently
- **Contact Details**: Show address, phone, and delivery information clearly
- **Visual Status**: Use color coding for open/closed status with clear indicators
- **User Actions**: Add favorite/bookmark functionality for logged-in users

**Cart Management:**
```typescript
**Cart Hook Implementation Pattern:**
- **State Initialization**: Load cart from localStorage with proper SSR handling
- **Item Management**: Handle add, update, remove operations with validation
- **Data Persistence**: Automatically sync cart changes to localStorage
- **Calculations**: Provide computed values for totals and item counts
- **Performance**: Use useCallback and useMemo to prevent unnecessary re-renders
```

### Mobile-First Responsive Design

**Breakpoint Strategy:**
- **Mobile (< 768px)**: Single column, bottom cart sheet
- **Tablet (768px - 1024px)**: Two column menu, side cart panel
- **Desktop (> 1024px)**: Three column menu, persistent cart sidebar

**Touch Interactions:**
- Category tabs: Horizontal scroll with momentum
- Menu items: Touch-friendly quantity selectors
- Cart sheet: Swipe gestures for open/close
- Image gallery: Swipe for multiple photos

### SEO and Meta Tags

**SEO Metadata Pattern:**
- **Dynamic Titles**: Create unique, descriptive titles for each store page
- **Meta Descriptions**: Generate compelling descriptions that include key store info
- **Open Graph**: Add social media sharing with store images and descriptions
- **Structured Data**: Consider adding schema.org markup for better search results
- **Error Handling**: Provide fallback metadata for invalid or missing store data

## Validation Loop

### Level 1: Store Page Rendering
```bash
# Test store page loads
curl -I "http://localhost:3000/stores/VALID_STORE_ID"
# Should return 200 OK

# Test invalid store ID
curl -I "http://localhost:3000/stores/invalid-id"
# Should return 404 Not Found

# Check SSR rendering
curl -s "http://localhost:3000/stores/VALID_STORE_ID" | grep -o "<title>.*</title>"
# Should show store-specific title
```

### Level 2: Menu Display
```bash
# Open browser dev tools → Network tab
# Navigate to store page
# Should see API calls for store details and menu items
# Menu should render with categories and items
# Images should load with proper optimization

# Test menu search
# Type in menu search box
# Results should filter in real-time
# URL should not change (local filtering)
```

### Level 3: Cart Functionality
```bash
# Test add to cart
# Click "Add to Cart" on menu item
# Cart counter should update immediately
# Item should appear in cart preview
# Total should calculate correctly

# Test quantity updates
# Use +/- buttons on menu items
# Cart should update in real-time
# Totals should recalculate properly

# Test cart persistence
# Add items to cart
# Refresh page or navigate away and back
# Cart should maintain its state
```

### Level 4: Mobile Experience
```bash
# Test mobile layout (375px width)
# Store header should be single column
# Menu items should stack properly
# Cart should open as bottom sheet
# Touch targets should be adequate (44px)

# Test category navigation
# Category tabs should scroll horizontally
# Tapping category should scroll to section
# Active category should be highlighted

# Test cart sheet
# Tap cart button
# Sheet should slide up from bottom
# Content should be scrollable
# Close gesture should work
```

### Level 5: Performance Testing
```bash
# Test loading performance
# Open dev tools → Performance tab
# Record page navigation to store
# LCP should be < 2.5s
# CLS should be < 0.1

# Test image optimization
# Check Network tab for image requests
# Menu item images should be lazy loaded
# Images should use appropriate formats (WebP)

# Test cart operations
# Add/remove items rapidly
# UI should remain responsive
# No visual glitches or delays
```

### Level 6: Error Handling
```bash
# Test network failures
# Disconnect internet
# Error message should appear
# Retry functionality should work

# Test empty menu
# Store with no menu items
# Should show appropriate empty state
# Should suggest contacting store

# Test cart errors
# Test with invalid price data
# Should handle gracefully without crashing
```

## Task Checklist

### Store Page Setup
- [ ] Create dynamic route with Server-Side Rendering
- [ ] Implement store data fetching with error handling
- [ ] Add dynamic meta tags for SEO optimization
- [ ] Set up proper TypeScript types for all components
- [ ] Configure responsive layout with mobile-first design

### Store Header Component
- [ ] Design store info display with rating and hours
- [ ] Add operating hours with open/closed status
- [ ] Include delivery information and contact details
- [ ] Implement hero image with proper optimization
- [ ] Add favorite/bookmark functionality for logged-in users

### Menu Display System
- [ ] Create categorized menu layout with navigation
- [ ] Implement menu item cards with images and descriptions
- [ ] Add menu search and filtering functionality
- [ ] Create scroll-spy navigation for categories
- [ ] Handle loading states and empty menu scenarios

### Cart Management
- [ ] Implement cart context with React Context API
- [ ] Add cart persistence using localStorage
- [ ] Create add/remove/update cart functionality
- [ ] Build cart preview/summary component
- [ ] Add cart total calculations with proper decimal handling

### Mobile Experience
- [ ] Design mobile-first responsive layout
- [ ] Create bottom sheet cart for mobile devices
- [ ] Implement touch-friendly quantity selectors
- [ ] Add horizontal scrolling for category navigation
- [ ] Test gesture interactions and smooth scrolling

### Performance Optimization
- [ ] Implement image lazy loading for menu items
- [ ] Add skeleton loading components
- [ ] Optimize bundle size with code splitting
- [ ] Configure proper caching strategies
- [ ] Monitor and optimize Core Web Vitals

### Error Handling & UX
- [ ] Handle store not found scenarios
- [ ] Add network error recovery mechanisms
- [ ] Create empty menu state with helpful messaging
- [ ] Implement retry functionality for failed requests
- [ ] Add loading indicators for all async operations

**Critical Success Metrics:**
1. **Performance**: Store page loads completely within 2 seconds
2. **Conversion**: Add to cart flow works smoothly on all devices
3. **Mobile UX**: Excellent mobile experience with proper touch interactions
4. **Cart Persistence**: Cart state survives page navigation and refresh
5. **Error Resilience**: All error scenarios handled gracefully

**Demo Scenario**: User clicks store from homepage → sees complete store info and menu → browses categories → searches for specific item → adds multiple items to cart with different quantities → cart updates in real-time → proceeds to checkout → entire experience is smooth on mobile and desktop.
