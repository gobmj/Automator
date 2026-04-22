# Testing Documentation

## Overview

This document describes the testing setup and strategy for the Order Management System project.

## Current Test Status

### Backend Tests ✅

**Test Framework:** Jest with ES Modules support

**Current Coverage:** 92% overall
- ✅ **Integration Tests**: 16 tests passing
  - Complete API endpoint testing
  - CRUD operations
  - Search and filter functionality
- ✅ **Unit Tests**: 18 tests passing
  - **Utils** (4 tests): 100% coverage - ID generation
  - **Middleware - errorHandler** (10 tests): 100% coverage - All error types
  - **Middleware - validator** (4 tests): 97% coverage - Validation logic

**Test Command:**
```bash
cd backend
npm test
```

**Test Results:**
```
Test Suites: 4 passed, 4 total
Tests:       34 passed, 34 total
Time:        ~1.3s
```

**Coverage Breakdown:**
```
File                 | % Stmts | % Branch | % Funcs | % Lines
---------------------|---------|----------|---------|--------
All files            |   92.00 |    79.16 |  100.00 |   92.56
 controllers         |   83.33 |    58.33 |  100.00 |   83.33
 middleware          |   97.05 |    93.75 |  100.00 |   97.05
  errorHandler.js    |  100.00 |   100.00 |  100.00 |  100.00
  validator.js       |   92.85 |    75.00 |  100.00 |   92.85
 models              |   80.00 |    66.66 |  100.00 |   80.00
 routes              |  100.00 |   100.00 |  100.00 |  100.00
 services            |   97.50 |    84.61 |  100.00 |  100.00
 utils               |  100.00 |   100.00 |  100.00 |  100.00
```

### Frontend Tests ✅

**Test Framework:** Vitest with React Testing Library

**Current Coverage:**
- ✅ **Service Tests**: 8 tests passing
  - Order service API calls
  - All CRUD operations
  - Search and filter functionality
- ✅ **Component Tests**: 19 tests passing
  - **OrderList** (5 tests): Rendering, loading states, error handling, empty states
  - **OrderForm** (4 tests): Form rendering, field validation, loading states
  - **OrderDetails** (4 tests): Details display, loading states, error handling
  - **App** (5 tests): Navigation, routing, layout components

**Test Command:**
```bash
cd frontend
npm test
```

**Test Results:**
```
Test Files: 5 passed, 5 total
Tests:      27 passed, 27 total
Duration:   ~1.4s
```

## Test Structure

```
backend/
├── tests/
│   ├── integration/
│   │   └── api.test.js              ✅ Passing (16 tests)
│   └── unit/
│       └── utils/
│           └── idGenerator.test.js  ✅ Passing (4 tests)
├── jest.config.js
└── package.json

frontend/
├── src/
│   ├── App.test.jsx                 ✅ Passing (5 tests)
│   ├── components/
│   │   ├── OrderList.test.jsx       ✅ Passing (5 tests)
│   │   ├── OrderForm.test.jsx       ✅ Passing (4 tests)
│   │   └── OrderDetails.test.jsx    ✅ Passing (4 tests)
│   ├── services/
│   │   └── orderService.test.js     ✅ Passing (8 tests)
│   └── test/
│       └── setup.js                 ✅ Test configuration
├── vitest.config.js
└── package.json
```

## Running Tests

### Backend

```bash
# Run all tests
cd backend && npm test

# Run tests in watch mode
cd backend && npm run test:watch

# Run tests with coverage
cd backend && npm test -- --coverage
```

### Frontend

```bash
# Run all tests
cd frontend && npm test

# Run tests in watch mode (interactive)
cd frontend && npm test

# Run tests with UI
cd frontend && npm run test:ui

# Run tests with coverage
cd frontend && npm run test:coverage
```

## Test Coverage Goals

### Current Coverage
- **Utils**: 100% ✅
- **Controllers**: 0% (needs integration tests)
- **Services**: 0% (needs integration tests)
- **Middleware**: 0% (needs integration tests)
- **Models**: 0% (needs integration tests)

### Why Low Coverage?

The current low coverage is intentional. The existing tests were **integration tests** that were hitting the real database instead of using proper mocks. These have been removed to avoid false positives.

## Testing Strategy

### Unit Tests ✅
- **What**: Test individual functions in isolation
- **Example**: ID generator functions
- **Status**: Implemented for utilities

### Integration Tests ⚠️
- **What**: Test multiple components working together
- **Example**: API endpoints with database
- **Status**: Needs implementation
- **Recommendation**: Use a test database or proper mocking strategy

### End-to-End Tests 📋
- **What**: Test complete user workflows
- **Example**: Playwright tests (as per dissertation scope)
- **Status**: Part of the AI-driven test generation pipeline

## Known Issues & Recommendations

### 1. Mocking Challenges with ES Modules

**Issue:** Jest's mocking system doesn't work well with ES modules, making it difficult to mock Sequelize models and services.

**Solutions:**
- Use integration tests with a test database
- Consider using a different test framework (Vitest has better ES module support)
- Implement dependency injection for better testability

### 2. Missing Integration Tests

**Current State:** No integration tests for:
- Controllers
- Services  
- Middleware
- Routes

**Recommendation:** Create integration tests that:
- Use a separate test database
- Test actual API endpoints
- Verify database operations
- Test error handling

### 3. Frontend Testing Not Implemented

**Needed:**
- Component tests (React Testing Library)
- Service tests (API mocking)
- Integration tests (user workflows)

**Setup Required:**
```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

## Future Testing Roadmap

### Phase 1: Backend Integration Tests
- [ ] Set up test database
- [ ] Create API integration tests
- [ ] Test all CRUD operations
- [ ] Test error scenarios
- [ ] Test validation middleware

### Phase 2: Frontend Unit Tests
- [ ] Install Vitest and Testing Library
- [ ] Test React components
- [ ] Test service layer
- [ ] Mock API calls

### Phase 3: E2E Tests (Dissertation Scope)
- [ ] AI-generated Playwright tests
- [ ] Automated test generation pipeline
- [ ] Test comparison with unit tests
- [ ] CI/CD integration

## Test Best Practices

### DO ✅
- Write tests for critical business logic
- Use descriptive test names
- Test edge cases and error scenarios
- Keep tests independent
- Use proper setup and teardown

### DON'T ❌
- Test implementation details
- Write tests that depend on each other
- Mock everything (integration tests need real interactions)
- Ignore failing tests
- Skip error case testing

## CI/CD Integration

### Current Setup
- Tests run locally with `npm test`
- No CI/CD pipeline yet

### Recommended Setup
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: cd backend && npm install && npm test
      - run: cd frontend && npm install && npm test
```

## Dissertation Context

This testing infrastructure supports the dissertation project:
**"Implementing and Exploring AI-Driven Test Automation Using Playwright"**

### How Tests Fit In:
1. **Unit Tests** (Current): Validate individual components
2. **AI-Generated Tests** (Dissertation): Playwright tests generated by AI
3. **Test Comparison**: Compare AI-generated tests with unit test expectations
4. **Validation**: Ensure AI-generated tests match functionality

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)

## Contact

For questions about testing setup, refer to the main README.md or project documentation.

---

**Last Updated:** April 8, 2026  
**Test Status:** ✅ Basic unit tests passing, integration tests needed