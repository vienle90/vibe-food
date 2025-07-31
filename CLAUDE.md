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

### Common TypeScript Errors and Solutions (CRITICAL LESSONS LEARNED)

Based on real implementation experience, these are the most frequent errors that occur on first implementation attempts and their solutions:

#### 1. Type Mismatches Between Frontend and Shared Packages
**Error Pattern**: `Type 'string' is not assignable to type 'StoreId'` or similar branded type errors
```typescript
// ❌ Common mistake - using string directly where branded type expected
const storeId: StoreId = params.id; // Error: string not assignable to StoreId

// ✅ Solution - Bypass validation for route params or validate properly
const storeId = params.id; // Use as string directly
// OR validate if needed:
const storeId = StoreIdSchema.parse(params.id);
```

**Root Cause**: Route parameters come as strings but schema expects branded types (CUID format)
**Prevention**: Use string types for route params, validate only when necessary

#### 2. Environment Validation Triggering in Browser
**Error Pattern**: `Environment validation failed` in browser console
```typescript
// ❌ Problematic - validation runs in browser
export const env = envSchema.parse(process.env);

// ✅ Solution - Skip validation in browser/test environments
if (
  (typeof globalThis !== 'undefined' && 'window' in globalThis) || // Browser
  process.env.NODE_ENV === 'test' || 
  process.env.SKIP_ENV_VALIDATION === 'true'
) {
  return process.env?.[prop] || undefined;
}
```

**Root Cause**: Shared packages try to validate backend env vars in frontend
**Prevention**: Always check environment before validation, add SKIP_ENV_VALIDATION flag

#### 3. Zustand Store Infinite Loop (getSnapshot errors)
**Error Pattern**: `Cannot access store.getState before initialization` or infinite re-renders
```typescript
// ❌ Problematic - creates new object on every render
export const useCartActions = () => useCartStore((state) => ({
  addItem: state.addItem,
  updateQuantity: state.updateQuantity,
  removeItem: state.removeItem,
}));

// ✅ Solution - Individual action hooks
export const useAddToCart = () => useCartStore((state) => state.addItem);
export const useUpdateCartQuantity = () => useCartStore((state) => state.updateQuantity);
export const useRemoveFromCart = () => useCartStore((state) => state.removeItem);
```

**Root Cause**: Selector functions return new objects causing re-renders
**Prevention**: Use individual selectors, avoid object returns in selectors

#### 4. Next.js Server/Client Component Hydration Issues  
**Error Pattern**: Hydration mismatches or `useEffect` warnings
```typescript
// ❌ Problematic - trying to use client state in server component
export default function StoreDetailsPage({ params }: { params: { id: string } }) {
  const cart = useCartStore(); // Error: can't use hooks in server component
}

// ✅ Solution - Separate client and server logic
// page.tsx (Server Component)
export default async function StoreDetailsPage({ params }: { params: { id: string } }) {
  const data = await fetchStoreData(params.id);
  return <StoreDetailsClient initialData={data} />;
}

// client.tsx (Client Component)  
'use client';
export function StoreDetailsClient({ initialData }: Props) {
  const cart = useCartStore(); // OK: client component can use hooks
}
```

**Root Cause**: Mixing server and client component patterns
**Prevention**: Always separate server data fetching from client interactions

#### 5. Asset Loading Issues (CSS/JS 404 errors)
**Error Pattern**: `MIME type ('text/html') is not a supported stylesheet MIME type`
```bash
# ❌ Problem - dev server not running or crashed
localhost:3000/_next/static/css/app/layout.css → 404

# ✅ Solution - Restart dev server properly
cd apps/frontend && npm run dev
```

**Root Cause**: Frontend dev server crashes or stops serving assets
**Prevention**: Always verify dev server is running, restart when needed

### Error Prevention Checklist (MUST FOLLOW)

Before implementing any feature:

1. **Type Safety Check**:
   - [ ] Verify shared types match between frontend/backend
   - [ ] Use string types for route params, not branded types
   - [ ] Check if branded type validation is actually needed

2. **Environment Setup**:
   - [ ] Add `SKIP_ENV_VALIDATION=true` to frontend .env.local
   - [ ] Verify both frontend and backend servers are running
   - [ ] Check browser console for asset loading errors

3. **State Management**:
   - [ ] Use individual selectors instead of object selectors
   - [ ] Separate server components from client components
   - [ ] Test store hooks in isolation first

4. **Component Architecture**:
   - [ ] Server components for data fetching only
   - [ ] Client components for interactivity only  
   - [ ] Use 'use client' directive properly

5. **Testing Strategy**:
   - [ ] Test with empty state first
   - [ ] Verify error boundaries work
   - [ ] Check console for hydration warnings

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
All endpoints must be defined with TypeScript interfaces before implementation

#### 2. Shared Type Safety
Use shared types for all API communication

```typescript
export const getStores = async (
  req: Request<{}, GetStoresResponse, {}, GetStoresRequest>, 
  res: Response<GetStoresResponse>
) => {
}

const stores = await apiClient.get<GetStoresResponse>('/api/stores', { params: query });
```

#### 3. Database-First Schema Design
Prisma schema drives the entire data model

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
JWT tokens with refresh token rotation pattern

### Error Handling Pattern
Consistent error responses across all endpoints

### Database Operations
Use Prisma Client with proper error handling

### Input Validation with Zod (MANDATORY)

### Structured Logging with Pino

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

### State Management Hierarchy (MUST FOLLOW)
1. **Local State**: `useState` ONLY for component-specific state
2. **Context**: For cross-component state within a single feature
3. **URL State**: MUST use search params for shareable state
4. **Server State**: MUST use TanStack Query for ALL API data
5. **Global State**: Zustand ONLY when truly needed app-wide

### Server State Pattern (TanStack Query)

### API Integration
Centralized API client with proper error handling:

## 🛡️ Data Validation with Zod (MANDATORY FOR ALL EXTERNAL DATA)

### MUST Follow These Validation Rules
- **MUST validate ALL external data**: API responses, form inputs, URL params, environment variables
- **MUST use branded types**: For all IDs and domain-specific values
- **MUST fail fast**: Validate at system boundaries, throw errors immediately
- **MUST use type inference**: Always derive TypeScript types from Zod schemas

### Backend Validation Middleware
Use validateBody() and validateQuery() middleware functions with Zod schemas for all endpoints.

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
Use Native Node.js test runner with describe/it blocks, mock dependencies, test all scenarios including errors.

#### Integration Testing
Test complete request/response cycles with temporary server instance, verify status codes and response structure.

### Frontend Testing (Vitest + React Testing Library)

#### Component Testing
Use Vitest + React Testing Library, test user interactions, accessibility, and error handling. Focus on behavior not implementation.

#### Hook Testing
Use renderHook with QueryClient wrapper, mock fetch responses, test success and error states.

### E2E Testing with Cypress
Test complete user journeys (login → browse → add to cart → checkout), use data-testid attributes, seed database before tests.

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

#### Essential Patterns
- **Type-Safe APIs**: Use branded types with Zod schemas, proper error classes
- **Input Validation**: Validate at system boundaries with safeParse()
- **Component Design**: Clear interfaces, proper error boundaries, explicit return types

### ❌ Anti-Patterns

#### Common Anti-Patterns to Avoid
- **NEVER use `any` type** - use proper typing or `unknown`
- **NO hardcoded values** - use environment configuration
- **ALWAYS handle all component states** - loading, error, empty, success
- **NO prop drilling beyond 2 levels** - use context or state management

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
1. **VALIDATE everything with Zod** - ALL external data must be validated
2. **MUST validate at system boundaries** - API inputs, form data, environment
3. **MUST fail fast** - validate early, throw meaningful errors immediately

### Testing (MINIMUM REQUIREMENTS)
1. **MINIMUM 80% test coverage** - NO EXCEPTIONS
2. **MUST co-locate tests** - tests MUST be in `__tests__` folders
3. **MUST test ALL states** - loading, error, empty, and success states
4. **MUST write integration tests** for API endpoints

### Code Quality (ENFORCE STRICTLY)  
1. **MAXIMUM 500 lines per file** - split if larger
2. **MAXIMUM 200 lines per component** - refactor if larger
3. **MUST handle ALL error cases** - never ignore potential failures
4. **MUST use semantic commits** - feat:, fix:, docs:, refactor:, test:

### Security (NON-NEGOTIABLE)
1. **NEVER trust user input** - sanitize and validate everything
2. **MUST validate environment variables** - with Zod at startup
3. **MUST use HTTPS in production** - no exceptions
4. **MUST sanitize all outputs** - prevent XSS attacks

### Performance (OPTIMIZE FOR SCALE)
1. **MUST use React Server Components** for data fetching
2. **MUST implement proper caching** - API responses and database queries  
3. **MUST optimize images** - use Next.js Image component
4. **MUST implement pagination** - for all list endpoints

Remember: This is a demonstration project showcasing PRP methodology. Every implementation should be production-ready and follow the established patterns. Code quality and type safety are non-negotiable - they demonstrate the effectiveness of the PRP approach.