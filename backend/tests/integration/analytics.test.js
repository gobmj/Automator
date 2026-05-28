import request from 'supertest';
import app from '../../src/app.js';
import sequelize from '../../src/config/database.js';
import Order from '../../src/models/Order.js';

describe('Analytics API Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Clear database before each test
    await Order.destroy({ where: {}, truncate: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should return dashboard analytics with empty database', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('statusBreakdown');
      expect(response.body.data).toHaveProperty('plantPerformance');
      expect(response.body.data).toHaveProperty('topMaterials');
      expect(response.body.data).toHaveProperty('priorityDistribution');
      expect(response.body.data).toHaveProperty('overdueOrders');
      expect(response.body.data).toHaveProperty('timeline');

      expect(response.body.data.summary.totalOrders).toBe(0);
    });

    it('should return dashboard analytics with sample data', async () => {
      // Create sample orders
      const orders = [
        {
          orderId: 'ORD-2026-001',
          orderNumber: 'TEST-001',
          material: 'FORKLIFT-FRAME',
          quantity: 10,
          priority: 150,
          status: 'CREATED',
          plant: 'DT6364',
          scheduledStartDate: new Date('2026-06-01'),
          scheduledCompletionDate: new Date('2026-06-15'),
        },
        {
          orderId: 'ORD-2026-002',
          orderNumber: 'TEST-002',
          material: 'ENGINE-BLOCK',
          quantity: 5,
          priority: 350,
          status: 'RELEASABLE',
          plant: 'DT6364',
          scheduledStartDate: new Date('2026-06-02'),
          scheduledCompletionDate: new Date('2026-06-16'),
        },
        {
          orderId: 'ORD-2026-003',
          orderNumber: 'TEST-003',
          material: 'FORKLIFT-FRAME',
          quantity: 8,
          priority: 550,
          status: 'RELEASED',
          plant: 'DT6365',
          scheduledStartDate: new Date('2026-06-03'),
          scheduledCompletionDate: new Date('2026-06-17'),
        },
        {
          orderId: 'ORD-2026-004',
          orderNumber: 'TEST-004',
          material: 'CHASSIS',
          quantity: 12,
          priority: 750,
          status: 'IN_PROGRESS',
          plant: 'DT6365',
          scheduledStartDate: new Date('2026-06-04'),
          scheduledCompletionDate: new Date('2026-06-18'),
        },
        {
          orderId: 'ORD-2026-005',
          orderNumber: 'TEST-005',
          material: 'WHEEL-ASSEMBLY',
          quantity: 20,
          priority: 950,
          status: 'COMPLETED',
          plant: 'DT6364',
          scheduledStartDate: new Date('2026-06-05'),
          scheduledCompletionDate: new Date('2026-06-19'),
        },
      ];

      await Order.bulkCreate(orders);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalOrders).toBe(5);
      expect(response.body.data.statusBreakdown).toHaveProperty('CREATED');
      expect(response.body.data.statusBreakdown).toHaveProperty('RELEASABLE');
      expect(response.body.data.statusBreakdown).toHaveProperty('RELEASED');
      expect(response.body.data.statusBreakdown).toHaveProperty('IN_PROGRESS');
      expect(response.body.data.statusBreakdown).toHaveProperty('COMPLETED');

      expect(response.body.data.plantPerformance.length).toBeGreaterThan(0);
      expect(response.body.data.topMaterials.length).toBeGreaterThan(0);
      expect(response.body.data.priorityDistribution).toHaveLength(5);
    });

    it('should accept date range parameters', async () => {
      // Create sample orders
      const orders = [
        {
          orderId: 'ORD-2026-001',
          orderNumber: 'TEST-001',
          material: 'MATERIAL-A',
          quantity: 5,
          priority: 500,
          status: 'CREATED',
          plant: 'DT6364',
          scheduledStartDate: new Date(),
          scheduledCompletionDate: new Date(),
        },
      ];

      await Order.bulkCreate(orders);

      // Test that date parameters are accepted without error
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .query({ startDate: '2026-05-01', endDate: '2026-05-31' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('statusBreakdown');
    });

    it('should identify overdue orders', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const overdueOrder = {
        orderId: 'ORD-2026-001',
        orderNumber: 'OVERDUE-001',
        material: 'URGENT-PART',
        quantity: 5,
        priority: 900,
        status: 'IN_PROGRESS',
        plant: 'DT6364',
        scheduledStartDate: new Date(pastDate.getTime() - 5 * 24 * 60 * 60 * 1000),
        scheduledCompletionDate: pastDate,
      };

      await Order.create(overdueOrder);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.overdueCount).toBeGreaterThan(0);
      expect(response.body.data.overdueOrders.length).toBeGreaterThan(0);
      expect(response.body.data.overdueOrders[0].daysOverdue).toBeGreaterThan(0);
    });

    it('should calculate priority distribution correctly', async () => {
      const orders = [
        { orderId: 'ORD-001', orderNumber: 'T1', material: 'M1', quantity: 5, priority: 100, status: 'CREATED', plant: 'P1', scheduledStartDate: new Date(), scheduledCompletionDate: new Date() },
        { orderId: 'ORD-002', orderNumber: 'T2', material: 'M2', quantity: 5, priority: 300, status: 'CREATED', plant: 'P1', scheduledStartDate: new Date(), scheduledCompletionDate: new Date() },
        { orderId: 'ORD-003', orderNumber: 'T3', material: 'M3', quantity: 5, priority: 500, status: 'CREATED', plant: 'P1', scheduledStartDate: new Date(), scheduledCompletionDate: new Date() },
        { orderId: 'ORD-004', orderNumber: 'T4', material: 'M4', quantity: 5, priority: 700, status: 'CREATED', plant: 'P1', scheduledStartDate: new Date(), scheduledCompletionDate: new Date() },
        { orderId: 'ORD-005', orderNumber: 'T5', material: 'M5', quantity: 5, priority: 900, status: 'CREATED', plant: 'P1', scheduledStartDate: new Date(), scheduledCompletionDate: new Date() },
      ];

      await Order.bulkCreate(orders);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.priorityDistribution).toHaveLength(5);
      
      const distribution = response.body.data.priorityDistribution;
      expect(distribution.find(d => d.range === 'Critical (1-200)').count).toBe(1);
      expect(distribution.find(d => d.range === 'High (201-400)').count).toBe(1);
      expect(distribution.find(d => d.range === 'Medium (401-600)').count).toBe(1);
      expect(distribution.find(d => d.range === 'Low (601-800)').count).toBe(1);
      expect(distribution.find(d => d.range === 'Very Low (801-1000)').count).toBe(1);
    });

    it('should show top materials by order count', async () => {
      const orders = [
        { orderId: 'ORD-001', orderNumber: 'T1', material: 'FORKLIFT-FRAME', quantity: 5, priority: 500, status: 'CREATED', plant: 'P1', scheduledStartDate: new Date(), scheduledCompletionDate: new Date() },
        { orderId: 'ORD-002', orderNumber: 'T2', material: 'FORKLIFT-FRAME', quantity: 10, priority: 500, status: 'CREATED', plant: 'P1', scheduledStartDate: new Date(), scheduledCompletionDate: new Date() },
        { orderId: 'ORD-003', orderNumber: 'T3', material: 'ENGINE-BLOCK', quantity: 3, priority: 500, status: 'CREATED', plant: 'P1', scheduledStartDate: new Date(), scheduledCompletionDate: new Date() },
      ];

      await Order.bulkCreate(orders);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topMaterials.length).toBeGreaterThan(0);
      expect(response.body.data.topMaterials[0].material).toBe('FORKLIFT-FRAME');
      expect(response.body.data.topMaterials[0].orderCount).toBe(2);
      expect(response.body.data.topMaterials[0].totalQuantity).toBe(15);
    });
  });
});