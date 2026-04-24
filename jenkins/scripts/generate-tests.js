#!/usr/bin/env node

/**
 * generate-tests.js
 * AI-driven test generation using SAP AI Core
 * Analyzes changed files and generates Playwright tests
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration from environment variables
const CHANGED_FILES = process.env.CHANGED_FILES || '';
const GENERATED_TESTS_DIR = process.env.GENERATED_TESTS_DIR || 'playwright-tests/generated';

// Load AI configuration from environment variables
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
    const required = ['clientId', 'clientSecret', 'authUrl', 'baseUrl', 'deploymentUrl'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
        console.error('Missing required environment variables:');
        missing.forEach(field => {
            const envVar = 'AI_CORE_' + field.replace(/([A-Z])/g, '_$1').toUpperCase();
            console.error(`  - ${envVar}`);
        });
        console.error('\nPlease set these variables in jenkins/config/.env');
        process.exit(1);
    }
    
    return config;
}

// Get OAuth token from SAP AI Core
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

// Read file content
function readFileContent(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
        return null;
    }
}

// Analyze file to determine test type
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
        content: content.substring(0, 3000) // Limit content size for API
    };
}

// Generate test using AI with retry logic
async function generateTestWithAI(fileAnalysis, config, accessToken, retries = 3) {
    const prompt = createPrompt(fileAnalysis);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const testCode = await makeAIRequest(prompt, config, accessToken);
            return testCode;
        } catch (error) {
            console.log(`  Attempt ${attempt}/${retries} failed: ${error.message}`);
            
            if (attempt === retries) {
                throw new Error(`Failed after ${retries} attempts: ${error.message}`);
            }
            
            // Wait before retry (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`  Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

// Make AI request
function makeAIRequest(prompt, config, accessToken) {
    return new Promise((resolve, reject) => {
        const requestData = JSON.stringify({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert test automation engineer. Generate comprehensive Playwright test cases for the provided code. Return only valid JavaScript code for Playwright tests, no explanations.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 2000,
            temperature: 0.3
        });
        
        const url = new URL(config.deploymentUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': requestData.length,
                'AI-Resource-Group': config.resourceGroup || 'default'
            },
            timeout: 30000 // 30 second timeout
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
                    
                    // Check for API errors
                    if (response.error) {
                        reject(new Error(`API Error: ${response.error.message || JSON.stringify(response.error)}`));
                        return;
                    }
                    
                    const generatedTest = extractTestCode(response);
                    
                    if (!generatedTest || generatedTest.length < 50) {
                        reject(new Error('Generated test is too short or empty'));
                        return;
                    }
                    
                    resolve(generatedTest);
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout after 30 seconds'));
        });
        
        req.write(requestData);
        req.end();
    });
}

// Create prompt for AI
function createPrompt(fileAnalysis) {
    const { filePath, testType, content, isAPI, isComponent } = fileAnalysis;
    
    let prompt = `You are an expert test automation engineer. Generate comprehensive Playwright test cases for the following ${testType} code from ${filePath}.\n\n`;
    prompt += `CODE TO TEST:\n\`\`\`javascript\n${content}\n\`\`\`\n\n`;
    
    if (isAPI) {
        prompt += `REQUIREMENTS - Generate API tests that:\n`;
        prompt += `1. Test all HTTP endpoints and methods (GET, POST, PUT, DELETE, etc.)\n`;
        prompt += `2. Validate request/response formats and data structures\n`;
        prompt += `3. Test error handling, edge cases, and boundary conditions\n`;
        prompt += `4. Verify HTTP status codes (200, 201, 400, 404, 500, etc.)\n`;
        prompt += `5. Test authentication and authorization if applicable\n`;
        prompt += `6. Use Playwright's request context (test.request) for API testing\n`;
        prompt += `7. Include data validation and schema checks\n`;
        prompt += `8. Test concurrent requests if relevant\n\n`;
    } else if (isComponent) {
        prompt += `REQUIREMENTS - Generate UI/Component tests that:\n`;
        prompt += `1. Test initial component rendering and DOM structure\n`;
        prompt += `2. Test all user interactions (clicks, inputs, form submissions, etc.)\n`;
        prompt += `3. Validate UI state changes and dynamic content updates\n`;
        prompt += `4. Test error states and loading states\n`;
        prompt += `5. Verify accessibility (ARIA labels, keyboard navigation, etc.)\n`;
        prompt += `6. Test responsive behavior if applicable\n`;
        prompt += `7. Use Playwright's page object model and locators\n`;
        prompt += `8. Include visual regression checks where appropriate\n\n`;
    } else {
        prompt += `REQUIREMENTS - Generate comprehensive tests that:\n`;
        prompt += `1. Cover all major functions and methods\n`;
        prompt += `2. Test both success and failure scenarios\n`;
        prompt += `3. Validate input/output behavior\n`;
        prompt += `4. Test edge cases and boundary conditions\n`;
        prompt += `5. Include integration test scenarios\n\n`;
    }
    
    prompt += `TECHNICAL REQUIREMENTS:\n`;
    prompt += `- Use Playwright test syntax: import { test, expect } from '@playwright/test'\n`;
    prompt += `- Use descriptive test names that explain what is being tested\n`;
    prompt += `- Group related tests using test.describe() blocks\n`;
    prompt += `- Add comprehensive assertions using expect() for all critical paths\n`;
    prompt += `- Handle async operations properly with await\n`;
    prompt += `- Include beforeEach/afterEach hooks for setup and teardown if needed\n`;
    prompt += `- Use proper error handling and try-catch where appropriate\n`;
    prompt += `- Add comments for complex test logic\n`;
    prompt += `- Follow best practices for test isolation and independence\n\n`;
    
    prompt += `OUTPUT FORMAT:\n`;
    prompt += `- Return ONLY valid JavaScript/Playwright test code\n`;
    prompt += `- Do NOT include explanations, markdown formatting, or commentary\n`;
    prompt += `- Do NOT wrap the code in markdown code blocks\n`;
    prompt += `- Start directly with the import statement\n`;
    prompt += `- Ensure the code is production-ready and can be executed immediately\n`;
    
    return prompt;
}

// Extract test code from AI response
function extractTestCode(response) {
    // Handle different response formats from AI Core
    let content = '';
    
    if (response.choices && response.choices[0]) {
        content = response.choices[0].message?.content || response.choices[0].text || '';
    } else if (response.content) {
        content = response.content;
    } else if (response.text) {
        content = response.text;
    }
    
    // Extract code from markdown code blocks if present
    const codeBlockMatch = content.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }
    
    return content.trim();
}

// Save generated test
function saveGeneratedTest(filePath, testCode) {
    // Create test filename
    const fileName = path.basename(filePath, path.extname(filePath));
    const testFileName = `${fileName}.generated.spec.js`;
    const testFilePath = path.join(GENERATED_TESTS_DIR, testFileName);
    
    // Ensure directory exists
    fs.mkdirSync(GENERATED_TESTS_DIR, { recursive: true });
    
    // Add header comment
    const header = `// Auto-generated test for ${filePath}\n// Generated on: ${new Date().toISOString()}\n\n`;
    const fullTestCode = header + testCode;
    
    // Save test file
    fs.writeFileSync(testFilePath, fullTestCode, 'utf8');
    console.log(`✓ Generated test: ${testFilePath}`);
    
    return testFilePath;
}

// Main execution
async function main() {
    console.log('=== AI Test Generation Started ===\n');
    
    // Check if there are changed files
    if (!CHANGED_FILES || CHANGED_FILES.trim() === '') {
        console.log('No changed files to process');
        return;
    }
    
    // Load configuration
    console.log('Loading AI Core configuration...');
    const config = loadConfig();
    console.log('✓ Configuration loaded\n');
    
    // Get access token
    console.log('Authenticating with SAP AI Core...');
    let accessToken;
    try {
        accessToken = await getAccessToken(config);
        console.log('✓ Authentication successful\n');
    } catch (error) {
        console.error('Authentication failed:', error.message);
        console.error('Please check your AI Core credentials');
        process.exit(1);
    }
    
    // Process each changed file
    const files = CHANGED_FILES.split('\n').filter(f => f.trim());
    console.log(`Processing ${files.length} changed file(s)...\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const filePath of files) {
        console.log(`Processing: ${filePath}`);
        
        try {
            // Read file content
            const content = readFileContent(filePath);
            if (!content) {
                console.log(`  ⚠ Skipping (unable to read file)\n`);
                failCount++;
                continue;
            }
            
            // Analyze file
            const fileAnalysis = analyzeFile(filePath, content);
            console.log(`  Type: ${fileAnalysis.testType}`);
            
            // Generate test with AI
            console.log(`  Generating test with AI...`);
            const testCode = await generateTestWithAI(fileAnalysis, config, accessToken);
            
            if (!testCode || testCode.length < 50) {
                console.log(`  ⚠ Generated test is too short or empty\n`);
                failCount++;
                continue;
            }
            
            // Save generated test
            saveGeneratedTest(filePath, testCode);
            successCount++;
            console.log('');
            
        } catch (error) {
            console.error(`  ✗ Error: ${error.message}\n`);
            failCount++;
        }
    }
    
    // Summary
    console.log('=== Test Generation Summary ===');
    console.log(`Total files: ${files.length}`);
    console.log(`Successfully generated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    if (successCount === 0) {
        console.error('\nNo tests were generated successfully');
        process.exit(1);
    }
    
    console.log('\n✓ Test generation completed');
}

// Run main function
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});