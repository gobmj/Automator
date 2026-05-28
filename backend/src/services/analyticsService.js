import Order from '../models/Order.js';
import { Op } from 'sequelize';

/**
 * Analytics Service
 * Provides comprehensive analytics and insights for order management
 * Updated: Added dashboard analytics feature for production monitoring
 */

/**
 * Get comprehensive dashboard analytics
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Dashboard analytics data
 */
export const getDashboardAnalytics = async (options = {}) => {
  const { startDate, endDate } = options;
  
  // Build date filter if provided
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdDate = {};
    if (startDate) dateFilter.createdDate[Op.gte] = new Date(startDate);
    if (endDate) dateFilter.createdDate[Op.lte] = new Date(endDate);
  }

  // 1. Overall Statistics
  const totalOrders = await Order.count({ where: dateFilter });
  
  // 2. Status Breakdown
  const statusCounts = await Order.findAll({
    attributes: [
      'status',
      [Order.sequelize.fn('COUNT', Order.sequelize.col('status')), 'count']
    ],
    where: dateFilter,
    group: ['status'],
    raw: true,
  });
  
  const statusBreakdown = {};
  statusCounts.forEach(item => {
    statusBreakdown[item.status] = parseInt(item.count);
  });

  // 3. Plant Performance
  const plantStats = await Order.findAll({
    attributes: [
      'plant',
      [Order.sequelize.fn('COUNT', Order.sequelize.col('plant')), 'orderCount'],
      [Order.sequelize.fn('SUM', Order.sequelize.col('quantity')), 'totalQuantity'],
      [Order.sequelize.fn('AVG', Order.sequelize.col('priority')), 'avgPriority']
    ],
    where: dateFilter,
    group: ['plant'],
    raw: true,
  });

  const plantPerformance = plantStats.map(plant => ({
    plant: plant.plant,
    orderCount: parseInt(plant.orderCount),
    totalQuantity: parseInt(plant.totalQuantity || 0),
    avgPriority: parseFloat(plant.avgPriority || 0).toFixed(2)
  }));

  // 4. Material Analysis
  const materialStats = await Order.findAll({
    attributes: [
      'material',
      [Order.sequelize.fn('COUNT', Order.sequelize.col('material')), 'orderCount'],
      [Order.sequelize.fn('SUM', Order.sequelize.col('quantity')), 'totalQuantity']
    ],
    where: dateFilter,
    group: ['material'],
    order: [[Order.sequelize.fn('COUNT', Order.sequelize.col('material')), 'DESC']],
    limit: 10,
    raw: true,
  });

  const topMaterials = materialStats.map(material => ({
    material: material.material,
    orderCount: parseInt(material.orderCount),
    totalQuantity: parseInt(material.totalQuantity || 0)
  }));

  // 5. Priority Distribution
  const priorityRanges = [
    { label: 'Critical (1-200)', min: 1, max: 200 },
    { label: 'High (201-400)', min: 201, max: 400 },
    { label: 'Medium (401-600)', min: 401, max: 600 },
    { label: 'Low (601-800)', min: 601, max: 800 },
    { label: 'Very Low (801-1000)', min: 801, max: 1000 }
  ];

  const priorityDistribution = await Promise.all(
    priorityRanges.map(async (range) => {
      const count = await Order.count({
        where: {
          ...dateFilter,
          priority: {
            [Op.gte]: range.min,
            [Op.lte]: range.max
          }
        }
      });
      return {
        range: range.label,
        count
      };
    })
  );

  // 6. Overdue Orders
  const now = new Date();
  const overdueOrders = await Order.findAll({
    where: {
      ...dateFilter,
      scheduledCompletionDate: {
        [Op.lt]: now
      },
      status: {
        [Op.notIn]: ['COMPLETED']
      }
    },
    attributes: [
      'orderId',
      'orderNumber',
      'material',
      'status',
      'scheduledCompletionDate',
      'priority'
    ],
    order: [['scheduledCompletionDate', 'ASC']],
    limit: 20,
    raw: true
  });

  const overdueCount = overdueOrders.length;
  const overdueList = overdueOrders.map(order => {
    const daysOverdue = Math.floor((now - new Date(order.scheduledCompletionDate)) / (1000 * 60 * 60 * 24));
    return {
      ...order,
      daysOverdue
    };
  });

  // 7. Timeline Analytics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const timelineData = await Order.findAll({
    attributes: [
      [Order.sequelize.fn('DATE', Order.sequelize.col('created_date')), 'date'],
      [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'count']
    ],
    where: {
      createdDate: {
        [Op.gte]: thirtyDaysAgo
      }
    },
    group: [Order.sequelize.fn('DATE', Order.sequelize.col('created_date'))],
    order: [[Order.sequelize.fn('DATE', Order.sequelize.col('created_date')), 'ASC']],
    raw: true
  });

  const timeline = timelineData.map(item => ({
    date: item.date,
    ordersCreated: parseInt(item.count)
  }));

  // 8. Average Metrics
  const avgMetrics = await Order.findOne({
    attributes: [
      [Order.sequelize.fn('AVG', Order.sequelize.col('priority')), 'avgPriority'],
      [Order.sequelize.fn('AVG', Order.sequelize.col('quantity')), 'avgQuantity']
    ],
    where: dateFilter,
    raw: true
  });

  // 9. Recent Activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentOrdersCount = await Order.count({
    where: {
      createdDate: {
        [Op.gte]: sevenDaysAgo
      }
    }
  });

  return {
    summary: {
      totalOrders,
      overdueCount,
      recentOrders: recentOrdersCount,
      averagePriority: parseFloat(avgMetrics?.avgPriority || 0).toFixed(2),
      averageQuantity: parseFloat(avgMetrics?.avgQuantity || 0).toFixed(2)
    },
    statusBreakdown,
    plantPerformance,
    topMaterials,
    priorityDistribution,
    overdueOrders: overdueList,
    timeline
  };
};