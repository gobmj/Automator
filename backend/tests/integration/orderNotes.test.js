import request from 'supertest';
import app from '../../src/app.js';
import Order from '../../src/models/Order.js';
import sequelize from '../../src/config/database.js';

describe('Order Notes API Integration Tests', () => {
  let testOrder;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Create a test order
    testOrder = await Order.create({
      orderId: 'ORD-2024-TEST-001',
      orderNumber: 'TEST-001',
      material: 'MAT-001',
      quantity: 100,
      priority: 500,
      status: 'CREATED',
      plant: 'PLANT-001',
      scheduledStartDate: new Date('2024-01-01'),
      scheduledCompletionDate: new Date('2024-01-31'),
      notes: '',
    });
  });

  afterEach(async () => {
    await Order.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('PATCH /api/orders/:orderId/notes', () => {
    it('should update order notes successfully', async () => {
      const notesText = 'This is a test note for the order';

      const response = await request(app)
        .patch(`/api/orders/${testOrder.orderId}/notes`)
        .send({ notes: notesText })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order notes updated successfully');
      expect(response.body.data.notes).toBe(notesText);

      // Verify in database
      const updatedOrder = await Order.findOne({ where: { orderId: testOrder.orderId } });
      expect(updatedOrder.notes).toBe(notesText);
    });

    it('should update notes with empty string', async () => {
      // First add some notes
      await testOrder.update({ notes: 'Some existing notes' });

      const response = await request(app)
        .patch(`/api/orders/${testOrder.orderId}/notes`)
        .send({ notes: '' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('');
    });

    it('should return 400 when notes field is missing', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrder.orderId}/notes`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('notes field is required');
    });

    it('should return 404 when order does not exist', async () => {
      const response = await request(app)
        .patch('/api/orders/INVALID-ORDER-ID/notes')
        .send({ notes: 'Some notes' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });

    it('should handle long notes text', async () => {
      const longNotes = 'A'.repeat(1000);

      const response = await request(app)
        .patch(`/api/orders/${testOrder.orderId}/notes`)
        .send({ notes: longNotes })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe(longNotes);
    });

    it('should preserve newlines in notes', async () => {
      const notesWithNewlines = 'Line 1\nLine 2\nLine 3';

      const response = await request(app)
        .patch(`/api/orders/${testOrder.orderId}/notes`)
        .send({ notes: notesWithNewlines })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe(notesWithNewlines);
    });
  });

  describe('GET /api/orders/:orderId - Notes included', () => {
    it('should return order with notes field', async () => {
      const notesText = 'Test notes for retrieval';
      await testOrder.update({ notes: notesText });

      const response = await request(app)
        .get(`/api/orders/${testOrder.orderId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe(notesText);
    });

    it('should return empty string for notes when not set', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.orderId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('');
    });
  });
});