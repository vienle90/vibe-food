# PRP-003: Vibe Food Ordering - Shared TypeScript Contracts

## Goal

Establish a comprehensive shared type system that serves as the single source of truth for data structures across backend and frontend, ensuring type safety, API contract enforcement, and seamless developer experience.

## Why

- **Type Safety**: Prevent runtime errors through compile-time type checking
- **Single Source of Truth**: Changes to types automatically propagate to both BE/FE
- **API Contract Enforcement**: Frontend and backend must agree on data structures
- **Developer Experience**: Auto-completion and inline documentation
- **Refactoring Safety**: TypeScript catches breaking changes across codebase
- **Validation Consistency**: Shared schemas ensure consistent validation rules

## What

### User-Visible Behavior
- Developers get immediate feedback on type mismatches
- API responses are type-safe in frontend code
- Form validation schemas match backend expectations
- Auto-completion works for all shared data structures
- Branded types prevent accidental ID mixing (StoreId vs UserId)

### Technical Requirements
- Branded types for all entity IDs with Zod validation
- Complete API contract interfaces for all endpoints
- Runtime validation schemas with TypeScript inference
- Utility types for pagination, filtering, sorting patterns
- Standardized error response types and codes
- Type-safe environment variable handling

### Success Criteria
- [ ] All entity types match Prisma schema exactly
- [ ] API contracts cover all planned endpoints
- [ ] Branded types prevent ID confusion at compile time
- [ ] Zod schemas provide runtime validation for all external data
- [ ] Backend and frontend compile without type errors
- [ ] Package builds and publishes correctly to workspace

## All Needed Context

### Documentation & References

```yaml
- file: /Users/vienle2/code_projects/vibe-food/PRD.md
  why: Product Requirement Document

- url: https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
  why: Advanced TypeScript patterns for utility types

- url: https://zod.dev/
  section: "Type inference and branded types"
  critical: "Always derive TypeScript types from Zod schemas using z.infer"

- url: https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety
  why: Generating types from Prisma schema

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Data Validation with Zod (MANDATORY FOR ALL EXTERNAL DATA)"
  critical: "Must use branded types for all IDs and domain-specific values"

- file: /Users/vienle2/code_projects/vibe-food/PRPs/vibe-001-foundation-setup.md
  section: "Prisma Database Schema"
  critical: "All entity relationships and field types already defined"
```

### API Design Context

**Endpoint Categories:**
- **Authentication**: /api/auth/* (login, register, refresh, logout)
- **Stores**: /api/stores/* (list, details, create, update)
- **Menu Items**: /api/stores/:id/menu (list, create, update, delete)
- **Orders**: /api/orders/* (create, list, details, update status)
- **Users**: /api/users/* (profile, update, order history)

**Response Patterns:**
- Success: `{ success: true, data: T, meta?: PaginationMeta }`
- Error: `{ success: false, error: string, message: string, details?: any[] }`
- Lists: Always include pagination metadata

### Critical Gotchas

1. **Branded Types**: Prevent mixing different ID types (StoreId vs UserId)
2. **Prisma Types**: Re-export Prisma types rather than duplicating
3. **API Versioning**: Structure types to support future API versions
4. **Decimal Types**: Prisma Decimal needs conversion for JSON serialization
5. **Date Serialization**: Dates become strings over JSON API

## Implementation Guidance

### 1. Core Type System Architecture

**File Structure Pattern:**
```
packages/shared/src/
├── types/
│   ├── core.ts          # Branded types, enums, utilities
│   ├── entities.ts      # Database entity interfaces
│   └── api.ts           # Request/response contracts
├── schemas/
│   └── validation.ts    # Zod schemas for validation
├── utils/
│   └── types.ts         # Helper functions and constants
├── env.ts               # Environment validation
└── index.ts             # Public exports
```

**Branded Type Implementation:**
- Create branded types for ALL entity IDs using Zod `.brand()` method
- Use CUID format validation for all ID types
- Define domain-specific value types (Email, Phone, Price) with validation
- Match all enum types exactly with Prisma schema definitions

**Essential Patterns:**
```typescript
// Branded ID pattern
export const EntityIdSchema = z.string().cuid().brand<'EntityId'>();
export type EntityId = z.infer<typeof EntityIdSchema>;

// Value type pattern with validation
export const EmailSchema = z.string().email().brand<'Email'>();
export type Email = z.infer<typeof EmailSchema>;

// Enum pattern matching Prisma
export const StatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type Status = z.infer<typeof StatusSchema>;
```

### 2. Entity Type Design Patterns

**Core Entity Structure:**
- All entities MUST extend TimestampFields (createdAt, updatedAt as ISO strings)
- Use branded types for ALL entity IDs to prevent mixing
- Match Prisma schema exactly - no deviations allowed
- Optional fields should be explicitly marked with `?`

**Relationship Patterns:**
- Base entity: Core fields only, no relations
- WithDetails variant: Include selected related data for detailed views
- Use Pick<Entity, 'field1' | 'field2'> for partial relation data
- Frontend-specific types (CartItem) separate from persisted entities

**Field Type Guidelines:**
- Dates: Always string (ISO format) for JSON serialization
- Prices: Use branded Price type with 2-decimal validation
- Phone/Email: Use branded types with format validation
- Enums: Match Prisma schema exactly

**Essential Entity Examples:**
```typescript
// Base entity pattern
export interface User extends TimestampFields {
  id: UserId;
  email: Email;
  // ... other fields
}

// Detailed view pattern
export interface StoreWithDetails extends Store {
  owner: Pick<User, 'id' | 'firstName' | 'lastName'>;
  menuItems: MenuItem[];
  _count: { orders: number; menuItems: number };
}
```

### 3. API Contract Design Principles

**Request/Response Naming Convention:**
- Request: `{Verb}{Resource}Request` (e.g., GetStoresRequest, CreateOrderRequest)
- Response: `{Verb}{Resource}Response` (e.g., GetStoresResponse, CreateOrderResponse)
- Use specific verbs: Get, Create, Update, Delete

**Response Wrapper Patterns:**
```typescript
// Success responses
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;  // For list endpoints
  timestamp: string;
}

// Error responses
interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: ValidationError[];  // For validation failures
  timestamp: string;
}
```

**Request Type Guidelines:**
- Query parameters: Use optional fields with sensible defaults
- Body data: Required fields explicit, optional fields with `?`
- Use branded types for all IDs in requests
- Include filter/pagination types for list endpoints

**Response Type Guidelines:**
- Single resources: Direct entity or WithDetails variant
- Lists: Array + pagination metadata + summary stats
- Include related data selectively (avoid over-fetching)
- Use consistent timestamp format (ISO strings)

**Essential API Patterns:**
```typescript
// List endpoint pattern
interface GetResourcesRequest {
  page?: number;
  limit?: number;
  // ... filters
}

interface GetResourcesResponse {
  resources: Resource[];
  pagination: PaginationMeta;
  summary?: { /* aggregate data */ };
}

// Create endpoint pattern
interface CreateResourceRequest {
  // Required fields for creation
}

interface CreateResourceResponse {
  resource: Resource;  // Newly created entity
}
```

### 4. Validation Schema Patterns

**Schema Organization Strategy:**
- Group schemas by domain (stores, orders, users)
- Create reusable base schemas (pagination, sorting)
- Use schema composition with `.extend()` for common patterns
- Always export both schema and inferred type

**Common Schema Patterns:**
```typescript
// Reusable base schemas
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Query schema pattern
const getResourcesQuerySchema = paginationSchema.extend({
  // Add domain-specific filters
});

// Create/Update schema pattern
const createResourceSchema = z.object({
  // Required fields with validation
});

const updateResourceSchema = createResourceSchema.partial();
```

**Validation Guidelines:**
- Use `.coerce` for query parameters (strings → numbers/booleans)
- Apply business logic constraints (min/max lengths, ranges)
- Use `.transform()` for data normalization (price formatting)
- Leverage branded type schemas for IDs
- Set sensible defaults where appropriate

**Schema Export Strategy:**
- Export individual schemas for specific use cases
- Create `validationSchemas` object for centralized access
- Always export inferred types: `export type DataType = z.infer<typeof schema>`
- Use consistent naming: `{action}{Resource}Schema` and `{Action}{Resource}Data`

**Business Rule Examples:**
- Prices: `.positive().multipleOf(0.01)` for 2-decimal currency
- Quantities: `.int().min(1).max(10)` for reasonable limits
- Text fields: Appropriate `.min()/.max()` length constraints
- Time formats: Regex validation for HH:mm patterns

### 5. Utility Types and Helper Functions

**Essential Utility Type Patterns:**
```typescript
// Entity manipulation utilities
type CreateEntityData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateEntityData<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// API response utilities
type ApiListResponse<T> = {
  success: true;
  data: T[];
  meta: PaginationMeta;
  timestamp: string;
};
```

**Helper Function Categories:**
1. **Pagination Utilities**: `createPaginationMeta(page, limit, total)`
2. **API Response Builders**: `createApiResponse(data, meta?)`
3. **Type Guards**: `isStoreId(value)`, `isUserId(value)` for runtime checking
4. **Business Constants**: Centralized limits, rates, defaults
5. **Error Code Definitions**: Consistent error handling across app

**Business Constants Pattern:**
```typescript
export const BUSINESS_CONSTANTS = {
  MAX_CART_ITEMS: 20,
  MIN_ORDER_VALUE: 10.00,
  TAX_RATE: 0.08,
  // ... other constants
} as const;
```

**Error Code Organization:**
- Group by category (AUTH, VALIDATION, BUSINESS, SYSTEM)
- Use SCREAMING_SNAKE_CASE naming
- Export as const assertion for literal types
- Create ErrorCode union type for type safety

**Type Guard Implementation:**
- Use for runtime validation of branded types
- Provide both existence and format validation
- Essential for API boundary validation

### 6. Package Structure and Export Strategy

**Index.ts Export Organization:**
```typescript
// Organize exports by category for better tree-shaking
export * from './types/core';      // Branded types, enums
export * from './types/entities';  // Database entities
export * from './types/api';       // Request/response contracts
export * from './schemas/validation'; // Zod schemas
export * from './utils/types';     // Utilities and constants
```

**Package.json Configuration:**
- **Name**: `@vibe/shared` (scoped for workspace)
- **Main fields**: Set both `main` and `types` for proper resolution
- **Files**: Include only `dist/**/*` in published package
- **Dependencies**: Zod as only runtime dependency
- **DevDependencies**: TypeScript tooling for development

**TypeScript Configuration:**
- **Target**: ES2022 for modern JavaScript features
- **Module**: CommonJS for Node.js compatibility
- **Strict Mode**: Enable ALL strict type checking options
- **Declaration**: Generate .d.ts files for type definitions
- **Source Maps**: Enable for debugging

**Key Configuration Settings:**
```json
{
  "strict": true,
  "noImplicitAny": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

**Build Scripts:**
- `build`: Compile TypeScript to JavaScript
- `dev`: Watch mode for development
- `type-check`: Verify types without emitting files
- `lint`: Check code quality and style

## Validation Strategy

### Level 1: Package Setup and Build
```bash
# Install dependencies and verify structure
cd packages/shared
npm install zod
npm install -D typescript @types/node eslint

# Build and verify compilation
npm run build
ls -la dist/  # Should show compiled JS and .d.ts files
```

### Level 2: Type Safety Verification
```bash
# Test TypeScript compilation
npm run type-check  # Should pass without errors

# Verify backend integration
cd apps/backend
npm install @vibe/shared@workspace:*
npx tsc --noEmit  # Should compile with shared types

# Verify frontend integration
cd apps/frontend
npm install @vibe/shared@workspace:*
npx tsc --noEmit  # Should compile with shared types
```

### Level 3: Runtime Validation Testing
```bash
# Test schema validation with valid data
node -e "const { validationSchemas } = require('@vibe/shared'); console.log('Schemas loaded:', Object.keys(validationSchemas).length > 0);"

# Test branded type creation
node -e "const { StoreIdSchema } = require('@vibe/shared'); console.log('Branded type works:', !!StoreIdSchema.parse('clp123456789'));"

# Test business constants availability
node -e "const { BUSINESS_CONSTANTS, ERROR_CODES } = require('@vibe/shared'); console.log('Constants loaded:', Object.keys(BUSINESS_CONSTANTS).length, Object.keys(ERROR_CODES).length);"
```

### Level 4: Integration Testing
**Backend Integration:**
- Import shared types in controllers and services
- Use validation schemas in middleware
- Verify API responses match shared contracts

**Frontend Integration:**
- Import API types for form validation
- Use shared schemas in React Hook Form resolvers
- Verify API calls are fully type-safe

**Key Validation Points:**
1. All packages compile without type errors
2. Branded types prevent ID mixing at compile time
3. Validation schemas work with both valid and invalid data
4. API contracts match between frontend and backend
5. Business constants are accessible across applications

## Implementation Roadmap

### Phase 1: Foundation (Core Types)
- [ ] **Branded Types**: Create ID types with Zod validation (UserId, StoreId, etc.)
- [ ] **Enums**: Define all enum types matching Prisma schema exactly
- [ ] **Core Utilities**: TimestampFields, PaginationMeta, SortOptions
- [ ] **Value Types**: Email, Phone, Price with appropriate validation

### Phase 2: Entity Layer (Database Types)
- [ ] **Base Entities**: User, Store, MenuItem, Order interfaces
- [ ] **Relationship Types**: WithDetails variants for complex queries
- [ ] **Frontend Types**: CartItem, form-specific interfaces
- [ ] **Prisma Alignment**: Ensure 100% match with database schema

### Phase 3: API Contracts (Communication Layer)
- [ ] **Request Types**: All endpoint input interfaces
- [ ] **Response Types**: Standardized output formats
- [ ] **Error Handling**: Consistent error response structure
- [ ] **Pagination**: List endpoint metadata patterns

### Phase 4: Validation Layer (Runtime Safety)
- [ ] **Zod Schemas**: Input validation for all external data
- [ ] **Business Rules**: Constraints, formats, transformations
- [ ] **Schema Composition**: Reusable patterns and base schemas
- [ ] **Type Inference**: Export inferred types for all schemas

### Phase 5: Utilities and Constants
- [ ] **Helper Functions**: Pagination builders, response wrappers
- [ ] **Type Guards**: Runtime type checking utilities
- [ ] **Business Constants**: Limits, rates, configuration values
- [ ] **Error Codes**: Centralized error classification system

### Phase 6: Package and Integration
- [ ] **Build System**: TypeScript compilation and declaration generation
- [ ] **Export Strategy**: Organized public API surface
- [ ] **Documentation**: JSDoc comments and usage examples
- [ ] **Cross-Package**: Backend and frontend integration testing

## Success Criteria

### Technical Validation
1. **Type Safety**: Zero TypeScript errors across all packages
2. **Runtime Validation**: All Zod schemas handle valid/invalid data correctly
3. **API Contracts**: Perfect alignment between frontend and backend types
4. **Branded Types**: Compile-time prevention of ID mixing
5. **Package Integration**: Seamless imports and usage in both apps

### Developer Experience Goals
1. **Auto-completion**: IntelliSense works perfectly across all packages
2. **Error Messages**: Clear, actionable validation error feedback
3. **Refactoring Safety**: Type changes propagate automatically
4. **Documentation**: Self-documenting code with helpful JSDoc
5. **Consistency**: Uniform patterns and naming conventions

### Business Impact
- **Faster Development**: Type safety reduces debugging time
- **Fewer Bugs**: Compile-time catching of data structure mismatches
- **Better Maintainability**: Single source of truth for all data contracts
- **Improved Onboarding**: New developers can understand data flow immediately

**Success Demo**: A developer adds a new field to any entity → sees immediate TypeScript errors in all places that need updates → gets auto-completion for the new field → has runtime validation automatically applied → experiences seamless integration across the entire application stack.
