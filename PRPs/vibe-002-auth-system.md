# PRP-002: Vibe Food Ordering - Authentication System

## Goal

Implement secure JWT-based authentication with refresh token rotation for the Vibe food ordering application:
- User registration and login endpoints
- JWT access tokens (15min) + refresh tokens (7 days)
- Automatic token refresh mechanism
- Password hashing with bcrypt
- Authentication middleware for protected routes
- Role-based access control (Customer, Store Owner, Admin)

## Why

- **Security First**: JWT with rotation prevents token hijacking and replay attacks
- **User Experience**: Seamless authentication without frequent re-logins
- **Scalability**: Stateless authentication supports horizontal scaling
- **Role Management**: Different user types have different permissions
- **Production Ready**: Industry-standard security practices

## What

### User-Visible Behavior
- Users can register with email/username/password
- Users can login and receive authentication tokens
- Users stay logged in for 7 days without re-authentication
- Protected features require valid authentication
- Different user roles see appropriate functionality

### Technical Requirements
- JWT access token (15 minutes expiry)
- JWT refresh token (7 days expiry, rotation on use)
- Password hashing with bcrypt (salt rounds: 12)
- Authentication middleware for Express routes
- Role-based route protection
- Token blacklisting for logout
- Comprehensive input validation with Zod

### Success Criteria
- [ ] User registration creates account with hashed password
- [ ] Login returns valid access + refresh token pair
- [ ] Protected routes reject invalid/expired tokens
- [ ] Token refresh works automatically
- [ ] Role-based access control functions correctly
- [ ] Password validation enforces security requirements

## All Needed Context

### Documentation & References

```yaml
- file: /Users/vienle2/code_projects/vibe-food/PRD.md
  why: Product Requirement Document

- url: https://jwt.io/
  why: JWT token structure and validation patterns

- url: https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/
  why: Refresh token rotation security best practices

- url: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
  why: Password hashing and storage security requirements

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Security and Authentication"
  critical: "Never trust user input, always validate and sanitize"

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Backend Development Guidelines - Authentication Flow"
  critical: "JWT tokens with refresh token rotation pattern"

- file: /Users/vienle2/code_projects/vibe-food/CLAUDE.md
  section: "Data Validation with Zod"
  critical: "MANDATORY for all external data validation"
```

### Security Context

**JWT Security Requirements:**
- Access tokens: Short-lived (15 minutes)
- Refresh tokens: Longer-lived (7 days) with rotation
- Secure HTTP-only cookies for token storage
- CSRF protection for state-changing operations
- Password requirements: min 8 chars, uppercase, lowercase, number

**Authentication Flow:**
1. User submits credentials
2. Server validates and creates JWT pair
3. Access token used for API requests
4. Refresh token used to get new access token
5. Refresh token rotated on each use

### Critical Gotchas

1. **Token Storage**: Use HTTP-only cookies, never localStorage for tokens
2. **Refresh Rotation**: Always invalidate old refresh token when issuing new one
3. **Password Validation**: Enforce strong password requirements
4. **Rate Limiting**: Prevent brute force attacks on auth endpoints
5. **CORS Configuration**: Properly configure for frontend domain

## Implementation Blueprint

### 1. Authentication Schema Design

**Input Validation Requirements:**
- **Registration**: Email validation, username constraints (3-20 chars, alphanumeric+underscore), strong password regex
- **Login**: Support both email and username as identifier
- **Password Rules**: Minimum 8 characters, must contain uppercase, lowercase, and number
- **Phone**: Optional, regex validation for international formats

**Type Safety Strategy:**
- Use Zod schemas for all input validation with detailed error messages
- Define TypeScript interfaces for API responses (`AuthTokens`, `AuthUser`, `AuthResponse`)
- Create JWT payload interfaces for access and refresh tokens with required claims
- Use branded types for user IDs and token identifiers

**Key Interface Patterns:**
- `AuthResponse`: Contains both user profile data and token pair
- `JWTPayload`: Include standard claims (sub, iat, exp) plus custom user data
- `RefreshPayload`: Minimal payload with tokenId for rotation tracking

### 2. JWT Service Implementation Strategy

**JWT Configuration Requirements:**
- Use separate secrets for access and refresh tokens from environment variables
- Set appropriate expiry times (15min access, 7 days refresh)
- Include issuer and audience claims for additional security
- Use `randomUUID()` for refresh token rotation tracking

**Token Generation Patterns:**
- **Access Tokens**: Include user data (sub, email, username, role) for stateless authorization
- **Refresh Tokens**: Minimal payload with only userId and tokenId for security
- Both tokens should include standard JWT claims (iat, exp) automatically
- Use `Omit<PayloadType, 'iat' | 'exp'>` pattern for clean interfaces

**Token Verification Strategy:**
- Wrap `jwt.verify()` with proper error handling for different JWT errors
- Distinguish between expired tokens and invalid tokens for appropriate responses
- Validate issuer and audience claims to prevent token misuse
- Convert token expiration to milliseconds for frontend compatibility

**Security Considerations:**
- Never log or expose token secrets in error messages
- Use different secrets for access vs refresh tokens
- Implement proper error types for token validation failures

### 3. Authentication Service Architecture

**Service Layer Responsibilities:**
- Input validation using Zod schemas before any business logic
- User registration with duplicate email/username checking
- Password hashing with bcrypt (salt rounds: 12 for security)
- Login authentication with flexible identifier (email or username)
- JWT token generation and refresh token rotation
- User profile management and role-based data access

**Registration Flow Pattern:**
1. Validate input with `registerSchema.parse()`
2. Check for existing users with `OR` query for email/username
3. Hash password with `bcrypt.hash(password, 12)`
4. Create user with Prisma `create()` using `select` to exclude sensitive fields
5. Generate token pair and return `AuthResponse`

**Login Flow Pattern:**
1. Validate with `loginSchema.parse()`
2. Find user by email OR username using Prisma `findFirst()`
3. Compare password with `bcrypt.compare()`
4. Generate fresh token pair on successful authentication
5. Store refresh token reference for rotation tracking

**Token Refresh Strategy:**
- Verify existing refresh token before issuing new one
- Generate new access token with current user data
- Rotate refresh token (invalidate old, create new)
- Return both new tokens in response

**AuthService Implementation Strategy:**

1. **Service Class Structure**: Create a service class that encapsulates all authentication business logic, using dependency injection for Prisma client

2. **Registration Flow Implementation**:
   - Use `registerSchema.parse()` for input validation with Zod
   - Check for existing users with OR query for email/username conflicts
   - Hash passwords with `bcrypt.hash(password, 12)` for security
   - Create user with Prisma `create()` using `select` to exclude sensitive fields
   - Generate token pair and return structured `AuthResponse`

3. **Login Flow Implementation**:
   - Support flexible identifier (email OR username) using Prisma `findFirst()`
   - Compare passwords with `bcrypt.compare()` for security
   - Generate fresh token pair on successful authentication
   - Never expose password hash in response data

4. **Token Refresh Strategy**:
   - Verify existing refresh token before issuing new ones
   - Look up current user data for fresh access token generation
   - Implement token rotation (invalidate old, create new)
   - Return both new access and refresh tokens

5. **Error Handling Patterns**:
   - Use consistent error messages for security ("Invalid credentials")
   - Throw appropriate error types (`ValidationError`, `UnauthorizedError`)
   - Never leak sensitive information in error responses

6. **Private Helper Methods**:
   - Create `generateTokenPair()` method for consistent token creation
   - Use JWT service for token generation with proper payloads
   - Set appropriate expiration times (15min access, 7d refresh)

### 4. Authentication Middleware Architecture

**Middleware Class Structure:**
- Create `AuthMiddleware` class with dependency injection for auth service
- Extend Express Request type globally to include user property
- Implement three distinct middleware methods for different auth requirements

**Authentication Middleware Implementation Patterns:**

1. **Basic Authentication Middleware (`authenticate`)**:
   - Extract Bearer token from Authorization header
   - Verify token using JWT service with proper error handling
   - Attach decoded user data to `req.user` for downstream access
   - Return 401 with consistent error format for invalid/expired tokens
   - Use try-catch for proper error handling and response formatting

2. **Role-Based Authorization Middleware (`authorize`)**:
   - Create higher-order function that accepts allowed roles array
   - Check if user is authenticated before role validation
   - Compare user role against allowed roles array
   - Return 403 for insufficient permissions, 401 for missing auth
   - Use consistent error response format across all auth failures

3. **Optional Authentication Middleware (`optionalAuth`)**:
   - Attempt token verification without throwing errors
   - Silently fail for missing or invalid tokens
   - Attach user data if valid token present
   - Continue processing regardless of authentication status
   - Useful for routes that enhance functionality with auth but don't require it

**Global Type Extensions:**
- Extend Express Request interface to include optional user property
- Define user property structure with id, email, username, role
- Ensure type safety across all middleware and route handlers

**Error Handling Patterns:**
- Use consistent JSON error response format with success boolean
- Distinguish between authentication (401) and authorization (403) errors
- Provide clear error messages without exposing sensitive information
- Handle JWT-specific errors (expired, invalid, malformed) appropriately

### 5. Authentication Controllers Implementation Strategy

**Controller Class Architecture:**
- Create `AuthController` class with dependency injection for auth service
- Use Express async/await pattern with proper error handling
- Implement consistent JSON response format across all endpoints
- Follow HTTP status code conventions (201 for creation, 200 for success)

**Controller Method Implementation Patterns:**

1. **Registration Controller (`register`)**:
   - Call auth service with request body (validation handled by middleware)
   - Set refresh token as HTTP-only cookie with security flags
   - Return 201 status with user data and access token
   - Never include refresh token in JSON response body
   - Use environment-based secure flag for cookies

2. **Login Controller (`login`)**:
   - Similar pattern to registration but return 200 status
   - Same cookie handling for refresh token security
   - Consistent response format with user profile and access token
   - Handle authentication failures through service layer

3. **Token Refresh Controller (`refresh`)**:
   - Accept refresh token from both cookies and request body
   - Validate refresh token presence before processing
   - Set new refresh token cookie (rotation pattern)
   - Return fresh access token with updated expiration
   - Handle token rotation failures appropriately

4. **Logout Controller (`logout`)**:
   - Clear refresh token cookie to invalidate session
   - Return success message without additional data
   - Keep implementation simple (stateless JWT approach)
   - Consider future token blacklisting enhancement

5. **Current User Controller (`me`)**:
   - Verify user authentication from middleware
   - Fetch fresh user data from database via service
   - Handle cases where user no longer exists
   - Return current user profile data

**Cookie Security Configuration:**
- Use `httpOnly: true` to prevent XSS attacks
- Set `secure: true` in production for HTTPS-only
- Use `sameSite: 'strict'` for CSRF protection
- Set appropriate `maxAge` (7 days for refresh tokens)

**Error Handling Strategy:**
- Use try-catch blocks in all controller methods
- Pass errors to Express error handling middleware
- Let service layer handle business logic errors
- Maintain consistent error response format

### 6. Authentication Routes Implementation Strategy

**Route Factory Function Pattern:**
- Create factory function that accepts Prisma client for dependency injection
- Initialize all services and middleware within the factory
- Return configured router ready for mounting in main app
- Use this pattern for clean separation and testability

**Route Configuration Patterns:**

1. **Public Routes Setup**:
   - `/register`: POST with body validation middleware
   - `/login`: POST with body validation middleware
   - `/refresh`: POST without validation (accepts cookies/body)
   - `/logout`: POST for session termination

2. **Protected Routes Setup**:
   - `/me`: GET with authentication middleware
   - Future routes can add role-based authorization middleware

3. **Middleware Chain Ordering**:
   - Validation middleware before business logic
   - Authentication middleware for protected routes
   - Authorization middleware for role-specific routes

**Dependency Injection Strategy:**
- Pass Prisma client to factory function
- Initialize auth service with Prisma client
- Initialize controller with auth service
- Initialize middleware with auth service
- Create clean dependency chain without circular references

**Validation Integration:**
- Use `validateBody()` middleware with Zod schemas from shared package
- Import schemas from `@vibe/shared/types/auth`
- Let validation middleware handle schema parsing and error responses
- Keep route definitions clean and focused on business flow

**Route Mounting Strategy:**
- Export factory function for use in main app
- Mount returned router at `/api/auth` prefix
- Ensure consistent URL patterns across the application
- Plan for future auth-related endpoints (password reset, etc.)

### 7. Input Validation Middleware Implementation Strategy

**Validation Middleware Architecture:**
Refer to `/Users/vienle2/code_projects/vibe-food/CLAUDE.md` section "Backend Validation Middleware" for the complete implementation pattern.

**Key Implementation Patterns:**

1. **Higher-Order Function Pattern**:
   - Create `validateBody()` and `validateQuery()` functions that accept Zod schema
   - Return Express middleware function with proper typing
   - Use generic types `<T extends z.ZodTypeAny>` for schema flexibility

2. **Request Transformation**:
   - Parse and validate request data in-place (`req.body = schema.parse(req.body)`)
   - Ensure downstream handlers receive validated, typed data
   - Transform query parameters to appropriate types (strings to numbers, etc.)

3. **Error Handling Strategy**:
   - Catch Zod validation errors specifically
   - Convert to custom `ValidationError` with formatted error details
   - Pass to Express error handling middleware with `next(error)`
   - Preserve original error details in error response

4. **Usage Patterns**:
   - Apply to routes before controller methods
   - Use with auth schemas: `validateBody(registerSchema)`, `validateBody(loginSchema)`
   - Chain with other middleware: validation → authentication → business logic

**Critical Security Considerations:**
- Always validate at system boundaries (API endpoints)
- Use strict Zod schemas with explicit field definitions
- Never trust client data, even after initial validation
- Sanitize input data to prevent injection attacks
- Follow the principle from CLAUDE.md: "MUST validate ALL external data"

### 8. Custom Error Classes Implementation Strategy

**Error Class Hierarchy:**
Refer to `/Users/vienle2/code_projects/vibe-food/CLAUDE.md` section "Error Handling Pattern" for the complete error architecture.

**Key Implementation Patterns:**

1. **Base AppError Class**:
   - Include statusCode, message, code, and isOperational properties
   - Use `Error.captureStackTrace()` for proper stack trace handling
   - Set isOperational=true to distinguish from programming errors
   - Provide consistent error structure across the application

2. **Authentication-Specific Error Classes**:
   - `ValidationError`: 400 status for input validation failures
   - `UnauthorizedError`: 401 status for authentication failures
   - `ForbiddenError`: 403 status for authorization failures
   - `NotFoundError`: 404 status for missing resources

3. **Error Usage Patterns**:
   - Throw specific error types in service layer
   - Let Express error middleware handle error responses
   - Use consistent error codes for client-side handling
   - Never expose sensitive information in error messages

4. **Authentication Error Messages**:
   - Use generic "Invalid credentials" for login failures
   - Provide specific validation error details for registration
   - Use "Access token required" for missing authentication
   - Use "Insufficient permissions" for role-based failures

**Integration with Express Error Handling:**
- Extend global error middleware to handle custom error types
- Return consistent JSON error response format
- Log operational errors appropriately without exposing to client
- Use error codes for programmatic error handling on frontend

## Validation Loop

### Level 1: Dependencies and Setup
```bash
# Install authentication dependencies
cd apps/backend
npm install jsonwebtoken bcryptjs cookie-parser @types/jsonwebtoken @types/bcryptjs @types/cookie-parser

# Install shared type dependencies
cd packages/shared
npm install zod
```

### Level 2: Environment Variables
**Environment Configuration Requirements:**
- Generate cryptographically secure secrets using `openssl rand -base64 64`
- Set JWT_SECRET and JWT_REFRESH_SECRET with different values for security
- Configure appropriate expiration times (15m access, 7d refresh)
- Validate environment variables at application startup using Zod schemas
- Test environment validation to ensure all required variables are present

**Security Best Practices:**
- Never commit secrets to version control
- Use different secrets for access and refresh tokens
- Ensure secrets are at least 64 characters long
- Validate environment configuration before starting server

### Level 3: Unit Tests
```bash
# Test JWT utilities
cd apps/backend && npm test -- --grep "JWTService"

# Test authentication service
cd apps/backend && npm test -- --grep "AuthService"

# Test authentication middleware
cd apps/backend && npm test -- --grep "AuthMiddleware"
```

### Level 4: Integration Tests
**API Endpoint Testing Strategy:**

1. **Registration Endpoint Testing**:
   - Test successful user registration with valid data
   - Verify response includes user data and access token
   - Check that refresh token is set as HTTP-only cookie
   - Validate that password is properly hashed in database

2. **Login Endpoint Testing**:
   - Test login with both email and username identifiers
   - Verify successful authentication returns proper token pair
   - Test invalid credentials return appropriate error responses
   - Check cookie-based refresh token handling

3. **Protected Route Testing**:
   - Test `/me` endpoint with valid access token
   - Verify proper user data is returned
   - Test with expired/invalid tokens return 401 errors
   - Validate Authorization header parsing works correctly

4. **Token Refresh Testing**:
   - Test refresh endpoint with valid refresh token
   - Verify new access token is generated with fresh expiration
   - Test refresh token rotation (old token should be invalidated)
   - Validate refresh token from both cookies and request body

**Testing Commands Pattern:**
- Use curl commands or HTTP files for endpoint testing
- Start backend server in development mode first
- Extract tokens from responses for subsequent requests
- Test both success and failure scenarios for comprehensive coverage

### Level 5: Security Validation
**Security Testing Requirements:**

1. **Password Strength Validation**:
   - Test weak passwords are rejected (should return 400)
   - Verify minimum 8 characters, uppercase, lowercase, number requirements
   - Test edge cases like only numbers, only letters, etc.
   - Ensure proper Zod validation error messages are returned

2. **User Uniqueness Validation**:
   - Test duplicate email registration is rejected
   - Test duplicate username registration is rejected
   - Verify appropriate error messages ("Email already registered", "Username already taken")
   - Test case sensitivity handling for emails and usernames

3. **Authentication Security**:
   - Test invalid credentials return 401 with generic "Invalid credentials" message
   - Test login with non-existent users
   - Test login with correct email/username but wrong password
   - Ensure no information leakage about user existence

4. **Token Security Validation**:
   - Test expired access tokens return 401 errors
   - Test malformed tokens return appropriate errors
   - Test tokens with wrong signature are rejected
   - Test protected routes without tokens return 401

**Security Test Scenarios:**
- Use various invalid inputs to test validation robustness
- Verify error responses don't leak sensitive information
- Test rate limiting if implemented (prevent brute force)
- Validate HTTPS-only cookies in production environment

### Level 6: Role-Based Access Control
**RBAC Testing Strategy:**

1. **Role Assignment Testing**:
   - Create users with different roles (CUSTOMER, STORE_OWNER, ADMIN)
   - Test default role assignment (CUSTOMER) during registration
   - Verify role information is included in JWT access tokens
   - Test role persistence across token refresh cycles

2. **Authorization Middleware Testing**:
   - Test routes with role-based authorization middleware
   - Verify users with correct roles can access protected resources
   - Test users with insufficient roles receive 403 Forbidden errors
   - Validate role validation works with both string and enum comparisons

3. **Role-Based Route Protection**:
   - Create test routes for different user roles
   - Test STORE_OWNER routes reject CUSTOMER users
   - Test ADMIN routes reject both CUSTOMER and STORE_OWNER users
   - Verify consistent error messages across role-protected routes

4. **Database Role Management**:
   - Test role updates through database changes
   - Verify role changes are reflected in new JWT tokens
   - Test role validation during token refresh
   - Ensure inactive users cannot access any protected routes

**Future Enhancement Considerations:**
- Plan for dynamic role assignment endpoints
- Consider hierarchical role structures if needed
- Test role-based data filtering (users see only their own data)
- Validate role changes don't affect existing valid tokens

## Task Checklist

### Core Authentication
- [ ] Implement JWT utility functions with proper error handling
- [ ] Create authentication service with password hashing
- [ ] Build authentication middleware with role support
- [ ] Create authentication controllers with proper responses
- [ ] Set up authentication routes with validation

### Security Implementation
- [ ] Implement secure password hashing (bcrypt, 12 rounds)
- [ ] Set up JWT with proper expiration times (15min access, 7d refresh)
- [ ] Implement refresh token rotation mechanism
- [ ] Add HTTP-only cookie support for refresh tokens
- [ ] Create comprehensive input validation with Zod

### Error Handling
- [ ] Define custom error classes for auth scenarios
- [ ] Implement proper error responses with status codes
- [ ] Add validation error formatting
- [ ] Handle JWT-specific errors (expired, invalid, malformed)

### Testing & Validation
- [ ] Write unit tests for all auth services and utilities
- [ ] Create integration tests for auth endpoints
- [ ] Test password strength validation
- [ ] Verify role-based access control works
- [ ] Test token refresh flow works correctly

### Security Checklist
- [ ] Passwords are properly hashed with bcrypt
- [ ] JWT secrets are sufficiently long and random
- [ ] Tokens have appropriate expiration times
- [ ] Refresh tokens are rotated on use
- [ ] HTTP-only cookies used for refresh tokens
- [ ] CORS configured correctly for frontend domain
- [ ] Rate limiting implemented on auth endpoints (future enhancement)

### Integration Points
- [ ] Authentication middleware integrates with Express routes
- [ ] User roles properly stored and validated from database
- [ ] Error handling integrates with global error middleware
- [ ] Environment validation includes all JWT configuration

**Critical Success Metrics:**
1. **Security**: All passwords hashed, tokens properly validated, no sensitive data in responses
2. **Usability**: Users can register, login, and stay authenticated for 7 days
3. **Reliability**: Token refresh works automatically, expired tokens properly rejected
4. **Testability**: All auth flows covered by automated tests
5. **Maintainability**: Clear separation of concerns, proper error handling

**Demo Scenario**:
A new user can register → login → access protected routes → refresh tokens automatically → logout cleanly, with all security best practices followed and comprehensive error handling.

## Implementation Guidance for AI Agents

This PRP follows the **PRP methodology** (Product Requirement Prompt = PRD + curated codebase intelligence + agent/runbook). It provides **implementation guidance** rather than complete code implementations.

### Key Implementation Principles

1. **Follow CLAUDE.md Guidelines**: Always reference `/Users/vienle2/code_projects/vibe-food/CLAUDE.md` for:
   - Architecture patterns and tech stack decisions
   - Type safety requirements and validation strategies
   - Testing standards and security best practices
   - Error handling and API response formats

2. **Pattern-Based Implementation**: Use the patterns described in each section to:
   - Build services with proper dependency injection
   - Implement middleware with consistent error handling
   - Create controllers following Express async/await patterns
   - Structure routes with appropriate validation layers

3. **Security-First Approach**:
   - Validate ALL inputs with Zod schemas (mandatory from CLAUDE.md)
   - Use branded types for IDs and domain-specific values
   - Follow password hashing and JWT best practices
   - Implement proper error handling without information leakage

4. **Test-Driven Development**:
   - Write tests BEFORE implementation (TDD from CLAUDE.md)
   - Achieve minimum 80% code coverage requirement
   - Test all error states and edge cases
   - Use co-located test files in `__tests__/` folders

### AI Agent Instructions
- **Read CLAUDE.md first** to understand the complete development context
- **Implement incrementally** following the validation loop levels
- **Use existing patterns** from CLAUDE.md rather than creating new ones
- **Validate frequently** using the provided validation commands
- **Focus on guidance** - this PRP tells you HOW to implement, not WHAT code to write
