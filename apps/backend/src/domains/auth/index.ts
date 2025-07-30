/**
 * Authentication Domain Public API
 * 
 * This module exports the public API for the authentication domain,
 * following the domain-driven design pattern specified in CLAUDE.md.
 */

// Services
export { JWTService, createJWTService } from './services/jwt.service.js';
export { AuthService, createAuthService } from './services/auth.service.js';

// Controllers
export { AuthController, createAuthController } from './controllers/auth.controller.js';

// Middleware
export * from './middleware/index.js';

// Routes
export { createAuthRoutes, AuthRouteConfig, getAuthMiddleware, mountAuthRoutes } from './routes/auth.routes.js';

// Entities (to be implemented)
// export { User } from './entities/user.entity.js';

// Repositories (to be implemented)
// export { UserRepository } from './repos/user.repository.js';

// Types
export type * from './types/auth.types.js';