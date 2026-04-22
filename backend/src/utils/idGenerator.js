/**
 * Generate a unique order ID
 * Format: ORD-YYYY-NNNN (e.g., ORD-2024-0001)
 */
export const generateOrderId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}-${random}`;
};

/**
 * Generate a unique order ID with custom prefix
 * @param {string} prefix - Custom prefix for the order ID
 */
export const generateOrderIdWithPrefix = (prefix = 'ORD') => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${year}-${timestamp}`;
};