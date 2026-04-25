# BDD (Behavior-Driven Development) Test Approach

## Overview

This project uses a **two-phase AI-driven BDD approach** for test generation:

1. **Phase 1**: Generate Cucumber/Gherkin Feature files (business-readable scenarios)
2. **Phase 2**: Generate Step Definitions (technical implementation)

This approach ensures tests are both **business-friendly** and **technically robust**.

---

## Why BDD?

### Benefits

1. **Business-Readable**: Stakeholders can understand and validate test scenarios
2. **Living Documentation**: Feature files serve as up-to-date system documentation
3. **Collaboration**: Bridges gap between business and technical teams
4. **Reusability**: Step definitions can be reused across multiple scenarios
5. **Clarity**: Separates WHAT (features) from HOW (steps)

### Traditional vs BDD Approach

**Traditional Approach:**
```javascript
test('should create order', async ({ request }) => {
  const response = await request.post('/api/orders', { data: {...} });
  expect(response.status()).toBe(201);
});
```

**BDD Approach:**
```gherkin
Scenario: Create a new order successfully
  Given I have valid order data
  When I send a POST request to "/orders"
  Then the response status should be 201
  And the order should be created in the database
```

---

## Two-Phase Generation Process

### Phase 1: Feature File Generation

**Input**: Source code (backend/frontend)

**AI Prompt Focus**:
- Business capabilities and user stories
- Gherkin syntax (Feature, Scenario, Given/When/Then)
- Success and failure scenarios
- Data tables for complex test data
- Business-friendly language

**Output**: `.feature` files in `playwright-tests/features/`

**Example**:
```gherkin
Feature: Order Management System
  As a manufacturing operations manager
  I want to manage production orders
  So that I can track and control manufacturing processes

  Scenario: Create a new order successfully
    Given I have valid order data
      | field       | value          |
      | orderNumber | TEST-001       |
      | material    | FORKLIFT-FRAME |
      | quantity    | 5              |
    When I send a POST request to "/orders"
    Then the response status should be 201
    And the response should contain "orderId"
```

### Phase 2: Step Definitions Generation

**Input**: Generated feature file + source code context

**AI Prompt Focus**:
- Cucumber step definition syntax
- Playwright API/UI interactions
- Proper async/await patterns
- Assertions and validations
- Setup/teardown hooks
- Shared test context

**Output**: `.steps.js` files in `playwright-tests/step-definitions/`

**Example**:
```javascript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('I have valid order data', async function(dataTable) {
  this.requestData = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    this.requestData[row.field] = row.value;
  });
});

When('I send a POST request to {string}', async function(endpoint) {
  this.response = await this.apiContext.post(endpoint, {
    data: this.requestData
  });
});

Then('the response status should be {int}', async function(statusCode) {
  expect(this.response.status()).toBe(statusCode);
});
```

---

## Pipeline Integration

### Jenkins Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    BDD Pipeline Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Code Change Detected                                     │
│     ↓                                                         │
│  2. Analyze Changed Files                                    │
│     ↓                                                         │
│  3. [PHASE 1] Generate Feature Files                         │
│     - AI analyzes code                                       │
│     - Creates business-readable scenarios                    │
│     - Saves to features/ directory                           │
│     ↓                                                         │
│  4. [PHASE 2] Generate Step Definitions                      │
│     - AI reads generated features                            │
│     - Creates technical implementations                      │
│     - Saves to step-definitions/ directory                   │
│     ↓                                                         │
│  5. Execute BDD Tests                                        │
│     - Run Cucumber with Playwright                           │
│     - Generate reports                                       │
│     ↓                                                         │
│  6. Validate & Report                                        │
│     - Compare with unit tests                                │
│     - Archive artifacts                                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Script Usage

**Generate BDD Tests**:
```bash
# Set environment variables
export CHANGED_FILES="backend/src/services/orderService.js"
export AI_CORE_CLIENT_ID="your-client-id"
export AI_CORE_CLIENT_SECRET="your-secret"
export AI_CORE_DEPLOYMENT_URL="your-deployment-url"

# Run BDD test generation
node jenkins/scripts/generate-bdd-tests.js
```

**Execute BDD Tests**:
```bash
cd playwright-tests
npx cucumber-js features/ --require step-definitions/
```

---

## File Structure

```
playwright-tests/
├── features/                          # Gherkin feature files
│   ├── order-management.feature       # Business scenarios
│   └── [component].feature            # Generated features
│
├── step-definitions/                  # Step implementations
│   ├── order-management.steps.js      # Step definitions
│   └── [component].steps.js           # Generated steps
│
├── generated/                         # Traditional Playwright tests
│   ├── orderService.generated.spec.js
│   └── *.generated.spec.js
│
├── cucumber.js                        # Cucumber configuration
└── BDD_APPROACH.md                    # This document
```

---

## Example: Complete BDD Test

### Feature File (`order-management.feature`)

```gherkin
Feature: Order Management System
  As a manufacturing operations manager
  I want to manage production orders
  So that I can track and control manufacturing processes

  Background:
    Given the Order Management API is available at "http://localhost:3000/api"
    And the database is initialized

  Scenario: Create a new order successfully
    Given I have valid order data
      | field                      | value                  |
      | orderNumber                | TEST-001               |
      | material                   | FORKLIFT-FRAME         |
      | quantity                   | 5                      |
      | priority                   | 500                    |
      | status                     | CREATED                |
      | plant                      | DT6364                 |
      | scheduledStartDate         | 2026-04-26T00:00:00Z   |
      | scheduledCompletionDate    | 2026-05-01T00:00:00Z   |
    When I send a POST request to "/orders"
    Then the response status should be 201
    And the response should contain "success" as true
    And the response should contain "orderId"
    And the order should be created in the database

  Scenario: Fail to create order with invalid quantity
    Given I have order data with invalid quantity
      | field    | value |
      | quantity | -5    |
    When I send a POST request to "/orders"
    Then the response status should be 400
    And the response should contain validation error for "quantity"
```

### Step Definitions (`order-management.steps.js`)

```javascript
import { Given, When, Then, After } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

let apiContext;
let requestData;
let response;
let responseData;

Given('the Order Management API is available at {string}', async function(url) {
  apiContext = await this.request.newContext({
    baseURL: url,
    extraHTTPHeaders: { 'Content-Type': 'application/json' }
  });
});

Given('I have valid order data', async function(dataTable) {
  requestData = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    requestData[row.field] = row.value;
  });
  // Convert numeric fields
  if (requestData.quantity) requestData.quantity = parseInt(requestData.quantity);
  if (requestData.priority) requestData.priority = parseInt(requestData.priority);
});

When('I send a POST request to {string}', async function(endpoint) {
  response = await apiContext.post(endpoint, { data: requestData });
  responseData = await response.json();
});

Then('the response status should be {int}', async function(statusCode) {
  expect(response.status()).toBe(statusCode);
});

Then('the response should contain {string} as true', async function(field) {
  expect(responseData[field]).toBe(true);
});

After(async function() {
  // Cleanup test data
  if (responseData?.data?.orderId) {
    await apiContext.delete(`/orders/${responseData.data.orderId}`);
  }
});
```

---

## Advantages of This Approach

### 1. **Separation of Concerns**
- **Features**: Business logic and requirements
- **Steps**: Technical implementation details

### 2. **Maintainability**
- Change business requirements → Update feature files
- Change technical implementation → Update step definitions
- No need to touch both simultaneously

### 3. **Reusability**
- Same step definitions work across multiple scenarios
- Common steps (Given/When/Then) shared across features

### 4. **Collaboration**
- Product owners write/review feature files
- Developers implement step definitions
- QA validates both layers

### 5. **Living Documentation**
- Feature files document system behavior
- Always up-to-date (tests fail if outdated)
- Business-readable specifications

---

## Best Practices

### Feature Files

1. **Use business language**: Avoid technical jargon
2. **Focus on behavior**: Describe WHAT, not HOW
3. **Keep scenarios independent**: Each should run standalone
4. **Use data tables**: For complex test data
5. **Group related scenarios**: Use Feature and Scenario Outline

### Step Definitions

1. **Keep steps atomic**: One action per step
2. **Use shared context**: Store state in `this` or global variables
3. **Handle cleanup**: Use After hooks
4. **Make steps reusable**: Generic enough for multiple scenarios
5. **Add proper assertions**: Validate all expected outcomes

---

## Running BDD Tests

### Local Development

```bash
# Install dependencies
cd playwright-tests
npm install @cucumber/cucumber

# Run all features
npx cucumber-js features/ --require step-definitions/

# Run specific feature
npx cucumber-js features/order-management.feature --require step-definitions/

# Generate HTML report
npx cucumber-js features/ --require step-definitions/ --format html:reports/cucumber-report.html
```

### CI/CD Pipeline

The Jenkins pipeline automatically:
1. Detects code changes
2. Generates feature files (Phase 1)
3. Generates step definitions (Phase 2)
4. Executes BDD tests
5. Archives reports

---

## Comparison: Traditional vs BDD

| Aspect | Traditional Playwright | BDD with Cucumber |
|--------|----------------------|-------------------|
| **Readability** | Technical | Business-friendly |
| **Collaboration** | Developer-focused | Cross-functional |
| **Documentation** | Code comments | Living documentation |
| **Maintenance** | Coupled | Separated concerns |
| **Reusability** | Limited | High (step reuse) |
| **Learning Curve** | Moderate | Higher initially |
| **Flexibility** | High | Moderate |

---

## Future Enhancements

1. **Scenario Outlines**: Data-driven testing with examples
2. **Tags**: Organize and filter scenarios (@smoke, @regression)
3. **Hooks**: Global setup/teardown
4. **Custom Formatters**: Enhanced reporting
5. **Parallel Execution**: Run scenarios concurrently
6. **Visual Regression**: Screenshot comparison in BDD

---

## Resources

- **Cucumber Documentation**: https://cucumber.io/docs/cucumber/
- **Gherkin Syntax**: https://cucumber.io/docs/gherkin/
- **Playwright with Cucumber**: https://playwright.dev/docs/test-runners
- **BDD Best Practices**: https://cucumber.io/docs/bdd/

---

**Last Updated**: April 25, 2026  
**Author**: Govind M J  
**Project**: AI-Driven Test Automation Using Playwright