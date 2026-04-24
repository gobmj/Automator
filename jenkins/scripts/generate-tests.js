#!/usr/bin/env node

/**
 * generate-tests.js
 * AI-driven test generation using SAP AI Core
 * Analyzes changed files and generates Playwright tests
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG_FILE = process.env.AI_CONFIG_FILE || 'jenkins/config/ai-config.json';
const CHANGED_FILES = process.env.CHANGED_FILES || '';
const GENERATED_TESTS_DIR = process.env.GENERATED_TESTS_DIR || 'playwright-tests/generated';

// Load AI configuration
function loadConfig() {
    try {
        const configPath = path.resolve(CONFIG_FILE);
        if (!fs.existsSync(configPath)) {
            console.error(`Configuration file not found: ${configPath}`);
            console.error('Please create the configuration file with AI Core credentials');
            process.exit(1);
        }
        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Validate required fields
        const required = ['clientId', 'clientSecret', 'authUrl', 'baseUrl', 'deploymentUrl'];
        for (const field of required) {
            if (!config[field]) {
                console.error(`Missing required field in config: ${field}`);
                process.exit(1);
            }
        }
        
        return config;
    } catch (error) {
        console.error('Error loading configuration:', error.message);
        process.exit(1);
    }
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

// Generate test using AI
async function generateTestWithAI(fileAnalysis, config, accessToken) {
    const prompt = createPrompt(fileAnalysis);
    
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
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    const generatedTest = extractTestCode(response);
                    resolve(generatedTest);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        req.write(requestData);
        req.end();
    });
}

// Create prompt for AI
function createPrompt(fileAnalysis) {
    const { filePath, testType, content, isAPI, isComponent } = fileAnalysis;
    
    let prompt = `Generate Playwright test cases for the following ${testType} code from ${filePath}:\n\n`;
    prompt += `\`\`\`javascript\n${content}\n\`\`\`\n\n`;
    
    if (isAPI) {
        prompt += `Generate API tests that:\n`;
        prompt += `1. Test all endpoints and methods\n`;
        prompt += `2. Validate request/response formats\n`;
        prompt += `3. Test error handling and edge cases\n`;
        prompt += `4. Check status codes and response data\n`;
        prompt += `5. Use Playwright's request context for API testing\n\n`;
    } else if (isComponent) {
        prompt += `Generate UI tests that:\n`;
        prompt += `1. Test component rendering\n`;
        prompt += `2. Test user interactions (clicks, inputs, etc.)\n`;
        prompt += `3. Validate UI state changes\n`;
        prompt += `4. Test accessibility\n`;
        prompt += `5. Use Playwright's page object model\n\n`;
    }
    
    prompt += `Requirements:\n`;
    prompt += `- Use Playwright test syntax\n`;
    prompt += `- Include proper test descriptions\n`;
    prompt += `- Add assertions for all critical paths\n`;
    prompt += `- Handle async operations properly\n`;
    prompt += `- Include setup and teardown if needed\n`;
    prompt += `- Return ONLY the test code, no explanations\n`;
    
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