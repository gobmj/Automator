import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Order Service
export const orderService = {
  // Get all orders with pagination and filters
  getAllOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  // Get order by ID
  getOrderById: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  // Create new order
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  // Update order
  updateOrder: async (orderId, orderData) => {
    const response = await api.put(`/orders/${orderId}`, orderData);
    return response.data;
  },

  // Delete order
  deleteOrder: async (orderId) => {
    const response = await api.delete(`/orders/${orderId}`);
    return response.data;
  },

  // Release order
  releaseOrder: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/release`);
    return response.data;
  },

  // Get orders by status
  getOrdersByStatus: async (status) => {
    const response = await api.get(`/orders/status/${status}`);
    return response.data;
  },

  // Search orders
  searchOrders: async (searchTerm) => {
    const response = await api.get('/orders/search', {
      params: { q: searchTerm },
    });
    return response.data;
  },
};

export default orderService;