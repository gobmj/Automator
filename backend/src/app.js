import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection, syncDatabase } from './config/database.js';
import orderRoutes from './routes/orderRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // HTTP request logger
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/orders', orderRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Sync database models
    await syncDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`📍 API endpoint: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`\n📚 Available endpoints:`);
      console.log(`   POST   /api/orders                    - Create order`);
      console.log(`   GET    /api/orders                    - List orders`);
      console.log(`   GET    /api/orders/:orderId           - Get order`);
      console.log(`   PUT    /api/orders/:orderId           - Update order`);
      console.log(`   DELETE /api/orders/:orderId           - Delete order`);
      console.log(`   POST   /api/orders/:orderId/release   - Release order`);
      console.log(`   GET    /api/orders/status/:status     - Get by status`);
      console.log(`   GET    /api/orders/search?q=term      - Search orders\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Start the server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
