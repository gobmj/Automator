import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Order Model
 * Represents a manufacturing order in the system
 */
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'order_id',
    comment: 'Unique order identifier (e.g., ORD-2024-001)',
  },
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'order_number',
    comment: 'User-provided order number',
  },
  material: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Material/product code',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
    },
    comment: 'Order quantity',
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 500,
    validate: {
      min: 1,
      max: 1000,
    },
    comment: 'Order priority (1-1000)',
  },
  status: {
    type: DataTypes.ENUM('CREATED', 'RELEASABLE', 'RELEASED', 'IN_PROGRESS', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'CREATED',
    comment: 'Current order status',
  },
  plant: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Manufacturing plant code',
  },
  createdDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_date',
    comment: 'Order creation timestamp',
  },
  scheduledStartDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'scheduled_start_date',
    comment: 'Scheduled start date',
  },
  scheduledCompletionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'scheduled_completion_date',
    comment: 'Scheduled completion date',
  },
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['order_id'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['plant'],
    },
  ],
});

/**
 * Validate that scheduled start date is before completion date
 */
Order.beforeValidate((order) => {
  if (order.scheduledStartDate && order.scheduledCompletionDate) {
    if (new Date(order.scheduledStartDate) >= new Date(order.scheduledCompletionDate)) {
      throw new Error('Scheduled start date must be before completion date');
    }
  }
});

export default Order;