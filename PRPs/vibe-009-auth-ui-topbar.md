# PRP-009: Authentication Button & User Information in Top Bar

## Goal
Implement a complete authentication UI system in the top bar that displays login/logout buttons and authenticated user information, seamlessly integrating with the existing JWT authentication backend and maintaining consistent design patterns.

## Why
- **User Experience**: Users need clear visual indication of their authentication status and easy access to login/logout functionality
- **Business Value**: Enables user account features, personalized experiences, and order tracking capabilities
- **Integration**: Connects the robust backend authentication system (PRP-002) with the frontend user interface
- **Security**: Provides secure, accessible authentication controls following modern best practices

## What
A complete authentication UI system that includes:
- **Login Button**: Prominent button in header for unauthenticated users
- **User Menu**: Dropdown showing user info with logout option for authenticated users  
- **Login Modal**: Secure form for user authentication
- **Loading States**: Proper feedback during authentication operations
- **Error Handling**: Clear error messages for failed authentication attempts
- **Responsive Design**: Mobile-first approach matching existing header patterns
- **Accessibility**: Full keyboard navigation and screen reader support

## All Needed Context

### Documentation & References
- **url**: https://nextjs.org/docs/app/building-your-application/authentication (Next.js 15 Auth patterns)
- **url**: https://ui.shadcn.com/docs/components/dropdown-menu (Shadcn DropdownMenu component)
- **url**: https://ui.shadcn.com/docs/components/avatar (Shadcn Avatar component) 
- **url**: https://authjs.dev/getting-started/session-management/get-session (Auth.js session patterns)
- **url**: https://react-spectrum.adobe.com/react-aria/accessibility.html (Accessibility guidelines)

- **file**: `/Users/vienle2/code_projects/vibe-food/apps/backend/src/domains/auth/controllers/auth.controller.ts` (Auth endpoints)
- **file**: `/Users/vienle2/code_projects/vibe-food/packages/shared/src/types/auth.ts` (Auth types)
- **file**: `/Users/vienle2/code_projects/vibe-food/apps/frontend/src/components/common/Header.tsx` (Current header)
- **file**: `/Users/vienle2/code_projects/vibe-food/apps/frontend/src/lib/api-client.ts` (API client patterns)
- **file**: `/Users/vienle2/code_projects/vibe-food/apps/frontend/src/stores/cart.ts` (Zustand store patterns)

- **docfile**: `/Users/vienle2/code_projects/vibe-food/PRPs/vibe-002-auth-system.md` (Backend auth system)
- **docfile**: `/Users/vienle2/code_projects/vibe-food/CLAUDE.md` (Development guidelines)

### Current Codebase Context

```
apps/frontend/src/
├── components/
│   ├── common/
│   │   └── Header.tsx              # Current header (needs auth integration)
│   └── ui/                         # Shadcn/ui components
├── lib/
│   ├── api-client.ts              # API client with auth support
│   └── env.ts                     # Environment configuration
├── stores/
│   └── cart.ts                    # Zustand store pattern reference
└── hooks/                         # Custom hooks directory

apps/backend/src/domains/auth/
├── controllers/auth.controller.ts  # Auth endpoints
├── services/auth.service.ts       # Auth business logic  
└── routes/auth.routes.ts          # Auth route definitions

packages/shared/src/types/
└── auth.ts                        # Shared auth types and schemas
```

### Implementation Patterns from Codebase Analysis

#### 1. Header Integration Pattern (Header.tsx:1-89)
```tsx
// Current header structure to extend
<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="container mx-auto px-4 h-16 flex items-center justify-between">
    <div className="flex items-center space-x-4">
      {/* Logo section */}
    </div>
    <nav className="hidden md:flex items-center space-x-6">
      {/* Navigation links */}
    </nav>
    <div className="flex items-center space-x-4">
      <CartButton variant="inline" />
      {/* Add auth button here */}
    </div>
  </div>
</header>
```

#### 2. Zustand Store Pattern (cart.ts:1-84)
```typescript
// Auth store should follow this pattern
interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

// Individual selector hooks pattern
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
```

#### 3. API Service Pattern (api-client.ts:50-89)
```typescript
// Auth service to add to api-services.ts
export const authService = {
  login: (data: LoginRequest) => apiClient.post<AuthResponse>('/api/auth/login', data),
  register: (data: RegisterRequest) => apiClient.post<AuthResponse>('/api/auth/register', data),
  logout: () => apiClient.post('/api/auth/logout'),
  getCurrentUser: (token: string) => createAuthenticatedClient(token).get<CurrentUserResponse>('/api/auth/me')
};
```

### Known Gotchas from Research

#### 1. TypeScript Configuration Issues
- **Problem**: `JSX.Element` namespace errors in Next.js 15
- **Solution**: Always use `ReactElement` from 'react' import
- **Prevention**: Add explicit return type annotations

#### 2. Environment Validation in Browser
- **Problem**: Backend env validation runs in frontend causing errors
- **Solution**: Add `SKIP_ENV_VALIDATION=true` to frontend .env.local
- **File**: apps/frontend/.env.local

#### 3. Zustand Store Infinite Loops  
- **Problem**: Object selectors cause re-renders
- **Solution**: Use individual selectors like `useAuthUser()` not `useAuth()`
- **Pattern**: Follow cart store's individual hook exports

#### 4. Server/Client Component Separation
- **Problem**: Cannot use hooks in Server Components
- **Solution**: Separate auth state logic into Client Components
- **Pattern**: Create AuthButton as 'use client' component

#### 5. JWT Token Storage Security
- **Problem**: localStorage vulnerable to XSS attacks
- **Solution**: Use sessionStorage or in-memory storage with HTTP-only refresh cookies
- **Implementation**: Store access token in memory, refresh token in HTTP-only cookie

## Implementation Blueprint

### Data Models and Structure

#### Authentication Store Schema
```typescript
// src/stores/auth.ts
interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: AuthUser, token: string) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Individual selector hooks (prevents re-render loops)
export const useAuthUser = () => useAuthStore(state => state.user);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore(state => state.isLoading);
```

#### Component Props Interfaces
```typescript
// src/components/auth/types.ts
interface AuthButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

interface UserMenuProps {
  user: AuthUser;
  onLogout: () => void;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (credentials: LoginRequest) => Promise<void>;
}
```

### Task List

1. **Create Authentication Store**
   - Set up Zustand store with persistence
   - Implement individual selector hooks
   - Add loading and error state management

2. **Create Authentication API Service**
   - Add auth methods to api-services.ts
   - Implement token management utilities
   - Add error handling for auth failures

3. **Build Login Modal Component**
   - Create modal with form validation
   - Implement loading states and error display
   - Add accessibility features and keyboard navigation

4. **Build User Menu Component**
   - Create dropdown with user information
   - Add logout functionality
   - Implement responsive design patterns

5. **Create Auth Button Component**
   - Conditional rendering based on auth state
   - Integrate with existing header layout
   - Handle loading states during auth operations

6. **Integrate with Header Component**
   - Modify existing Header.tsx
   - Position auth elements alongside cart button
   - Maintain responsive design consistency

7. **Add Authentication Context/Hook**
   - Create useAuth hook for auth operations
   - Implement auto-login from stored tokens
   - Add token refresh functionality

8. **Implement Error Handling**
   - Add toast notifications for auth errors
   - Create error boundaries for auth components
   - Handle network failures gracefully

9. **Add Comprehensive Testing**
   - Unit tests for auth store and hooks
   - Component tests for UI interactions
   - Integration tests for auth flows

10. **Security & Performance Optimization**
    - Implement secure token storage
    - Add request interceptors for automatic token refresh
    - Optimize re-render performance

### Pseudocode

#### 1. Authentication Store Implementation
```typescript
// src/stores/auth.ts
const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user, token) => set({ 
        user, 
        accessToken: token, 
        isAuthenticated: true,
        error: null 
      }),

      clearUser: () => set({ 
        user: null, 
        accessToken: null, 
        isAuthenticated: false,
        error: null 
      }),

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error })
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
);
```

#### 2. Auth Button Component Logic
```typescript
// src/components/auth/AuthButton.tsx
'use client';

export function AuthButton(): ReactElement {
  const isAuthenticated = useIsAuthenticated();
  const user = useAuthUser();
  const isLoading = useAuthLoading();
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (isLoading) {
    return <Button disabled><Loader2 className="h-4 w-4 animate-spin" /></Button>;
  }

  if (isAuthenticated && user) {
    return <UserMenu user={user} onLogout={handleLogout} />;
  }

  return (
    <>
      <Button onClick={() => setShowLoginModal(true)}>
        <LogIn className="h-4 w-4 mr-2" />
        Login
      </Button>
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </>
  );
}
```

#### 3. User Menu Component Structure
```typescript
// src/components/auth/UserMenu.tsx
export function UserMenu({ user, onLogout }: UserMenuProps): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {user.firstName[0]}{user.lastName[0]}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Integration Points

#### 1. Header Component Integration
- **Location**: apps/frontend/src/components/common/Header.tsx:79
- **Pattern**: Add `<AuthButton />` alongside existing `<CartButton variant="inline" />`
- **Responsive**: Maintain existing mobile/desktop breakpoint behavior

#### 2. API Services Integration
- **Location**: apps/frontend/src/lib/api-services.ts
- **Pattern**: Add `authService` object with login, logout, register, getCurrentUser methods
- **Error Handling**: Use existing ApiError and NetworkError classes

#### 3. Environment Configuration
- **Location**: apps/frontend/.env.local
- **Addition**: `SKIP_ENV_VALIDATION=true` to prevent backend validation in frontend
- **Security**: Consider adding auth-related environment variables if needed

#### 4. Routing Integration
- **Protected Routes**: Create ProtectedRoute wrapper component for authenticated pages
- **Redirects**: Implement login redirects for protected routes
- **Navigation**: Update navigation logic based on authentication state

## Validation Loop

### Level 1: Syntax & Style
```bash
# Frontend validation
cd apps/frontend
npm run lint              # ESLint validation
npm run type-check        # TypeScript compilation
npm run format:check      # Prettier formatting

# Shared packages validation  
cd packages/shared
npm run build            # Build shared types
npm run type-check       # Validate auth types
```

### Level 2: Unit Tests
```bash
# Authentication store tests
npm run test src/stores/auth.test.ts

# Authentication hook tests  
npm run test src/hooks/useAuth.test.ts

# Component unit tests
npm run test src/components/auth/**/*.test.tsx

# Run with coverage
npm run test:coverage -- --threshold=90
```

### Level 3: Integration Tests
```bash
# Start development servers
npm run dev

# Test authentication endpoints
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","password":"password123"}'

# Test authenticated endpoints
curl -X GET "http://localhost:3001/api/auth/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Frontend integration tests
npm run test:integration
```

### Level 4: End-to-End Tests
```bash
# Start all services
npm run dev

# Run E2E authentication flows
npm run test:e2e:auth

# Test authentication user journeys
npx cypress run --spec "cypress/e2e/auth/*.cy.ts"
```

### Level 5: Security & Performance
```bash
# Security audit
npm audit --audit-level moderate

# Performance testing
npm run test:performance:auth

# Accessibility testing
npm run test:a11y:auth

# Bundle size analysis
npm run build:analyze
```

## Final Validation Checklist

### ✅ Functionality Requirements
- [ ] Login button displays for unauthenticated users
- [ ] User menu displays with user info for authenticated users
- [ ] Login modal opens with proper form validation
- [ ] Logout functionality clears user state and redirects appropriately
- [ ] Loading states display during authentication operations
- [ ] Error states display meaningful messages to users

### ✅ Technical Requirements  
- [ ] TypeScript compilation passes with no errors
- [ ] All components use ReactElement return types (not JSX.Element)
- [ ] Zustand store follows individual selector pattern
- [ ] API integration uses existing error handling patterns
- [ ] Components follow Shadcn/ui design system patterns

### ✅ Integration Requirements
- [ ] Header component integration maintains responsive design
- [ ] Authentication state persists across browser sessions
- [ ] Token refresh works automatically for expired tokens
- [ ] Protected routes redirect unauthenticated users
- [ ] Cart state persists through authentication state changes

### ✅ Security Requirements
- [ ] Passwords are never stored in client state
- [ ] JWT tokens stored securely (sessionStorage, not localStorage)
- [ ] API requests include proper authentication headers
- [ ] Logout clears all authentication tokens
- [ ] CSRF protection implemented for authentication endpoints

### ✅ Performance Requirements
- [ ] Authentication operations don't block UI thread
- [ ] Minimal re-renders during authentication state changes
- [ ] Components lazy load when appropriate
- [ ] Bundle size impact is minimized
- [ ] Authentication checks are optimized

### ✅ Accessibility Requirements
- [ ] All interactive elements have proper ARIA labels
- [ ] Keyboard navigation works for all authentication UI
- [ ] Screen readers announce authentication state changes
- [ ] Focus management works properly in modals
- [ ] Color contrast meets WCAG guidelines

### ✅ Testing Requirements
- [ ] Unit test coverage ≥90% for authentication components
- [ ] Integration tests cover complete authentication flows
- [ ] E2E tests validate user authentication journeys
- [ ] Error scenarios are comprehensively tested
- [ ] Performance tests validate no authentication bottlenecks

### ✅ Code Quality Requirements
- [ ] All files under 500 lines (refactor if larger)
- [ ] Components under 200 lines (split if larger)
- [ ] No use of `any` type (use proper typing or `unknown`)
- [ ] All external data validated with Zod schemas
- [ ] Semantic commit messages used throughout

## Success Metrics

**Context Richness**: 9/10 - Comprehensive research across codebase patterns, external docs, testing strategies, and project documentation

**Implementation Clarity**: 9/10 - Clear task breakdown with specific file locations, code patterns, and integration points

**Validation Completeness**: 9/10 - Multi-level validation from syntax to E2E with specific commands and thresholds

**One-Pass Success Probability**: 8/10 - High confidence through parallel research depth and context-rich implementation guidance

This PRP provides comprehensive guidance for implementing authentication UI that integrates seamlessly with the existing Vibe Food application architecture while following modern security and accessibility best practices.