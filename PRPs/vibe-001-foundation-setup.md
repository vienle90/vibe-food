# PRP-001: Vibe Food Ordering - Foundation Setup & Database Schema

## Goal

Set up the complete monorepo foundation for Vibe food ordering application with:
- Workspace configuration with pnpm
- PostgreSQL database with Prisma ORM running locally
- Core database schema for stores, menus, users, and orders
- Environment configuration and validation
- Basic CI/CD pipeline setup

## Why

- **Foundation First**: All subsequent PRPs depend on this infrastructure
- **Type Safety**: Shared database schema drives TypeScript types across BE/FE
- **Developer Experience**: Local development environment with minimal setup
- **Production Ready**: Proper environment handling and database migrations
- **Scalability**: Monorepo structure supports coordinated changes across services

## What

### User-Visible Behavior
- Developers can run `npm run dev` to start entire application
- Database schema supports complete food ordering workflow
- All services start reliably with proper environment configuration

### Technical Requirements
- pnpm workspace configuration
- Local PostgreSQL 15+ with Prisma ORM
- Environment validation with Zod
- Database migrations and seeding
- Basic package.json scripts for all workspaces

### Success Criteria
- [ ] All services start with local PostgreSQL running
- [ ] Database migrations run successfully
- [ ] Seed data populates all tables
- [ ] Type generation works from Prisma schema
- [ ] Environment validation catches missing variables
- [ ] All workspace packages install and build

## All Needed Context

### Documentation & References

```yaml
- url: https://pnpm.io/workspaces
  why: Workspace configuration patterns and dependency management

- url: https://www.prisma.io/docs/getting-started
  why: Database schema design and migration patterns

- file: /Users/vienle2/code_projects/vibe-food/PRD.md
  why: Product Requirement Document

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Data Validation with Zod"
  critical: "Use branded types for all IDs and domain-specific values, validate ALL external data"
```

### Domain Model Context

**Core Entities:**
- **Users**: Authentication, profiles, order history
- **Stores**: Restaurant/shop information, categories, operating hours
- **MenuItems**: Products with pricing, availability, categories
- **Orders**: Order lifecycle, status tracking, payments
- **OrderItems**: Line items linking orders to menu items

**Key Relationships:**
- Store -> MenuItems (one-to-many)
- User -> Orders (one-to-many)
- Order -> OrderItems (one-to-many)
- OrderItem -> MenuItem (many-to-one)

### Critical Gotchas

1. **Prisma Client Generation**: Must run `prisma generate` after schema changes
2. **Environment Variables**: Frontend needs `NEXT_PUBLIC_` prefix for client-side access
3. **Database URLs**: Different formats for development vs production
4. **Docker Volumes**: Persist PostgreSQL data between container restarts
5. **pnpm Workspaces**: Use `workspace:*` for internal dependencies

## Implementation Blueprint

### 1. Root Workspace Configuration

```bash
# Root package.json structure
{
  "name": "vibe-food-ordering",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "build": "npm run build:shared && npm run build:backend && npm run build:frontend",
    "test": "npm run test:backend && npm run test:frontend",
    "db:migrate": "cd apps/backend && npx prisma migrate dev",
    "db:seed": "cd apps/backend && npx prisma db seed"
  }
}

# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 2. Local Database Setup

```bash
# Install PostgreSQL locally (macOS with Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create development database
createdb vibe_food_dev

# Install Redis locally (optional for caching)
brew install redis
brew services start redis

# Verify installations
psql -d vibe_food_dev -c "SELECT version();"
redis-cli ping
```

### 3. Database Schema Design

**Core Entities & Relationships:**
- **User**: Authentication, roles (Customer/Store Owner/Admin), profile data
- **Store**: Restaurant info, categories, business hours, verification status
- **MenuItem**: Products with pricing, availability, media
- **Order**: Order lifecycle with status tracking, pricing, delivery info
- **OrderItem**: Line items linking orders to menu items with quantities

**Key Design Patterns:**
- Use `@id @default(cuid())` for all primary keys
- Include `createdAt` and `updatedAt` timestamps on all entities
- Use enums for constrained values (UserRole, StoreCategory, OrderStatus)
- Use `@db.Decimal(10, 2)` for all monetary values
- Include soft delete patterns with `isActive` flags
- Use `@@map()` to specify table names explicitly

**Critical Schema Considerations:**
- Foreign key relationships with proper `onDelete` cascades
- Unique constraints on business-critical fields (email, username, orderNumber)
- Indexes on frequently queried fields (storeId, customerId, category)
- Business hours stored as strings in "HH:MM" format for simplicity

### 4. Environment Configuration Strategy

**Centralized Validation Pattern:**
- Create `packages/shared/src/env.ts` with Zod schema for all environment variables
- Use `z.coerce.number()` for port configurations with sensible defaults
- Require minimum lengths for secrets (32+ chars for JWT secrets)
- Use branded types for database URLs and API endpoints
- Export typed `env` object that fails fast on missing/invalid variables

**Key Environment Groups:**
- **Database**: `DATABASE_URL` (required), `REDIS_URL` (optional)
- **Authentication**: JWT secrets, expiration times, NextAuth configuration
- **API Configuration**: Host, port, CORS origins
- **Frontend**: `NEXT_PUBLIC_` prefixed variables for client-side access

**Validation Requirements:**
- All secrets must be minimum 32 characters
- URLs must be properly formatted with protocol
- Ports must be valid integers between 1-65535
- Environment must be one of: development, test, production

### 5. Workspace Package Strategy

**Package Naming Convention:**
- Use `@vibe/` scoped naming for all internal packages
- Backend: `@vibe/backend`, Frontend: `@vibe/frontend`, Shared: `@vibe/shared`

**Essential Scripts per Package:**
- **Backend**: `dev` (tsx watch), `build` (tsc), database scripts (`db:generate`, `db:migrate`, `db:seed`)
- **Frontend**: Standard Next.js scripts (`dev`, `build`, `start`)
- **Shared**: TypeScript compilation with watch mode for development

**Dependency Management:**
- Use `workspace:*` for internal package dependencies
- Core dependencies: Express (backend), Next.js (frontend), Zod (shared)
- Development dependencies: tsx for backend development, Prisma CLI tools
- Ensure TypeScript configurations are consistent across packages

### 6. Database Seeding Strategy

**Seed Data Requirements:**
- Create realistic test users with different roles (Customer, Store Owner, Admin)
- Generate representative stores across multiple categories (Pizza, Coffee, etc.)
- Populate menu items with proper pricing and descriptions
- Use `upsert` operations to avoid duplicate data on re-runs

**Key Seeding Patterns:**
- Hash passwords with bcrypt for security consistency
- Use predictable IDs for test data (e.g., 'pizza-store-1') for easier testing
- Include both active and inactive records to test filtering
- Create relationships that demonstrate all foreign key constraints
- Add menu items across different price ranges and categories

**Seeding Best Practices:**
- Log progress with clear emoji indicators (🌱 Starting, ✅ Success, ❌ Error)
- Handle errors gracefully with process.exit(1) on failure
- Always disconnect Prisma client in finally block
- Use createMany for bulk operations where relationships allow

## Validation Loop

### Level 1: Infrastructure Setup
```bash
# Install dependencies
pnpm install

# Ensure PostgreSQL is running
brew services start postgresql@15

# Verify database connection
psql -d vibe_food_dev -c "SELECT version();"
```

### Level 2: Database Setup
```bash
# Generate Prisma client
cd apps/backend && npx prisma generate

# Run migrations
cd apps/backend && npx prisma migrate dev --name init

# Seed database
cd apps/backend && npx prisma db seed

# Verify schema
cd apps/backend && npx prisma studio
```

### Level 3: Package Builds
```bash
# Build shared package
cd packages/shared && npm run build

# Build backend
cd apps/backend && npm run build

# Build frontend
cd apps/frontend && npm run build
```

### Level 4: Service Startup
```bash
# Start backend
cd apps/backend && npm run dev
# Should start on http://localhost:3001

# Start frontend (new terminal)
cd apps/frontend && npm run dev
# Should start on http://localhost:3000

# Test API endpoint
curl http://localhost:3001/health
# Should return {"status": "ok", "timestamp": "..."}
```

### Level 5: Environment Validation
```bash
# Test environment parsing
node -e "
const { env } = require('./packages/shared/dist/env.js');
console.log('Environment validation passed:', env.NODE_ENV);
"

# Verify all required variables are set
grep -E "^[A-Z_]+" .env.example | while read var; do
  if [ -z "${!var}" ]; then
    echo "Missing: $var"
  fi
done
```

## Task Checklist

### Infrastructure
- [ ] Create root package.json with workspace configuration
- [ ] Set up pnpm-workspace.yaml
- [ ] Install and configure local PostgreSQL and Redis
- [ ] Configure environment variables (.env.example and validation)

### Database
- [ ] Design complete Prisma schema with all entities
- [ ] Create database migrations
- [ ] Implement comprehensive seed script
- [ ] Verify foreign key relationships work correctly

### Package Structure
- [ ] Set up apps/backend with TypeScript configuration
- [ ] Set up apps/frontend with Next.js configuration
- [ ] Set up packages/shared with environment validation
- [ ] Configure workspace dependencies correctly

### Development Experience
- [ ] All services start with single command
- [ ] Hot reload works for backend and frontend
- [ ] Database GUI accessible via Prisma Studio
- [ ] Environment validation catches missing variables

### Validation
- [ ] All validation commands pass
- [ ] Database seeding creates realistic test data
- [ ] Type generation works from Prisma schema
- [ ] Cross-package imports resolve correctly

**Critical Success Metric**: A new developer can run `git clone`, `pnpm install`, ensure PostgreSQL is running locally, and `npm run dev` to have a fully working development environment in under 5 minutes.
