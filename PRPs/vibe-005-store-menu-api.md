# PRP-005: Vibe Food Ordering - Store Details & Menu API

## Goal

Build comprehensive store details and menu management APIs that provide complete information for store pages and ordering:
- GET /api/stores/:id endpoint for detailed store information
- GET /api/stores/:id/menu endpoint for menu items with categories
- Store owner endpoints for menu management (POST, PUT, DELETE)
- Optimized queries with proper relations and caching
- Menu item availability and pricing management
- Image upload support for menu items

## Why

- **Ordering Foundation**: Users need detailed menu info to place orders
- **Store Management**: Store owners need CRUD operations for their menus
- **Performance Critical**: Menu loading affects conversion rates
- **Data Completeness**: Rich store/menu data improves user experience
- **Business Logic**: Menu availability, pricing, and categorization

## What

### User-Visible Behavior
- Users can view complete store details (hours, contact, rating)
- Users can browse full menu with categories, descriptions, and pricing
- Store owners can add/edit/delete menu items through admin interface
- Menu items show real-time availability status
- Images load quickly for menu items

### Technical Requirements
- GET /api/stores/:storeId - Store details with relations
- GET /api/stores/:storeId/menu - Menu items with categories
- POST /api/stores/:storeId/menu - Create menu item (store owners only)
- PUT /api/menu-items/:itemId - Update menu item (store owners only)
- DELETE /api/menu-items/:itemId - Delete menu item (store owners only)
- Role-based access control for management endpoints
- Efficient database queries with proper joins
- Image upload handling for menu item photos

### Success Criteria
- [ ] Store details API returns complete store information in <150ms
- [ ] Menu API returns categorized items with availability
- [ ] Store owners can manage their menu items successfully
- [ ] Authorization prevents cross-store menu tampering
- [ ] Image uploads work with proper validation and storage
- [ ] Database queries are optimized with minimal N+1 issues

## All Needed Context

### Documentation & References

```yaml
- file: /Users/vienle2/code_projects/vibe-food/PRD.md
  why: Product Requirement Document

- url: https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries
  why: Efficient loading of store with menu items and relations

- url: https://expressjs.com/en/resources/middleware/multer.html
  why: File upload handling for menu item images

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Architecture Principles - Database-First Schema Design"
  critical: "MenuItem relationships to Store and OrderItem"

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Backend Development Guidelines - Authentication Flow"
  critical: "Store owners can only manage their own stores"

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Architecture Principles - API-First Development"
  critical: "CreateMenuItemRequest/Response and update schemas"
```

### Business Context

**Store Details Requirements:**
- Basic info: name, description, category, address, phone
- Operating hours: openTime, closeTime with timezone handling
- Rating and review summary: average rating, total orders
- Owner information: contact details for customer service
- Menu categories: unique categories from menu items

**Menu Item Structure:**
- **Categories**: Appetizers, Main Course, Beverages, Desserts (dynamic)
- **Pricing**: Decimal precision for currency, tax calculations
- **Availability**: Real-time status, temporary out-of-stock
- **Images**: Upload, resize, CDN storage for performance
- **Descriptions**: Rich text support, allergen information

**Authorization Rules:**
- **Public**: Can view any active store details and menu
- **Store Owners**: Can manage only their own store's menu items
- **Admins**: Can manage any store's menu items

### Critical Gotchas

1. **Store Authorization**: Verify store ownership before allowing menu modifications
2. **Menu Item Relations**: Existing orders reference menu items - soft delete only
3. **Image Storage**: Handle upload failures gracefully, validate file types
4. **Decimal Precision**: Use Prisma Decimal type for prices, convert for JSON
5. **Menu Categories**: Auto-generate from menu items, not hardcoded list

## Implementation Blueprint

### Architecture Pattern
**Layered Approach**: Repository → Service → Controller → Routes
- **Repository**: Data access with optimized Prisma queries
- **Service**: Business logic and authorization checks
- **Controller**: Request/response handling and validation
- **Routes**: Endpoint definition with middleware

### Key Database Patterns

**Store Details Query Strategy:**
- Use `findUnique` with strategic `include` for related data
- Select only necessary owner fields for privacy
- Filter menu items by availability and order by category/name
- Include aggregate counts for orders and menu items using `_count`
- Follow database-first schema design from CLAUDE.md

**Menu Items Query Strategy:**
- Use `findMany` with store filtering and availability checks
- Order by category first, then name for consistent grouping
- Select only required fields to minimize data transfer
- Apply proper indexing on `(store_id, is_available)` and `(store_id, category, name)`

### Authorization Strategy

**Store Ownership Validation Pattern:**
- Create middleware to verify store ownership before menu operations
- Extract `storeId` from route parameters and `userId` from JWT token
- Query database to confirm user owns the store before proceeding
- Return 403 Forbidden if ownership validation fails
- Attach verified store to request object for downstream use
- Follow JWT authentication patterns from CLAUDE.md backend guidelines

### Image Upload Strategy

**File Handling Approach:**
- Use multer for multipart form handling
- Validate file type (JPEG, PNG, WebP only)
- Resize images to standard sizes (400x300 thumbnail, 800x600 full)
- Store in local uploads folder (production: use S3/CloudStorage)
- Return URL path in API responses

**Validation Rules:**
- Max file size: 5MB
- Allowed formats: image/jpeg, image/png, image/webp
- Image dimensions: minimum 200x200, maximum 2000x2000

### Error Handling Patterns

**Store Not Found Strategy:**
- Check both store existence and active status in single validation
- Use custom error classes (NotFoundError) following CLAUDE.md error handling
- Return consistent 404 status with user-friendly messages
- Log errors with proper context for debugging

**Menu Item Soft Delete Strategy:**
- Never hard delete menu items that have existing order references
- Check for existing order items before deletion
- Set `isAvailable: false` for items with order history
- Only allow hard delete for items with zero order references
- Maintain data integrity while preserving order history

### Performance Optimizations

**Caching Strategy:**
- Cache store details for 10 minutes (changes infrequently)
- Cache menu items for 5 minutes (availability changes more often)
- Invalidate cache on menu item updates
- Use ETags for conditional requests

**Database Indexes Strategy:**
- Create composite index on `(store_id, is_available)` for availability filtering
- Add compound index on `(store_id, category, name)` for ordered menu queries
- Consider additional indexes on `updated_at` for cache invalidation
- Monitor query performance and add indexes based on actual usage patterns
- Use Prisma migration system to manage index creation

## Validation Loop

### Level 1: Store Details API
**Testing Strategy:** Validate store retrieval with proper error handling

```bash
# Test successful store details retrieval
curl "http://localhost:3001/api/stores/STORE_ID" | jq '.data.store'
# Expected: Complete store object with owner info, menu items, and counts

# Test error handling for non-existent store
curl "http://localhost:3001/api/stores/invalid-id"
# Expected: 404 status with "Store not found" error message

# Test inactive store handling
curl "http://localhost:3001/api/stores/INACTIVE_STORE_ID"
# Expected: 404 status with "Store not found or unavailable" message
```

**Validation Checklist:**
- Store details include all required fields from shared types
- Owner information excludes sensitive data (passwords, etc.)
- Menu items are filtered by availability and properly ordered
- Aggregate counts are accurate and efficient

### Level 2: Menu API Testing
**Testing Strategy:** Validate menu CRUD operations with proper authorization

```bash
# Test menu items retrieval with category grouping
curl "http://localhost:3001/api/stores/STORE_ID/menu" | jq '.data'
# Expected: { menuItems: [...], categories: [...] } with proper ordering

# Test authenticated menu item creation
curl -X POST "http://localhost:3001/api/stores/STORE_ID/menu" \
  -H "Authorization: Bearer STORE_OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Margherita Pizza", "description": "Fresh tomatoes", "price": 18.99, "category": "Pizza"}'
# Expected: 201 status with created menu item following shared types

# Test cross-store authorization prevention
curl -X POST "http://localhost:3001/api/stores/OTHER_STORE_ID/menu" \
  -H "Authorization: Bearer STORE_OWNER_TOKEN" \
  -d '{"name": "Test", "price": 10, "category": "Test"}'
# Expected: 403 status with access denied message
```

**Validation Checklist:**
- Menu items are properly categorized and ordered
- Authorization prevents cross-store menu tampering
- Input validation follows Zod schemas from shared types
- Decimal precision preserved for pricing

### Level 3: Image Upload Testing
**Testing Strategy:** Validate file upload with proper validation and error handling

```bash
# Test successful menu item image upload
curl -X POST "http://localhost:3001/api/menu-items/ITEM_ID/image" \
  -H "Authorization: Bearer STORE_OWNER_TOKEN" \
  -F "image=@test-image.jpg"
# Expected: 200 status with imageUrl field pointing to stored image

# Test file format validation
curl -X POST "http://localhost:3001/api/menu-items/ITEM_ID/image" \
  -H "Authorization: Bearer STORE_OWNER_TOKEN" \
  -F "image=@test-file.txt"
# Expected: 400 status with "Invalid file format" error
```

**Validation Checklist:**
- Only allow JPEG, PNG, WebP formats as specified
- Enforce 5MB file size limit with clear error messages
- Validate image dimensions (200x200 min, 2000x2000 max)
- Store images securely and return accessible URLs
- Handle upload failures gracefully with cleanup

### Level 4: Menu Management
**Testing Strategy:** Validate update and delete operations with data integrity

```bash
# Test menu item partial update
curl -X PUT "http://localhost:3001/api/menu-items/ITEM_ID" \
  -H "Authorization: Bearer STORE_OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price": 20.99, "isAvailable": true}'
# Expected: 200 status with updated menu item reflecting changes

# Test menu item soft delete with order history
curl -X DELETE "http://localhost:3001/api/menu-items/ITEM_ID" \
  -H "Authorization: Bearer STORE_OWNER_TOKEN"
# Expected: 200 status, item marked isAvailable: false (not hard deleted)
```

**Validation Checklist:**
- Updates preserve data integrity and validate input
- Soft delete preserves order history references
- Hard delete only allowed for items with zero orders
- Price updates maintain decimal precision
- Availability changes reflect immediately in menu queries

### Level 5: Performance Validation
**Testing Strategy:** Ensure performance targets and caching effectiveness

```bash
# Measure store details response time
curl -w "Response time: %{time_total}s\n" -s -o /dev/null "http://localhost:3001/api/stores/STORE_ID"
# Expected: < 150ms response time for store details

# Validate caching headers
curl -I "http://localhost:3001/api/stores/STORE_ID/menu"
# Expected: Cache-Control headers with appropriate TTL

# Monitor database query patterns (enable Prisma logging)
# Expected: No N+1 queries, efficient joins, proper index usage
```

**Performance Checklist:**
- Store details load within 150ms target
- Menu queries complete within 100ms target
- Caching reduces database load for repeated requests
- Database queries use proper indexes and minimize N+1 issues
- ETags enable conditional requests for unchanged data

## Task Checklist

### Store Details API
- [ ] Create StoreRepository.findByIdWithDetails() method
- [ ] Implement StoreService.getStoreDetails() with authorization
- [ ] Build StoreController.getStoreById() endpoint
- [ ] Add caching middleware for store details
- [ ] Handle inactive/non-existent stores properly

### Menu Items API
- [ ] Create MenuItemRepository with CRUD operations
- [ ] Implement MenuItemService with business logic
- [ ] Build MenuController with role-based access control
- [ ] Add store ownership verification middleware
- [ ] Create menu item routes with proper validation

### Image Upload System
- [ ] Set up multer middleware for file uploads
- [ ] Add image validation (type, size, dimensions)
- [ ] Implement image resizing and storage
- [ ] Create image URL generation and serving
- [ ] Handle upload errors and cleanup

### Authorization & Security
- [ ] Verify store ownership before menu modifications
- [ ] Implement role-based access for different user types
- [ ] Add input validation for all menu item fields
- [ ] Prevent cross-store data access
- [ ] Validate decimal precision for pricing

### Database & Performance
- [ ] Create optimized database indexes
- [ ] Implement soft delete for menu items with orders
- [ ] Add query optimization to prevent N+1 issues
- [ ] Set up appropriate caching strategies
- [ ] Add database connection error handling

### Error Handling & Logging
- [ ] Handle all error scenarios with proper status codes
- [ ] Add comprehensive input validation
- [ ] Implement detailed error logging
- [ ] Create user-friendly error messages
- [ ] Add monitoring for failed operations

**Critical Success Metrics:**
1. **Performance**: Store details load in <150ms, menu in <100ms
2. **Security**: Store owners can only manage their own menus
3. **Data Integrity**: Menu items properly categorized and priced
4. **Image Handling**: Photos upload and display correctly
5. **Availability**: Real-time menu item availability updates

**Demo Scenario**: Store owner logs in → navigates to their store management → adds new menu item with photo → sets price and category → item appears on public menu immediately → customers can see new item with proper pricing and availability.

---

## Implementation Guidance

### Key Patterns to Follow
- **API-First Development**: Define all request/response types in shared packages before implementation
- **Database-First Schema**: Let Prisma schema drive your data model design
- **Layered Architecture**: Maintain clear separation between Repository → Service → Controller → Routes
- **Error Handling**: Use custom error classes and consistent status codes as per CLAUDE.md
- **Input Validation**: Apply Zod validation at all system boundaries
- **Type Safety**: Never use `any` type, prefer strict TypeScript throughout

### Critical References
- Follow **Backend Development Guidelines** in CLAUDE.md for domain-driven design
- Apply **Data Validation with Zod** patterns for all external inputs
- Use **Testing Strategy** requirements for comprehensive coverage
- Reference **Performance Optimizations** for caching and database strategies

### Success Indicators
- All validation commands pass without errors
- API responses match shared type contracts exactly
- Database queries are optimized with proper indexing
- Authorization prevents unauthorized cross-store access
- Image uploads work reliably with proper validation
- Performance targets met consistently under load
