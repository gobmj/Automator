import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation middleware
 */

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
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

/**
 * Validate order creation
 */
export const validateCreateOrder = [
  body('orderNumber')
    .trim()
    .notEmpty()
    .withMessage('Order number is required')
    .isLength({ max: 50 })
    .withMessage('Order number must not exceed 50 characters'),
  
  body('material')
    .trim()
    .notEmpty()
    .withMessage('Material is required')
    .isLength({ max: 100 })
    .withMessage('Material must not exceed 100 characters'),
  
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('priority')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Priority must be between 1 and 1000'),
  
  body('status')
    .optional()
    .isIn(['CREATED', 'RELEASABLE', 'RELEASED', 'IN_PROGRESS', 'COMPLETED'])
    .withMessage('Invalid status value'),
  
  body('plant')
    .trim()
    .notEmpty()
    .withMessage('Plant is required')
    .isLength({ max: 50 })
    .withMessage('Plant must not exceed 50 characters'),
  
  body('scheduledStartDate')
    .notEmpty()
    .withMessage('Scheduled start date is required')
    .isISO8601()
    .withMessage('Scheduled start date must be a valid ISO 8601 date'),
  
  body('scheduledCompletionDate')
    .notEmpty()
    .withMessage('Scheduled completion date is required')
    .isISO8601()
    .withMessage('Scheduled completion date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.scheduledStartDate)) {
        throw new Error('Scheduled completion date must be after start date');
      }
      return true;
    }),
  
  handleValidationErrors,
];

/**
 * Validate order update
 */
export const validateUpdateOrder = [
  param('orderId')
    .trim()
    .notEmpty()
    .withMessage('Order ID is required'),
  
  body('orderNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Order number cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Order number must not exceed 50 characters'),
  
  body('material')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Material cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Material must not exceed 100 characters'),
  
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('priority')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Priority must be between 1 and 1000'),
  
  body('status')
    .optional()
    .isIn(['CREATED', 'RELEASABLE', 'RELEASED', 'IN_PROGRESS', 'COMPLETED'])
    .withMessage('Invalid status value'),
  
  body('plant')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Plant cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Plant must not exceed 50 characters'),
  
  body('scheduledStartDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled start date must be a valid ISO 8601 date'),
  
  body('scheduledCompletionDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled completion date must be a valid ISO 8601 date'),
  
  handleValidationErrors,
];

/**
 * Validate order ID parameter
 */
export const validateOrderId = [
  param('orderId')
    .trim()
    .notEmpty()
    .withMessage('Order ID is required'),
  
  handleValidationErrors,
];

/**
 * Validate status parameter
 */
export const validateStatus = [
  param('status')
    .isIn(['CREATED', 'RELEASABLE', 'RELEASED', 'IN_PROGRESS', 'COMPLETED'])
    .withMessage('Invalid status value'),
  
  handleValidationErrors,
];

/**
 * Validate query parameters for listing orders
 */
export const validateListOrders = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['CREATED', 'RELEASABLE', 'RELEASED', 'IN_PROGRESS', 'COMPLETED'])
    .withMessage('Invalid status value'),
  
  query('sortBy')
    .optional()
    .isIn(['createdDate', 'scheduledStartDate', 'scheduledCompletionDate', 'priority', 'quantity'])
    .withMessage('Invalid sortBy field'),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC'),
  
  handleValidationErrors,
];