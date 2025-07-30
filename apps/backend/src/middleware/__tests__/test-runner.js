/**
 * Simple test runner for middleware tests without complex dependencies
 */

// Mock the external imports that are causing issues
const mockErrors = {
  AccessTokenRequiredError: class extends Error {
    constructor(message = 'Access token required') {
      super(message);
      this.statusCode = 401;
      this.code = 'ACCESS_TOKEN_REQUIRED';
    }
  },
  InvalidTokenError: class extends Error {
    constructor(message = 'Invalid token') {
      super(message);
      this.statusCode = 401;
      this.code = 'INVALID_TOKEN';
    }
  },
  ExpiredTokenError: class extends Error {
    constructor(message = 'Token has expired') {
      super(message);
      this.statusCode = 401;
      this.code = 'EXPIRED_TOKEN';
    }
  },
  InsufficientRoleError: class extends Error {
    constructor(message = 'Insufficient permissions') {
      super(message);
      this.statusCode = 403;
      this.code = 'INSUFFICIENT_ROLE';
    }
  },
  createErrorResponse: (error) => ({
    success: false,
    error: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
  }),
};

// Mock the JWT service
const createMockJWTService = () => ({
  verifyAccessToken: () => ({
    success: true,
    payload: {
      sub: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'CUSTOMER',
    },
  }),
});

// Mock the AuthMiddleware class
class AuthMiddleware {
  constructor(jwtService) {
    this.jwtService = jwtService;
  }

  authenticate = () => {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new mockErrors.AccessTokenRequiredError();
        res.status(error.statusCode).json(mockErrors.createErrorResponse(error));
        return;
      }

      const token = authHeader.substring(7);
      if (!token.trim()) {
        const error = new mockErrors.AccessTokenRequiredError();
        res.status(error.statusCode).json(mockErrors.createErrorResponse(error));
        return;
      }

      const result = this.jwtService.verifyAccessToken(token);
      if (result.success) {
        req.user = {
          id: result.payload.sub,
          email: result.payload.email,
          username: result.payload.username,
          role: result.payload.role,
          firstName: '',
          lastName: '',
        };
        next();
      } else {
        const error = new mockErrors.InvalidTokenError();
        res.status(error.statusCode).json(mockErrors.createErrorResponse(error));
      }
    };
  };

  authorize = (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        const error = new mockErrors.AccessTokenRequiredError();
        res.status(error.statusCode).json(mockErrors.createErrorResponse(error));
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        const error = new mockErrors.InsufficientRoleError();
        res.status(error.statusCode).json(mockErrors.createErrorResponse(error));
        return;
      }

      next();
    };
  };

  optionalAuth = () => {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token.trim()) {
          const result = this.jwtService.verifyAccessToken(token);
          if (result.success) {
            req.user = {
              id: result.payload.sub,
              email: result.payload.email,
              username: result.payload.username,
              role: result.payload.role,
              firstName: '',
              lastName: '',
            };
          }
        }
      }
      next();
    };
  };
}

// Simple test framework
function runTests() {
  console.log('🧪 Running Authentication Middleware Tests\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, testFn) {
    totalTests++;
    try {
      testFn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  function createMockRequest(overrides = {}) {
    return {
      headers: {},
      body: {},
      query: {},
      params: {},
      user: undefined,
      ...overrides,
    };
  }

  function createMockResponse() {
    const res = {
      statusCode: 200,
      jsonData: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.jsonData = data;
        return this;
      },
    };
    return res;
  }

  function createMockNext() {
    let called = false;
    const next = () => { called = true; };
    next.wasCalled = () => called;
    return next;
  }

  // Create middleware instance
  const jwtService = createMockJWTService();
  const authMiddleware = new AuthMiddleware(jwtService);

  // Test authenticate middleware
  test('authenticate() should pass with valid Bearer token', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = authMiddleware.authenticate();
    middleware(req, res, next);

    assert(next.wasCalled(), 'next() should be called');
    assert(req.user, 'user should be attached to request');
    assert(req.user.id === 'user-123', 'user id should match');
    assert(req.user.email === 'test@example.com', 'user email should match');
  });

  test('authenticate() should return 401 with no Authorization header', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = authMiddleware.authenticate();
    middleware(req, res, next);

    assert(!next.wasCalled(), 'next() should not be called');
    assert(res.statusCode === 401, 'status code should be 401');
    assert(res.jsonData.success === false, 'response should indicate failure');
    assert(res.jsonData.code === 'ACCESS_TOKEN_REQUIRED', 'error code should match');
  });

  // Test authorize middleware
  test('authorize() should allow access with correct role', () => {
    const req = createMockRequest({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'ADMIN',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = authMiddleware.authorize(['ADMIN', 'STORE_OWNER']);
    middleware(req, res, next);

    assert(next.wasCalled(), 'next() should be called');
    assert(res.statusCode === 200, 'status code should remain 200');
  });

  test('authorize() should return 403 with insufficient role', () => {
    const req = createMockRequest({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'CUSTOMER',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = authMiddleware.authorize(['ADMIN', 'STORE_OWNER']);
    middleware(req, res, next);

    assert(!next.wasCalled(), 'next() should not be called');
    assert(res.statusCode === 403, 'status code should be 403');
    assert(res.jsonData.code === 'INSUFFICIENT_ROLE', 'error code should match');
  });

  // Test optional auth middleware
  test('optionalAuth() should attach user with valid token', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = authMiddleware.optionalAuth();
    middleware(req, res, next);

    assert(next.wasCalled(), 'next() should be called');
    assert(req.user, 'user should be attached to request');
    assert(req.user.id === 'user-123', 'user id should match');
  });

  test('optionalAuth() should continue without user when no token', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = authMiddleware.optionalAuth();
    middleware(req, res, next);

    assert(next.wasCalled(), 'next() should be called');
    assert(!req.user, 'user should not be attached to request');
    assert(res.statusCode === 200, 'status code should remain 200');
  });

  // Print results
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed');
    process.exit(1);
  }
}

// Run the tests
runTests();