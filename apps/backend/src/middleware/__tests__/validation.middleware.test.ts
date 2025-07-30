/**
 * Unit tests for validation middleware
 * 
 * Tests all validation middleware functionality including:
 * - Request body validation with Zod schemas
 * - Query parameter validation and type coercion
 * - URL parameter validation
 * - Request header validation
 * - Comprehensive request validation
 * - Error handling and response formats
 * - Request sanitization
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  validateParams,
  validateHeaders,
  validateRequest,
  sanitizeRequest,
} from '../validation.middleware.js';

/**
 * Mock Express request object
 */
function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as Request;
}

/**
 * Mock Express response object with spy functions
 */
function createMockResponse(): Response & {
  statusCode: number;
  jsonData: any;
  status: ReturnType<typeof mock.fn>;
  json: ReturnType<typeof mock.fn>;
} {
  const res = {
    statusCode: 200,
    jsonData: null,
    status: mock.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: mock.fn((data: any) => {
      res.jsonData = data;
      return res;
    }),
  };
  return res as any;
}

/**
 * Mock Express next function
 */
function createMockNext(): NextFunction & ReturnType<typeof mock.fn> {
  return mock.fn();
}

/**
 * Sample schemas for testing
 */
const sampleBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.number().int().min(18, 'Must be at least 18 years old'),
  isActive: z.boolean().default(true),
});

const sampleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.enum(['food', 'drinks', 'desserts']).optional(),
});

const sampleParamsSchema = z.object({
  id: z.string().cuid(),
  storeId: z.string().cuid().optional(),
});

const sampleHeaderSchema = z.object({
  'content-type': z.literal('application/json'),
  'x-api-key': z.string().min(1),
});

describe('validateBody middleware', () => {
  it('should pass validation with valid request body', () => {
    // Arrange
    const validBody = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      isActive: true,
    };
    const req = createMockRequest({ body: validBody });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateBody(sampleBodySchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(res.status.mock.calls.length, 0);
    assert.deepEqual(req.body, validBody);
  });

  it('should apply default values during validation', () => {
    // Arrange
    const bodyWithoutDefaults = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      // isActive not provided - should default to true
    };
    const req = createMockRequest({ body: bodyWithoutDefaults });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateBody(sampleBodySchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(req.body.isActive, true);
  });

  it('should return 400 with validation errors for invalid body', () => {
    // Arrange
    const invalidBody = {
      name: '', // Invalid: empty string
      email: 'invalid-email', // Invalid: not an email
      age: 15, // Invalid: less than 18
      isActive: true,
    };
    const req = createMockRequest({ body: invalidBody });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateBody(sampleBodySchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.code, 'VALIDATION_ERROR');
    assert.equal(res.jsonData.error, 'Request body validation failed');
    assert(Array.isArray(res.jsonData.details));
    assert(res.jsonData.details.length > 0);
    assert.equal(next.mock.calls.length, 0);

    // Check specific validation errors
    const nameError = res.jsonData.details.find((err: any) => err.field === 'name');
    const emailError = res.jsonData.details.find((err: any) => err.field === 'email');
    const ageError = res.jsonData.details.find((err: any) => err.field === 'age');

    assert(nameError && nameError.message === 'Name is required');
    assert(emailError && emailError.message === 'Invalid email format');
    assert(ageError && ageError.message === 'Must be at least 18 years old');
  });

  it('should return 400 for missing required fields', () => {
    // Arrange
    const incompleteBody = {
      name: 'John Doe',
      // email missing
      // age missing
    };
    const req = createMockRequest({ body: incompleteBody });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateBody(sampleBodySchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert(res.jsonData.details.length > 0);
    assert.equal(next.mock.calls.length, 0);
  });

  it('should handle malformed JSON gracefully', () => {
    // Arrange
    const req = createMockRequest({ body: null });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateBody(sampleBodySchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(next.mock.calls.length, 0);
  });

  it('should handle unexpected errors during validation', () => {
    // Arrange
    const req = createMockRequest({ body: { name: 'test' } });
    const res = createMockResponse();
    const next = createMockNext();

    // Create a schema that throws during parsing
    const errorSchema = z.object({
      name: z.string().refine(() => {
        throw new Error('Unexpected error');
      }),
    });

    const middleware = validateBody(errorSchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.error, 'Invalid request body format');
    assert.equal(next.mock.calls.length, 0);
  });
});

describe('validateQuery middleware', () => {
  it('should pass validation with valid query parameters', () => {
    // Arrange
    const validQuery = {
      page: '2',
      limit: '50',
      search: 'pizza',
      category: 'food',
    };
    const req = createMockRequest({ query: validQuery });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateQuery(sampleQuerySchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(res.status.mock.calls.length, 0);
    
    // Check type coercion worked
    assert.equal(req.query.page, 2);
    assert.equal(req.query.limit, 50);
    assert.equal(req.query.search, 'pizza');
    assert.equal(req.query.category, 'food');
  });

  it('should apply default values for missing query parameters', () => {
    // Arrange
    const minimalQuery = {
      search: 'test',
    };
    const req = createMockRequest({ query: minimalQuery });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateQuery(sampleQuerySchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(req.query.page, 1); // Default value
    assert.equal(req.query.limit, 20); // Default value
    assert.equal(req.query.search, 'test');
  });

  it('should return 400 for invalid query parameters', () => {
    // Arrange
    const invalidQuery = {
      page: 'invalid', // Invalid: not a number
      limit: '150', // Invalid: exceeds max
      category: 'invalid-category', // Invalid: not in enum
    };
    const req = createMockRequest({ query: invalidQuery });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateQuery(sampleQuerySchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.code, 'VALIDATION_ERROR');
    assert.equal(res.jsonData.error, 'Query parameters validation failed');
    assert(Array.isArray(res.jsonData.details));
    assert(res.jsonData.details.length > 0);
    assert.equal(next.mock.calls.length, 0);
  });

  it('should pass validation with empty query object', () => {
    // Arrange
    const req = createMockRequest({ query: {} });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateQuery(sampleQuerySchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(req.query.page, 1); // Default value
    assert.equal(req.query.limit, 20); // Default value
  });
});

describe('validateParams middleware', () => {
  it('should pass validation with valid URL parameters', () => {
    // Arrange
    const validParams = {
      id: 'clp123456789',
      storeId: 'cls987654321',
    };
    const req = createMockRequest({ params: validParams });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateParams(sampleParamsSchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(res.status.mock.calls.length, 0);
    assert.deepEqual(req.params, validParams);
  });

  it('should return 400 for invalid URL parameters', () => {
    // Arrange
    const invalidParams = {
      id: 'invalid-id', // Invalid: not a cuid
      storeId: 'also-invalid', // Invalid: not a cuid
    };
    const req = createMockRequest({ params: invalidParams });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateParams(sampleParamsSchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.code, 'VALIDATION_ERROR');
    assert.equal(res.jsonData.error, 'URL parameters validation failed');
    assert(Array.isArray(res.jsonData.details));
    assert.equal(next.mock.calls.length, 0);
  });
});

describe('validateHeaders middleware', () => {
  it('should pass validation with valid headers', () => {
    // Arrange
    const validHeaders = {
      'content-type': 'application/json',
      'x-api-key': 'secret-key-123',
    };
    const req = createMockRequest({ headers: validHeaders });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateHeaders(sampleHeaderSchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(res.status.mock.calls.length, 0);
  });

  it('should return 400 for invalid headers', () => {
    // Arrange
    const invalidHeaders = {
      'content-type': 'text/plain', // Invalid: must be application/json
      'x-api-key': '', // Invalid: empty string
    };
    const req = createMockRequest({ headers: invalidHeaders });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateHeaders(sampleHeaderSchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.code, 'VALIDATION_ERROR');
    assert.equal(res.jsonData.error, 'Request headers validation failed');
    assert.equal(next.mock.calls.length, 0);
  });

  it('should return 400 for missing required headers', () => {
    // Arrange
    const incompleteHeaders = {
      'content-type': 'application/json',
      // x-api-key missing
    };
    const req = createMockRequest({ headers: incompleteHeaders });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateHeaders(sampleHeaderSchema);

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(next.mock.calls.length, 0);
  });
});

describe('validateRequest middleware', () => {
  it('should pass validation when all request parts are valid', () => {
    // Arrange
    const req = createMockRequest({
      body: { name: 'John', email: 'john@example.com', age: 25 },
      query: { page: '1', limit: '10' },
      params: { id: 'clp123456789' },
      headers: { 'content-type': 'application/json', 'x-api-key': 'key123' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateRequest({
      body: sampleBodySchema,
      query: sampleQuerySchema,
      params: sampleParamsSchema,
      headers: sampleHeaderSchema,
    });

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(res.status.mock.calls.length, 0);
  });

  it('should validate only specified request parts', () => {
    // Arrange
    const req = createMockRequest({
      body: { name: 'John', email: 'john@example.com', age: 25 },
      query: { invalid: 'data' }, // Invalid but not validated
      params: { invalid: 'param' }, // Invalid but not validated
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateRequest({
      body: sampleBodySchema,
      // query and params not specified - should not be validated
    });

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(res.status.mock.calls.length, 0);
  });

  it('should return 400 with combined errors from multiple parts', () => {
    // Arrange
    const req = createMockRequest({
      body: { name: '', email: 'invalid' }, // Invalid body
      query: { page: 'invalid' }, // Invalid query
      params: { id: 'invalid' }, // Invalid params
    });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateRequest({
      body: sampleBodySchema,
      query: sampleQuerySchema,
      params: sampleParamsSchema,
    });

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.code, 'VALIDATION_ERROR');
    assert.equal(res.jsonData.error, 'Request validation failed');
    assert(Array.isArray(res.jsonData.details));
    assert(res.jsonData.details.length > 0);
    assert.equal(next.mock.calls.length, 0);

    // Check that errors from different sections are included
    const sections = res.jsonData.details.map((err: any) => err.section);
    assert(sections.includes('body'));
    assert(sections.includes('query'));
    assert(sections.includes('params'));
  });

  it('should handle unexpected errors during comprehensive validation', () => {
    // Arrange
    const req = createMockRequest({
      body: { name: 'test' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    // Create a schema that throws during parsing
    const errorSchema = z.object({
      name: z.string().refine(() => {
        throw new Error('Unexpected error');
      }),
    });

    const middleware = validateRequest({
      body: errorSchema,
    });

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.error, 'Request validation failed');
    assert.equal(next.mock.calls.length, 0);
  });
});

describe('sanitizeRequest middleware', () => {
  it('should sanitize string values in request body', () => {
    // Arrange
    const dirtyBody = {
      name: '  John Doe  ', // Leading/trailing whitespace
      description: 'Test\0description', // Null byte
      nested: {
        value: '  nested\0value  ',
      },
    };
    const req = createMockRequest({ body: dirtyBody });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = sanitizeRequest();

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(res.status.mock.calls.length, 0);
    assert.equal(req.body.name, 'John Doe');
    assert.equal(req.body.description, 'Testdescription');
    assert.equal(req.body.nested.value, 'nestedvalue');
  });

  it('should sanitize string values in query parameters', () => {
    // Arrange
    const dirtyQuery = {
      search: '  pizza\0search  ',
      category: 'food\0category',
    };
    const req = createMockRequest({ query: dirtyQuery });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = sanitizeRequest();

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(req.query.search, 'pizzasearch');
    assert.equal(req.query.category, 'foodcategory');
  });

  it('should handle arrays in request data', () => {
    // Arrange
    const bodyWithArray = {
      tags: ['  tag1  ', 'tag2\0test', '  tag3\0  '],
      metadata: {
        categories: ['  cat1  ', 'cat2\0'],
      },
    };
    const req = createMockRequest({ body: bodyWithArray });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = sanitizeRequest();

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.deepEqual(req.body.tags, ['tag1', 'tag2test', 'tag3']);
    assert.deepEqual(req.body.metadata.categories, ['cat1', 'cat2']);
  });

  it('should preserve non-string values', () => {
    // Arrange
    const mixedBody = {
      name: '  John  ',
      age: 25,
      isActive: true,
      score: 95.5,
      tags: null,
      metadata: undefined,
    };
    const req = createMockRequest({ body: mixedBody });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = sanitizeRequest();

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(req.body.name, 'John');
    assert.equal(req.body.age, 25);
    assert.equal(req.body.isActive, true);
    assert.equal(req.body.score, 95.5);
    assert.equal(req.body.tags, null);
    assert.equal(req.body.metadata, undefined);
  });

  it('should continue on sanitization errors', () => {
    // Arrange
    const problematicBody = {
      get name() {
        throw new Error('Property access error');
      },
    };
    const req = createMockRequest({ body: problematicBody });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = sanitizeRequest();

    // Act
    middleware(req, res, next);

    // Assert - Should continue even if sanitization fails
    assert.equal(next.mock.calls.length, 1);
    assert.equal(res.status.mock.calls.length, 0);
  });

  it('should handle null and undefined request body/query', () => {
    // Arrange
    const req = createMockRequest({ body: null, query: undefined });
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = sanitizeRequest();

    // Act
    middleware(req, res, next);

    // Assert
    assert.equal(next.mock.calls.length, 1);
    assert.equal(res.status.mock.calls.length, 0);
  });
});