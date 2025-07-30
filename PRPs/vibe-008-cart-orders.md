# PRP-008: Vibe Food Ordering - Cart & Order Management

## Goal

Build the complete cart and order management system that enables users to place orders and track their progress:
- Shopping cart with item management (add, remove, update quantities)
- Checkout flow with delivery address and payment method selection
- Order creation API with proper validation and inventory checks
- Order status management system (New, Confirmed, Preparing, etc.)
- Real-time order updates and notifications
- Order history and details for customers
- Store owner order management interface

## Why

- **Revenue Generation**: This is where actual transactions happen
- **Customer Experience**: Smooth checkout process drives completion rates
- **Business Operations**: Order management is core to restaurant operations
- **User Trust**: Reliable order tracking builds customer confidence
- **Scalability**: Proper order system supports business growth

## What

### User-Visible Behavior
- Users can review and modify their cart before ordering
- Checkout flow guides through address, payment, and confirmation
- Order is placed successfully with confirmation number
- Users receive real-time updates on order status
- Order history shows all past orders with details
- Store owners can view and manage incoming orders

### Technical Requirements
- Backend APIs: POST /api/orders, GET /api/orders, PUT /api/orders/:id/status
- Frontend: Cart page, checkout flow, order confirmation, order tracking
- Database: Order and OrderItem models with proper relationships
- Authentication: Protected routes for order placement and management
- Real-time updates: WebSocket or Server-Sent Events for status updates
- Payment integration: Cash on Delivery (COD) initially, extensible for cards

### Success Criteria
- [ ] Users can successfully place orders from their cart
- [ ] Order placement completes within 3 seconds
- [ ] Order status updates reach users within 30 seconds
- [ ] Cart persists across browser sessions reliably
- [ ] Order history displays complete order information
- [ ] Store owners can efficiently manage order workflow

## All Needed Context

### Documentation & References

```yaml
- file: /Users/vienle2/code_projects/vibe-food/PRD.md
  why: Product Requirement Document

- url: https://www.prisma.io/docs/concepts/components/prisma-client/transactions
  why: Database transactions for order creation with multiple items

- url: https://nextjs.org/docs/app/building-your-application/authentication
  why: Protected routes for order management

- file: /Users/vienle2/code_projects/vibe-food/PRPs/vibe-001-foundation-setup.md
  section: "Prisma Database Schema - Order and OrderItem models"
  critical: "Order relationships and status management"

- file: /Users/vienle2/code_projects/vibe-food/PRPs/vibe-002-auth-system.md
  section: "Authentication middleware and user context"
  critical: "User authentication required for order placement"

- file: /Users/vienle2/code_projects/vibe-food/PRPs/vibe-003-shared-types.md
  section: "API Request/Response Contracts - Order APIs"
  critical: "CreateOrderRequest/Response and order status types"
```

### Business Logic Context

**Order Lifecycle:**
1. **NEW**: Order received, awaiting store confirmation
2. **CONFIRMED**: Store accepted order, preparing food
3. **PREPARING**: Food is being prepared
4. **READY**: Food ready for pickup/delivery
5. **PICKED_UP**: Order picked up by delivery driver
6. **DELIVERED**: Order delivered to customer
7. **CANCELLED**: Order cancelled (by customer or store)

**Order Validation Rules:**
- Minimum order value: $10.00
- Maximum order value: $200.00
- Store must be active and within operating hours
- Menu items must be available
- Delivery address must be within service area
- User must be authenticated

**Price Calculation:**
```
Subtotal = Sum(item.price * item.quantity)
Tax = Subtotal * 0.08 (8% tax rate)
Delivery Fee = $2.99 (flat rate)
Total = Subtotal + Tax + Delivery Fee
```

### Critical Gotchas

1. **Race Conditions**: Multiple users ordering same limited item
2. **Price Changes**: Menu prices might change between cart and checkout
3. **Store Hours**: Store might close between browsing and ordering
4. **Inventory Management**: Items might become unavailable
5. **Payment Failures**: Handle failed payment gracefully

## Implementation Blueprint

### Backend Order System

**Order Service Pattern:**
- **Transaction Management**: Use database transactions for atomicity across order creation
- **Validation Pipeline**: Validate store status, menu availability, and pricing in sequence
- **Price Calculation**: Recalculate totals with current prices to prevent stale data issues
- **Data Integrity**: Ensure all related records are created or none at all
- **Error Handling**: Provide specific error messages for different failure scenarios

**Order Status Management Pattern:**
- **Status Validation**: Enforce valid status transitions (e.g., NEW → CONFIRMED → PREPARING)
- **Permission Checks**: Verify user authorization for status updates by role
- **Audit Trail**: Log all status changes with timestamps and user information
- **Real-time Updates**: Trigger notifications to customers when status changes
- **Business Logic**: Handle status-specific operations (inventory updates, notifications)

### Frontend Cart Management

**Cart Context Pattern:**
- **State Structure**: Design clear interface with typed actions and computed values
- **Single Store Rule**: Enforce cart items from single store with validation
- **Calculations**: Provide real-time totals including tax and delivery fees
- **Persistence**: Maintain cart state across browser sessions with localStorage
- **Performance**: Use memoization for expensive calculations and prevent re-renders

**Checkout Flow Components:**
```
CheckoutPage
├── CartReview (item list, totals)
├── DeliveryAddressForm (address input)
├── PaymentMethodSelect (COD initially)
├── OrderSummary (final review)
└── PlaceOrderButton (submit)
```

### Real-time Order Updates

**Real-time Updates Pattern:**
- **WebSocket Management**: Implement proper connection lifecycle with cleanup
- **Message Handling**: Parse and validate incoming status updates safely
- **User Notifications**: Show toast messages for important status changes
- **Connection Recovery**: Handle disconnections and automatic reconnection
- **Memory Management**: Properly clean up connections to prevent memory leaks

### Database Transaction Strategy

**Database Transaction Pattern:**
- **Atomicity**: Ensure all order-related operations succeed or fail together
- **Inventory Management**: Update menu item quantities atomically with order creation
- **Store Metrics**: Update store statistics as part of the transaction
- **Constraint Validation**: Let database constraints enforce data integrity
- **Error Recovery**: Handle transaction failures with proper rollback and error messages

### Error Handling Patterns

**Order Placement Failures:**
- **Store Closed**: "Sorry, this store is currently closed"
- **Item Unavailable**: "Some items are no longer available"
- **Price Changed**: "Prices have been updated, please review"
- **Network Error**: "Connection issue, please try again"
- **Payment Failed**: "Payment could not be processed"

## Validation Loop

### Level 1: Cart Functionality
```bash
# Test cart operations (with frontend running)
# Add items to cart from store page
# Navigate to cart page: http://localhost:3000/cart
# Should show all items with correct quantities and prices

# Test cart persistence
# Add items, close browser, reopen
# Cart should maintain state from localStorage

# Test cart calculations
# Verify subtotal = sum(price * quantity)
# Verify tax = subtotal * 0.08
# Verify total includes delivery fee
```

### Level 2: Order Creation API
```bash
# Test order creation (requires authentication)
curl -X POST "http://localhost:3001/api/orders" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "valid-store-id",
    "items": [
      {
        "menuItemId": "valid-item-id",
        "quantity": 2,
        "notes": "Extra spicy"
      }
    ],
    "deliveryAddress": "123 Main St, City, State",
    "deliveryNotes": "Ring doorbell",
    "paymentMethod": "COD"
  }'
# Should return: 201 with order details and order number

# Test validation errors
curl -X POST "http://localhost:3001/api/orders" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"storeId": "", "items": []}'
# Should return: 400 with validation errors
```

### Level 3: Order Status Management
```bash
# Test order status updates (store owner)
curl -X PUT "http://localhost:3001/api/orders/ORDER_ID/status" \
  -H "Authorization: Bearer STORE_OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED"}'
# Should return: 200 with updated order

# Test unauthorized status update
curl -X PUT "http://localhost:3001/api/orders/ORDER_ID/status" \
  -H "Authorization: Bearer OTHER_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CANCELLED"}'
# Should return: 403 Forbidden
```

### Level 4: Checkout Flow
```bash
# Test checkout page loads
curl -I "http://localhost:3000/checkout"
# Should return 200 (or redirect to login if not authenticated)

# Test order placement flow
# 1. Add items to cart
# 2. Navigate to checkout
# 3. Fill delivery address
# 4. Select payment method
# 5. Click "Place Order"
# Should redirect to order confirmation page

# Test form validation
# Submit checkout with empty address
# Should show validation errors
# Should prevent order submission
```

### Level 5: Order Tracking
```bash
# Test order history page
curl -I "http://localhost:3000/orders"
# Should show user's order history

# Test individual order page
curl -I "http://localhost:3000/orders/ORDER_ID"
# Should show order details with current status

# Test real-time updates (if WebSocket implemented)
# Place order in one browser tab
# Update status in another tab (as store owner)
# Original tab should show updated status
```

### Level 6: Store Owner Order Management
```bash
# Test store owner dashboard
curl "http://localhost:3001/api/orders?storeId=STORE_ID" \
  -H "Authorization: Bearer STORE_OWNER_TOKEN"
# Should return orders for their store only

# Test order filtering
curl "http://localhost:3001/api/orders?status=NEW&storeId=STORE_ID" \
  -H "Authorization: Bearer STORE_OWNER_TOKEN"
# Should return only new orders for the store
```

## Task Checklist

### Backend Order System
- [ ] Create OrderRepository with transaction support
- [ ] Implement OrderService with business logic validation
- [ ] Build OrderController with proper error handling
- [ ] Add order status management endpoints
- [ ] Create real-time notification system (WebSocket/SSE)

### Cart Management (Frontend)
- [ ] Implement cart context with localStorage persistence
- [ ] Create cart page with item management
- [ ] Add cart totals calculation with tax and fees
- [ ] Build cart validation before checkout
- [ ] Handle cart conflicts (price/availability changes)

### Checkout Flow
- [ ] Design checkout page with multi-step form
- [ ] Implement delivery address validation
- [ ] Add payment method selection (COD initially)
- [ ] Create order summary and confirmation
- [ ] Handle checkout errors and recovery

### Order Tracking System
- [ ] Build order history page for customers
- [ ] Create individual order details page
- [ ] Implement real-time status updates
- [ ] Add order cancellation functionality
- [ ] Create order receipt and invoice display

### Store Owner Interface
- [ ] Build order management dashboard
- [ ] Add order filtering and search
- [ ] Implement status update controls
- [ ] Create order fulfillment workflow
- [ ] Add order analytics and reporting

### Database & Performance
- [ ] Implement proper database transactions
- [ ] Add order-related database indexes
- [ ] Create order number generation system
- [ ] Implement order archival for old orders
- [ ] Add performance monitoring for order operations

### Security & Validation
- [ ] Validate all order data with Zod schemas
- [ ] Implement proper authorization checks
- [ ] Add rate limiting for order placement
- [ ] Prevent duplicate order submissions
- [ ] Secure sensitive order information

**Critical Success Metrics:**
1. **Completion Rate**: >95% of checkout flows complete successfully
2. **Performance**: Order placement completes within 3 seconds
3. **Reliability**: Orders are never lost or duplicated
4. **Real-time Updates**: Status changes reach users within 30 seconds
5. **Security**: Only authorized users can access/modify orders

**Demo Scenario**: Customer adds items to cart → proceeds to checkout → enters delivery address → places order → receives confirmation with order number → gets real-time updates as store confirms and prepares order → receives notification when ready for delivery → can view complete order history.
