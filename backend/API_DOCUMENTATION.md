# Order Management API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
Currently, no authentication is required. This will be added in future phases.

---

## Endpoints

### Health Check

#### GET /health
Check if the server is running.

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-04-08T12:42:58.863Z"
}
```

---

## Orders

### Create Order

#### POST /api/orders

Create a new order in the system.

**Request Body:**
```json
{
  "orderNumber": "TEST-001",
  "material": "FORKLIFT-FRAME",
  "quantity": 5,
  "priority": 500,
  "status": "RELEASABLE",
  "plant": "DT6364",
  "scheduledStartDate": "2026-04-09T00:00:00Z",
  "scheduledCompletionDate": "2026-04-15T00:00:00Z"
}
```

**Validation Rules:**
- `orderNumber`: Required, max 50 characters
- `material`: Required, max 100 characters
- `quantity`: Required, positive integer
- `priority`: Optional, integer between 1-1000 (default: 500)
- `status`: Optional, one of: CREATED, RELEASABLE, RELEASED, IN_PROGRESS, COMPLETED
- `plant`: Required, max 50 characters
- `scheduledStartDate`: Required, ISO 8601 date
- `scheduledCompletionDate`: Required, ISO 8601 date, must be after start date

**Success Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "orderId": "ORD-2026-9613",
    "orderNumber": "TEST-001",
    "material": "FORKLIFT-FRAME",
    "quantity": 5,
    "priority": 500,
    "status": "RELEASABLE",
    "plant": "DT6364",
    "createdDate": "2026-04-08T12:43:07.680Z",
    "scheduledStartDate": "2026-04-09T00:00:00.000Z",
    "scheduledCompletionDate": "2026-04-15T00:00:00.000Z",
    "updated_at": "2026-04-08T12:43:07.680Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be a positive integer"
    }
  ]
}
```

---

### Get All Orders

#### GET /api/orders

Retrieve a paginated list of orders with optional filtering and sorting.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page, max 100 (default: 10)
- `status` (optional): Filter by status
- `plant` (optional): Filter by plant
- `sortBy` (optional): Sort field (createdDate, scheduledStartDate, scheduledCompletionDate, priority, quantity)
- `sortOrder` (optional): ASC or DESC (default: DESC)

**Example:**
```
GET /api/orders?page=1&limit=10&status=RELEASABLE&sortBy=createdDate&sortOrder=DESC
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "orderId": "ORD-2026-9613",
      "orderNumber": "TEST-001",
      "material": "FORKLIFT-FRAME",
      "quantity": 5,
      "priority": 500,
      "status": "RELEASABLE",
      "plant": "DT6364",
      "createdDate": "2026-04-08T12:43:07.680Z",
      "scheduledStartDate": "2026-04-09T00:00:00.000Z",
      "scheduledCompletionDate": "2026-04-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### Get Order by ID

#### GET /api/orders/:orderId

Retrieve a specific order by its ID.

**Path Parameters:**
- `orderId`: The unique order identifier (e.g., ORD-2026-9613)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderId": "ORD-2026-9613",
    "orderNumber": "TEST-001",
    "material": "FORKLIFT-FRAME",
    "quantity": 5,
    "priority": 500,
    "status": "RELEASABLE",
    "plant": "DT6364",
    "createdDate": "2026-04-08T12:43:07.680Z",
    "scheduledStartDate": "2026-04-09T00:00:00.000Z",
    "scheduledCompletionDate": "2026-04-15T00:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Order not found"
}
```

---

### Update Order

#### PUT /api/orders/:orderId

Update an existing order. Only provided fields will be updated.

**Path Parameters:**
- `orderId`: The unique order identifier

**Request Body (all fields optional):**
```json
{
  "orderNumber": "TEST-002",
  "material": "FORKLIFT-FRAME-V2",
  "quantity": 10,
  "priority": 600,
  "status": "RELEASED",
  "plant": "DT6365",
  "scheduledStartDate": "2026-04-10T00:00:00Z",
  "scheduledCompletionDate": "2026-04-16T00:00:00Z"
}
```

**Note:** The `orderId` field cannot be updated.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order updated successfully",
  "data": {
    "id": 1,
    "orderId": "ORD-2026-9613",
    "orderNumber": "TEST-002",
    "quantity": 10,
    "priority": 600
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Order not found"
}
```

---

### Delete Order

#### DELETE /api/orders/:orderId

Delete an order from the system.

**Path Parameters:**
- `orderId`: The unique order identifier

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Order not found"
}
```

---

### Release Order

#### POST /api/orders/:orderId/release

Release an order for production. The order must have status "RELEASABLE".

**Path Parameters:**
- `orderId`: The unique order identifier

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order released successfully",
  "data": {
    "id": 1,
    "orderId": "ORD-2026-9613",
    "status": "RELEASED"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Cannot release order with status CREATED. Order must be RELEASABLE."
}
```

---

### Get Orders by Status

#### GET /api/orders/status/:status

Retrieve all orders with a specific status.

**Path Parameters:**
- `status`: One of: CREATED, RELEASABLE, RELEASED, IN_PROGRESS, COMPLETED

**Example:**
```
GET /api/orders/status/RELEASABLE
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "orderId": "ORD-2026-9613",
      "status": "RELEASABLE"
    }
  ]
}
```

---

### Search Orders

#### GET /api/orders/search

Search orders by order ID, order number, or material.

**Query Parameters:**
- `q` (required): Search term

**Example:**
```
GET /api/orders/search?q=FORKLIFT
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "orderId": "ORD-2026-9613",
      "orderNumber": "TEST-001",
      "material": "FORKLIFT-FRAME"
    }
  ]
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Search term is required"
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request (validation error) |
| 404  | Not Found |
| 409  | Conflict (duplicate entry) |
| 500  | Internal Server Error |

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Specific error message"
    }
  ]
}
```

---

## Order Status Workflow

```
CREATED → RELEASABLE → RELEASED → IN_PROGRESS → COMPLETED
```

**Status Transitions:**
- Orders can only be released when status is "RELEASABLE"
- Status transitions should follow the workflow above
- Direct status updates are allowed via PUT /api/orders/:orderId

---

## Examples

### cURL Examples

**Create an order:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "TEST-001",
    "material": "FORKLIFT-FRAME",
    "quantity": 5,
    "priority": 500,
    "status": "RELEASABLE",
    "plant": "DT6364",
    "scheduledStartDate": "2026-04-09T00:00:00Z",
    "scheduledCompletionDate": "2026-04-15T00:00:00Z"
  }'
```

**Get all orders:**
```bash
curl http://localhost:3000/api/orders
```

**Get order by ID:**
```bash
curl http://localhost:3000/api/orders/ORD-2026-9613
```

**Update order:**
```bash
curl -X PUT http://localhost:3000/api/orders/ORD-2026-9613 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 10}'
```

**Release order:**
```bash
curl -X POST http://localhost:3000/api/orders/ORD-2026-9613/release
```

**Delete order:**
```bash
curl -X DELETE http://localhost:3000/api/orders/ORD-2026-9613
```

**Search orders:**
```bash
curl "http://localhost:3000/api/orders/search?q=FORKLIFT"
```

---

## Rate Limiting

Currently, no rate limiting is implemented. This will be added in future versions.

---

## Versioning

Current API version: v1 (implicit)

Future versions will use URL versioning: `/api/v2/orders`

---

---

## Analytics

### Get Dashboard Analytics

#### GET /api/analytics/dashboard

Retrieve comprehensive analytics and insights for order management dashboard.

**Query Parameters:**
- `startDate` (optional): Filter analytics from this date (ISO 8601 format)
- `endDate` (optional): Filter analytics until this date (ISO 8601 format)

**Example:**
```
GET /api/analytics/dashboard
GET /api/analytics/dashboard?startDate=2026-05-01&endDate=2026-05-31
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOrders": 150,
      "overdueCount": 5,
      "recentOrders": 23,
      "averagePriority": "542.50",
      "averageQuantity": "8.75"
    },
    "statusBreakdown": {
      "CREATED": 20,
      "RELEASABLE": 35,
      "RELEASED": 40,
      "IN_PROGRESS": 30,
      "COMPLETED": 25
    },
    "plantPerformance": [
      {
        "plant": "DT6364",
        "orderCount": 75,
        "totalQuantity": 650,
        "avgPriority": "520.00"
      },
      {
        "plant": "DT6365",
        "orderCount": 75,
        "totalQuantity": 700,
        "avgPriority": "565.00"
      }
    ],
    "topMaterials": [
      {
        "material": "FORKLIFT-FRAME",
        "orderCount": 45,
        "totalQuantity": 400
      },
      {
        "material": "ENGINE-BLOCK",
        "orderCount": 30,
        "totalQuantity": 250
      }
    ],
    "priorityDistribution": [
      {
        "range": "Critical (1-200)",
        "count": 15
      },
      {
        "range": "High (201-400)",
        "count": 25
      },
      {
        "range": "Medium (401-600)",
        "count": 50
      },
      {
        "range": "Low (601-800)",
        "count": 40
      },
      {
        "range": "Very Low (801-1000)",
        "count": 20
      }
    ],
    "overdueOrders": [
      {
        "orderId": "ORD-2026-9613",
        "orderNumber": "TEST-001",
        "material": "FORKLIFT-FRAME",
        "status": "IN_PROGRESS",
        "scheduledCompletionDate": "2026-04-01T00:00:00.000Z",
        "priority": 800,
        "daysOverdue": 57
      }
    ],
    "timeline": [
      {
        "date": "2026-05-01",
        "ordersCreated": 5
      },
      {
        "date": "2026-05-02",
        "ordersCreated": 8
      }
    ]
  }
}
```

**Response Fields:**

- `summary`: Overall statistics
  - `totalOrders`: Total number of orders (filtered by date range if provided)
  - `overdueCount`: Number of orders past their scheduled completion date
  - `recentOrders`: Orders created in the last 7 days
  - `averagePriority`: Average priority across all orders
  - `averageQuantity`: Average quantity across all orders

- `statusBreakdown`: Count of orders by status

- `plantPerformance`: Performance metrics per plant
  - `orderCount`: Number of orders for this plant
  - `totalQuantity`: Sum of quantities for this plant
  - `avgPriority`: Average priority for this plant

- `topMaterials`: Top 10 most frequently ordered materials
  - `orderCount`: Number of orders for this material
  - `totalQuantity`: Total quantity ordered for this material

- `priorityDistribution`: Distribution of orders across priority ranges

- `overdueOrders`: List of up to 20 overdue orders (not completed and past scheduled completion date)
  - `daysOverdue`: Number of days past the scheduled completion date

- `timeline`: Daily order creation count for the last 30 days

**Use Cases:**
- Dashboard visualization
- Production planning insights
- Resource allocation decisions
- Performance monitoring
- Identifying bottlenecks and overdue orders

---

## Support

For issues or questions, please refer to the main README.md or contact the project maintainer.
