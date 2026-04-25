import { jest } from '@jest/globals';
import * as orderService from '../../../src/services/orderService.js';
import Order from '../../../src/models/Order.js';

// Mock the Order model
jest.mock('../../../src/models/Order.js');

describe('Order Service - Statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrderStatistics', () => {
    it('should return comprehensive order statistics', async () => {
      // Mock total count
      Order.count.mockResolvedValueOnce(100);

      // Mock status counts
      Order.findAll.mockResolvedValueOnce([
        { status: 'CREATED', count: '20' },
        { status: 'RELEASABLE', count: '30' },
        { status: 'RELEASED', count: '25' },
        { status: 'IN_PROGRESS', count: '15' },
        { status: 'COMPLETED', count: '10' },
      ]);

      // Mock plant counts
      Order.findAll.mockResolvedValueOnce([
        { plant: 'DT6364', count: '50' },
        { plant: 'DT6365', count: '30' },
        { plant: 'DT6366', count: '20' },
      ]);

      // Mock average priority
      Order.findOne.mockResolvedValueOnce({
        avgPriority: 525.75,
      });

      // Mock recent orders count
      Order.count.mockResolvedValueOnce(35);

      const result = await orderService.getOrderStatistics();

      expect(result).toEqual({
        totalOrders: 100,
        statusBreakdown: {
          CREATED: 20,
          RELEASABLE: 30,
          RELEASED: 25,
          IN_PROGRESS: 15,
          COMPLETED: 10,
        },
        plantBreakdown: {
          DT6364: 50,
          DT6365: 30,
          DT6366: 20,
        },
        averagePriority: '525.75',
        recentOrders: {
          last7Days: 35,
        },
      });

      // Verify Order.count was called twice (total and recent)
      expect(Order.count).toHaveBeenCalledTimes(2);
      
      // Verify Order.findAll was called twice (status and plant)
      expect(Order.findAll).toHaveBeenCalledTimes(2);
      
      // Verify Order.findOne was called once (average priority)
      expect(Order.findOne).toHaveBeenCalledTimes(1);
    });

    it('should handle empty database gracefully', async () => {
      // Mock empty results
      Order.count.mockResolvedValueOnce(0);
      Order.findAll.mockResolvedValueOnce([]);
      Order.findAll.mockResolvedValueOnce([]);
      Order.findOne.mockResolvedValueOnce({ avgPriority: null });
      Order.count.mockResolvedValueOnce(0);

      const result = await orderService.getOrderStatistics();

      expect(result).toEqual({
        totalOrders: 0,
        statusBreakdown: {},
        plantBreakdown: {},
        averagePriority: 0,
        recentOrders: {
          last7Days: 0,
        },
      });
    });

    it('should handle missing average priority', async () => {
      Order.count.mockResolvedValueOnce(10);
      Order.findAll.mockResolvedValueOnce([
        { status: 'CREATED', count: '10' },
      ]);
      Order.findAll.mockResolvedValueOnce([
        { plant: 'DT6364', count: '10' },
      ]);
      Order.findOne.mockResolvedValueOnce(null);
      Order.count.mockResolvedValueOnce(5);

      const result = await orderService.getOrderStatistics();

      expect(result.averagePriority).toBe(0);
    });

    it('should format average priority to 2 decimal places', async () => {
      Order.count.mockResolvedValueOnce(50);
      Order.findAll.mockResolvedValueOnce([]);
      Order.findAll.mockResolvedValueOnce([]);
      Order.findOne.mockResolvedValueOnce({
        avgPriority: 333.3333333,
      });
      Order.count.mockResolvedValueOnce(10);

      const result = await orderService.getOrderStatistics();

      expect(result.averagePriority).toBe('333.33');
    });

    it('should calculate recent orders from last 7 days', async () => {
      Order.count.mockResolvedValueOnce(100);
      Order.findAll.mockResolvedValueOnce([]);
      Order.findAll.mockResolvedValueOnce([]);
      Order.findOne.mockResolvedValueOnce({ avgPriority: 500 });
      Order.count.mockResolvedValueOnce(42);

      const result = await orderService.getOrderStatistics();

      expect(result.recentOrders.last7Days).toBe(42);
      
      // Verify the second count call includes date filter
      const secondCountCall = Order.count.mock.calls[1][0];
      expect(secondCountCall).toHaveProperty('where');
      expect(secondCountCall.where).toHaveProperty('createdDate');
    });
  });
});