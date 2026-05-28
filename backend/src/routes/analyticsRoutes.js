import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

/**
 * Analytics Routes
 */

// Get dashboard analytics
router.get('/dashboard', analyticsController.getDashboardAnalytics);

export default router;