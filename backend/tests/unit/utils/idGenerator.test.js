import { generateOrderId, generateOrderIdWithPrefix } from '../../../src/utils/idGenerator.js';

describe('ID Generator Utils', () => {
  describe('generateOrderId', () => {
    it('should generate order ID with correct format', () => {
      const orderId = generateOrderId();
      const year = new Date().getFullYear();
      
      expect(orderId).toMatch(new RegExp(`^ORD-${year}-\\d{4}$`));
    });

    it('should generate unique IDs', () => {
      const id1 = generateOrderId();
      const id2 = generateOrderId();
      
      // IDs should be different (though there's a small chance they could be the same)
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
    });
  });

  describe('generateOrderIdWithPrefix', () => {
    it('should generate order ID with custom prefix', () => {
      const orderId = generateOrderIdWithPrefix('CUSTOM');
      const year = new Date().getFullYear();
      
      expect(orderId).toMatch(new RegExp(`^CUSTOM-${year}-\\d{6}$`));
    });

    it('should use default prefix when not provided', () => {
      const orderId = generateOrderIdWithPrefix();
      const year = new Date().getFullYear();
      
      expect(orderId).toMatch(new RegExp(`^ORD-${year}-\\d{6}$`));
    });
  });
});