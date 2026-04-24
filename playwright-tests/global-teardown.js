// global-teardown.js
// Global teardown for Playwright tests

module.exports = async () => {
  console.log('Global teardown: Cleaning up test environment...');
  
  // Add any global teardown logic here
  // For example: cleanup test data, close connections, etc.
  
  console.log('Global teardown completed');
};