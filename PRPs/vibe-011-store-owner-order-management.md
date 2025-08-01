# PRP-011: Vibe Food Ordering - Store Owner Order Management Interface

## Goal

Build a comprehensive order management interface for store owners that enables them to efficiently view all orders for their store and update order status through the complete order lifecycle. This interface will provide real-time order tracking, filtering capabilities, and streamlined order status management for optimal restaurant operations.

**Core Features:**
- View all orders for owned stores with pagination and filtering
- Update order status through valid state transitions (NEW → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED)
- Real-time order updates using existing WebSocket infrastructure
- Order filtering by status, date range, and search
- Order details view with customer information and items
- Store order analytics and statistics

## Why

- **Operational Efficiency**: Store owners need centralized order management to handle order flow efficiently
- **Revenue Optimization**: Faster order processing reduces wait times and increases customer satisfaction
- **Business Control**: Store owners must have complete visibility and control over their order pipeline
- **Customer Experience**: Real-time status updates improve customer trust and satisfaction
- **Scalability**: Proper order management supports business growth and multiple concurrent orders

## What

### User-Visible Behavior
- Store owners access a dedicated order management dashboard
- Orders are displayed in an organized list with key information (order number, customer, status, time, total)
- Status can be updated via action buttons or dropdowns
- Real-time updates show new orders and status changes without page refresh
- Filtering and search capabilities help manage high order volumes
- Order details modal shows complete order information including customer contact and delivery details
- Analytics section shows key metrics (pending orders, completed orders, revenue)

### Technical Requirements
- **Backend**: Extend existing order endpoints with store owner filtering and authorization
- **Frontend**: New store owner dashboard page with order management components
- **Authentication**: Role-based access control for STORE_OWNER users with ownership verification
- **Real-time Updates**: Integration with existing WebSocket service for live order updates
- **Performance**: Efficient pagination and caching for high-volume order lists
- **Mobile Responsive**: Interface works well on tablets and mobile devices for kitchen use

### Success Criteria
- [ ] Store owners can view orders for their stores only (proper authorization)
- [ ] Order status updates complete within 2 seconds with optimistic UI
- [ ] Real-time updates appear within 30 seconds across all connected clients
- [ ] Interface handles 100+ concurrent orders without performance degradation
- [ ] Mobile interface is usable on tablet devices in kitchen environments
- [ ] All status transitions follow business rules and validation

## All Needed Context

### Documentation & References

```yaml
- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Authentication/Authorization Patterns - Store Owner Access"
  critical: "Existing ownership verification middleware and patterns"

- file: /Users/vienle2/code_projects/vibe-food/apps/backend/src/domains/order/services/order.service.ts
  lines: "100-150"
  critical: "Existing getOrders() method with role-based filtering for STORE_OWNER"

- file: /Users/vienle2/code_projects/vibe-food/apps/backend/src/domains/order/controllers/order.controller.ts
  critical: "Existing order endpoints and response format patterns"

- file: /Users/vienle2/code_projects/vibe-food/apps/backend/src/domains/store/middleware/ownership.middleware.ts
  critical: "verifyStoreOwnership() and verifyStoreOwnerRole() middleware patterns"

- file: /Users/vienle2/code_projects/vibe-food/apps/frontend/src/app/orders/client.tsx
  critical: "Existing order list component patterns and ORDER_STATUS_CONFIG"

- file: /Users/vienle2/code_projects/vibe-food/apps/frontend/src/components/stores/StoreFilters.tsx
  critical: "Filtering UI patterns with debounced search and category filters"

- file: /Users/vienle2/code_projects/vibe-food/apps/frontend/src/hooks/useWebSocket.ts
  critical: "WebSocket integration patterns for real-time updates"

- file: /Users/vienle2/code_projects/vibe-food/packages/shared/src/types/api.ts
  critical: "Existing order API schemas and types"
```

### Existing Architecture Context

#### Database Schema (Orders are perfectly structured)
- **Order Model**: `/Users/vienle2/code_projects/vibe-food/apps/backend/prisma/schema.prisma`
  - Orders linked to stores via `storeId` field with proper indexing
  - Status enum: NEW, CONFIRMED, PREPARING, READY, PICKED_UP, DELIVERED, CANCELLED
  - Comprehensive order information including customer details, pricing, timing
  - Proper relationships: Order → Store → User(owner)

#### Authentication & Authorization (Production Ready)
- **JWT-based auth** with role support: CUSTOMER, STORE_OWNER, ADMIN
- **Ownership middleware** already exists: `verifyStoreOwnership()` verifies user owns specific store
- **Role middleware** already exists: `requireStoreOwnerOrAdmin()` for role-based access
- **Order service authorization** already implemented: STORE_OWNER users can only access orders for their stores

#### Existing Order Management Backend (80% Complete)
- **OrderService.getOrders()**: Already filters by storeId for STORE_OWNER role
- **OrderService.updateOrderStatus()**: Already validates ownership and status transitions  
- **OrderRepository**: Has `findByStoreId()` and `getStoreOrderStats()` methods
- **Order status transitions**: Validated business logic with ORDER_STATUS_TRANSITIONS rules
- **WebSocket integration**: Real-time updates already broadcast to store rooms

#### Frontend Patterns (Excellent Foundation)
- **Order display components**: Existing OrderHistoryClient shows proper patterns
- **Status management**: ORDER_STATUS_CONFIG with icons, labels, colors
- **UI Components**: Shadcn/ui components (Card, Badge, Dialog, Sheet) ready to use
- **Filtering patterns**: StoreFilters component shows debounced search and filter UI
- **Real-time updates**: useWebSocket hook with joinStoreRoom() functionality

### Critical Implementation Gotchas

#### Type Safety Issues (From CLAUDE.md Experience)
1. **Route Parameter Types**: Don't use branded types (StoreId) for URL params - use string and validate when needed
2. **Environment Validation**: Add `SKIP_ENV_VALIDATION=true` to frontend .env.local to prevent browser validation
3. **Zustand Selectors**: Use individual selectors, avoid returning objects from selectors to prevent re-renders
4. **Server/Client Components**: Separate server data fetching from client interactivity

#### Performance Considerations
1. **Database Indexes**: Add composite index `(storeId, status, createdAt DESC)` for optimal store order queries
2. **Caching Strategy**: Implement 1-minute TTL for order lists, invalidate on updates
3. **Pagination**: Use cursor-based pagination for large order volumes
4. **WebSocket Scaling**: Store owners join `store:${storeId}` rooms for targeted updates

### Real-time Update Patterns

#### Existing WebSocket Infrastructure
- **Connection Management**: Authenticated WebSocket connections with automatic reconnection
- **Room-based Messaging**: Store owners join `store:${storeId}` rooms
- **Event Types**: `order-status-update`, `new-order`, `order-cancelled`
- **Integration**: useWebSocket hook provides `onOrderStatusUpdate()` callback

#### Update Broadcasting Pattern
```typescript
// Existing pattern from OrderService
webSocketService.broadcastOrderUpdate({
  orderId: order.id,
  status: order.status,
  estimatedDeliveryTime: order.estimatedDeliveryTime?.toISOString(),
  message: 'Order status updated',
  timestamp: new Date().toISOString()
}, customerId, storeId);
```

## Implementation Blueprint

### Phase 1: Backend Enhancements (30% effort - mostly exists)

#### 1.1 Extend Existing Order Controller
**File**: `/Users/vienle2/code_projects/vibe-food/apps/backend/src/domains/order/controllers/order.controller.ts`

**Pattern**: Add store-specific endpoints to existing controller
```typescript
// GET /api/orders/store/:storeId - Store-specific order list
getStoreOrders = async (req: Request, res: Response, next: NextFunction) => {
  // Use existing getOrders() method with storeId filtering
  // Apply existing ownership verification middleware
}

// GET /api/orders/store/:storeId/stats - Store analytics  
getStoreOrderStats = async (req: Request, res: Response, next: NextFunction) => {
  // Use existing orderRepository.getStoreStats() method
}
```

#### 1.2 Add Store-Specific Routes
**File**: `/Users/vienle2/code_projects/vibe-food/apps/backend/src/domains/order/routes/order.routes.ts`

**Pattern**: Follow existing ownership middleware pattern
```typescript
// Store owner specific routes with three-layer protection
router.get('/store/:storeId/orders',
  authMiddleware.authenticate,        // 1. Verify JWT
  verifyStoreOwnerRole,              // 2. Verify STORE_OWNER role  
  verifyStoreOwnership,              // 3. Verify owns this store
  validateQuery(storeOrderFiltersSchema),
  orderController.getStoreOrders
);
```

#### 1.3 Database Optimization
**Add Missing Composite Index** (Critical for Performance):
```sql
-- Add to migration file
CREATE INDEX "idx_orders_store_status_created" ON "orders" ("storeId", "status", "createdAt" DESC);
```

### Phase 2: Frontend Store Owner Dashboard (60% effort)

#### 2.1 Dashboard Page Structure
**File**: `/Users/vienle2/code_projects/vibe-food/apps/frontend/src/app/store-owner/orders/page.tsx`

**Pattern**: Server Component → Client Component separation
```typescript
// Server Component - Data fetching
export default async function StoreOwnerOrdersPage({ 
  params, searchParams 
}: { params: { storeId: string }, searchParams: { [key: string]: string | undefined } }) {
  // Server-side authentication check
  // Initial data fetch (optional for faster loading)
  return <StoreOwnerOrdersClient storeId={params.storeId} initialFilters={searchParams} />;
}
```

#### 2.2 Order Management Client Component
**File**: `/Users/vienle2/code_projects/vibe-food/apps/frontend/src/app/store-owner/orders/client.tsx`

**Pattern**: Adapt existing OrderHistoryClient pattern
```typescript
'use client';

interface StoreOwnerOrdersClientProps {
  storeId: string;
  initialFilters?: OrderFilters;
}

export function StoreOwnerOrdersClient({ storeId, initialFilters }: StoreOwnerOrdersClientProps) {
  // Use existing patterns:
  // - TanStack Query for server state
  // - Individual Zustand selectors for local state  
  // - useWebSocket for real-time updates
  // - Existing ORDER_STATUS_CONFIG for status display
}
```

#### 2.3 Order Status Update Components
**Pattern**: Reuse existing UI components with action buttons
```typescript
// Order status action buttons
const StatusActionButtons = ({ order, onStatusUpdate }: Props) => {
  // Use existing Badge component for current status
  // Use existing Button component for actions
  // Follow ORDER_STATUS_TRANSITIONS for valid actions
  // Implement optimistic updates with error rollback
};
```

#### 2.4 Order Filtering Interface
**Pattern**: Adapt StoreFilters component pattern
```typescript
// Reuse filtering patterns from StoreFilters.tsx
const OrderFilters = ({ filters, onFiltersChange }: Props) => {
  // Status filter buttons (New, Confirmed, Preparing, etc.)
  // Date range picker
  // Search input with debouncing (300ms)
  // Clear filters functionality
};
```

### Phase 3: Real-time Integration (10% effort - mostly exists)

#### 3.1 WebSocket Integration
**Pattern**: Use existing useWebSocket hook
```typescript
const StoreOwnerOrdersClient = ({ storeId }: Props) => {
  const { joinStoreRoom, onOrderStatusUpdate } = useWebSocket();
  
  useEffect(() => {
    joinStoreRoom(storeId);
    
    const unsubscribe = onOrderStatusUpdate((update) => {
      // Update order in TanStack Query cache
      queryClient.setQueryData(['orders', storeId], (oldData) => {
        // Optimistically update order status
      });
    });
    
    return unsubscribe;
  }, [storeId]);
};
```

### Phase 4: Testing Implementation (Following Existing Patterns)

#### 4.1 Backend Unit Tests
**Pattern**: Follow existing OrderService test patterns
```typescript
// apps/backend/src/domains/order/__tests__/order.service.store-owner.test.ts
describe('OrderService - Store Owner Operations', () => {
  // Test getOrders() with storeId filtering
  // Test updateOrderStatus() with ownership validation
  // Test unauthorized access attempts
  // Test status transition validation
});
```

#### 4.2 Frontend Component Tests
**Pattern**: Follow existing component test patterns with Vitest + React Testing Library
```typescript
// apps/frontend/src/app/store-owner/__tests__/OrderManagement.test.tsx
describe('Store Owner Order Management', () => {
  // Test order list display
  // Test status update actions
  // Test real-time updates
  // Test filtering functionality
  // Test error states and loading
});
```

#### 4.3 Integration Tests
**Pattern**: Follow existing API integration test patterns
```typescript
// Test complete order management flow
// Test authorization for store owner access
// Test WebSocket real-time updates
// Test performance with high order volumes
```

## Validation Gates (Must be Executable by AI Agent)

### Level 1: Backend Validation
```bash
# Type checking and linting
cd apps/backend && npm run lint && npm run type-check

# Unit tests
cd apps/backend && npm test -- --grep "store.owner"

# Database migration (for index)
cd apps/backend && npx prisma migrate dev --name add-store-order-indexes
```

### Level 2: API Endpoint Testing
```bash
# Start backend server  
cd apps/backend && npm run dev

# Test store owner order access (replace with actual tokens/IDs)
curl -X GET "http://localhost:3001/api/orders/store/STORE_ID/orders?status=NEW" \
  -H "Authorization: Bearer STORE_OWNER_JWT_TOKEN" \
  -H "Accept: application/json"

# Should return: 200 with filtered orders
# Should respect authorization (403 if wrong owner)

# Test order status update
curl -X PUT "http://localhost:3001/api/orders/ORDER_ID/status" \
  -H "Authorization: Bearer STORE_OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED", "notes": "Order confirmed by store"}'

# Should return: 200 with updated order
# Should validate status transitions (400 if invalid)
```

### Level 3: Frontend Validation
```bash
# Type checking and linting
cd apps/frontend && npm run lint && npm run type-check  

# Component tests
cd apps/frontend && npm run test -- store-owner

# Start frontend development server
cd apps/frontend && npm run dev

# Test store owner dashboard access
# Navigate to: http://localhost:3000/store-owner/STORE_ID/orders
# Should show order management interface (or redirect to login)
```

### Level 4: Integration Testing
```bash
# Start both servers
npm run dev

# Test complete workflow:
# 1. Login as store owner
# 2. Navigate to order management dashboard  
# 3. View orders for owned store
# 4. Update order status
# 5. Verify real-time updates in another browser tab
# 6. Test filtering and search functionality

# Test authorization:
# 1. Try accessing orders for non-owned store
# 2. Should receive 403 Forbidden error
```

### Level 5: Performance Testing
```bash
# Test with high order volume
# Create 100+ test orders via API
# Load store owner dashboard
# Should load within 3 seconds
# Should handle pagination smoothly
# Should show real-time updates without lag

# Test concurrent users
# Have multiple store owners access their dashboards simultaneously
# Should maintain proper isolation and performance
```

### Level 6: MCP Database Validation
```bash
# Use PostgreSQL MCP to validate schema and performance
# Check index usage:
EXPLAIN ANALYZE SELECT * FROM orders 
WHERE "storeId" = 'test-store-id' AND "status" = 'NEW' 
ORDER BY "createdAt" DESC LIMIT 20;

# Should use: idx_orders_store_status_created index
# Query should complete in <50ms

# Validate data integrity:
SELECT COUNT(*) FROM orders o 
JOIN stores s ON o."storeId" = s.id 
WHERE s."ownerId" = 'test-owner-id';

# Should return only orders for stores owned by the user
```

## Task Checklist (Implementation Order)

### Backend Foundation (Day 1)
- [ ] **Add composite database index** for (storeId, status, createdAt) - CRITICAL for performance
- [ ] **Extend OrderController** with getStoreOrders() and getStoreOrderStats() methods
- [ ] **Add store-specific routes** with proper ownership middleware protection
- [ ] **Create Zod validation schemas** for store owner order filtering
- [ ] **Write unit tests** for store owner order access and authorization

### Frontend Dashboard Structure (Day 2-3)  
- [ ] **Create store owner dashboard page** following server/client component pattern
- [ ] **Build OrderManagement client component** adapting existing OrderHistoryClient patterns
- [ ] **Implement order filtering interface** using StoreFilters component patterns
- [ ] **Add order status update controls** with optimistic UI updates
- [ ] **Create order details modal** using existing Dialog/Sheet components

### Real-time Integration (Day 4)
- [ ] **Integrate WebSocket updates** using existing useWebSocket hook patterns
- [ ] **Implement real-time order notifications** with toast messages
- [ ] **Add optimistic status updates** with error rollback handling  
- [ ] **Test concurrent user scenarios** with multiple store owners
- [ ] **Validate real-time update performance** under load

### Testing & Polish (Day 5)
- [ ] **Write comprehensive component tests** following existing test patterns
- [ ] **Add integration tests** for complete order management workflow
- [ ] **Test authorization edge cases** and error handling
- [ ] **Optimize performance** with caching and pagination
- [ ] **Add mobile responsive design** for tablet use in kitchens

### Performance & Security (Final)
- [ ] **Implement efficient caching strategy** with appropriate TTL values
- [ ] **Add rate limiting** for order status updates to prevent abuse
- [ ] **Validate security isolation** between different store owners
- [ ] **Performance testing** with high order volumes (100+ concurrent orders)
- [ ] **Load testing** with multiple concurrent store owners

## Critical Success Metrics

1. **Authorization Security**: Store owners can ONLY access orders for stores they own - 100% isolation
2. **Performance**: Order list loads within 3 seconds with 100+ orders
3. **Real-time Updates**: Status changes appear within 30 seconds across all connected clients  
4. **Reliability**: Zero data corruption or lost orders during status updates
5. **Usability**: Interface is intuitive for restaurant staff with minimal training
6. **Mobile Support**: Fully functional on tablet devices for kitchen environments

## Confidence Score: 9/10

**Reasoning for High Confidence:**
- **Excellent Foundation**: 80% of backend functionality already exists and is production-ready
- **Proven Patterns**: All major patterns (auth, WebSocket, UI components) are established and working
- **Comprehensive Research**: Deep analysis of existing codebase provides clear implementation path
- **Type Safety**: Existing TypeScript patterns prevent common implementation errors
- **Testing Framework**: Comprehensive testing patterns are established and proven
- **Performance**: Database schema and indexing strategy are optimized for this use case

**Risk Mitigation:**
- Follow existing patterns exactly to avoid introduction of new bugs
- Comprehensive testing at each level before proceeding to next phase
- Leverage existing authorization and WebSocket infrastructure rather than rebuilding
- Use established UI component patterns for consistency and reliability

This PRP provides a clear, executable path to implementing store owner order management with minimal risk and maximum code reuse. The implementation leverages all existing infrastructure while adding the specific functionality needed for store owner operations.