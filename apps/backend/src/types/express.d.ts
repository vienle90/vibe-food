/**
 * Express type extensions for the Vibe food ordering application
 * 
 * This module extends the Express Request interface to include authentication-related
 * properties that are added by authentication middleware.
 */

import { AuthenticatedUser } from '@vibe/shared/types/auth';
import { Store, MenuItem } from '@prisma/client';

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

      /**
       * Store information for ownership verification
       * 
       * This property is set by the store ownership middleware when a valid
       * store ownership is verified. It contains the store information.
       * 
       * - Undefined: No store ownership verification attempted
       * - Store: Valid store ownership verified
       */
      store?: Store;

      /**
       * Menu item information for ownership verification
       * 
       * This property is set by the menu item ownership middleware when a valid
       * menu item ownership is verified through store relationship.
       * 
       * - Undefined: No menu item ownership verification attempted
       * - MenuItem: Valid menu item ownership verified
       */
      menuItem?: MenuItem & {
        store?: {
          id: string;
          name: string;
          ownerId: string;
        };
      };
    }
  }
}

export {};