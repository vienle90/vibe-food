/**
 * Express type extensions for the Vibe food ordering application
 * 
 * This module extends the Express Request interface to include authentication-related
 * properties that are added by authentication middleware.
 */

import { AuthenticatedUser } from '@vibe/shared/types/auth';

declare global {
  namespace Express {
    /**
     * Extended Request interface with authentication support
     * 
     * The user property is populated by authentication middleware
     * when a valid access token is provided.
     */
    interface Request {
      /**
       * Authenticated user information
       * 
       * This property is set by the authentication middleware when a valid
       * access token is provided. It contains the user's basic information
       * extracted from the JWT payload.
       * 
       * - Undefined: No authentication attempted or token invalid
       * - AuthenticatedUser: Valid token with user information
       */
      user?: AuthenticatedUser;
    }
  }
}

export {};