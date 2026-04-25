import Order from '../models/Order.js';
import { generateOrderId } from '../utils/idGenerator.js';
import { Op } from 'sequelize';

/**
 * Order Service
 * Handles business logic for order management
 * Testing with OpenAI-compatible SAP AI Core wrapper
 */

/**
 * Create a new order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Created order
 */
export const createOrder = async (orderData) => {
  // Generate unique order ID
  const orderId = generateOrderId();
  
  // Create order with generated ID
  const order = await Order.create({
    orderId,
    ...orderData,
  });
  
  return order;
};

/**
 * Get all orders with pagination and filtering
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders with pagination info
 */
export const getAllOrders = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    status,
    plant,
    sortBy = 'createdDate',
    sortOrder = 'DESC',
  } = options;

  const offset = (page - 1) * limit;
  
  // Build where clause
  const where = {};
  if (status) where.status = status;
  if (plant) where.plant = plant;

  const { count, rows } = await Order.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortBy, sortOrder]],
  });

  return {
    orders: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
    },
  };
};

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order
 */
export const getOrderById = async (orderId) => {
  const order = await Order.findOne({
    where: { orderId },
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  return order;
};

/**
 * Update order
 * @param {string} orderId - Order ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated order
 */
export const updateOrder = async (orderId, updateData) => {
  const order = await getOrderById(orderId);
  
  // Prevent updating orderId
  delete updateData.orderId;
  
  await order.update(updateData);
  return order;
};

/**
 * Delete order
 * @param {string} orderId - Order ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteOrder = async (orderId) => {
  const order = await getOrderById(orderId);
  await order.destroy();
  return true;
};

/**
 * Release order (change status to RELEASED)
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Updated order
 */
export const releaseOrder = async (orderId) => {
  const order = await getOrderById(orderId);
  
  // Validate status transition
  if (order.status !== 'RELEASABLE') {
    throw new Error(`Cannot release order with status ${order.status}. Order must be RELEASABLE.`);
  }
  
  await order.update({ status: 'RELEASED' });
  return order;
};

/**
 * Get orders by status
 * @param {string} status - Order status
 * @returns {Promise<Array>} Orders
 */
export const getOrdersByStatus = async (status) => {
  const orders = await Order.findAll({
    where: { status },
    order: [['createdDate', 'DESC']],
  });
  
  return orders;
};

/**
 * Search orders
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Orders
 */
export const searchOrders = async (searchTerm) => {
  const orders = await Order.findAll({
    where: {
      [Op.or]: [
        { orderId: { [Op.iLike]: `%${searchTerm}%` } },
        { orderNumber: { [Op.iLike]: `%${searchTerm}%` } },
        { material: { [Op.iLike]: `%${searchTerm}%` } },
      ],
    },
    order: [['createdDate', 'DESC']],
  });
  
  return orders;
};// Trigger test generation - Fri Apr 24 17:32:35 IST 2026
