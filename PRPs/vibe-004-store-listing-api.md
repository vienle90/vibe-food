# PRP-004: Vibe Food Ordering - Store Listing & Filtering API

## Goal

Build a comprehensive store listing and filtering API that serves as the foundation for the food ordering experience:
- GET /api/stores endpoint with advanced filtering capabilities
- Category-based filtering (lunch, dinner, coffee, tea, dessert, fast_food)
- Text search across store names and descriptions
- Pagination with configurable page sizes
- Sorting by relevance, rating, distance, and popularity
- Efficient database queries with proper indexing
- Caching layer for improved performance

## Why

- **Core User Experience**: Store discovery is the primary user entry point
- **Performance Critical**: Fast store listing drives user engagement and retention
- **Scalability Foundation**: Proper pagination and caching support growth
- **Search & Discovery**: Users need to find relevant stores quickly
- **Business Intelligence**: Filtering provides insights into user preferences

## What

### User-Visible Behavior
- Users can browse all available stores with instant loading
- Category filters work immediately (lunch, dinner, coffee, etc.)
- Search finds stores by name and description
- Results are paginated for smooth scrolling experience
- Stores are sorted by relevance and quality

### Technical Requirements
- RESTful API endpoint: GET /api/stores
- Query parameters: category, search, page, limit, sort, isActive
- Response includes: stores array, pagination metadata, filter options
- Database queries optimized with proper indexes
- Response caching for frequently accessed data
- Input validation using shared Zod schemas
- Comprehensive error handling

### Success Criteria
- [ ] API returns filtered store results in <200ms
- [ ] Pagination works correctly with large datasets
- [ ] Search finds relevant stores accurately
- [ ] Category filters return appropriate results
- [ ] Response format matches shared API contracts
- [ ] Database queries are optimized and indexed

## All Needed Context

### Documentation & References

```yaml
- file: /Users/vienle2/code_projects/vibe-food/PRD.md
  why: Product Requirement Document

- url: https://www.prisma.io/docs/concepts/components/prisma-client/pagination
  why: Database pagination patterns and performance optimization

- url: https://expressjs.com/en/guide/writing-middleware.html
  why: Express middleware patterns for validation and error handling

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Backend Development Guidelines - Database Operations"
  critical: "Use Prisma Client with proper error handling patterns"

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Architecture Principles - API-First Development"
  critical: "API contract definitions and shared type safety patterns"

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Data Validation with Zod - Schema Patterns"
  critical: "Input validation requirements and branded types usage"
```

### Business Context

**Store Categories:**
- **LUNCH**: Restaurants serving lunch meals (11:00-15:00)
- **DINNER**: Evening dining establishments (17:00-23:00)
- **COFFEE**: Coffee shops and cafes (06:00-20:00)
- **TEA**: Tea houses and bubble tea shops (10:00-22:00)
- **DESSERT**: Bakeries and dessert shops (08:00-21:00)
- **FAST_FOOD**: Quick service restaurants (10:00-24:00)

**Search Requirements:**
- Search store names (primary match)
- Search descriptions (secondary match)
- Case-insensitive partial matching
- Relevance scoring based on match quality

**Sorting Options:**
- **relevance**: Best match for search query (default for search)
- **rating**: Highest rated stores first (default for browsing)
- **name**: Alphabetical order
- **created**: Newest stores first

### Critical Gotchas

1. **N+1 Query Problem**: Use `include` to fetch related data in single query
2. **Case Sensitivity**: PostgreSQL search needs ILIKE for case-insensitive matching
3. **Empty Results**: Always return valid pagination metadata even for empty results
4. **Invalid Categories**: Validate category values against enum before database query
5. **SQL Injection**: Use Prisma's parameterized queries, never string concatenation

## Implementation Blueprint

### 1. Store Repository Pattern

**Architecture Guidance:**
- Follow domain-driven design principles with Repository pattern
- Create `StoreRepository` class in `apps/backend/src/domains/store/store.repository.ts`
- Use Prisma Client for database operations with proper error handling
- Implement parallel query execution for better performance

**Key Interfaces to Define:**
```typescript
// Core interfaces for type safety
export interface StoreFilters {
  category?: StoreCategory;
  search?: string;
  isActive?: boolean;
}

export interface StoreSortOptions {
  field: 'name' | 'rating' | 'createdAt' | 'totalOrders';
  direction: 'asc' | 'desc';
}
```

**Critical Implementation Patterns:**

1. **Query Building Method**: Create `buildWhereClause()` that:
   - Defaults to active stores only (`isActive: true`)
   - Handles category filtering with proper enum validation
   - Implements case-insensitive search using Prisma's `contains` with `mode: 'insensitive'`
   - Uses `OR` conditions for searching across name and description fields

2. **Pagination Strategy**: Implement efficient pagination using:
   - `skip` and `take` parameters for offset-based pagination
   - Parallel execution of `findMany()` and `count()` queries
   - Include `_count` relations to avoid N+1 queries

3. **Sorting Logic**: Create `buildOrderByClause()` with:
   - Default sort by rating (desc) then name (asc)
   - Support for multiple sort fields with direction control
   - Handle special cases like `totalOrders` field

**Performance Considerations:**
- Always use `include` with selective fields to avoid over-fetching
- Execute count and data queries in parallel using `Promise.all()`
- Return structured result with stores, total, and pagination metadata

### 2. Store Service Layer

**Business Logic Architecture:**
- Create `StoreService` class in `apps/backend/src/domains/store/store.service.ts`
- Handle business validation and input normalization
- Coordinate between repository and external services
- Follow CLAUDE.md error handling patterns

**Key Responsibilities:**

1. **Input Validation & Sanitization:**
   - Validate query parameters using shared Zod schemas
   - Normalize search strings (trim whitespace, handle empty values)
   - Enforce pagination limits (cap at 100 items per page)
   - Validate sort parameters against allowed fields

2. **Business Rules Implementation:**
   - Default to showing only active stores
   - Handle inactive store access attempts appropriately
   - Implement category validation using enum values
   - Apply search relevance scoring logic

3. **Response Coordination:**
   - Execute parallel queries for stores and filter options
   - Transform repository results to match API contracts
   - Add business context to raw data (e.g., availability status)

**Critical Methods Pattern:**
```typescript
// Service method signature example
async getStores(query: GetStoresQuery): Promise<GetStoresResponse> {
  // 1. Validate and normalize inputs
  // 2. Build filter/pagination objects
  // 3. Execute parallel repository calls
  // 4. Transform and return response
}
```

**Error Handling Strategy:**
- Use custom error classes: `NotFoundError`, `ValidationError`, `AppError`
- Log errors with structured context for debugging
- Transform database errors to user-friendly messages
- Never expose internal implementation details

### 3. Store Controller & Route Setup

**HTTP Layer Architecture:**
- Create `StoreController` class in `apps/backend/src/domains/store/store.controller.ts`
- Follow Express.js controller patterns with proper middleware integration
- Implement consistent API response format as defined in CLAUDE.md

**Controller Responsibilities:**

1. **Request/Response Handling:**
   - Extract and validate query parameters using middleware
   - Delegate business logic to service layer
   - Format responses according to shared API contracts
   - Handle HTTP-specific concerns (headers, status codes)

2. **Middleware Integration:**
   - Use validation middleware for query parameter parsing
   - Integrate with authentication middleware for protected routes
   - Apply caching middleware for performance optimization
   - Use error handling middleware for consistent error responses

**Route Configuration Pattern:**
```typescript
// Route setup example
router.get('/stores',
  validateQuery(getStoresQuerySchema),  // Zod validation middleware
  cacheMiddleware(300),                 // 5-minute cache
  storeController.getStores             // Controller method
);

router.get('/stores/:storeId',
  validateParams(storeParamsSchema),    // Validate store ID format
  storeController.getStoreById
);
```

**Response Format Standards:**
- Always include `success`, `data`, and `timestamp` fields
- Use appropriate HTTP status codes (200, 400, 404, 500)
- Include pagination metadata for list endpoints
- Add filter options metadata for frontend consumption

**Error Flow:**
- Let errors bubble up to Express error handling middleware
- Never catch and suppress errors in controllers
- Use `next(error)` to pass errors to centralized handler

## Validation Loop

### Level 1: Dependencies and Setup
```bash
# Verify workspace dependencies
cd apps/backend && npm ls @vibe/shared
cd apps/backend && npx prisma generate
```

### Level 2: Database Optimization
**Critical Database Indexes Required:**
- Category + Active status: `idx_stores_category_active`
- Full-text search: `idx_stores_search` (using GIN index)
- Rating sorting: `idx_stores_rating_active`

**Index Creation Pattern:**
```sql
-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_stores_category_active ON stores(category, is_active);
CREATE INDEX IF NOT EXISTS idx_stores_search ON stores USING gin((name || ' ' || COALESCE(description, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stores_rating_active ON stores(is_active, rating DESC) WHERE is_active = true;
```

### Level 3: API Endpoint Testing
**Essential Test Commands:**
```bash
cd apps/backend && npm run dev

# Test core functionality
curl "http://localhost:3001/api/stores" | jq '.'
curl "http://localhost:3001/api/stores?category=LUNCH" | jq '.data.stores[].category'
curl "http://localhost:3001/api/stores?search=pizza" | jq '.data.stores[].name'
curl "http://localhost:3001/api/stores?page=1&limit=5" | jq '.data.pagination'
```

### Level 4: Performance Validation
**Response Time Requirements:**
- All store listing queries must complete in <200ms
- Implement and test caching middleware effectiveness
- Verify pagination performance with large datasets

**Performance Test Pattern:**
```bash
curl -w "time_total: %{time_total}s\n" -s "http://localhost:3001/api/stores"
```

### Level 5: Error Handling
**Test Error Scenarios:**
- Invalid category values → 400 validation error
- Invalid pagination parameters → 400 validation error
- Non-existent store IDs → 404 not found error
- Database connection failures → 500 internal error

### Level 6: Data Integrity
**Verify Business Rules:**
- Active/inactive store filtering works correctly
- Search relevance ranking is appropriate
- Category filtering is accurate
- Pagination metadata is consistent

## Task Checklist

### Core Implementation Tasks
- [ ] **Repository Layer**: Create `StoreRepository` with filtering, pagination, and search capabilities
- [ ] **Service Layer**: Implement `StoreService` with business validation and input normalization
- [ ] **Controller Layer**: Build `StoreController` following Express.js patterns with middleware integration
- [ ] **Route Configuration**: Set up routes with validation, caching, and error handling middleware
- [ ] **Type Definitions**: Define interfaces for filters, sorting, and response structures

### Database & Performance
- [ ] **Database Indexes**: Create essential indexes for category, search, and rating queries
- [ ] **Query Optimization**: Implement parallel execution patterns and avoid N+1 queries
- [ ] **Caching Strategy**: Add response caching middleware with appropriate TTL
- [ ] **Performance Testing**: Validate <200ms response times under load

### Validation & Error Handling
- [ ] **Input Validation**: Use Zod schemas for all query parameters and request data
- [ ] **Error Management**: Implement custom error classes and centralized error handling
- [ ] **Business Rules**: Enforce category validation, pagination limits, and active store filtering
- [ ] **Edge Cases**: Handle empty results, invalid parameters, and database failures

### Integration & Testing
- [ ] **API Contracts**: Ensure responses match shared type definitions from packages/shared
- [ ] **Authentication**: Integrate with existing auth middleware for protected routes
- [ ] **Logging**: Add structured logging for debugging and monitoring
- [ ] **Test Coverage**: Create unit tests for all layers with proper mocking

### Success Validation Criteria

**Performance Benchmarks:**
- Store listing API responds in <200ms with 1000+ stores
- Caching reduces subsequent request times by 80%+
- Database queries are optimized with proper indexing

**Functional Requirements:**
- Category filtering returns accurate results
- Search finds relevant stores by name and description
- Pagination handles large datasets without performance degradation
- Error responses provide clear, actionable messages

**Integration Standards:**
- Responses follow shared API contract definitions
- Authentication middleware integrates seamlessly
- Frontend can consume responses without transformation
- Logging provides adequate debugging information

**Demo Scenario**: User browses stores → filters by category → searches for specific restaurants → navigates paginated results → all interactions complete smoothly with appropriate feedback for error states.
