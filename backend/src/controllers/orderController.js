import * as orderService from '../services/orderService.js';

/**
 * Order Controller
 * Handles HTTP requests for order operations
 */

/**
 * Create a new order
 * POST /api/orders
 */
export const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all orders with pagination and filtering
 * GET /api/orders
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      plant: req.query.plant,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };
    
    const result = await orderService.getAllOrders(options);
    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 * GET /api/orders/:orderId
 */
export const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId);
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * Update order
 * PUT /api/orders/:orderId
 */
export const updateOrder = async (req, res, next) => {
  try {
    const order = await orderService.updateOrder(req.params.orderId, req.body);
    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * Delete order
 * DELETE /api/orders/:orderId
 */
export const deleteOrder = async (req, res, next) => {
  try {
    await orderService.deleteOrder(req.params.orderId);
    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * Release order
 * POST /api/orders/:orderId/release
 */
export const releaseOrder = async (req, res, next) => {
  try {
    const order = await orderService.releaseOrder(req.params.orderId);
    res.status(200).json({
      success: true,
      message: 'Order released successfully',
      data: order,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    if (error.message.includes('Cannot release order')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * Get orders by status
 * GET /api/orders/status/:status
 */
export const getOrdersByStatus = async (req, res, next) => {
  try {
    const orders = await orderService.getOrdersByStatus(req.params.status);
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search orders
 * GET /api/orders/search?q=searchTerm
 */
export const searchOrders = async (req, res, next) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Search term is required',
      });
    }
    
    const orders = await orderService.searchOrders(searchTerm);
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order statistics
 * GET /api/orders/statistics
 */
export const getOrderStatistics = async (req, res, next) => {
  try {
    const statistics = await orderService.getOrderStatistics();
    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    next(error);
  }
};
