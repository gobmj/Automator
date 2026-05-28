import * as analyticsService from '../services/analyticsService.js';

/**
 * Analytics Controller
 * Handles HTTP requests for analytics operations
 * Provides dashboard analytics endpoint
 */

/**
 * Get comprehensive dashboard analytics
 * GET /api/analytics/dashboard
 */
export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    
    const analytics = await analyticsService.getDashboardAnalytics(options);
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};