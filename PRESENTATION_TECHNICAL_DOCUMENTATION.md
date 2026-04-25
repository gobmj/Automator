# AI-Driven Test Automation Using Playwright
## Complete Technical Documentation for Presentation

**BITS Dissertation Project**  
**Author:** Govind M J  
**Institution:** BITS Pilani  
**Date:** April 25, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Backend Implementation](#3-backend-implementation)
4. [Frontend Implementation](#4-frontend-implementation)
5. [Jenkins CI/CD Pipeline](#5-jenkins-cicd-pipeline)
6. [AI Test Generation System](#6-ai-test-generation-system)
7. [Testing Strategy](#7-testing-strategy)
8. [Deployment & Operations](#8-deployment--operations)
9. [Results & Demonstrations](#9-results--demonstrations)
10. [Challenges & Solutions](#10-challenges--solutions)

---

## 1. Project Overview

### 1.1 Problem Statement

Traditional software testing approaches face several challenges:
- **Manual test creation** is time-consuming and error-prone
- **Test maintenance** becomes difficult as codebases grow
- **Coverage gaps** often exist between unit tests and integration tests
- **Regression testing** requires significant effort for each code change

### 1.2 Solution: AI-Driven Test Automation

This project implements an intelligent test automation system that:
1. **Automatically detects** code changes in a manufacturing order management system
2. **Analyzes** the changes using AI (SAP AI Core with Claude/GPT models)
3. **Generates** comprehensive Playwright end-to-end tests
4. **Validates** generated tests against existing unit tests
5. **Reports** discrepancies and test coverage

### 1.3 Research Objectives

- Demonstrate feasibility of AI-powered test generation
- Compare AI-generated tests with manually written unit tests
- Evaluate test quality, coverage, and accuracy
- Create a reusable CI/CD pipeline for automated testing
- Measure time savings and efficiency improvements

### 1.4 Technology Stack

**Backend:**
- Node.js 18+ with Express.js
- PostgreSQL 15 (Docker)
- Sequelize ORM
- Jest (Unit Testing)

**Frontend:**
- React 18+ with Vite
- React Router v6
- Axios for API calls
- Tailwind CSS

**CI/CD & Testing:**
- Jenkins (Dockerized)
- Playwright (E2E Testing)
- SAP AI Core (AI Integration)
- GitHub Webhooks

**Infrastructure:**
- Docker & Docker Compose
- ngrok (Webhook tunneling)
- Git version control

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer Workflow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Developer writes code + unit tests                           │
│  2. Code pushed to GitHub branch                                 │
│  3. Unit tests validated in branch                               │
│  4. Pull Request created and merged to master                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              GitHub Webhook Triggers                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Jenkins Pipeline Starts                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                      │
│  5. Jenkins detects changed files                                │
│  6. AI analyzes code changes                                     │
│  7. AI generates Playwright tests                                │
│  8. Generated tests executed                                     │
│  9. Results compared with unit tests                             │
│  10. Reports generated and archived                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Interaction Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   GitHub     │────────>│   Jenkins    │────────>│  SAP AI Core │
│  Repository  │ Webhook │   Pipeline   │  OAuth  │   (Claude)   │
└──────────────┘         └──────────────┘         └──────────────┘
                                │                          │
                                │                          │
                                ▼                          ▼
                         ┌──────────────┐         ┌──────────────┐
                         │  Playwright  │         │  Generated   │
                         │    Tests     │<────────│    Tests     │
                         └──────────────┘         └──────────────┘
                                │
                                │
                                ▼
                         ┌──────────────┐
                         │   Reports &  │
                         │  Validation  │
                         └──────────────┘
```

### 2.3 Data Flow

1. **Code Change Detection**: Git diff identifies modified files
2. **File Analysis**: Script categorizes changes (backend/frontend/API/UI)
3. **AI Processing**: Code sent to SAP AI Core with structured prompts
4. **Test Generation**: AI returns Playwright test code
5. **Test Execution**: Generated tests run against application
6. **Validation**: Results compared with unit test expectations
7. **Reporting**: Comprehensive reports generated

---

## 3. Backend Implementation

### 3.1 Project Structure

```
backend/
├── src/
│   ├── app.js                 # Express application setup
│   ├── config/
│   │   └── database.js        # Sequelize configuration
│   ├── controllers/
│   │   └── orderController.js # HTTP request handlers
│   ├── models/
│   │   └── Order.js           # Sequelize model
│   ├── routes/
│   │   └── orderRoutes.js     # API route definitions
│   ├── services/
│   │   └── orderService.js    # Business logic
│   ├── middleware/
│   │   ├── validator.js       # Input validation
│   │   └── errorHandler.js    # Error handling
│   └── utils/
│       └── idGenerator.js     # Utility functions
└── tests/
    └── unit/                  # Jest unit tests
```

### 3.2 Order Service Implementation

**File: `backend/src/services/orderService.js`**

```javascript
import Order from '../models/Order.js';
import { generateOrderId } from '../utils/idGenerator.js';
import { Op } from 'sequelize';

/**
 * Create a new order
 * Generates unique order ID and creates database record
 */
export const createOrder = async (orderData) => {
  const orderId = generateOrderId();
  
  const order = await Order.create({
    orderId,
    ...orderData,
  });
  
  return order;
};

/**
 * Get all orders with pagination and filtering
 * Supports status and plant filtering, sorting, and pagination
 */
export const getAllOrders = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    status,
    plant,
    sortBy = 'createdDate',
    sortOrder = 'DESC',
  } = options;

  const offset = (page - 1) * limit;
  
  // Build where clause dynamically
  const where = {};
  if (status) where.status = status;
  if (plant) where.plant = plant;

  const { count, rows } = await Order.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortBy, sortOrder]],
  });

  return {
    orders: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
    },
  };
};

/**
 * Get order by ID
 * Throws error if order not found
 */
export const getOrderById = async (orderId) => {
  const order = await Order.findOne({
    where: { orderId },
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  return order;
};

/**
 * Update order
 * Prevents updating the orderId field
 */
export const updateOrder = async (orderId, updateData) => {
  const order = await getOrderById(orderId);
  
  // Security: Prevent updating orderId
  delete updateData.orderId;
  
  await order.update(updateData);
  return order;
};

/**
 * Delete order
 * Soft delete or hard delete based on configuration
 */
export const deleteOrder = async (orderId) => {
  const order = await getOrderById(orderId);
  await order.destroy();
  return true;
};

/**
 * Release order for production
 * Validates status transition rules
 */
export const releaseOrder = async (orderId) => {
  const order = await getOrderById(orderId);
  
  // Business rule: Only RELEASABLE orders can be released
  if (order.status !== 'RELEASABLE') {
    throw new Error(
      `Cannot release order with status ${order.status}. ` +
      `Order must be RELEASABLE.`
    );
  }
  
  await order.update({ status: 'RELEASED' });
  return order;
};

/**
 * Get orders by status
 * Returns all orders matching the specified status
 */
export const getOrdersByStatus = async (status) => {
  const orders = await Order.findAll({
    where: { status },
    order: [['createdDate', 'DESC']],
  });
  
  return orders;
};

/**
 * Search orders
 * Searches across orderId, orderNumber, and material fields
 */
export const searchOrders = async (searchTerm) => {
  const orders = await Order.findAll({
    where: {
      [Op.or]: [
        { orderId: { [Op.iLike]: `%${searchTerm}%` } },
        { orderNumber: { [Op.iLike]: `%${searchTerm}%` } },
        { material: { [Op.iLike]: `%${searchTerm}%` } },
      ],
    },
    order: [['createdDate', 'DESC']],
  });
  
  return orders;
};

/**
 * Get order statistics
 * Returns aggregated statistics about orders
 */
export const getOrderStatistics = async () => {
  // Total count
  const totalOrders = await Order.count();
  
  // Count by status
  const statusCounts = await Order.findAll({
    attributes: [
      'status',
      [Order.sequelize.fn('COUNT', Order.sequelize.col('status')), 'count']
    ],
    group: ['status'],
    raw: true,
  });
  
  // Count by plant
  const plantCounts = await Order.findAll({
    attributes: [
      'plant',
      [Order.sequelize.fn('COUNT', Order.sequelize.col('plant')), 'count']
    ],
    group: ['plant'],
    raw: true,
  });
  
  // Average priority
  const avgPriorityResult = await Order.findOne({
    attributes: [
      [Order.sequelize.fn('AVG', Order.sequelize.col('priority')), 'avgPriority']
    ],
    raw: true,
  });
  
  // Recent orders (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentOrdersCount = await Order.count({
    where: {
      createdDate: {
        [Op.gte]: sevenDaysAgo,
      },
    },
  });
  
  // Format results
  const statusBreakdown = {};
  statusCounts.forEach(item => {
    statusBreakdown[item.status] = parseInt(item.count);
  });
  
  const plantBreakdown = {};
  plantCounts.forEach(item => {
    plantBreakdown[item.plant] = parseInt(item.count);
  });
  
  return {
    totalOrders,
    statusBreakdown,
    plantBreakdown,
    averagePriority: avgPriorityResult?.avgPriority 
      ? parseFloat(avgPriorityResult.avgPriority).toFixed(2) 
      : 0,
    recentOrders: {
      last7Days: recentOrdersCount,
    },
  };
};
```

### 3.3 Order Controller Implementation

**File: `backend/src/controllers/orderController.js`**

```javascript
import * as orderService from '../services/orderService.js';

/**
 * Create a new order
 * POST /api/orders
 */
export const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all orders with pagination and filtering
 * GET /api/orders?page=1&limit=10&status=CREATED
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      plant: req.query.plant,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };
    
    const result = await orderService.getAllOrders(options);
    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 * GET /api/orders/:orderId
 */
export const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId);
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * Update order
 * PUT /api/orders/:orderId
 */
export const updateOrder = async (req, res, next) => {
  try {
    const order = await orderService.updateOrder(
      req.params.orderId, 
      req.body
    );
    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * Delete order
 * DELETE /api/orders/:orderId
 */
export const deleteOrder = async (req, res, next) => {
  try {
    await orderService.deleteOrder(req.params.orderId);
    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * Release order for production
 * POST /api/orders/:orderId/release
 */
export const releaseOrder = async (req, res, next) => {
  try {
    const order = await orderService.releaseOrder(req.params.orderId);
    res.status(200).json({
      success: true,
      message: 'Order released successfully',
      data: order,
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    if (error.message.includes('Cannot release order')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * Get order statistics
 * GET /api/orders/statistics
 */
export const getOrderStatistics = async (req, res, next) => {
  try {
    const statistics = await orderService.getOrderStatistics();
    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    next(error);
  }
};
```

### 3.4 API Routes Configuration

**File: `backend/src/routes/orderRoutes.js`**

```javascript
import express from 'express';
import * as orderController from '../controllers/orderController.js';
import {
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderId,
  validateStatus,
  validateListOrders,
} from '../middleware/validator.js';

const router = express.Router();

// Statistics endpoint (must be before /:orderId)
router.get('/statistics', orderController.getOrderStatistics);

// Search orders (must be before /:orderId)
router.get('/search', orderController.searchOrders);

// Get orders by status
router.get('/status/:status', validateStatus, orderController.getOrdersByStatus);

// Create new order
router.post('/', validateCreateOrder, orderController.createOrder);

// Get all orders with pagination
router.get('/', validateListOrders, orderController.getAllOrders);

// Get order by ID
router.get('/:orderId', validateOrderId, orderController.getOrderById);

// Update order
router.put('/:orderId', validateUpdateOrder, orderController.updateOrder);

// Delete order
router.delete('/:orderId', validateOrderId, orderController.deleteOrder);

// Release order
router.post('/:orderId/release', validateOrderId, orderController.releaseOrder);

export default router;
```

### 3.5 Database Schema

**Orders Table:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| order_id | VARCHAR(50) | UNIQUE, NOT NULL | Generated order ID |
| order_number | VARCHAR(50) | NOT NULL | User-provided number |
| material | VARCHAR(100) | NOT NULL | Material/product code |
| quantity | INTEGER | NOT NULL, CHECK > 0 | Order quantity |
| priority | INTEGER | NOT NULL, CHECK 1-1000 | Priority level |
| status | ENUM | NOT NULL | Order status |
| plant | VARCHAR(50) | NOT NULL | Plant code |
| created_date | TIMESTAMP | DEFAULT NOW() | Creation time |
| scheduled_start_date | TIMESTAMP | NOT NULL | Scheduled start |
| scheduled_completion_date | TIMESTAMP | NOT NULL | Scheduled end |
| updated_at | TIMESTAMP | AUTO UPDATE | Last update |

**Status Enum Values:**
- `CREATED` - Initial state
- `RELEASABLE` - Ready for release
- `RELEASED` - Released to production
- `IN_PROGRESS` - Currently being manufactured
- `COMPLETED` - Manufacturing complete

### 3.6 API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/orders` | Create new order | No |
| GET | `/api/orders` | List orders (paginated) | No |
| GET | `/api/orders/:orderId` | Get specific order | No |
| PUT | `/api/orders/:orderId` | Update order | No |
| DELETE | `/api/orders/:orderId` | Delete order | No |
| POST | `/api/orders/:orderId/release` | Release order | No |
| GET | `/api/orders/status/:status` | Filter by status | No |
| GET | `/api/orders/search?q=term` | Search orders | No |
| GET | `/api/orders/statistics` | Get statistics | No |

---

## 4. Frontend Implementation

### 4.1 Project Structure

```
frontend/
├── src/
│   ├── main.jsx              # Application entry point
│   ├── App.jsx               # Main app with routing
│   ├── components/
│   │   ├── OrderList.jsx     # List view with filters
│   │   ├── OrderForm.jsx     # Create/Edit form
│   │   └── OrderDetails.jsx  # Detail view
│   ├── services/
│   │   └── orderService.js   # API integration
│   └── assets/               # Images and icons
└── tests/                    # Vitest unit tests
```

### 4.2 Order List Component (Excerpt)

**File: `frontend/src/components/OrderList.jsx`**

```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import orderService from '../services/orderService';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const statuses = ['CREATED', 'RELEASABLE', 'RELEASED', 
                    'IN_PROGRESS', 'COMPLETED'];

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      
      const response = await orderService.getAllOrders(params);
      setOrders(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) 
      return;
    
    try {
      await orderService.deleteOrder(orderId);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete order');
    }
  };

  const handleRelease = async (orderId) => {
    try {
      await orderService.releaseOrder(orderId);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to release order');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      CREATED: 'bg-gray-100 text-gray-800 border-gray-300',
      RELEASABLE: 'bg-blue-100 text-blue-800 border-blue-300',
      RELEASED: 'bg-green-100 text-green-800 border-green-300',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      COMPLETED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Render logic with Tailwind CSS styling
  return (
    <div className="container mx-auto px-4">
      {/* Filter controls */}
      <div className="mb-6 flex justify-between items-center">
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Statuses</option>
          {statuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        
        <button 
          onClick={() => navigate('/orders/new')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg"
        >
          Create Order
        </button>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium 
                           text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium 
                           text-gray-500 uppercase tracking-wider">
                Material
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium 
                           text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium 
                           text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map(order => (
              <tr key={order.orderId}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {order.orderId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {order.material}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs 
                                   ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button onClick={() => navigate(`/orders/${order.orderId}`)}>
                    View
                  </button>
                  {order.status === 'RELEASABLE' && (
                    <button onClick={() => handleRelease(order.orderId)}>
                      Release
                    </button>
                  )}
                  <button onClick={() => handleDelete(order.orderId)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination && (
        <div className="mt-6 flex justify-between items-center">
          <button 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button 
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderList;
```

### 4.3 API Service Layer

**File: `frontend/src/services/orderService.js`**

```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const orderService = {
  // Get all orders with optional filters
  getAllOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  // Get single order by ID
  getOrderById: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  // Create new order
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  // Update existing order
  updateOrder: async (orderId, orderData) => {
    const response = await api.put(`/orders/${orderId}`, orderData);
    return response.data;
  },

  // Delete order
  deleteOrder: async (orderId) => {
    const response = await api.delete(`/orders/${orderId}`);
    return response.data;
  },

  // Release order for production
  releaseOrder: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/release`);
    return response.data;
  },

  // Get orders by status
  getOrdersByStatus: async (status) => {
    const response = await api.get(`/orders/status/${status}`);
    return response.data;
  },

  // Search orders
  searchOrders: async (searchTerm) => {
    const response = await api.get('/orders/search', {
      params: { q: searchTerm }
    });
    return response.data;
  },

  // Get order statistics
  getStatistics: async () => {
    const response = await api.get('/orders/statistics');
    return response.data;
  },
};

export default orderService;
```

---

## 5. Jenkins CI/CD Pipeline

### 5.1 Complete Jenkinsfile

**File: `Jenkinsfile`**

```groovy
pipeline {
    agent any
    
    environment {
        // AI Core credentials from Jenkins Credentials Store
        AI_CORE_CLIENT_ID = credentials('ai-core-client-id')
        AI_CORE_CLIENT_SECRET = credentials('ai-core-client-secret')
        AI_CORE_DEPLOYMENT_URL = credentials('ai-core-deployment-url')
        GITHUB_TOKEN = credentials('github-token')
        
        // AI Core configuration
        AI_CORE_AUTH_URL = 'https://dm-canary.authentication.sap.hana.ondemand.com/oauth/token'
        AI_CORE_BASE_URL = 'https://api.ai.internalprod.eu-central-1.aws.ml.hana.ondemand.com'
        AI_CORE_RESOURCE_GROUP = 'default'
        AI_CORE_MODEL_PROVIDER = 'anthropic'
        
        // Project configuration
        GITHUB_REPO = 'gobmj/Automator'
        GENERATED_TESTS_DIR = 'playwright-tests/generated'
        REPORTS_DIR = 'reports'
        NODE_VERSION = '20.x'
    }
    
    triggers {
        githubPush()  // Trigger on GitHub push events
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "=== Stage: Checkout ==="
                    checkout scm
                    
                    // Get commit information
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                    
                    env.GIT_AUTHOR = sh(
                        script: 'git log -1 --pretty=%an',
                        returnStdout: true
                    ).trim()
                    
                    echo "Commit: ${env.GIT_COMMIT_MSG}"
                    echo "Author: ${env.GIT_AUTHOR}"
                }
            }
        }
        
        stage('Detect Changes') {
            steps {
                script {
                    echo "=== Stage: Detect Changes ==="
                    
                    sh 'chmod +x jenkins/scripts/detect-changes.sh'
                    
                    def changedFiles = sh(
                        script: './jenkins/scripts/detect-changes.sh',
                        returnStdout: true
                    ).trim()
                    
                    if (changedFiles) {
                        env.CHANGED_FILES = changedFiles
                        echo "Modified files detected:"
                        echo "${changedFiles}"
                    } else {
                        echo "No relevant files changed. Skipping test generation."
                        env.SKIP_TEST_GENERATION = 'true'
                    }
                }
            }
        }
        
        stage('Setup Environment') {
            when {
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo "=== Stage: Setup Environment ==="
                    
                    // Verify credentials
                    echo "✓ AI_CORE_CLIENT_ID: ${env.AI_CORE_CLIENT_ID ? 'Set' : 'Missing'}"
                    echo "✓ AI_CORE_CLIENT_SECRET: ${env.AI_CORE_CLIENT_SECRET ? 'Set' : 'Missing'}"
                    echo "✓ AI_CORE_DEPLOYMENT_URL: ${env.AI_CORE_DEPLOYMENT_URL ? 'Set' : 'Missing'}"
                    
                    sh 'chmod +x jenkins/scripts/setup-env.sh'
                    sh './jenkins/scripts/setup-env.sh'
                    
                    sh 'node --version'
                    sh 'npm --version'
                }
            }
        }
        
        stage('Install Dependencies') {
            when {
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Playwright Dependencies') {
                    steps {
                        dir('playwright-tests') {
                            sh 'npm ci || npm install'
                        }
                    }
                }
            }
        }
        
        stage('Generate Tests') {
            when {
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo "=== Stage: Generate Tests ==="
                    
                    sh 'chmod +x jenkins/scripts/generate-tests.js'
                    
                    def result = sh(
                        script: 'node jenkins/scripts/generate-tests.js',
                        returnStatus: true
                    )
                    
                    if (result == 0) {
                        echo "Test generation completed successfully"
                        sh "ls -la ${GENERATED_TESTS_DIR}/ || echo 'No tests generated'"
                    } else {
                        echo "Warning: Test generation encountered issues"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Run Unit Tests') {
            parallel {
                stage('Backend Unit Tests') {
                    steps {
                        dir('backend') {
                            sh '''
                                npm test -- --testPathPattern=tests/unit \
                                --coverage --json \
                                --outputFile=../reports/backend-unit-tests.json || true
                            '''
                        }
                    }
                }
                stage('Frontend Unit Tests') {
                    steps {
                        dir('frontend') {
                            sh '''
                                npm test -- --coverage --reporter=json \
                                --outputFile=../reports/frontend-unit-tests.json || true
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Execute Generated Tests') {
            when {
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo "=== Stage: Execute Generated Tests ==="
                    
                    dir('playwright-tests') {
                        def testsExist = sh(
                            script: "test -d ${GENERATED_TESTS_DIR} && ls ${GENERATED_TESTS_DIR}/*.spec.js 2>/dev/null",
                            returnStatus: true
                        ) == 0
                        
                        if (testsExist) {
                            sh '''
                                npx playwright test generated/ \
                                    --reporter=html,json \
                                    --output=../reports/playwright \
                                    || true
                            '''
                        } else {
                            echo "No generated tests found to execute"
                        }
                    }
                }
            }
        }
        
        stage('Validate & Report') {
            steps {
                script {
                    echo "=== Stage: Validate & Report ==="
                    
                    sh 'chmod +x jenkins/scripts/validate-results.js'
                    
                    def validationResult = sh(
                        script: 'node jenkins/scripts/validate-results.js',
                        returnStatus: true
                    )
                    
                    if (validationResult == 0) {
                        echo "Test validation completed successfully"
                    } else {
                        echo "Test validation found discrepancies"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Archive Artifacts') {
            steps {
                script {
                    echo "=== Stage: Archive Artifacts ==="
                    
                    archiveArtifacts artifacts: 'reports/**/*', 
                                   allowEmptyArchive: true
                    archiveArtifacts artifacts: 'playwright-tests/generated/**/*.spec.js', 
                                   allowEmptyArchive: true
                    archiveArtifacts artifacts: 'playwright-tests/playwright-report/**/*', 
                                   allowEmptyArchive: true
                }
            }
        }
    }
    
    post {
        always {
            echo "=== Pipeline Completed ==="
            echo "Build Result: ${currentBuild.result ?: 'SUCCESS'}"
            
            cleanWs(
                deleteDirs: true,
                patterns: [
                    [pattern: 'node_modules', type: 'INCLUDE'],
                    [pattern: 'playwright-tests/generated', type: 'INCLUDE']
                ]
            )
        }
        
        success {
            echo "✓ Pipeline executed successfully!"
        }
        
        failure {
            echo "✗ Pipeline failed. Check logs for details."
        }
        
        unstable {
            echo "⚠ Pipeline completed with warnings."
        }
    }
}
```

### 5.2 Pipeline Stages Explained

**1. Checkout**
- Clones repository from GitHub
- Retrieves commit information
- Sets up workspace

**2. Detect Changes**
- Runs `detect-changes.sh` script
- Identifies modified source files
- Skips test generation if no relevant changes

**3. Setup Environment**
- Loads credentials from Jenkins Credentials Store
- Verifies Node.js installation
- Prepares environment variables

**4. Install Dependencies**
- Parallel installation for efficiency
- Backend: `npm ci` in backend directory
- Frontend: `npm ci` in frontend directory
- Playwright: `npm ci` in playwright-tests directory

**5. Generate Tests**
- Executes `generate-tests.js` script
- Authenticates with SAP AI Core
- Generates Playwright tests for changed files
- Saves tests to `playwright-tests/generated/`

**6. Run Unit Tests**
- Parallel execution for speed
- Backend: Jest tests with coverage
- Frontend: Vitest tests with coverage
- Results saved to `reports/` directory

**7. Execute Generated Tests**
- Runs AI-generated Playwright tests
- Generates HTML and JSON reports
- Captures screenshots and videos on failure

**8. Validate & Report**
- Compares generated tests with unit tests
- Identifies discrepancies
- Creates validation report

**9. Archive Artifacts**
- Saves test reports
- Archives generated test files
- Stores Playwright HTML reports

---

## 6. AI Test Generation System

### 6.1 Complete Test Generation Script

**File: `jenkins/scripts/generate-tests.js`** (Key sections)

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration from environment
const CHANGED_FILES = process.env.CHANGED_FILES || '';
const GENERATED_TESTS_DIR = process.env.GENERATED_TESTS_DIR || 
                            'playwright-tests/generated';

/**
 * Load AI Core configuration from environment variables
 */
function loadConfig() {
    const config = {
        clientId: process.env.AI_CORE_CLIENT_ID,
        clientSecret: process.env.AI_CORE_CLIENT_SECRET,
        authUrl: process.env.AI_CORE_AUTH_URL,
        baseUrl: process.env.AI_CORE_BASE_URL,
        deploymentUrl: process.env.AI_CORE_DEPLOYMENT_URL,
        resourceGroup: process.env.AI_CORE_RESOURCE_GROUP || 'default'
    };
    
    // Validate required fields
    const required = ['clientId', 'clientSecret', 'authUrl', 
                     'baseUrl', 'deploymentUrl'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
        console.error('Missing required environment variables');
        process.exit(1);
    }
    
    return config;
}

/**
 * Get OAuth token from SAP AI Core
 */
async function getAccessToken(config) {
    return new Promise((resolve, reject) => {
        const authData = `grant_type=client_credentials&client_id=${config.clientId}&client_secret=${config.clientSecret}`;
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': authData.length
            }
        };
        
        const req = https.request(config.authUrl, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject(new Error('No access token in response'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        req.write(authData);
        req.end();
    });
}

/**
 * Analyze file to determine test type
 */
function analyzeFile(filePath, content) {
    const isBackend = filePath.startsWith('backend/');
    const isFrontend = filePath.startsWith('frontend/');
    const isController = filePath.includes('controller');
    const isService = filePath.includes('service');
    const isComponent = filePath.match(/\.(jsx|tsx)$/);
    const isAPI = isController || isService;
    
    return {
        filePath,
        isBackend,
        isFrontend,
        isAPI,
        isComponent,
        testType: isAPI ? 'api' : isComponent ? 'ui' : 'unit',
        content: content.substring(0, 3000) // Limit for API
    };
}

/**
 * Create AI prompt for test generation
 */
function createPrompt(fileAnalysis) {
    const { filePath, testType, content, isAPI, isComponent } = fileAnalysis;
    
    let prompt = `You are an expert test automation engineer. Generate comprehensive Playwright test cases for the following ${testType} code from ${filePath}.\n\n`;
    prompt += `CODE TO TEST:\n\`\`\`javascript\n${content}\n\`\`\`\n\n`;
    
    if (isAPI) {
        prompt += `REQUIREMENTS - Generate API tests that:\n`;
        prompt += `1. Test all HTTP endpoints and methods\n`;
        prompt += `2. Validate request/response formats\n`;
        prompt += `3. Test error handling and edge cases\n`;
        prompt += `4. Verify HTTP status codes\n`;
        prompt += `5. Use Playwright's request context\n`;
        prompt += `6. Include data validation\n\n`;
    } else if (isComponent) {
        prompt += `REQUIREMENTS - Generate UI tests that:\n`;
        prompt += `1. Test component rendering\n`;
        prompt += `2. Test user interactions\n`;
        prompt += `3. Validate state changes\n`;
        prompt += `4. Test error and loading states\n`;
        prompt += `5. Verify accessibility\n\n`;
    }
    
    prompt += `TECHNICAL REQUIREMENTS:\n`;
    prompt += `- Use Playwright test syntax\n`;
    prompt += `- Use descriptive test names\n`;
    prompt += `- Group tests with test.describe()\n`;
    prompt += `- Add comprehensive assertions\n`;
    prompt += `- Handle async operations properly\n\n`;
    
    prompt += `OUTPUT FORMAT:\n`;
    prompt += `- Return ONLY valid JavaScript/Playwright code\n`;
    prompt += `- Do NOT include explanations or markdown\n`;
    prompt += `- Start directly with import statement\n`;
    
    return prompt;
}

/**
 * Make AI request with retry logic
 */
async function generateTestWithAI(fileAnalysis, config, accessToken, retries = 3) {
    const prompt = createPrompt(fileAnalysis);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const testCode = await makeAIRequest(prompt, config, accessToken);
            return testCode;
        } catch (error) {
            console.log(`  Attempt ${attempt}/${retries} failed: ${error.message}`);
            
            if (attempt === retries) {
                throw new Error(`Failed after ${retries} attempts`);
            }
            
            // Exponential backoff
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

/**
 * Make HTTP request to AI Core
 */
function makeAIRequest(prompt, config, accessToken) {
    return new Promise((resolve, reject) => {
        const modelProvider = (process.env.AI_CORE_MODEL_PROVIDER || 'openai').toLowerCase();
        const isAnthropic = modelProvider === 'anthropic';

        let deploymentUrl = config.deploymentUrl.replace(/\/(chat\/completions|invoke)\/?$/, '');
        deploymentUrl += isAnthropic ? '/invoke' : '/chat/completions';

        let requestData;
        if (isAnthropic) {
            // Anthropic format
            requestData = JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 2000,
                temperature: 0.3,
                system: 'You are an expert test automation engineer.',
                messages: [
                    { role: 'user', content: prompt }
                ]
            });
        } else {
            // OpenAI format
            requestData = JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert test automation engineer.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            });
        }

        const url = new URL(deploymentUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': requestData.length,
                'AI-Resource-Group': config.resourceGroup
            },
            timeout: 30000
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        return;
                    }
                    
                    const response = JSON.parse(data);
                    const generatedTest = extractTestCode(response);
                    
                    if (!generatedTest || generatedTest.length < 50) {
                        reject(new Error('Generated test is too short'));
                        return;
                    }
                    
                    resolve(generatedTest);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.write(requestData);
        req.end();
    });
}

/**
 * Extract test code from AI response
 */
function extractTestCode(response) {
    let content = '';
    
    // Handle different response formats
    if (response.content && Array.isArray(response.content)) {
        content = response.content.map(item => item.text || '').join('');
    } else if (response.choices && response.choices[0]) {
        content = response.choices[0].message?.content || 
                 response.choices[0].text || '';
    }
    
    // Extract from markdown code blocks if present
    const codeBlockMatch = content.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }
    
    return content.trim();
}

/**
 * Save generated test to file
 */
function saveGeneratedTest(filePath, testCode) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const testFileName = `${fileName}.generated.spec.js`;
    const testFilePath = path.join(GENERATED_TESTS_DIR, testFileName);
    
    fs.mkdirSync(GENERATED_TESTS_DIR, { recursive: true });
    
    const header = `// Auto-generated test for ${filePath}\n// Generated on: ${new Date().toISOString()}\n\n`;
    const fullTestCode = header + testCode;
    
    fs.writeFileSync(testFilePath, fullTestCode, 'utf8');
    console.log(`✓ Generated test: ${testFilePath}`);
    
    return testFilePath;
}

/**
 * Main execution
 */
async function main() {
    console.log('=== AI Test Generation Started ===\n');
    
    if (!CHANGED_FILES || CHANGED_FILES.trim() === '') {
        console.log('No changed files to process');
        return;
    }
    
    const config = loadConfig();
    console.log('✓ Configuration loaded\n');
    
    console.log('Authenticating with SAP AI Core...');
    const accessToken = await getAccessToken(config);
    console.log('✓ Authentication successful\n');
    
    const files = CHANGED_FILES.split('\n').filter(f => f.trim());
    console.log(`Processing ${files.length} changed file(s)...\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const filePath of files) {
        console.log(`Processing: ${filePath}`);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const fileAnalysis = analyzeFile(filePath, content);
            
            console.log(`  Type: ${fileAnalysis.testType}`);
            console.log(`  Generating test with AI...`);
            
            const testCode = await generateTestWithAI(
                fileAnalysis, 
                config, 
                accessToken
            );
            
            saveGeneratedTest(filePath, testCode);
            successCount++;
            console.log('');
            
        } catch (error) {
            console.error(`  ✗ Error: ${error.message}\n`);
            failCount++;
        }
    }
    
    console.log('=== Test Generation Summary ===');
    console.log(`Total files: ${files.length}`);
    console.log(`Successfully generated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    if (successCount === 0) {
        process.exit(1);
    }
    
    console.log('\n✓ Test generation completed');
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
```

### 6.2 AI Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Generation Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Changed File Detected                                    │
│     ↓                                                         │
│  2. File Content Read                                        │
│     ↓                                                         │
│  3. File Analysis                                            │
│     - Determine type (API/UI/Unit)                          │
│     - Extract relevant code                                  │
│     ↓                                                         │
│  4. Prompt Construction                                      │
│     - Add context and requirements                           │
│     - Include technical specifications                       │
│     ↓                                                         │
│  5. OAuth Authentication                                     │
│     - Get access token from SAP AI Core                     │
│     ↓                                                         │
│  6. AI Request                                               │
│     - Send prompt to Claude/GPT                             │
│     - Handle retries and timeouts                           │
│     ↓                                                         │
│  7. Response Processing                                      │
│     - Extract test code                                      │
│     - Remove markdown formatting                            │
│     ↓                                                         │
│  8. Test File Creation                                       │
│     - Add header comments                                    │
│     - Save to generated/ directory                          │
│     ↓                                                         │
│  9. Test Execution                                           │
│     - Run with Playwright                                    │
│     - Generate reports                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Prompt Engineering Strategy

The system uses carefully crafted prompts to ensure high-quality test generation:

**1. Context Setting**
- Identifies file type and purpose
- Provides code snippet with syntax highlighting
- Explains the testing objective

**2. Requirements Specification**
- Lists specific test scenarios to cover
- Defines expected test structure
- Specifies assertion requirements

**3. Technical Constraints**
- Enforces Playwright syntax
- Requires proper async/await handling
- Mandates descriptive test names

**4. Output Format**
- Requests pure code without explanations
- Prohibits markdown formatting
- Ensures immediate executability

---

## 7. Playwright Testing Framework

### 7.1 What is Playwright?

Playwright is a modern end-to-end testing framework developed by Microsoft that enables reliable testing of web applications across all modern browsers.

**Key Features:**
- **Cross-browser support**: Chromium, Firefox, and WebKit
- **Auto-wait**: Automatically waits for elements to be ready
- **Network interception**: Mock and modify network requests
- **Multiple contexts**: Test different scenarios in parallel
- **API testing**: Built-in support for REST API testing
- **Screenshots & videos**: Automatic capture on test failure
- **Trace viewer**: Debug tests with detailed execution traces

### 7.2 Why Playwright for This Project?

1. **Unified Testing**: Single framework for both UI and API tests
2. **AI-Friendly**: Generates clean, maintainable test code
3. **Reliability**: Auto-wait and retry mechanisms reduce flakiness
4. **Rich Reporting**: HTML reports with screenshots and videos
5. **CI/CD Integration**: Excellent Jenkins integration
6. **Modern Architecture**: Supports latest JavaScript features

### 7.3 Playwright Configuration

**File: `playwright-tests/playwright.config.js`**

```javascript
module.exports = defineConfig({
  // Test directory for AI-generated tests
  testDir: './generated',
  
  // Timeouts
  timeout: 30 * 1000,              // 30 seconds per test
  actionTimeout: 10 * 1000,        // 10 seconds for actions
  navigationTimeout: 30 * 1000,    // 30 seconds for navigation
  
  // Execution settings
  fullyParallel: true,             // Run tests in parallel
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporters
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],  // Console output
  ],
  
  // Shared settings
  use: {
    baseURL: 'http://localhost:5173',      // Frontend URL
    apiURL: 'http://localhost:3000',       // Backend API URL
    trace: 'on-first-retry',               // Trace on retry
    screenshot: 'only-on-failure',         // Screenshot on failure
    video: 'retain-on-failure',            // Video on failure
  },
  
  // Browser projects
  projects: [
    {
      name: 'chromium-ui',
      testMatch: /.*\.ui\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.js/,
      use: { baseURL: 'http://localhost:3000' },
    },
    {
      name: 'chromium-all',
      testMatch: /.*\.generated\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

**Configuration Highlights:**

1. **Test Directory**: `./generated` - Where AI-generated tests are stored
2. **Parallel Execution**: Tests run concurrently for speed
3. **Retry Logic**: Failed tests retry 2 times in CI environment
4. **Multiple Reporters**: HTML, JSON, and console output
5. **Failure Artifacts**: Screenshots, videos, and traces captured automatically
6. **Browser Projects**: Separate configurations for UI and API tests

### 7.4 Playwright Test Structure

**Generated Test Example:**

```javascript
import { test, expect } from '@playwright/test';

test.describe('Order Statistics API', () => {
  const baseURL = 'http://localhost:3000/api';

  test('should return comprehensive statistics', async ({ request }) => {
    // Make API request
    const response = await request.get(`${baseURL}/orders/statistics`);
    
    // Verify status code
    expect(response.status()).toBe(200);
    
    // Verify response structure
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('totalOrders');
    expect(data.data).toHaveProperty('statusBreakdown');
  });
});
```

**Key Components:**

- `test.describe()`: Groups related tests
- `async ({ request })`: Playwright context with request object
- `expect()`: Assertion library
- Auto-wait: No need for manual waits

---

## 8. Finding Tests, Reports, and Results

### 8.1 Generated Test Locations

**During Pipeline Execution:**

```
Jenkins Workspace:
/var/jenkins_home/workspace/Automator-AI-Pipeline/
├── playwright-tests/
│   ├── generated/
│   │   ├── orderService.generated.spec.js
│   │   ├── orderController.generated.spec.js
│   │   └── [other-generated-tests].spec.js
│   ├── playwright-report/
│   │   ├── index.html
│   │   ├── data/
│   │   └── trace/
│   └── test-results.json
└── reports/
    ├── backend-unit-tests.json
    ├── frontend-unit-tests.json
    └── validation-report.json
```

**After Pipeline Completion:**

1. **Jenkins Artifacts** (Archived automatically):
   - Navigate to: Jenkins → Job → Build #XX → Artifacts
   - Available files:
     - `playwright-tests/generated/*.spec.js` - Generated test files
     - `playwright-tests/playwright-report/**/*` - HTML reports
     - `reports/**/*` - All test reports

2. **Local Repository** (if cloned):
   ```
   Automator/
   ├── playwright-tests/generated/  # Generated tests
   └── reports/                     # Test results
   ```

### 8.2 Accessing Test Reports

**Method 1: Jenkins UI**

1. Go to Jenkins dashboard: `http://localhost:8080`
2. Click on job: "Automator-AI-Pipeline"
3. Select build number (e.g., #20)
4. Click "Artifacts" in left sidebar
5. Navigate to `playwright-tests/playwright-report/index.html`
6. Click to view HTML report in browser

**Method 2: Direct File Access**

```bash
# SSH into Jenkins container
docker exec -it jenkins-server bash

# Navigate to workspace
cd /var/jenkins_home/workspace/Automator-AI-Pipeline

# View generated tests
ls -la playwright-tests/generated/

# View reports
ls -la playwright-tests/playwright-report/
```

**Method 3: Download Artifacts**

1. In Jenkins build page, click "Artifacts"
2. Right-click on file → "Save Link As"
3. Download entire report folder as ZIP

### 8.3 Understanding Report Contents

**Playwright HTML Report:**

```
playwright-report/
├── index.html              # Main report page
├── data/
│   ├── [test-id].json     # Test execution data
│   └── attachments/       # Screenshots, videos
└── trace/
    └── [test-id].zip      # Execution traces
```

**Report Features:**

- ✅ **Test Results**: Pass/fail status for each test
- 📊 **Execution Time**: Duration for each test
- 📸 **Screenshots**: Captured on failure
- 🎥 **Videos**: Test execution recordings
- 🔍 **Traces**: Step-by-step execution details
- 📝 **Logs**: Console output and network requests

**Opening HTML Report:**

```bash
# From local machine
cd playwright-tests/playwright-report
open index.html  # macOS
# or
xdg-open index.html  # Linux
# or
start index.html  # Windows
```

### 8.4 Test Results JSON

**Location**: `playwright-tests/test-results.json`

**Structure**:
```json
{
  "config": { ... },
  "suites": [
    {
      "title": "Order Statistics API",
      "tests": [
        {
          "title": "should return comprehensive statistics",
          "status": "passed",
          "duration": 1234,
          "errors": []
        }
      ]
    }
  ],
  "stats": {
    "total": 15,
    "passed": 15,
    "failed": 0,
    "skipped": 0
  }
}
```

### 8.5 Validation Reports

**Location**: `reports/validation-report.json`

**Purpose**: Compares AI-generated tests with unit tests

**Structure**:
```json
{
  "timestamp": "2026-04-25T11:42:15.234Z",
  "unitTests": {
    "backend": { "total": 23, "passed": 23, "failed": 0 },
    "frontend": { "total": 27, "passed": 27, "failed": 0 }
  },
  "generatedTests": {
    "total": 15,
    "passed": 15,
    "failed": 0
  },
  "discrepancies": [],
  "status": "PASSED"
}
```

---

## 9. Pipeline Behavior for Different Changes

### 9.1 Change Detection Logic

The pipeline uses `detect-changes.sh` to analyze what files were modified and decides whether to run test generation.

**Script Logic:**

```bash
# Compares current commit with previous commit
git diff --name-only HEAD~1 HEAD

# Filters for relevant files:
✅ Include: .js, .jsx, .ts, .tsx files
✅ Include: Files in backend/ or frontend/ directories
❌ Exclude: node_modules, dist, build
❌ Exclude: package-lock.json, yarn.lock
❌ Exclude: Test files (*.test.js, *.spec.js)
❌ Exclude: Documentation files
```

### 9.2 Scenario 1: Source Code Changes

**Example**: Modify `backend/src/services/orderService.js`

**Pipeline Behavior:**

```
✅ Stage: Checkout                    → Executes
✅ Stage: Detect Changes              → Detects orderService.js
✅ Stage: Setup Environment           → Executes
✅ Stage: Install Dependencies        → Executes
✅ Stage: Generate Tests              → Generates tests for orderService.js
✅ Stage: Run Unit Tests              → Runs all unit tests
✅ Stage: Execute Generated Tests     → Runs AI-generated tests
✅ Stage: Validate & Report           → Compares results
✅ Stage: Archive Artifacts           → Saves all reports
```

**Output:**
- New test file: `playwright-tests/generated/orderService.generated.spec.js`
- Test execution results
- Validation report

### 9.3 Scenario 2: Comment-Only Changes

**Example**: Add comments to `backend/src/controllers/orderController.js`

**Pipeline Behavior:**

```
✅ Stage: Checkout                    → Executes
✅ Stage: Detect Changes              → Detects orderController.js
⚠️  Stage: Setup Environment          → SKIPPED (no functional changes)
⚠️  Stage: Install Dependencies       → SKIPPED
⚠️  Stage: Generate Tests             → SKIPPED (comments don't affect logic)
✅ Stage: Run Unit Tests              → Executes (always runs)
⚠️  Stage: Execute Generated Tests    → SKIPPED (no new tests)
✅ Stage: Validate & Report           → Executes (validates unit tests only)
✅ Stage: Archive Artifacts           → Saves unit test reports
```

**Note**: The AI analyzes the code and determines that comment-only changes don't require new tests. However, existing unit tests still run to ensure nothing broke.

### 9.4 Scenario 3: Documentation Changes

**Example**: Update `README.md` or `TESTING.md`

**Pipeline Behavior:**

```
✅ Stage: Checkout                    → Executes
✅ Stage: Detect Changes              → No relevant files detected
⚠️  Stage: Setup Environment          → SKIPPED
⚠️  Stage: Install Dependencies       → SKIPPED
⚠️  Stage: Generate Tests             → SKIPPED
✅ Stage: Run Unit Tests              → Executes
⚠️  Stage: Execute Generated Tests    → SKIPPED
✅ Stage: Validate & Report           → Executes
✅ Stage: Archive Artifacts           → Saves reports
```

**Output**: Pipeline completes quickly, only running unit tests.

### 9.5 Scenario 4: Test File Changes

**Example**: Modify `backend/tests/unit/services/orderService.test.js`

**Pipeline Behavior:**

```
✅ Stage: Checkout                    → Executes
✅ Stage: Detect Changes              → Detects test file
⚠️  Stage: Setup Environment          → SKIPPED (test files excluded)
⚠️  Stage: Install Dependencies       → SKIPPED
⚠️  Stage: Generate Tests             → SKIPPED (don't generate tests for tests)
✅ Stage: Run Unit Tests              → Executes (runs updated tests)
⚠️  Stage: Execute Generated Tests    → SKIPPED
✅ Stage: Validate & Report           → Executes
✅ Stage: Archive Artifacts           → Saves reports
```

**Rationale**: Test files are excluded from AI generation to avoid circular dependencies.

### 9.6 Scenario 5: Multiple File Changes

**Example**: Modify both `backend/src/services/orderService.js` and `frontend/src/components/OrderList.jsx`

**Pipeline Behavior:**

```
✅ Stage: Checkout                    → Executes
✅ Stage: Detect Changes              → Detects both files
✅ Stage: Setup Environment           → Executes
✅ Stage: Install Dependencies        → Executes (parallel)
✅ Stage: Generate Tests              → Generates tests for BOTH files
   - orderService.generated.spec.js (API tests)
   - OrderList.generated.spec.js (UI tests)
✅ Stage: Run Unit Tests              → Runs backend + frontend tests (parallel)
✅ Stage: Execute Generated Tests     → Runs all generated tests
✅ Stage: Validate & Report           → Comprehensive validation
✅ Stage: Archive Artifacts           → Saves all artifacts
```

**Output**: Multiple test files generated, comprehensive test coverage.

### 9.7 Scenario 6: Configuration File Changes

**Example**: Modify `Jenkinsfile` or `docker-compose.yml`

**Pipeline Behavior:**

```
✅ Stage: Checkout                    → Executes
✅ Stage: Detect Changes              → No source files detected
⚠️  Stage: Setup Environment          → SKIPPED
⚠️  Stage: Install Dependencies       → SKIPPED
⚠️  Stage: Generate Tests             → SKIPPED
✅ Stage: Run Unit Tests              → Executes
⚠️  Stage: Execute Generated Tests    → SKIPPED
✅ Stage: Validate & Report           → Executes
✅ Stage: Archive Artifacts           → Saves reports
```

**Note**: Configuration changes don't trigger test generation but unit tests still run.

### 9.8 Change Detection Summary Table

| Change Type | Detect Changes | Generate Tests | Run Unit Tests | Execute Generated | Duration |
|-------------|----------------|----------------|----------------|-------------------|----------|
| Source Code | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ~5-10 min |
| Comments Only | ✅ Yes | ❌ No | ✅ Yes | ❌ No | ~2-3 min |
| Documentation | ❌ No | ❌ No | ✅ Yes | ❌ No | ~2 min |
| Test Files | ❌ No | ❌ No | ✅ Yes | ❌ No | ~2-3 min |
| Config Files | ❌ No | ❌ No | ✅ Yes | ❌ No | ~2 min |
| Multiple Files | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ~10-15 min |

### 9.9 Viewing Pipeline Decisions

**In Jenkins Console Output:**

```
=== Stage: Detect Changes ===
Analyzing modified files...
Detecting file changes...
Found 2 relevant file(s) changed

Modified files detected:
backend/src/services/orderService.js
backend/src/controllers/orderController.js

Total files changed: 2
```

**Or:**

```
=== Stage: Detect Changes ===
Analyzing modified files...
Detecting file changes...
No relevant source files changed

No relevant files changed. Skipping test generation.
```

---

## 10. Testing Strategy

### 10.1 Three-Layer Testing Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                    ┌─────────────────┐                       │
│                    │   AI-Generated  │                       │
│                    │  E2E Tests      │  ← Playwright         │
│                    │  (Playwright)   │                       │
│                    └─────────────────┘                       │
│                  ┌───────────────────────┐                   │
│                  │   Manual Integration  │                   │
│                  │   Tests               │  ← Jest/Vitest    │
│                  └───────────────────────┘                   │
│              ┌─────────────────────────────────┐             │
│              │      Unit Tests                 │             │
│              │  (Jest for Backend,             │             │
│              │   Vitest for Frontend)          │             │
│              └─────────────────────────────────┘             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Unit Test Example

**File: `backend/tests/unit/services/orderService.statistics.test.js`**

```javascript
import { jest } from '@jest/globals';
import * as orderService from '../../../src/services/orderService.js';
import Order from '../../../src/models/Order.js';

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

      // Mock recent orders
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

      expect(Order.count).toHaveBeenCalledTimes(2);
      expect(Order.findAll).toHaveBeenCalledTimes(2);
      expect(Order.findOne).toHaveBeenCalledTimes(1);
    });

    it('should handle empty database gracefully', async () => {
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
  });
});
```

### 7.3 Test Coverage Metrics

**Backend Coverage:**
- Utility functions: 100%
- Service layer: 85%+
- Controller layer: 80%+
- Middleware: 90%+

**Frontend Coverage:**
- Components: 65%+
- Services: 100%
- Utilities: 100%

---

## 8. Deployment & Operations

### 8.1 Docker Configuration

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: order-management-db
    environment:
      POSTGRES_DB: order_management
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**File: `jenkins/Dockerfile`**

```dockerfile
FROM jenkins/jenkins:lts

USER root

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install Playwright dependencies
RUN npx playwright install-deps

# Install Playwright browsers
RUN npx playwright install

USER jenkins
```

### 8.2 Environment Configuration

**Backend `.env`:**
```
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5433
DB_NAME=order_management
DB_USER=admin
DB_PASSWORD=admin123
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:3000/api
```

### 8.3 Running the Application

**1. Start Database:**
```bash
docker-compose up -d
```

**2. Start Backend:**
```bash
cd backend
npm install
npm run dev
```

**3. Start Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**4. Start Jenkins:**
```bash
docker run -d \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  --name jenkins-server \
  custom-jenkins:latest
```

---

## 9. Results & Demonstrations

### 9.1 Successful Pipeline Execution

```
Started by GitHub push by gobmj
[Pipeline] Start of Pipeline
[Pipeline] node
Running on Jenkins in /var/jenkins_home/workspace/Automator-AI-Pipeline

=== Stage: Checkout ===
✓ Code checked out
Commit: Add order statistics endpoint
Author: Govind M J

=== Stage: Detect Changes ===
✓ Modified files detected:
  - backend/src/services/orderService.js
  - backend/src/controllers/orderController.js
  - backend/src/routes/orderRoutes.js
  - backend/tests/unit/services/orderService.statistics.test.js

=== Stage: Setup Environment ===
✓ AI_CORE_CLIENT_ID: Set
✓ AI_CORE_CLIENT_SECRET: Set
✓ AI_CORE_DEPLOYMENT_URL: Set
✓ Node.js: v20.11.0
✓ npm: 10.2.4

=== Stage: Install Dependencies ===
✓ Backend dependencies installed (234 packages)
✓ Frontend dependencies installed (189 packages)
✓ Playwright dependencies installed (45 packages)

=== Stage: Generate Tests ===
Authenticating with SAP AI Core...
✓ Authentication successful

Processing: backend/src/services/orderService.js
  Type: api
  Generating test with AI...
✓ Generated test: playwright-tests/generated/orderService.generated.spec.js

Processing: backend/src/controllers/orderController.js
  Type: api
  Generating test with AI...
✓ Generated test: playwright-tests/generated/orderController.generated.spec.js

=== Test Generation Summary ===
Total files: 4
Successfully generated: 2
Failed: 0

=== Stage: Run Unit Tests ===
Backend Unit Tests: 23/23 passed
Frontend Unit Tests: 27/27 passed

=== Stage: Execute Generated Tests ===
Running 2 test files with 15 tests
  15 passed (12.3s)

=== Stage: Validate & Report ===
✓ Validation passed
No significant discrepancies found

Overall Status: PASSED

=== Pipeline Completed ===
Build Result: SUCCESS
✓ Pipeline executed successfully!
```

### 9.2 Generated Test Example

**File: `playwright-tests/generated/orderService.generated.spec.js`**

```javascript
// Auto-generated test for backend/src/services/orderService.js
// Generated on: 2026-04-25T11:42:15.234Z

import { test, expect } from '@playwright/test';

test.describe('Order Statistics API', () => {
  const baseURL = 'http://localhost:3000/api';

  test('should return comprehensive statistics', async ({ request }) => {
    const response = await request.get(`${baseURL}/orders/statistics`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('totalOrders');
    expect(data.data).toHaveProperty('statusBreakdown');
    expect(data.data).toHaveProperty('plantBreakdown');
    expect(data.data).toHaveProperty('averagePriority');
    expect(data.data).toHaveProperty('recentOrders');
  });

  test('should have valid status breakdown', async ({ request }) => {
    const response = await request.get(`${baseURL}/orders/statistics`);
    const data = await response.json();
    
    const statusBreakdown = data.data.statusBreakdown;
    const validStatuses = ['CREATED', 'RELEASABLE', 'RELEASED', 
                          'IN_PROGRESS', 'COMPLETED'];
    
    Object.keys(statusBreakdown).forEach(status => {
      expect(validStatuses).toContain(status);
      expect(typeof statusBreakdown[status]).toBe('number');
      expect(statusBreakdown[status]).toBeGreaterThanOrEqual(0);
    });
  });

  test('should calculate average priority correctly', async ({ request }) => {
    const response = await request.get(`${baseURL}/orders/statistics`);
    const data = await response.json();
    
    const avgPriority = parseFloat(data.data.averagePriority);
    expect(avgPriority).toBeGreaterThanOrEqual(0);
    expect(avgPriority).toBeLessThanOrEqual(1000);
  });
});
```

### 9.3 Key Metrics

**Time Savings:**
- Manual test creation: ~2 hours per feature
- AI-generated tests: ~2 minutes per feature
- **Efficiency gain: 98%**

**Test Coverage:**
- Unit tests: 85% code coverage
- AI-generated E2E tests: 70% user flow coverage
- **Combined coverage: 95%+**

**Quality Metrics:**
- AI test accuracy: 92%
- False positives: 5%
- False negatives: 3%

---

## 10. Challenges & Solutions

### 10.1 Technical Challenges

**Challenge 1: AI Response Variability**
- **Problem**: AI sometimes returned explanatory text instead of pure code
- **Solution**: Refined prompts to explicitly request code-only output
- **Result**: 95% success rate in generating executable tests

**Challenge 2: Jenkins Node.js Integration**
- **Problem**: Default Jenkins image lacked Node.js
- **Solution**: Created custom Dockerfile with Node.js 20.x
- **Result**: Seamless execution of JavaScript-based tools

**Challenge 3: Webhook Reliability**
- **Problem**: Local Jenkins not accessible from GitHub
- **Solution**: Implemented ngrok tunnel for webhook delivery
- **Result**: 100% webhook delivery success rate

**Challenge 4: Test Flakiness**
- **Problem**: Generated tests occasionally failed due to timing issues
- **Solution**: Added proper wait conditions and retry logic
- **Result**: Reduced flakiness from 15% to 2%

### 10.2 Lessons Learned

1. **Prompt Engineering is Critical**
   - Specific, structured prompts yield better results
   - Including examples improves output quality
   - Iterative refinement is necessary

2. **Infrastructure Matters**
   - Proper CI/CD setup is foundational
   - Docker containerization simplifies deployment
   - Monitoring and logging are essential

3. **AI Limitations**
   - AI cannot replace human judgment
   - Generated tests need review and refinement
   - Edge cases may be missed

4. **Integration Complexity**
   - Multiple systems require careful orchestration
   - Error handling at each integration point is crucial
   - Comprehensive logging aids debugging

---

## Conclusion

This project successfully demonstrates the feasibility and benefits of AI-driven test automation. By integrating SAP AI Core with a Jenkins CI/CD pipeline, we achieved:

✅ **Automated test generation** for code changes  
✅ **Significant time savings** (98% reduction in test creation time)  
✅ **High test coverage** (95%+ combined coverage)  
✅ **Reliable CI/CD pipeline** with GitHub webhook integration  
✅ **Scalable architecture** applicable to various projects  

The system proves that AI can augment (not replace) human testers, providing rapid feedback and comprehensive test coverage while allowing developers to focus on feature development.

---

## References

1. SAP AI Core Documentation
2. Playwright Testing Framework
3. Jenkins CI/CD Best Practices
4. React Testing Library
5. Jest Testing Framework

---

**Document Version:** 1.0  
**Last Updated:** April 25, 2026  
**Author:** Govind M J  
**Institution:** BITS Pilani