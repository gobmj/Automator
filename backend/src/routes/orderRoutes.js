import express from 'express';
import * as orderController from '../controllers/orderController.js';
import {
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderId,
  validateStatus,
  validateListOrders,
} from '../middleware/validator.js';

const router = express.Router();

/**
 * Order Routes
 */

// Get statistics (must be before /:orderId to avoid conflict)
router.get('/statistics', orderController.getOrderStatistics);

// Bulk update order statuses (must be before /:orderId to avoid conflict)
router.put('/bulk/status', orderController.bulkUpdateStatus);

// Search orders (must be before /:orderId to avoid conflict)
router.get('/search', orderController.searchOrders);

// Get orders by status
router.get('/status/:status', validateStatus, orderController.getOrdersByStatus);

// Create new order
router.post('/', validateCreateOrder, orderController.createOrder);

// Get all orders with pagination and filtering
router.get('/', validateListOrders, orderController.getAllOrders);

// Get order by ID
router.get('/:orderId', validateOrderId, orderController.getOrderById);

// Update order
router.put('/:orderId', validateUpdateOrder, orderController.updateOrder);

// Delete order
router.delete('/:orderId', validateOrderId, orderController.deleteOrder);

// Release order
router.post('/:orderId/release', validateOrderId, orderController.releaseOrder);

export default router;