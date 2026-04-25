# Auto-generated feature file for Order Management System
# Generated on: 2026-04-25T17:55:12.000Z

Feature: Order Management System
  As a manufacturing operations manager
  I want to manage production orders
  So that I can track and control manufacturing processes

  Background:
    Given the Order Management API is available at "http://localhost:3000/api"
    And the database is initialized

  # Order Creation Scenarios
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

  Scenario: Fail to create order with missing required fields
    Given I have incomplete order data
      | field       | value    |
      | orderNumber | TEST-002 |
    When I send a POST request to "/orders"
    Then the response status should be 400
    And the response should contain an error message

  Scenario: Fail to create order with invalid quantity
    Given I have order data with invalid quantity
      | field                      | value                  |
      | orderNumber                | TEST-003               |
      | material                   | FORKLIFT-FRAME         |
      | quantity                   | -5                     |
      | priority                   | 500                    |
      | status                     | CREATED                |
      | plant                      | DT6364                 |
      | scheduledStartDate         | 2026-04-26T00:00:00Z   |
      | scheduledCompletionDate    | 2026-05-01T00:00:00Z   |
    When I send a POST request to "/orders"
    Then the response status should be 400
    And the response should contain validation error for "quantity"

  # Order Retrieval Scenarios
  Scenario: Retrieve all orders with pagination
    Given there are existing orders in the system
    When I send a GET request to "/orders?page=1&limit=10"
    Then the response status should be 200
    And the response should contain "success" as true
    And the response should contain "data" as an array
    And the response should contain pagination information
      | field      |
      | total      |
      | page       |
      | limit      |
      | totalPages |

  Scenario: Filter orders by status
    Given there are orders with status "CREATED"
    When I send a GET request to "/orders?status=CREATED"
    Then the response status should be 200
    And all returned orders should have status "CREATED"

  Scenario: Filter orders by plant
    Given there are orders for plant "DT6364"
    When I send a GET request to "/orders?plant=DT6364"
    Then the response status should be 200
    And all returned orders should have plant "DT6364"

  Scenario: Retrieve a specific order by ID
    Given an order exists with ID "ORD-12345"
    When I send a GET request to "/orders/ORD-12345"
    Then the response status should be 200
    And the response should contain the order details
    And the order ID should be "ORD-12345"

  Scenario: Fail to retrieve non-existent order
    When I send a GET request to "/orders/NON-EXISTENT-ID"
    Then the response status should be 404
    And the response should contain error "Order not found"

  # Order Update Scenarios
  Scenario: Update an existing order
    Given an order exists with ID "ORD-12345"
    And I have updated order data
      | field    | value          |
      | material | NEW-MATERIAL   |
      | quantity | 10             |
      | priority | 600            |
    When I send a PUT request to "/orders/ORD-12345"
    Then the response status should be 200
    And the response should contain "success" as true
    And the order should be updated with new values

  Scenario: Fail to update non-existent order
    Given I have updated order data
      | field    | value        |
      | material | NEW-MATERIAL |
    When I send a PUT request to "/orders/NON-EXISTENT-ID"
    Then the response status should be 404

  # Order Deletion Scenarios
  Scenario: Delete an existing order
    Given an order exists with ID "ORD-12345"
    When I send a DELETE request to "/orders/ORD-12345"
    Then the response status should be 200
    And the response should contain "success" as true
    And the order should be removed from the database

  Scenario: Fail to delete non-existent order
    When I send a DELETE request to "/orders/NON-EXISTENT-ID"
    Then the response status should be 404

  # Order Release Scenarios
  Scenario: Release a RELEASABLE order
    Given an order exists with status "RELEASABLE"
    And the order ID is "ORD-12345"
    When I send a POST request to "/orders/ORD-12345/release"
    Then the response status should be 200
    And the response should contain "success" as true
    And the order status should be updated to "RELEASED"

  Scenario: Fail to release order with wrong status
    Given an order exists with status "CREATED"
    And the order ID is "ORD-12345"
    When I send a POST request to "/orders/ORD-12345/release"
    Then the response status should be 400
    And the response should contain error "Cannot release order"

  # Search Scenarios
  Scenario: Search orders by term
    Given there are orders with material "UNIQUE-SEARCH-MATERIAL"
    When I send a GET request to "/orders/search?q=UNIQUE-SEARCH"
    Then the response status should be 200
    And the response should contain matching orders

  Scenario: Fail to search without search term
    When I send a GET request to "/orders/search"
    Then the response status should be 400
    And the response should contain error "Search term is required"

  # Statistics Scenarios
  Scenario: Retrieve order statistics
    Given there are orders in the system
    When I send a GET request to "/orders/statistics"
    Then the response status should be 200
    And the response should contain statistics data
      | field           |
      | totalOrders     |
      | statusBreakdown |
      | plantBreakdown  |
      | averagePriority |
      | recentOrders    |

  Scenario: Validate status breakdown in statistics
    Given there are orders with various statuses
    When I send a GET request to "/orders/statistics"
    Then the response status should be 200
    And the status breakdown should contain valid statuses
      | status       |
      | CREATED      |
      | RELEASABLE   |
      | RELEASED     |
      | IN_PROGRESS  |
      | COMPLETED    |

  Scenario: Validate average priority calculation
    Given there are orders with different priorities
    When I send a GET request to "/orders/statistics"
    Then the response status should be 200
    And the average priority should be between 0 and 1000

  # Business Rules
  Scenario: Enforce order status workflow
    Given an order exists with status "CREATED"
    When I try to update the status to "RELEASED"
    Then the system should enforce the status workflow
    And the order should transition through "RELEASABLE" first

  Scenario: Validate priority range
    Given I have order data with priority 1500
    When I send a POST request to "/orders"
    Then the response status should be 400
    And the response should contain validation error for "priority"

  Scenario: Validate quantity is positive
    Given I have order data with quantity 0
    When I send a POST request to "/orders"
    Then the response status should be 400
    And the response should contain validation error for "quantity"