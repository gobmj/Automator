import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ApiError, errorHandler, notFoundHandler } from '../../../src/middleware/errorHandler.js';

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      originalUrl: '/api/test',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    console.error = jest.fn(); // Mock console.error
  });

  describe('ApiError', () => {
    it('should create an ApiError with statusCode and message', () => {
      const error = new ApiError(404, 'Not Found');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not Found');
      expect(error.name).toBe('ApiError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('errorHandler', () => {
    it('should handle SequelizeValidationError', () => {
      const err = {
        name: 'SequelizeValidationError',
        errors: [
          { path: 'email', message: 'Email is required' },
          { path: 'name', message: 'Name is required' },
        ],
      };

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error',
        details: [
          { field: 'email', message: 'Email is required' },
          { field: 'name', message: 'Name is required' },
        ],
      });
    });

    it('should handle SequelizeUniqueConstraintError', () => {
      const err = {
        name: 'SequelizeUniqueConstraintError',
        errors: [
          { path: 'email', message: 'Email must be unique' },
        ],
      };

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Duplicate Entry',
        message: 'A record with this value already exists',
        details: [
          { field: 'email', message: 'Email must be unique' },
        ],
      });
    });

    it('should handle SequelizeDatabaseError', () => {
      const err = {
        name: 'SequelizeDatabaseError',
        message: 'Database connection failed',
      };

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database Error',
        message: 'An error occurred while processing your request',
      });
    });

    it('should handle ApiError', () => {
      const err = new ApiError(403, 'Forbidden');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
      });
    });

    it('should handle generic errors with statusCode', () => {
      const err = {
        statusCode: 400,
        message: 'Bad Request',
      };

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Bad Request',
      });
    });

    it('should handle generic errors without statusCode', () => {
      const err = new Error('Something went wrong');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Something went wrong',
      });
    });

    it('should use default message for errors without message', () => {
      const err = {};

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
      });
    });

    it('should log errors to console', () => {
      const err = new Error('Test error');

      errorHandler(err, req, res, next);

      expect(console.error).toHaveBeenCalledWith('Error:', err);
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with route information', () => {
      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Route not found',
        path: '/api/test',
      });
    });
  });
});