# CLAUDE.md - Vibe Food Ordering Application

This file provides comprehensive guidance to Claude Code when working with the Vibe food ordering application codebase.

## Project Overview

**Vibe** is a food delivery application similar to GrabFood, built as a demonstration of **PRP (Product Requirement Prompt)** methodology. The application allows users to browse restaurants, view menus, place orders, and track delivery status.

**PRP Definition**: PRP = PRD + curated codebase intelligence + agent/runbook  
- **PRD**: Product Requirement Document (traditional specs)
- **Curated codebase intelligence**: Relevant documentation, examples, patterns from existing code  
- **Agent/runbook**: Executable validation steps and implementation guidance

## Core Development Philosophy

### KISS (Keep It Simple, Stupid)
Simplicity should be a key goal in design. Choose straightforward solutions over complex ones whenever possible. Simple solutions are easier to understand, maintain, and debug.

### YAGNI (You Aren't Gonna Need It)  
Avoid building functionality on speculation. Implement features only when they are needed, not when you anticipate they might be useful in the future.

### Design Principles
- **Vertical Slice Architecture**: Organize by features, not layers
- **API-First Development**: Define contracts before implementation
- **Fail Fast**: Validate inputs early, throw meaningful errors immediately
- **Security First**: Never trust user input, always validate and sanitize
- **Type Safety**: Use TypeScript strictly with no compromises

### Tech Stack

**Backend** (apps/backend/)
- Node.js 23+ with Express.js and TypeScript
- PostgreSQL with Prisma ORM  
- JWT authentication with refresh token rotation
- Native Node.js test runner for unit testing
- Pino for structured logging

**Frontend** (apps/frontend/)
- Next.js 15 with App Router and React 19
- Shadcn/ui component library with CVA
- TypeScript with strict configuration
- Tailwind CSS for styling
- Vitest + React Testing Library for testing

**Shared** (packages/shared/)
- Shared TypeScript types and utilities
- API contract definitions
- Zod validation schemas with branded types

## 🤖 AI Assistant Guidelines

### Search Command Requirements
**CRITICAL**: Always use `rg` (ripgrep) instead of traditional `grep` and `find` commands:

```bash
# ❌ Don't use grep
grep -r "pattern" .

# ✅ Use rg instead
rg "pattern"

# ❌ Don't use find with name
find . -name "*.tsx"

# ✅ Use rg with file filtering
rg --files | rg "\.tsx$"
# or
rg --files -g "*.tsx"
```

### File and Component Limits
- **NEVER create a file longer than 500 lines of code** - refactor by splitting into modules
- **Components should be under 200 lines** for better maintainability
- **Functions should be short and focused (sub 50 lines)** with single responsibility
- **Organize code into clearly separated modules** grouped by feature

### Context Awareness
- When implementing features, always check existing patterns first
- Prefer composition over inheritance in all designs
- Use existing utilities before creating new ones
- Check for similar functionality in other domains/features

### Workflow Patterns
- Preferably create tests BEFORE implementation (TDD)
- Break complex tasks into smaller, testable units
- Validate understanding before implementation
- Run validation commands frequently during development

## Architecture Principles

### Monorepo Structure
- **apps/backend/**: Express API server with domain-driven design
- **apps/frontend/**: Next.js web application with vertical slice architecture  
- **packages/shared/**: Shared TypeScript code and API contracts
- **PRPs/**: Product Requirement Prompts for development

### Key Patterns

#### 1. API-First Development
All endpoints must be defined with TypeScript interfaces before implementation:

```typescript
// packages/shared/src/types/api.ts
export interface GetStoresRequest {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetStoresResponse {
  stores: Store[];
  pagination: PaginationMeta;
  filters: FilterOptions;
}
```

#### 2. Shared Type Safety
Use shared types for all API communication:

```typescript
// Backend controller
export const getStores = async (
  req: Request<{}, GetStoresResponse, {}, GetStoresRequest>, 
  res: Response<GetStoresResponse>
) => {
  // Implementation
}

// Frontend API call
const stores = await apiClient.get<GetStoresResponse>('/api/stores', { params: query });
```

#### 3. Database-First Schema Design
Prisma schema drives the entire data model:

```prisma
model Store {
  id          String   @id @default(cuid())
  name        String
  description String?
  category    Category
  isActive    Boolean  @default(true)
  menuItems   MenuItem[]
  orders      Order[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Backend Development Guidelines

### Project Structure (Domain-Driven Design)
```
apps/backend/src/
├── domains/           # Business domains
│   └── [domain]/
│       ├── __tests__/ # Domain-specific tests
│       ├── entities/  # Domain entities
│       ├── services/  # Business logic
│       ├── repos/     # Data access
│       └── index.ts   # Domain public API
├── infrastructure/    # Technical concerns
│   ├── database/      # DB connections
│   ├── cache/         # Redis, etc.
│   └── monitoring/    # Logs, metrics
├── interfaces/        # External interfaces
│   ├── http/          # REST controllers
│   └── middleware/    # Express middleware
├── shared/            # Cross-cutting concerns
│   ├── errors/        # Custom errors
│   ├── types/         # Shared types
│   └── utils/         # Helpers
└── app.ts            # Express app setup
```

### Authentication Flow
JWT tokens with refresh token rotation pattern:

```typescript
// Middleware usage
app.use('/api/protected', authenticateToken);

// Token refresh endpoint
app.post('/api/auth/refresh', refreshTokenHandler);
```

### Error Handling Pattern
Consistent error responses across all endpoints:

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string = 'INTERNAL_ERROR',
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors: any[] = []) {
    super(400, message, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

// Usage in controllers
if (!store) {
  throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
}
```

### Database Operations
Use Prisma Client with proper error handling:

```typescript
export const storeService = {
  async findMany(filters: StoreFilters) {
    try {
      return await prisma.store.findMany({
        where: buildWhereClause(filters),
        include: { menuItems: true }
      });
    } catch (error) {
      throw new AppError(500, 'Database operation failed', 'DB_ERROR');
    }
  }
};
```

### Input Validation with Zod (MANDATORY)
```typescript
import { z } from 'zod';

// Schema-based validation for all external inputs
const createStoreSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['lunch', 'dinner', 'coffee', 'tea']),
  address: z.string().min(1),
});

export function validateCreateStore(data: unknown) {
  return createStoreSchema.parse(data);
}
```

### Structured Logging with Pino
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' }
    : undefined,
  redact: ['password', 'token', 'authorization']
});

// Use child loggers for context
export function createLogger(context: object) {
  return logger.child(context);
}

// Example usage
const storeLogger = createLogger({ module: 'StoreService' });
storeLogger.info({ storeId: '123' }, 'Store created successfully');
```

## Frontend Development Guidelines

### Project Structure (Vertical Slice Architecture)
```
apps/frontend/src/
├── app/               # Next.js App Router
│   ├── (routes)/      # Route groups
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── components/        # Shared UI components
│   ├── ui/            # Base components (shadcn/ui)
│   └── common/        # Application-specific shared components
├── features/          # Feature-based modules (RECOMMENDED)
│   └── [feature]/
│       ├── __tests__/ # Co-located tests
│       ├── components/# Feature components
│       ├── hooks/     # Feature-specific hooks
│       ├── api/       # API integration
│       ├── schemas/   # Zod validation schemas
│       ├── types/     # TypeScript types
│       └── index.ts   # Public API
├── lib/               # Core utilities and configurations
│   ├── utils.ts       # Utility functions
│   ├── env.ts         # Environment validation
│   └── constants.ts   # Application constants
├── hooks/             # Shared custom hooks
├── styles/            # Styling files
└── types/             # Shared TypeScript types
```

### TypeScript Configuration (STRICT REQUIREMENTS)
- **NEVER use `any` type** - use `unknown` if type is truly unknown
- **MUST have explicit return types** for all functions and components
- **MUST use `ReactElement` instead of `JSX.Element`** for return types
- **MUST import types from 'react'** explicitly

```typescript
// ✅ CORRECT: Modern React 19 typing
import { ReactElement } from 'react';

function MyComponent(): ReactElement {
  return <div>Content</div>;
}

// ❌ FORBIDDEN: Legacy JSX namespace
function MyComponent(): JSX.Element {  // Cannot find namespace 'JSX'
  return <div>Content</div>;
}
```

### Component Organization
Use Shadcn/ui as the base, create custom components as needed:

```typescript
/**
 * StoreCard component displays store information with clickable interaction.
 * 
 * @component
 * @example
 * ```tsx
 * <StoreCard 
 *   store={store} 
 *   onSelect={handleStoreSelect}
 * />
 * ```
 */
interface StoreCardProps {
  /** Store data to display */
  store: Store;
  /** Callback when store is selected */
  onSelect: (store: Store) => void;
}

export const StoreCard = ({ store, onSelect }: StoreCardProps): ReactElement => {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>{store.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{store.description}</p>
        <Button onClick={() => onSelect(store)} className="mt-4">
          View Menu
        </Button>
      </CardContent>
    </Card>
  );
};
```

### State Management Hierarchy (MUST FOLLOW)
1. **Local State**: `useState` ONLY for component-specific state
2. **Context**: For cross-component state within a single feature
3. **URL State**: MUST use search params for shareable state
4. **Server State**: MUST use TanStack Query for ALL API data
5. **Global State**: Zustand ONLY when truly needed app-wide

### Server State Pattern (TanStack Query)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useStores(filters: StoreFilters) {
  return useQuery({
    queryKey: ['stores', filters],
    queryFn: async () => {
      const response = await apiClient.get<GetStoresResponse>('/api/stores', {
        params: filters
      });
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
}

function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderData: CreateOrderRequest) => {
      const response = await apiClient.post<Order>('/api/orders', orderData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
```

### API Integration
Centralized API client with proper error handling:

```typescript
// lib/api-client.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export const apiClient = {
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...defaultConfig,
      ...config
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    
    return response.json();
  },
  
  async post<T>(url: string, data: unknown, config?: RequestConfig): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...defaultConfig.headers,
        ...config?.headers
      },
      body: JSON.stringify(data),
      ...config
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    
    return response.json();
  }
};
```

## 🛡️ Data Validation with Zod (MANDATORY FOR ALL EXTERNAL DATA)

### MUST Follow These Validation Rules
- **MUST validate ALL external data**: API responses, form inputs, URL params, environment variables
- **MUST use branded types**: For all IDs and domain-specific values
- **MUST fail fast**: Validate at system boundaries, throw errors immediately
- **MUST use type inference**: Always derive TypeScript types from Zod schemas

### Schema Patterns (MANDATORY)
```typescript
// packages/shared/src/schemas/core.ts
import { z } from 'zod';

// MUST use branded types for ALL IDs
export const StoreIdSchema = z.string().cuid().brand<'StoreId'>();
export type StoreId = z.infer<typeof StoreIdSchema>;

export const UserIdSchema = z.string().cuid().brand<'UserId'>();
export type UserId = z.infer<typeof UserIdSchema>;

// Environment validation (REQUIRED)
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

// API response validation
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    error: z.string().optional(),
    timestamp: z.string().datetime(),
  });

// Domain schemas
export const storeSchema = z.object({
  id: StoreIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['lunch', 'dinner', 'coffee', 'tea', 'dessert']),
  isActive: z.boolean().default(true),
  address: z.string().min(1),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  rating: z.number().min(0).max(5).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Store = z.infer<typeof storeSchema>;

export const menuItemSchema = z.object({
  id: z.string().cuid(),
  storeId: StoreIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  category: z.string().min(1).max(50),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
});

export type MenuItem = z.infer<typeof menuItemSchema>;
```

### Form Validation (Frontend)
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const createOrderSchema = z.object({
  storeId: StoreIdSchema,
  items: z.array(z.object({
    menuItemId: z.string().cuid(),
    quantity: z.number().int().min(1).max(10),
  })).min(1),
  deliveryAddress: z.string().min(1).max(200),
  notes: z.string().max(500).optional(),
});

type CreateOrderForm = z.infer<typeof createOrderSchema>;

export const OrderForm = (): ReactElement => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: CreateOrderForm): Promise<void> => {
    try {
      await createOrder(data);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields with proper error handling */}
    </form>
  );
};
```

### Backend Validation Middleware
```typescript
// apps/backend/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateBody = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
};

export const validateQuery = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
};

// Usage in routes
app.get('/api/stores', 
  validateQuery(getStoresQuerySchema), 
  getStoresController
);

app.post('/api/stores', 
  authenticateToken,
  validateBody(createStoreSchema), 
  createStoreController
);
```

## MCP Integration Guide

### Required MCPs

#### 1. PostgreSQL MCP
**Usage Patterns**:
```bash
# Database schema inspection
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public';

# Query validation during development
SELECT * FROM stores WHERE category = 'lunch' LIMIT 5;

# Performance analysis
EXPLAIN ANALYZE SELECT * FROM stores s 
JOIN menu_items mi ON s.id = mi.store_id 
WHERE s.category = 'lunch';
```

#### 2. Shadcn MCP
**Usage Patterns**:
```bash
# Get component source
shadcn:get_component button

# List available components
shadcn:list_components

# Get component demo
shadcn:get_component_demo card
```

### MCP Workflow Integration

#### Database Development
1. Use PostgreSQL MCP to inspect schema
2. Write Prisma migrations
3. Validate with direct SQL queries

#### UI Development  
1. Use Shadcn MCP to get component examples
2. Implement custom components following CVA patterns
3. Test with proper accessibility support

#### API Development
1. Use PostgreSQL MCP for query testing
2. Implement endpoints with proper types
3. Test with curl commands or HTTP files

## Testing Strategy (MANDATORY REQUIREMENTS)

### MUST Meet These Testing Standards
- **MINIMUM 80% code coverage** - NO EXCEPTIONS
- **MUST co-locate tests** with components/modules in `__tests__` folders
- **MUST test user behavior** not implementation details
- **MUST mock external dependencies** appropriately
- **MUST test ALL error states** and edge cases

### Backend Testing (Native Node.js Test Runner)

#### Test Organization
```typescript
// apps/backend/src/domains/store/__tests__/store.service.test.ts
import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { StoreService } from '../store.service.js';

describe('StoreService', () => {
  let storeService: StoreService;
  let mockRepo: any;

  before(async () => {
    mockRepo = {
      findMany: mock.fn(() => Promise.resolve([
        { id: 'store1', name: 'Test Store', category: 'lunch' }
      ])),
      create: mock.fn((data) => Promise.resolve({ id: 'new-id', ...data }))
    };
    storeService = new StoreService(mockRepo);
  });

  it('should return filtered stores by category', async () => {
    const stores = await storeService.findByCategory('lunch');
    
    assert.equal(stores.length, 1);
    assert.equal(stores[0].category, 'lunch');
    assert.equal(mockRepo.findMany.mock.calls.length, 1);
  });

  it('should create new store with valid data', async () => {
    const storeData = {
      name: 'New Store',
      category: 'coffee' as const,
      address: '123 Main St'
    };

    const result = await storeService.create(storeData);
    
    assert.equal(result.name, storeData.name);
    assert.equal(mockRepo.create.mock.calls.length, 1);
  });

  it('should throw validation error for invalid category', async () => {
    const invalidData = {
      name: 'Test Store',
      category: 'invalid' as any,
      address: '123 Main St'
    };

    await assert.rejects(
      () => storeService.create(invalidData),
      /Invalid category/
    );
  });
});
```

#### Integration Testing
```typescript
// apps/backend/src/__tests__/integration/stores.test.ts
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../app.js';

describe('Stores API Integration', () => {
  let server: any;

  before(async () => {
    server = app.listen(0); // Use random port
  });

  after(async () => {
    await server.close();
  });

  it('should return stores with correct filtering', async () => {
    const response = await fetch(`http://localhost:${server.address().port}/api/stores?category=lunch`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert(Array.isArray(data.data.stores));
  });

  it('should return 401 for protected endpoints without auth', async () => {
    const response = await fetch(`http://localhost:${server.address().port}/api/stores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Store' })
    });

    assert.equal(response.status, 401);
  });
});
```

### Frontend Testing (Vitest + React Testing Library)

#### Component Testing
```typescript
// apps/frontend/src/features/stores/__tests__/StoreCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@testing-library/react';
import { StoreCard } from '../components/StoreCard';
import type { Store } from '@shared/types';

/**
 * Test suite for StoreCard component.
 * 
 * Tests user interactions, accessibility, and error handling.
 * Ensures proper integration with parent components.
 */
describe('StoreCard', () => {
  const mockStore: Store = {
    id: 'store1' as any,
    name: 'Test Store',
    description: 'A test store',
    category: 'lunch',
    isActive: true,
    address: '123 Main St',
    rating: 4.5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should display store information correctly', () => {
    const onSelect = vi.fn();
    
    render(<StoreCard store={mockStore} onSelect={onSelect} />);
    
    expect(screen.getByText('Test Store')).toBeInTheDocument();
    expect(screen.getByText('A test store')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view menu/i })).toBeInTheDocument();
  });

  it('should call onSelect when store is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    
    render(<StoreCard store={mockStore} onSelect={onSelect} />);
    
    await user.click(screen.getByRole('button', { name: /view menu/i }));
    
    expect(onSelect).toHaveBeenCalledWith(mockStore);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should be accessible via keyboard navigation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    
    render(<StoreCard store={mockStore} onSelect={onSelect} />);
    
    const button = screen.getByRole('button', { name: /view menu/i });
    button.focus();
    
    expect(button).toHaveFocus();
    
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(mockStore);
  });
});
```

#### Hook Testing
```typescript
// apps/frontend/src/hooks/__tests__/useStores.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStores } from '../useStores';

describe('useStores', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should fetch stores successfully', async () => {
    const mockStores = [mockStore];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { stores: mockStores } }),
    } as Response);

    const { result } = renderHook(() => useStores({}), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.stores).toEqual(mockStores);
  });

  it('should handle fetch errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useStores({}), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
```

### E2E Testing with Cypress
```typescript
// cypress/e2e/order-flow.cy.ts
describe('Complete Order Flow', () => {
  beforeEach(() => {
    cy.task('db:seed'); // Seed test database
    cy.visit('/');
  });

  it('should complete full order process for authenticated user', () => {
    // Login
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="submit-button"]').click();

    // Browse stores
    cy.get('[data-testid="store-card"]').should('be.visible');
    cy.get('[data-testid="category-filter"]').select('lunch');
    cy.get('[data-testid="store-card"]').first().click();

    // Add items to cart
    cy.get('[data-testid="menu-item"]').first().within(() => {
      cy.get('[data-testid="add-to-cart"]').click();
    });
    
    cy.get('[data-testid="cart-count"]').should('contain', '1');

    // Checkout
    cy.get('[data-testid="cart-button"]').click();
    cy.get('[data-testid="delivery-address"]').type('123 Test St');
    cy.get('[data-testid="checkout-button"]').click();

    // Verify order creation
    cy.url().should('include', '/orders/');
    cy.get('[data-testid="order-status"]').should('contain', 'New');
  });

  it('should redirect to login for unauthenticated checkout', () => {
    cy.get('[data-testid="store-card"]').first().click();
    cy.get('[data-testid="add-to-cart"]').first().click();
    cy.get('[data-testid="cart-button"]').click();
    cy.get('[data-testid="checkout-button"]').click();

    cy.url().should('include', '/login');
  });
});
```

## Validation Commands

### Level 1: Syntax & Style
```bash
# Backend
cd apps/backend && npm run lint && npm run type-check

# Frontend  
cd apps/frontend && npm run lint && npm run type-check

# Shared packages
cd packages/shared && npm run build && npm run type-check

# Root workspace
npm run lint # Runs all package lints
```

### Level 2: Unit Tests
```bash
# Run all tests with coverage
npm run test:coverage

# Backend tests only
cd apps/backend && npm test

# Frontend tests only  
cd apps/frontend && npm run test

# Watch mode for development
npm run test:watch
```

### Level 3: Integration Tests
```bash
# Start backend server
cd apps/backend && npm run dev

# Test API endpoints
curl -X GET "http://localhost:3001/api/stores?category=lunch" \
  -H "Accept: application/json"

curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test protected endpoints
curl -X POST "http://localhost:3001/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"storeId":"store123","items":[{"menuItemId":"item1","quantity":2}]}'
```

### Level 4: E2E Tests
```bash
# Start all services
npm run dev

# Run Cypress tests headlessly
npm run test:e2e

# Open Cypress UI for development
npx cypress open
```

### Level 5: Database Operations
```bash
# Prisma operations
cd apps/backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio

# Reset database (development only)
npx prisma migrate reset
```

## Common Patterns & Anti-Patterns

### ✅ Good Patterns

#### Type-Safe API Calls with Branded Types
```typescript
// Define branded types first
type StoreId = z.infer<typeof StoreIdSchema>; // string & { readonly brand: unique symbol }

// Use in both BE and FE
const store = await apiClient.get<Store>(`/api/stores/${storeId}`);
```

#### Proper Error Handling with Custom Error Classes
```typescript
// Backend
export class StoreNotFoundError extends AppError {
  constructor(storeId: StoreId) {
    super(404, `Store with ID ${storeId} not found`, 'STORE_NOT_FOUND');
  }
}

// Frontend
try {
  const result = await createOrder(orderData);
  return result;
} catch (error) {
  if (error instanceof ApiError && error.status === 404) {
    toast.error('Store not found');
  } else {
    toast.error('Something went wrong');
  }
  throw error;
}
```

#### Comprehensive Input Validation
```typescript
// Validate at system boundaries
export const validateStoreCreation = (input: unknown): CreateStoreRequest => {
  const result = createStoreSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid store data', result.error.errors);
  }
  return result.data;
};
```

#### Component Composition with Proper Props
```typescript
// Compose components with clear interfaces
interface OrderSummaryProps {
  items: CartItem[];
  onItemChange: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  isLoading?: boolean;
}

export const OrderSummary = ({ 
  items, 
  onItemChange, 
  onRemoveItem, 
  isLoading = false 
}: OrderSummaryProps): ReactElement => {
  // Implementation with proper error boundaries
};
```

### ❌ Anti-Patterns

#### Using `any` Type
```typescript
// Bad - loses all type safety
const response: any = await fetch('/api/stores');
const data = await response.json(); // any type

// Good - maintain type safety
const stores = await apiClient.get<GetStoresResponse>('/api/stores');
```

#### Hardcoded Values
```typescript
// Bad - hardcoded configuration
const API_URL = 'http://localhost:3001';
const MAX_ITEMS = 10;

// Good - environment-based configuration
const API_URL = env.API_URL;
const MAX_ITEMS = env.MAX_CART_ITEMS;
```

#### Missing Error States in Components
```typescript
// Bad - doesn't handle error states
const StoreList = (): ReactElement => {
  const { data } = useStores();
  
  return (
    <div>
      {data?.stores.map(store => <StoreCard key={store.id} store={store} />)}
    </div>
  );
};

// Good - handles all states
const StoreList = (): ReactElement => {
  const { data, isLoading, error } = useStores();
  
  if (isLoading) return <StoreListSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.stores.length) return <EmptyStoreList />;
  
  return (
    <div>
      {data.stores.map(store => <StoreCard key={store.id} store={store} />)}
    </div>
  );
};
```

#### Prop Drilling Beyond 2 Levels
```typescript
// Bad - excessive prop drilling
<App>
  <Layout user={user} cart={cart}>
    <StorePage user={user} cart={cart}>
      <StoreDetails user={user} cart={cart}>
        <MenuItem user={user} cart={cart} />
      </StoreDetails>
    </StorePage>
  </Layout>
</App>

// Good - use context or state management
const CartProvider = ({ children }: { children: ReactNode }) => {
  // Cart context logic
};

<App>
  <CartProvider>
    <Layout>
      <StorePage>
        <StoreDetails>
          <MenuItem /> {/* Accesses cart via context */}
        </StoreDetails>
      </StorePage>
    </Layout>
  </CartProvider>
</App>
```

## Development Workflow

### Starting New Features
1. **Read relevant PRP** - understand requirements and context
2. **Define types first** - add to packages/shared/src/types/
3. **Create Zod schemas** - for all data validation
4. **Implement backend** - controllers, services, routes with tests
5. **Implement frontend** - components, pages, hooks with tests
6. **Write E2E tests** - critical user paths
7. **Run validation** - all validation commands must pass

### PRP Execution Flow
1. **Load PRP context** - read all referenced documentation
2. **Plan implementation** - break down into tasks with validation gates  
3. **Execute with validation** - run validation commands frequently
4. **Complete checklist** - ensure all requirements met

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/store-menu-display

# Make incremental commits with proper messages
git commit -m "feat(stores): add store menu API endpoint with validation"
git commit -m "test(stores): add comprehensive tests for menu display"
git commit -m "feat(frontend): implement store menu UI components"

# Run all validations before push
npm run validate # Runs lint, type-check, and tests

# Push and create PR
git push origin feature/store-menu-display
```

### Development Commands

#### Backend Development
```bash
# Start development server with auto-reload
cd apps/backend && npm run dev

# Run tests in watch mode
cd apps/backend && npm run test:watch

# Database operations
npx prisma studio           # Open database GUI
npx prisma migrate dev      # Apply migrations
npx prisma db seed         # Seed test data

# Debug mode
node --inspect src/app.ts   # Enable Chrome DevTools
```

#### Frontend Development  
```bash
# Start development server
cd apps/frontend && npm run dev

# Run tests with UI
cd apps/frontend && npm run test:ui

# Build for production
cd apps/frontend && npm run build

# Analyze bundle size
cd apps/frontend && npm run build:analyze
```

#### Full Stack Development
```bash
# Start both servers concurrently
npm run dev

# Run all tests
npm run test:all

# Build entire project
npm run build

# Validate entire codebase
npm run validate
```

## Critical Guidelines (MUST FOLLOW ALL)

### Type Safety (NO EXCEPTIONS)
1. **ENFORCE strict TypeScript** - ZERO compromises on type safety
2. **NEVER use `any` type** - use proper typing or `unknown`
3. **MUST use branded types** for all IDs and domain values
4. **MUST derive types from Zod schemas** using `z.infer<typeof schema>`

### Validation (MANDATORY)
5. **VALIDATE everything with Zod** - ALL external data must be validated
6. **MUST validate at system boundaries** - API inputs, form data, environment
7. **MUST fail fast** - validate early, throw meaningful errors immediately

### Testing (MINIMUM REQUIREMENTS)
8. **MINIMUM 80% test coverage** - NO EXCEPTIONS
9. **MUST co-locate tests** - tests MUST be in `__tests__` folders
10. **MUST test ALL states** - loading, error, empty, and success states
11. **MUST write integration tests** for API endpoints

### Code Quality (ENFORCE STRICTLY)  
12. **MAXIMUM 500 lines per file** - split if larger
13. **MAXIMUM 200 lines per component** - refactor if larger
14. **MUST handle ALL error cases** - never ignore potential failures
15. **MUST use semantic commits** - feat:, fix:, docs:, refactor:, test:

### Security (NON-NEGOTIABLE)
16. **NEVER trust user input** - sanitize and validate everything
17. **MUST validate environment variables** - with Zod at startup
18. **MUST use HTTPS in production** - no exceptions
19. **MUST sanitize all outputs** - prevent XSS attacks

### Performance (OPTIMIZE FOR SCALE)
20. **MUST use React Server Components** for data fetching
21. **MUST implement proper caching** - API responses and database queries  
22. **MUST optimize images** - use Next.js Image component
23. **MUST implement pagination** - for all list endpoints

Remember: This is a demonstration project showcasing PRP methodology. Every implementation should be production-ready and follow the established patterns. Code quality and type safety are non-negotiable - they demonstrate the effectiveness of the PRP approach.