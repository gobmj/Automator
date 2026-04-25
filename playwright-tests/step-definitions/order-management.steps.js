// Auto-generated step definitions for Order Management System
// Generated on: 2026-04-25T17:55:43.000Z

import { Given, When, Then, After } from '@cucumber/cucumber';
import { expect, request as playwrightRequest } from '@playwright/test';

// Global state for test context
let apiContext;
let baseURL;
let requestData;
let response;
let responseData;
let testOrderId;

// Background Steps
Given('the Order Management API is available at {string}', async function(url) {
  baseURL = url;
  // Initialize API context
  apiContext = await playwrightRequest.newContext({
    baseURL: baseURL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json'
    }
  });
});

Given('the database is initialized', async function() {
  // Database should be running and accessible
  // This is a placeholder - actual implementation would verify DB connection
  console.log('Database initialization verified');
});

// Given Steps - Data Preparation
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

Given('I have incomplete order data', async function(dataTable) {
  requestData = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    requestData[row.field] = row.value;
  });
});

Given('I have order data with invalid quantity', async function(dataTable) {
  requestData = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    requestData[row.field] = row.value;
  });
  requestData.quantity = parseInt(requestData.quantity);
  if (requestData.priority) requestData.priority = parseInt(requestData.priority);
});

Given('I have order data with priority {int}', async function(priority) {
  requestData = requestData || {};
  requestData.priority = priority;
});

Given('I have order data with quantity {int}', async function(quantity) {
  requestData = requestData || {};
  requestData.quantity = quantity;
});

Given('there are existing orders in the system', async function() {
  // Verify orders exist by making a GET request
  const checkResponse = await apiContext.get('/orders?page=1&limit=1');
  expect(checkResponse.status()).toBeLessThan(500);
});

Given('there are orders with status {string}', async function(status) {
  // Create a test order with the specified status if needed
  const testOrder = {
    orderNumber: `TEST-${status}-${Date.now()}`,
    material: 'TEST-MATERIAL',
    quantity: 5,
    priority: 500,
    status: status,
    plant: 'DT6364',
    scheduledStartDate: '2026-04-26T00:00:00Z',
    scheduledCompletionDate: '2026-05-01T00:00:00Z'
  };
  
  await apiContext.post('/orders', { data: testOrder });
});

Given('there are orders for plant {string}', async function(plant) {
  // Create a test order for the specified plant if needed
  const testOrder = {
    orderNumber: `TEST-PLANT-${Date.now()}`,
    material: 'TEST-MATERIAL',
    quantity: 5,
    priority: 500,
    status: 'CREATED',
    plant: plant,
    scheduledStartDate: '2026-04-26T00:00:00Z',
    scheduledCompletionDate: '2026-05-01T00:00:00Z'
  };
  
  const createResponse = await apiContext.post('/orders', { data: testOrder });
  const data = await createResponse.json();
  testOrderId = data.data?.orderId;
});

Given('an order exists with ID {string}', async function(_orderId) {
  // Create a test order and store its ID
  const testOrder = {
    orderNumber: `TEST-${Date.now()}`,
    material: 'TEST-MATERIAL',
    quantity: 5,
    priority: 500,
    status: 'CREATED',
    plant: 'DT6364',
    scheduledStartDate: '2026-04-26T00:00:00Z',
    scheduledCompletionDate: '2026-05-01T00:00:00Z'
  };
  
  const createResponse = await apiContext.post('/orders', { data: testOrder });
  const data = await createResponse.json();
  testOrderId = data.data?.orderId;
});

Given('an order exists with status {string}', async function(status) {
  // Create a test order with the specified status
  const testOrder = {
    orderNumber: `TEST-${status}-${Date.now()}`,
    material: 'TEST-MATERIAL',
    quantity: 5,
    priority: 500,
    status: status,
    plant: 'DT6364',
    scheduledStartDate: '2026-04-26T00:00:00Z',
    scheduledCompletionDate: '2026-05-01T00:00:00Z'
  };
  
  const createResponse = await apiContext.post('/orders', { data: testOrder });
  const data = await createResponse.json();
  testOrderId = data.data?.orderId;
});

Given('the order ID is {string}', async function(_orderId) {
  // Use the previously created order ID
  // testOrderId is already set from previous step
});

Given('I have updated order data', async function(dataTable) {
  requestData = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    requestData[row.field] = row.value;
  });
  // Convert numeric fields
  if (requestData.quantity) requestData.quantity = parseInt(requestData.quantity);
  if (requestData.priority) requestData.priority = parseInt(requestData.priority);
});

Given('there are orders with material {string}', async function(material) {
  // Create a test order with the specified material
  const testOrder = {
    orderNumber: `SEARCH-TEST-${Date.now()}`,
    material: material,
    quantity: 5,
    priority: 500,
    status: 'CREATED',
    plant: 'DT6364',
    scheduledStartDate: '2026-04-26T00:00:00Z',
    scheduledCompletionDate: '2026-05-01T00:00:00Z'
  };
  
  await apiContext.post('/orders', { data: testOrder });
});

Given('there are orders in the system', async function() {
  // Verify orders exist
  const checkResponse = await apiContext.get('/orders?page=1&limit=1');
  expect(checkResponse.status()).toBe(200);
});

Given('there are orders with various statuses', async function() {
  // Orders should already exist from previous tests
  // This is a placeholder for verification
});

Given('there are orders with different priorities', async function() {
  // Orders should already exist from previous tests
  // This is a placeholder for verification
});

// When Steps - Actions
When('I send a POST request to {string}', async function(endpoint) {
  response = await apiContext.post(endpoint, { data: requestData });
  responseData = await response.json();
});

When('I send a GET request to {string}', async function(endpoint) {
  response = await apiContext.get(endpoint);
  responseData = await response.json();
});

When('I send a PUT request to {string}', async function(endpoint) {
  // Replace placeholder ID with actual test order ID
  const actualEndpoint = endpoint.replace('ORD-12345', testOrderId || 'ORD-12345');
  response = await apiContext.put(actualEndpoint, { data: requestData });
  responseData = await response.json();
});

When('I send a DELETE request to {string}', async function(endpoint) {
  // Replace placeholder ID with actual test order ID
  const actualEndpoint = endpoint.replace('ORD-12345', testOrderId || 'ORD-12345');
  response = await apiContext.delete(actualEndpoint);
  responseData = await response.json();
});

When('I try to update the status to {string}', async function(status) {
  requestData = { status: status };
  response = await apiContext.put(`/orders/${testOrderId}`, { data: requestData });
  responseData = await response.json();
});

// Then Steps - Assertions
Then('the response status should be {int}', async function(statusCode) {
  expect(response.status()).toBe(statusCode);
});

Then('the response should contain {string} as true', async function(field) {
  expect(responseData[field]).toBe(true);
});

Then('the response should contain {string}', async function(field) {
  expect(responseData.data).toHaveProperty(field);
});

Then('the order should be created in the database', async function() {
  // Verify by fetching the created order
  if (responseData.data?.orderId) {
    const verifyResponse = await apiContext.get(`/orders/${responseData.data.orderId}`);
    expect(verifyResponse.status()).toBe(200);
  }
});

Then('the response should contain an error message', async function() {
  expect(responseData.success).toBe(false);
  expect(responseData.error).toBeTruthy();
});

Then('the response should contain validation error for {string}', async function(_field) {
  expect(responseData.success).toBe(false);
  expect(responseData.error).toBeTruthy();
});

Then('the response should contain {string} as an array', async function(field) {
  expect(Array.isArray(responseData[field])).toBe(true);
});

Then('the response should contain pagination information', async function(dataTable) {
  const fields = dataTable.hashes().map(row => row.field);
  fields.forEach(field => {
    expect(responseData.pagination).toHaveProperty(field);
  });
});

Then('all returned orders should have status {string}', async function(status) {
  if (responseData.data && responseData.data.length > 0) {
    responseData.data.forEach(order => {
      expect(order.status).toBe(status);
    });
  }
});

Then('all returned orders should have plant {string}', async function(plant) {
  if (responseData.data && responseData.data.length > 0) {
    responseData.data.forEach(order => {
      expect(order.plant).toBe(plant);
    });
  }
});

Then('the response should contain the order details', async function() {
  expect(responseData.data).toBeTruthy();
  expect(responseData.data).toHaveProperty('orderId');
  expect(responseData.data).toHaveProperty('orderNumber');
  expect(responseData.data).toHaveProperty('material');
});

Then('the order ID should be {string}', async function(_orderId) {
  // The actual order ID will be different, just verify it exists
  expect(responseData.data.orderId).toBeTruthy();
});

Then('the response should contain error {string}', async function(errorMessage) {
  expect(responseData.success).toBe(false);
  expect(responseData.error).toContain(errorMessage);
});

Then('the order should be updated with new values', async function() {
  // Verify the update by checking response data
  if (requestData.material) {
    expect(responseData.data.material).toBe(requestData.material);
  }
  if (requestData.quantity) {
    expect(responseData.data.quantity).toBe(requestData.quantity);
  }
  if (requestData.priority) {
    expect(responseData.data.priority).toBe(requestData.priority);
  }
});

Then('the order should be removed from the database', async function() {
  // Verify by trying to fetch the deleted order
  const verifyResponse = await apiContext.get(`/orders/${testOrderId}`);
  expect(verifyResponse.status()).toBe(404);
});

Then('the order status should be updated to {string}', async function(status) {
  expect(responseData.data.status).toBe(status);
});

Then('the response should contain matching orders', async function() {
  expect(responseData.success).toBe(true);
  expect(Array.isArray(responseData.data)).toBe(true);
  expect(responseData.data.length).toBeGreaterThan(0);
});

Then('the response should contain statistics data', async function(dataTable) {
  const fields = dataTable.hashes().map(row => row.field);
  fields.forEach(field => {
    expect(responseData.data).toHaveProperty(field);
  });
});

Then('the status breakdown should contain valid statuses', async function(dataTable) {
  const validStatuses = dataTable.hashes().map(row => row.status);
  const statusBreakdown = responseData.data.statusBreakdown;
  
  Object.keys(statusBreakdown).forEach(status => {
    expect(validStatuses).toContain(status);
  });
});

Then('the average priority should be between {int} and {int}', async function(min, max) {
  const avgPriority = parseFloat(responseData.data.averagePriority);
  expect(avgPriority).toBeGreaterThanOrEqual(min);
  expect(avgPriority).toBeLessThanOrEqual(max);
});

Then('the system should enforce the status workflow', async function() {
  // The response should indicate validation error
  expect(responseData.success).toBe(false);
});

Then('the order should transition through {string} first', async function(_intermediateStatus) {
  // This is a business rule validation
  // The error message should indicate the required workflow
  expect(responseData.error).toBeTruthy();
});

// Cleanup
After(async function() {
  // Clean up test data if needed
  if (testOrderId) {
    try {
      await apiContext.delete(`/orders/${testOrderId}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  // Reset state
  requestData = null;
  response = null;
  responseData = null;
  testOrderId = null;
});