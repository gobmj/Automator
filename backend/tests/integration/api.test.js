import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import sequelize from '../../src/config/database.js';

describe('Order Management API Integration Tests', () => {
  let createdOrderId;

  beforeAll(async () => {
    // Sync database with force to drop and recreate tables
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up orders before each test
    await sequelize.models.Order.destroy({ where: {}, truncate: true });
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const orderData = {
        orderNumber: 'TEST-001',
        material: 'FORKLIFT-FRAME',
        quantity: 5,
        priority: 500,
        status: 'CREATED',
        plant: 'DT6364',
        scheduledStartDate: '2026-04-09T00:00:00Z',
        scheduledCompletionDate: '2026-04-15T00:00:00Z',
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderId');
      expect(response.body.data.orderNumber).toBe('TEST-001');
      expect(response.body.data.material).toBe('FORKLIFT-FRAME');
      expect(response.body.data.quantity).toBe(5);

      createdOrderId = response.body.data.orderId;
    });

    it('should return 400 for invalid order data', async () => {
      const invalidData = {
        orderNumber: '',
        material: 'FORKLIFT-FRAME',
      };

      const response = await request(app)
        .post('/api/orders')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      // Create test orders
      await request(app)
        .post('/api/orders')
        .send({
          orderNumber: 'TEST-001',
          material: 'FORKLIFT-FRAME',
          quantity: 5,
          priority: 500,
          status: 'CREATED',
          plant: 'DT6364',
          scheduledStartDate: '2026-04-09T00:00:00Z',
          scheduledCompletionDate: '2026-04-15T00:00:00Z',
        });

      await request(app)
        .post('/api/orders')
        .send({
          orderNumber: 'TEST-002',
          material: 'BIKE',
          quantity: 3,
          priority: 600,
          status: 'RELEASABLE',
          plant: 'DT6364',
          scheduledStartDate: '2026-04-10T00:00:00Z',
          scheduledCompletionDate: '2026-04-16T00:00:00Z',
        });
    });

    it('should get all orders with pagination', async () => {
      const response = await request(app)
        .get('/api/orders')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders')
        .query({ status: 'RELEASABLE' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.every(order => order.status === 'RELEASABLE')).toBe(true);
    });
  });

  describe('GET /api/orders/:orderId', () => {
    let testOrderId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          orderNumber: 'TEST-003',
          material: 'CAR',
          quantity: 2,
          priority: 500,
          status: 'CREATED',
          plant: 'DT6364',
          scheduledStartDate: '2026-04-09T00:00:00Z',
          scheduledCompletionDate: '2026-04-15T00:00:00Z',
        });

      testOrderId = response.body.data.orderId;
    });

    it('should get order by ID', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe(testOrderId);
      expect(response.body.data.orderNumber).toBe('TEST-003');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/INVALID-ID')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });
  });

  describe('PUT /api/orders/:orderId', () => {
    let testOrderId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          orderNumber: 'TEST-004',
          material: 'BIKE',
          quantity: 3,
          priority: 500,
          status: 'CREATED',
          plant: 'DT6364',
          scheduledStartDate: '2026-04-09T00:00:00Z',
          scheduledCompletionDate: '2026-04-15T00:00:00Z',
        });

      testOrderId = response.body.data.orderId;
    });

    it('should update order', async () => {
      const updateData = {
        quantity: 10,
        priority: 700,
      };

      const response = await request(app)
        .put(`/api/orders/${testOrderId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(10);
      expect(response.body.data.priority).toBe(700);
    });

    it('should not allow updating orderId', async () => {
      const updateData = {
        orderId: 'NEW-ID',
        quantity: 10,
      };

      const response = await request(app)
        .put(`/api/orders/${testOrderId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.orderId).toBe(testOrderId);
      expect(response.body.data.orderId).not.toBe('NEW-ID');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .put('/api/orders/INVALID-ID')
        .send({ quantity: 10 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/orders/:orderId', () => {
    let testOrderId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          orderNumber: 'TEST-005',
          material: 'TRUCK',
          quantity: 1,
          priority: 500,
          status: 'CREATED',
          plant: 'DT6364',
          scheduledStartDate: '2026-04-09T00:00:00Z',
          scheduledCompletionDate: '2026-04-15T00:00:00Z',
        });

      testOrderId = response.body.data.orderId;
    });

    it('should delete order', async () => {
      const response = await request(app)
        .delete(`/api/orders/${testOrderId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order deleted successfully');

      // Verify order is deleted
      await request(app)
        .get(`/api/orders/${testOrderId}`)
        .expect(404);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .delete('/api/orders/INVALID-ID')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/orders/:orderId/release', () => {
    let testOrderId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          orderNumber: 'TEST-006',
          material: 'FORKLIFT-FRAME',
          quantity: 5,
          priority: 500,
          status: 'RELEASABLE',
          plant: 'DT6364',
          scheduledStartDate: '2026-04-09T00:00:00Z',
          scheduledCompletionDate: '2026-04-15T00:00:00Z',
        });

      testOrderId = response.body.data.orderId;
    });

    it('should release order when status is RELEASABLE', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrderId}/release`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('RELEASED');
    });

    it('should return 400 when order status is not RELEASABLE', async () => {
      // Create order with CREATED status
      const createResponse = await request(app)
        .post('/api/orders')
        .send({
          orderNumber: 'TEST-007',
          material: 'BIKE',
          quantity: 3,
          priority: 500,
          status: 'CREATED',
          plant: 'DT6364',
          scheduledStartDate: '2026-04-09T00:00:00Z',
          scheduledCompletionDate: '2026-04-15T00:00:00Z',
        });

      const orderId = createResponse.body.data.orderId;

      const response = await request(app)
        .post(`/api/orders/${orderId}/release`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot release order');
    });
  });

  describe('GET /api/orders/status/:status', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/orders')
        .send({
          orderNumber: 'TEST-008',
          material: 'FORKLIFT-FRAME',
          quantity: 5,
          priority: 500,
          status: 'RELEASED',
          plant: 'DT6364',
          scheduledStartDate: '2026-04-09T00:00:00Z',
          scheduledCompletionDate: '2026-04-15T00:00:00Z',
        });

      await request(app)
        .post('/api/orders')
        .send({
          orderNumber: 'TEST-009',
          material: 'BIKE',
          quantity: 3,
          priority: 500,
          status: 'RELEASED',
          plant: 'DT6364',
          scheduledStartDate: '2026-04-10T00:00:00Z',
          scheduledCompletionDate: '2026-04-16T00:00:00Z',
        });
    });

    it('should get orders by status', async () => {
      const response = await request(app)
        .get('/api/orders/status/RELEASED')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.every(order => order.status === 'RELEASED')).toBe(true);
    });
  });

  describe('GET /api/orders/search', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/orders')
        .send({
          orderNumber: 'SEARCH-001',
          material: 'FORKLIFT-FRAME',
          quantity: 5,
          priority: 500,
          status: 'CREATED',
          plant: 'DT6364',
          scheduledStartDate: '2026-04-09T00:00:00Z',
          scheduledCompletionDate: '2026-04-15T00:00:00Z',
        });
    });

    it('should search orders by term', async () => {
      const response = await request(app)
        .get('/api/orders/search')
        .query({ q: 'SEARCH' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 400 when search term is missing', async () => {
      const response = await request(app)
        .get('/api/orders/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Search term is required');
    });
  });
});