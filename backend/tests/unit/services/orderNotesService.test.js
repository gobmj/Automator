import { jest } from '@jest/globals';
import { updateOrderNotes } from '../../../src/services/orderService.js';
import Order from '../../../src/models/Order.js';

// Mock the Order model
jest.mock('../../../src/models/Order.js');

describe('Order Notes Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateOrderNotes', () => {
    it('should update order notes successfully', async () => {
      const mockOrder = {
        orderId: 'ORD-2024-001',
        notes: 'Old notes',
        update: jest.fn().mockResolvedValue(true),
      };

      Order.findOne = jest.fn().mockResolvedValue(mockOrder);

      const result = await updateOrderNotes('ORD-2024-001', 'New notes for this order');

      expect(Order.findOne).toHaveBeenCalledWith({
        where: { orderId: 'ORD-2024-001' },
      });
      expect(mockOrder.update).toHaveBeenCalledWith({ notes: 'New notes for this order' });
      expect(result).toBe(mockOrder);
    });

    it('should throw error when order not found', async () => {
      Order.findOne = jest.fn().mockResolvedValue(null);

      await expect(updateOrderNotes('INVALID-ID', 'Some notes')).rejects.toThrow('Order not found');
    });

    it('should handle empty notes', async () => {
      const mockOrder = {
        orderId: 'ORD-2024-001',
        notes: 'Existing notes',
        update: jest.fn().mockResolvedValue(true),
      };

      Order.findOne = jest.fn().mockResolvedValue(mockOrder);

      await updateOrderNotes('ORD-2024-001', '');

      expect(mockOrder.update).toHaveBeenCalledWith({ notes: '' });
    });
  });
});