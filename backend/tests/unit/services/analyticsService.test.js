import { jest } from '@jest/globals';
import { getDashboardAnalytics } from '../../../src/services/analyticsService.js';
import Order from '../../../src/models/Order.js';

// Mock the Order model
jest.mock('../../../src/models/Order.js');

describe('Analytics Service', () => {
  beforeEach(() => {
    // Assign fresh jest mock functions for every Sequelize static method
    Order.count = jest.fn();
    Order.findAll = jest.fn();
    Order.findOne = jest.fn();
    if (!Order.sequelize) Order.sequelize = {};
    Order.sequelize.fn = jest.fn((name, col) => `${name}(${col})`);
    Order.sequelize.col = jest.fn((col) => col);
  });

  describe('getDashboardAnalytics', () => {
    it('should return comprehensive dashboard analytics', async () => {
      // Mock data
      const mockOrders = [
        {
          id: 1,
          orderId: 'ORD-2026-001',
          orderNumber: 'TEST-001',
          material: 'FORKLIFT-FRAME',
          quantity: 10,
          priority: 500,
          status: 'RELEASABLE',
          plant: 'DT6364',
          createdDate: new Date('2026-05-01'),
          scheduledStartDate: new Date('2026-05-10'),
          scheduledCompletionDate: new Date('2026-05-20'),
        },
      ];

      // Mock Order.count
      Order.count.mockResolvedValue(100);

      // Mock Order.findAll for status breakdown
      Order.findAll
        .mockResolvedValueOnce([
          { status: 'CREATED', count: '20' },
          { status: 'RELEASABLE', count: '30' },
          { status: 'RELEASED', count: '25' },
          { status: 'IN_PROGRESS', count: '15' },
          { status: 'COMPLETED', count: '10' },
        ])
        // Mock for plant stats
        .mockResolvedValueOnce([
          {
            plant: 'DT6364',
            orderCount: '50',
            totalQuantity: '500',
            avgPriority: '450',
          },
          {
            plant: 'DT6365',
            orderCount: '50',
            totalQuantity: '600',
            avgPriority: '550',
          },
        ])
        // Mock for material stats
        .mockResolvedValueOnce([
          {
            material: 'FORKLIFT-FRAME',
            orderCount: '30',
            totalQuantity: '300',
          },
          {
            material: 'ENGINE-BLOCK',
            orderCount: '25',
            totalQuantity: '250',
          },
        ])
        // Mock for overdue orders
        .mockResolvedValueOnce([
          {
            orderId: 'ORD-2026-001',
            orderNumber: 'TEST-001',
            material: 'FORKLIFT-FRAME',
            status: 'IN_PROGRESS',
            scheduledCompletionDate: new Date('2026-04-01'),
            priority: 800,
          },
        ])
        // Mock for timeline data
        .mockResolvedValueOnce([
          { date: '2026-05-01', count: '5' },
          { date: '2026-05-02', count: '8' },
          { date: '2026-05-03', count: '6' },
        ]);

      // Mock Order.findOne for average metrics
      Order.findOne.mockResolvedValue({
        avgPriority: '500',
        avgQuantity: '10',
      });

      const result = await getDashboardAnalytics();

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('statusBreakdown');
      expect(result).toHaveProperty('plantPerformance');
      expect(result).toHaveProperty('topMaterials');
      expect(result).toHaveProperty('priorityDistribution');
      expect(result).toHaveProperty('overdueOrders');
      expect(result).toHaveProperty('timeline');

      expect(result.summary.totalOrders).toBe(100);
      expect(result.statusBreakdown).toHaveProperty('CREATED');
      expect(result.plantPerformance).toHaveLength(2);
      expect(result.topMaterials).toHaveLength(2);
      expect(result.priorityDistribution).toHaveLength(5);
    });

    it('should filter analytics by date range', async () => {
      const startDate = '2026-05-01';
      const endDate = '2026-05-31';

      Order.count.mockResolvedValue(50);
      Order.findAll.mockResolvedValue([]);
      Order.findOne.mockResolvedValue({ avgPriority: '500', avgQuantity: '10' });

      const result = await getDashboardAnalytics({ startDate, endDate });

      expect(result).toHaveProperty('summary');
      expect(Order.count).toHaveBeenCalled();
    });

    it('should handle empty database', async () => {
      Order.count.mockResolvedValue(0);
      Order.findAll.mockResolvedValue([]);
      Order.findOne.mockResolvedValue({ avgPriority: null, avgQuantity: null });

      const result = await getDashboardAnalytics();

      expect(result.summary.totalOrders).toBe(0);
      expect(result.summary.averagePriority).toBe('0.00');
      expect(result.summary.averageQuantity).toBe('0.00');
      expect(result.statusBreakdown).toEqual({});
      expect(result.plantPerformance).toEqual([]);
      expect(result.topMaterials).toEqual([]);
    });

    it('should calculate priority distribution correctly', async () => {
      Order.count
        .mockResolvedValueOnce(100) // Total orders
        .mockResolvedValueOnce(10) // Critical (1-200)
        .mockResolvedValueOnce(20) // High (201-400)
        .mockResolvedValueOnce(30) // Medium (401-600)
        .mockResolvedValueOnce(25) // Low (601-800)
        .mockResolvedValueOnce(15) // Very Low (801-1000)
        .mockResolvedValueOnce(50); // Recent orders

      Order.findAll.mockResolvedValue([]);
      Order.findOne.mockResolvedValue({ avgPriority: '500', avgQuantity: '10' });

      const result = await getDashboardAnalytics();

      expect(result.priorityDistribution).toHaveLength(5);
      expect(result.priorityDistribution[0].range).toBe('Critical (1-200)');
      expect(result.priorityDistribution[0].count).toBe(10);
    });

    it('should calculate days overdue correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      Order.count.mockResolvedValue(100);
      Order.findAll
        .mockResolvedValueOnce([]) // status breakdown
        .mockResolvedValueOnce([]) // plant stats
        .mockResolvedValueOnce([]) // material stats
        .mockResolvedValueOnce([
          {
            orderId: 'ORD-2026-001',
            orderNumber: 'TEST-001',
            material: 'FORKLIFT-FRAME',
            status: 'IN_PROGRESS',
            scheduledCompletionDate: pastDate,
            priority: 800,
          },
        ])
        .mockResolvedValueOnce([]); // timeline

      Order.findOne.mockResolvedValue({ avgPriority: '500', avgQuantity: '10' });

      const result = await getDashboardAnalytics();

      expect(result.overdueOrders).toHaveLength(1);
      expect(result.overdueOrders[0].daysOverdue).toBeGreaterThanOrEqual(4);
    });
  });
});