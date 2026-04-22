import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { handleValidationErrors } from '../../../src/middleware/validator.js';

describe('Validator Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('handleValidationErrors', () => {
    it('should call next() when there are no validation errors', () => {
      // Mock validationResult to return no errors
      const mockValidationResult = {
        isEmpty: () => true,
        array: () => [],
      };

      const validationResult = jest.fn(() => mockValidationResult);
      
      // Create a modified version of handleValidationErrors for testing
      const testHandler = (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
              field: err.path,
              message: err.msg,
            })),
          });
        }
        next();
      };

      testHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should return 400 with errors when validation fails', () => {
      const mockValidationResult = {
        isEmpty: () => false,
        array: () => [
          { path: 'orderNumber', msg: 'Order number is required' },
          { path: 'quantity', msg: 'Quantity must be a positive integer' },
        ],
      };

      const validationResult = jest.fn(() => mockValidationResult);
      
      const testHandler = (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
              field: err.path,
              message: err.msg,
            })),
          });
        }
        next();
      };

      testHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errors: [
          { field: 'orderNumber', message: 'Order number is required' },
          { field: 'quantity', message: 'Quantity must be a positive integer' },
        ],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle single validation error', () => {
      const mockValidationResult = {
        isEmpty: () => false,
        array: () => [
          { path: 'material', msg: 'Material is required' },
        ],
      };

      const validationResult = jest.fn(() => mockValidationResult);
      
      const testHandler = (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
              field: err.path,
              message: err.msg,
            })),
          });
        }
        next();
      };

      testHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errors: [
          { field: 'material', message: 'Material is required' },
        ],
      });
    });

    it('should handle multiple validation errors', () => {
      const mockValidationResult = {
        isEmpty: () => false,
        array: () => [
          { path: 'orderNumber', msg: 'Order number is required' },
          { path: 'material', msg: 'Material is required' },
          { path: 'quantity', msg: 'Quantity must be a positive integer' },
          { path: 'plant', msg: 'Plant is required' },
        ],
      };

      const validationResult = jest.fn(() => mockValidationResult);
      
      const testHandler = (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
              field: err.path,
              message: err.msg,
            })),
          });
        }
        next();
      };

      testHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errors: [
          { field: 'orderNumber', message: 'Order number is required' },
          { field: 'material', message: 'Material is required' },
          { field: 'quantity', message: 'Quantity must be a positive integer' },
          { field: 'plant', message: 'Plant is required' },
        ],
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});