/**
 * JWT Service Unit Tests
 * 
 * Comprehensive test suite for the JWT service following the testing standards
 * from CLAUDE.md. Tests all functionality including error cases and edge conditions.
 */

import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { JWTService, createJWTService } from '../services/jwt.service.js';
import {
  JWTConfig,
  AccessTokenInput,
  RefreshTokenInput,
  JWTAccessPayload,
  JWTRefreshPayload,
} from '../types/auth.types.js';

describe('JWTService', () => {
  let jwtService: JWTService;
  let config: JWTConfig;

  // Test configuration with valid secrets
  const testConfig: JWTConfig = {
    accessSecret: 'test-access-secret-at-least-32-characters-long-for-security',
    refreshSecret: 'test-refresh-secret-at-least-32-characters-long-different',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
    issuer: 'vibe-food-test',
    audience: 'vibe-food-users',
  };

  // Sample user data for testing
  const sampleUser: AccessTokenInput = {
    sub: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    role: 'CUSTOMER',
  };

  before(async () => {
    config = testConfig;
    jwtService = new JWTService(config);
  });

  describe('Constructor and Configuration Validation', () => {
    it('should create JWT service with valid configuration', () => {
      const service = new JWTService(testConfig);
      assert(service instanceof JWTService);
    });

    it('should throw error for access secret too short', () => {
      const invalidConfig = {
        ...testConfig,
        accessSecret: 'short-secret',
      };

      assert.throws(
        () => new JWTService(invalidConfig),
        /JWT access secret must be at least 32 characters long/
      );
    });

    it('should throw error for refresh secret too short', () => {
      const invalidConfig = {
        ...testConfig,
        refreshSecret: 'short-secret',
      };

      assert.throws(
        () => new JWTService(invalidConfig),
        /JWT refresh secret must be at least 32 characters long/
      );
    });

    it('should throw error when access and refresh secrets are the same', () => {
      const invalidConfig = {
        ...testConfig,
        refreshSecret: testConfig.accessSecret,
      };

      assert.throws(
        () => new JWTService(invalidConfig),
        /Access and refresh secrets must be different for security/
      );
    });
  });

  describe('Access Token Generation', () => {
    it('should generate valid access token with user information', () => {
      const token = jwtService.generateAccessToken(sampleUser);
      
      assert(typeof token === 'string');
      assert(token.length > 0);
      
      // Verify token structure
      const decoded = jwt.decode(token) as JWTAccessPayload;
      assert.equal(decoded.sub, sampleUser.sub);
      assert.equal(decoded.email, sampleUser.email);
      assert.equal(decoded.username, sampleUser.username);
      assert.equal(decoded.role, sampleUser.role);
      assert.equal(decoded.iss, config.issuer);
      assert.equal(decoded.aud, config.audience);
      assert(decoded.iat);
      assert(decoded.exp);
    });

    it('should generate tokens with proper expiration time', () => {
      const token = jwtService.generateAccessToken(sampleUser);
      const decoded = jwt.decode(token) as JWTAccessPayload;
      
      // Should expire in 15 minutes (with small tolerance for test execution time)
      const expectedExpiration = decoded.iat + (15 * 60); // 15 minutes in seconds
      assert(Math.abs(decoded.exp - expectedExpiration) <= 1); // 1 second tolerance
    });

    it('should generate different tokens for same user at different times', async () => {
      const token1 = jwtService.generateAccessToken(sampleUser);
      
      // Wait at least 1 second to ensure different iat (JWT uses seconds)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const token2 = jwtService.generateAccessToken(sampleUser);
      assert.notEqual(token1, token2);
    });
  });

  describe('Refresh Token Generation', () => {
    it('should generate valid refresh token with minimal payload', () => {
      const refreshInput: RefreshTokenInput = {
        sub: sampleUser.sub,
        tokenId: 'test-token-id',
      };

      const token = jwtService.generateRefreshToken(refreshInput);
      
      assert(typeof token === 'string');
      assert(token.length > 0);
      
      // Verify token structure
      const decoded = jwt.decode(token) as JWTRefreshPayload;
      assert.equal(decoded.sub, refreshInput.sub);
      assert.equal(decoded.tokenId, refreshInput.tokenId);
      assert.equal(decoded.iss, config.issuer);
      assert.equal(decoded.aud, config.audience);
      assert(decoded.iat);
      assert(decoded.exp);
    });

    it('should generate UUID for tokenId when not provided', () => {
      const refreshInput: RefreshTokenInput = {
        sub: sampleUser.sub,
        tokenId: '', // Empty tokenId should trigger UUID generation
      };

      const token = jwtService.generateRefreshToken(refreshInput);
      const decoded = jwt.decode(token) as JWTRefreshPayload;
      
      // Should have a UUID pattern
      assert(decoded.tokenId);
      assert(decoded.tokenId.length > 0);
      assert(decoded.tokenId !== refreshInput.tokenId);
    });

    it('should generate tokens with proper expiration time for refresh tokens', () => {
      const refreshInput: RefreshTokenInput = {
        sub: sampleUser.sub,
        tokenId: 'test-token-id',
      };

      const token = jwtService.generateRefreshToken(refreshInput);
      const decoded = jwt.decode(token) as JWTRefreshPayload;
      
      // Should expire in 7 days
      const expectedExpiration = decoded.iat + (7 * 24 * 60 * 60); // 7 days in seconds
      assert(Math.abs(decoded.exp - expectedExpiration) <= 1); // 1 second tolerance
    });
  });

  describe('Token Pair Generation', () => {
    it('should generate complete token pair with access and refresh tokens', () => {
      const tokenPair = jwtService.generateTokenPair(sampleUser);
      
      assert(tokenPair.accessToken);
      assert(tokenPair.refreshToken);
      assert(typeof tokenPair.expiresAt === 'number');
      assert(tokenPair.expiresAt > Date.now());
      
      // Verify both tokens are valid
      const accessDecoded = jwt.decode(tokenPair.accessToken) as JWTAccessPayload;
      const refreshDecoded = jwt.decode(tokenPair.refreshToken) as JWTRefreshPayload;
      
      assert.equal(accessDecoded.sub, sampleUser.sub);
      assert.equal(refreshDecoded.sub, sampleUser.sub);
      assert(refreshDecoded.tokenId); // Should have generated tokenId
    });

    it('should set correct expiration timestamp', () => {
      const tokenPair = jwtService.generateTokenPair(sampleUser);
      
      // ExpiresAt should be approximately 15 minutes from now
      const fifteenMinutesFromNow = Date.now() + (15 * 60 * 1000);
      const timeDifference = Math.abs(tokenPair.expiresAt - fifteenMinutesFromNow);
      
      // Allow 5 second tolerance for test execution time
      assert(timeDifference < 5000);
    });
  });

  describe('Access Token Verification', () => {
    it('should verify valid access token successfully', () => {
      const token = jwtService.generateAccessToken(sampleUser);
      const result = jwtService.verifyAccessToken(token);
      
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.payload.sub, sampleUser.sub);
        assert.equal(result.payload.email, sampleUser.email);
        assert.equal(result.payload.username, sampleUser.username);
        assert.equal(result.payload.role, sampleUser.role);
      }
    });

    it('should reject token with wrong secret', () => {
      const wrongSecretService = new JWTService({
        ...testConfig,
        accessSecret: 'wrong-access-secret-at-least-32-characters-long',
      });

      const token = jwtService.generateAccessToken(sampleUser);
      const result = wrongSecretService.verifyAccessToken(token);
      
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error, 'invalid');
        assert(result.message.includes('Invalid token signature'));
      }
    });

    it('should reject expired access token', async () => {
      // Create a service with very short expiration
      const shortExpiryService = new JWTService({
        ...testConfig,
        accessExpiresIn: '1ms', // Immediately expired
      });

      const token = shortExpiryService.generateAccessToken(sampleUser);
      
      // Wait a bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = shortExpiryService.verifyAccessToken(token);
      
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error, 'expired');
        assert.equal(result.message, 'Token has expired');
      }
    });

    it('should reject malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token';
      const result = jwtService.verifyAccessToken(malformedToken);
      
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error, 'malformed');
        assert(result.message.includes('malformed'));
      }
    });

    it('should reject token with wrong issuer', () => {
      const wrongIssuerService = new JWTService({
        ...testConfig,
        issuer: 'wrong-issuer',
      });

      const token = wrongIssuerService.generateAccessToken(sampleUser);
      const result = jwtService.verifyAccessToken(token);
      
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error, 'invalid');
      }
    });

    it('should reject token with wrong audience', () => {
      const wrongAudienceService = new JWTService({
        ...testConfig,
        audience: 'wrong-audience',
      });

      const token = wrongAudienceService.generateAccessToken(sampleUser);
      const result = jwtService.verifyAccessToken(token);
      
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error, 'invalid');
      }
    });
  });

  describe('Refresh Token Verification', () => {
    it('should verify valid refresh token successfully', () => {
      const refreshInput: RefreshTokenInput = {
        sub: sampleUser.sub,
        tokenId: 'test-token-id',
      };

      const token = jwtService.generateRefreshToken(refreshInput);
      const result = jwtService.verifyRefreshToken(token);
      
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.payload.sub, refreshInput.sub);
        assert.equal(result.payload.tokenId, refreshInput.tokenId);
      }
    });

    it('should reject refresh token with wrong secret', () => {
      const wrongSecretService = new JWTService({
        ...testConfig,
        refreshSecret: 'wrong-refresh-secret-at-least-32-characters-long',
      });

      const refreshInput: RefreshTokenInput = {
        sub: sampleUser.sub,
        tokenId: 'test-token-id',
      };

      const token = jwtService.generateRefreshToken(refreshInput);
      const result = wrongSecretService.verifyRefreshToken(token);
      
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error, 'invalid');
      }
    });

    it('should reject expired refresh token', async () => {
      const shortExpiryService = new JWTService({
        ...testConfig,
        refreshExpiresIn: '1ms',
      });

      const refreshInput: RefreshTokenInput = {
        sub: sampleUser.sub,
        tokenId: 'test-token-id',
      };

      const token = shortExpiryService.generateRefreshToken(refreshInput);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = shortExpiryService.verifyRefreshToken(token);
      
      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error, 'expired');
      }
    });
  });

  describe('Utility Methods', () => {
    it('should extract user ID from valid token', () => {
      const token = jwtService.generateAccessToken(sampleUser);
      const userId = jwtService.extractUserId(token);
      
      assert.equal(userId, sampleUser.sub);
    });

    it('should return null for malformed token in extractUserId', () => {
      const malformedToken = 'not.a.valid.jwt';
      const userId = jwtService.extractUserId(malformedToken);
      
      assert.equal(userId, null);
    });

    it('should correctly identify expired tokens', async () => {
      const shortExpiryService = new JWTService({
        ...testConfig,
        accessExpiresIn: '1ms',
      });

      const token = shortExpiryService.generateAccessToken(sampleUser);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const isExpired = jwtService.isTokenExpired(token);
      assert.equal(isExpired, true);
    });

    it('should correctly identify non-expired tokens', () => {
      const token = jwtService.generateAccessToken(sampleUser);
      const isExpired = jwtService.isTokenExpired(token);
      
      assert.equal(isExpired, false);
    });

    it('should return true for malformed token in isTokenExpired', () => {
      const malformedToken = 'not.a.valid.jwt';
      const isExpired = jwtService.isTokenExpired(malformedToken);
      
      assert.equal(isExpired, true);
    });
  });

  describe('Factory Function', () => {
    it('should create JWT service instance via factory function', () => {
      const service = createJWTService(testConfig);
      
      assert(service instanceof JWTService);
      
      // Test that it works correctly
      const token = service.generateAccessToken(sampleUser);
      const result = service.verifyAccessToken(token);
      
      assert.equal(result.success, true);
    });
  });

  describe('Security Tests', () => {
    it('should use different secrets for access and refresh tokens', () => {
      const accessToken = jwtService.generateAccessToken(sampleUser);
      
      // Try to verify access token with a service that uses refresh secret as access secret
      // This should fail because the token was signed with the original access secret
      try {
        const wrongSecretService = new JWTService({
          ...testConfig,
          accessSecret: testConfig.refreshSecret,
        });
        
        const result = wrongSecretService.verifyAccessToken(accessToken);
        assert.equal(result.success, false);
      } catch (error) {
        // If constructor throws error about same secrets, that's also valid
        assert(error instanceof Error);
        assert(error.message.includes('different'));
      }
    });

    it('should not leak sensitive information in error messages', () => {
      const malformedToken = 'malformed.token.here';
      const result = jwtService.verifyAccessToken(malformedToken);
      
      assert.equal(result.success, false);
      if (!result.success) {
        // Error message should not contain secrets or sensitive data
        assert(!result.message.includes(testConfig.accessSecret));
        assert(!result.message.includes(testConfig.refreshSecret));
      }
    });

    it('should generate unique token IDs for refresh tokens', () => {
      const token1 = jwtService.generateRefreshToken({
        sub: sampleUser.sub,
        tokenId: '',
      });
      
      const token2 = jwtService.generateRefreshToken({
        sub: sampleUser.sub,
        tokenId: '',
      });

      const decoded1 = jwt.decode(token1) as JWTRefreshPayload;
      const decoded2 = jwt.decode(token2) as JWTRefreshPayload;
      
      assert.notEqual(decoded1.tokenId, decoded2.tokenId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user ID by generating token (JWT allows empty subject)', () => {
      const userWithEmptyId = {
        ...sampleUser,
        sub: '',
      };

      // JWT allows empty subject, so this should not throw
      const token = jwtService.generateAccessToken(userWithEmptyId);
      assert(typeof token === 'string');
      assert(token.length > 0);
      
      const result = jwtService.verifyAccessToken(token);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.payload.sub, '');
      }
    });

    it('should handle special characters in user data', () => {
      const userWithSpecialChars = {
        ...sampleUser,
        email: 'test+special@example.com',
        username: 'user_with-special.chars',
      };

      const token = jwtService.generateAccessToken(userWithSpecialChars);
      const result = jwtService.verifyAccessToken(token);
      
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.payload.email, userWithSpecialChars.email);
        assert.equal(result.payload.username, userWithSpecialChars.username);
      }
    });

    it('should handle all user roles correctly', () => {
      const roles: Array<'CUSTOMER' | 'STORE_OWNER' | 'ADMIN'> = [
        'CUSTOMER',
        'STORE_OWNER',
        'ADMIN',
      ];

      roles.forEach(role => {
        const userWithRole = { ...sampleUser, role };
        const token = jwtService.generateAccessToken(userWithRole);
        const result = jwtService.verifyAccessToken(token);
        
        assert.equal(result.success, true);
        if (result.success) {
          assert.equal(result.payload.role, role);
        }
      });
    });
  });
});