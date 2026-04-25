# AI-Driven Test Automation Using Playwright

**BITS Dissertation Project**  
*Implementing and Exploring AI-Driven Test Automation Using Playwright*

## Project Overview

This project demonstrates an AI-driven test automation system for a manufacturing order management application. The system automatically generates Playwright tests based on code changes and compares them with unit tests to validate functionality.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
├─────────────────────────────────────────────────────────────┤
│  1. Developer writes code + unit tests                       │
│  2. Code pushed to branch → Unit tests validated             │
│  3. Code merged → Jenkins pipeline triggered                 │
│  4. AI analyzes changes → Generates Playwright tests         │
│  5. Generated tests compared with unit test functionality    │
│  6. Tests executed → Results reported                        │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Order Management Application (✅ Complete)

### Technology Stack

**Backend:**
- Node.js 18+ with Express.js
- PostgreSQL 15 (Docker)
- Sequelize ORM
- Jest (Unit Testing)
- Express Validator

**Frontend:**
- React 18+ with Vite
- React Router v6
- Axios (API calls)
- Tailwind CSS (styling)

**Database:**
- PostgreSQL in Docker container
- Port: 5433 (to avoid conflicts)

### Project Structure

```
Automator/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # Sequelize models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Validation & error handling
│   │   └── utils/           # Helper functions
│   ├── tests/unit/          # Unit tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API service layer
│   │   ├── App.jsx          # Main app with routing
│   │   └── index.css        # Tailwind styles
│   └── package.json
├── docker-compose.yml       # PostgreSQL container
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or pnpm

### Installation

1. **Clone the repository**
```bash
cd Automator
```

2. **Start PostgreSQL database**
```bash
docker-compose up -d
```

3. **Set up Backend**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The backend server will start on `http://localhost:3000`

4. **Set up Frontend** (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

5. **Access the Application**

Open your browser and navigate to:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Health Check: http://localhost:3000/health

## Features

### Backend API (✅ Complete)

**8 RESTful Endpoints:**
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders (with pagination/filtering)
- `GET /api/orders/:orderId` - Get specific order
- `PUT /api/orders/:orderId` - Update order
- `DELETE /api/orders/:orderId` - Delete order
- `POST /api/orders/:orderId/release` - Release order for production
- `GET /api/orders/status/:status` - Filter by status
- `GET /api/orders/search?q=term` - Search orders

**Features:**
- ✅ Complete CRUD operations
- ✅ Order status management (CREATED → RELEASABLE → RELEASED → IN_PROGRESS → COMPLETED)
- ✅ Input validation with express-validator
- ✅ Comprehensive error handling
- ✅ Pagination and filtering
- ✅ Search functionality
- ✅ Unit tests with Jest
- ✅ Auto-generated order IDs
- ✅ Database connection pooling
- ✅ CORS and security headers

### Frontend UI (✅ Complete)

**Pages:**
1. **Order List** - View all orders with filtering and pagination
2. **Create Order** - Form to create new orders
3. **Order Details** - View detailed order information
4. **Edit Order** - Update existing orders

**Features:**
- ✅ Responsive design with Tailwind CSS
- ✅ Real-time API integration
- ✅ Status-based filtering
- ✅ Pagination controls
- ✅ Form validation
- ✅ Error handling and loading states
- ✅ Status badges with color coding
- ✅ Confirmation dialogs for destructive actions

## Usage

### Creating an Order

1. Click "Create Order" button
2. Fill in the form:
   - Order Number (e.g., TEST-001)
   - Material (e.g., FORKLIFT-FRAME)
   - Quantity (positive integer)
   - Priority (1-1000)
   - Status (CREATED, RELEASABLE, etc.)
   - Plant (e.g., DT6364)
   - Scheduled dates
3. Click "Create Order"

### Managing Orders

- **View**: Click on any order to see details
- **Edit**: Click "Edit Order" from details page
- **Delete**: Click "Delete" (with confirmation)
- **Release**: Click "Release" for orders with RELEASABLE status
- **Filter**: Use status dropdown to filter orders
- **Navigate**: Use pagination controls for large datasets

## API Documentation

See [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) for complete API reference.

### Quick API Examples

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

## Database Schema

### Orders Table

| Column                    | Type         | Description                          |
|---------------------------|--------------|--------------------------------------|
| id                        | SERIAL       | Primary key                          |
| order_id                  | VARCHAR(50)  | Unique order identifier              |
| order_number              | VARCHAR(50)  | User-provided order number           |
| material                  | VARCHAR(100) | Material/product code                |
| quantity                  | INTEGER      | Order quantity (min: 1)              |
| priority                  | INTEGER      | Priority (1-1000)                    |
| status                    | ENUM         | Order status                         |
| plant                     | VARCHAR(50)  | Manufacturing plant code             |
| created_date              | TIMESTAMP    | Creation timestamp                   |
| scheduled_start_date      | TIMESTAMP    | Scheduled start date                 |
| scheduled_completion_date | TIMESTAMP    | Scheduled completion date            |
| updated_at                | TIMESTAMP    | Last update timestamp                |

**Status Values:**
- `CREATED` - Order created
- `RELEASABLE` - Ready to be released
- `RELEASED` - Released for production
- `IN_PROGRESS` - Currently in production
- `COMPLETED` - Production completed

## Testing

**Run backend unit tests:**
```bash
cd backend
npm test
```

**Test coverage:**
- Utility functions: ✅ 100% coverage
- Service layer: Comprehensive mocking tests
- Controller layer: Request/response tests

## Development

### Backend Development

```bash
cd backend
npm run dev  # Start with nodemon (auto-reload)
npm test     # Run tests
npm run test:watch  # Run tests in watch mode
```

### Frontend Development

```bash
cd frontend
npm run dev  # Start Vite dev server
npm run build  # Build for production
npm run preview  # Preview production build
```

## Troubleshooting

### Database Connection Issues

1. Check if PostgreSQL container is running:
```bash
docker ps | grep order-management-db
```

2. Restart the container:
```bash
docker-compose restart
```

3. Check logs:
```bash
docker logs order-management-db
```

### Port Conflicts

**Backend (Port 3000):**
If port 3000 is in use, update `backend/.env`:
```
PORT=3001
```

**Frontend (Port 5173):**
Vite will automatically use the next available port.

**Database (Port 5433):**
If port 5433 is in use, modify `docker-compose.yml` and `backend/.env`.

### CORS Issues

The backend is configured to allow all origins. For production, update `backend/src/app.js`:
```javascript
app.use(cors({
  origin: 'https://your-frontend-domain.com'
}));
```

## Future Phases

### Phase 2: AI Test Generation Pipeline (Planned)

- Jenkins pipeline configuration
- Code change detection and analysis
- SAP AI Core integration
- Automatic Playwright test generation
- Feature file generation (Cucumber)
- Step file generation based on features

### Phase 3: Test Comparison & Validation (Planned)

- Unit test analysis
- Generated test comparison logic
- Pass/fail determination based on unit tests
- Reporting dashboard
- Coverage analysis

## Project Status

✅ **Phase 1 Complete:**
- Backend API with 8 endpoints
- Frontend UI with 4 pages
- PostgreSQL database
- Full CRUD operations
- Status management
- Comprehensive documentation

🚧 **Next Steps:**
- Phase 2: AI Test Generation Pipeline
- Phase 3: Test Comparison & Validation

## Contributing

This is a dissertation project. For questions or suggestions, please contact the project author.

## License

MIT License - This project is for educational purposes.

## Acknowledgments

- SAP Digital Manufacturing Cloud team
- BITS Pilani
- Cline AI Agent for development assistance

---

**Developed by:** Govind M J 
**Institution:** BITS Pilani  
**Project:** BITS Dissertation - AI-Driven Test Automation Using Playwright

---

*Last updated: April 25, 2026 - Test branch update*
