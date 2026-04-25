#!/usr/bin/env node

/**
 * generate-bdd-tests.js
 * AI-driven BDD test generation using SAP AI Core
 * Two-phase approach: Generate Feature files first, then Step Definitions
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CHANGED_FILES = process.env.CHANGED_FILES || '';
const FEATURES_DIR = process.env.FEATURES_DIR || 'playwright-tests/features';
const STEPS_DIR = process.env.STEPS_DIR || 'playwright-tests/step-definitions';

/**
 * Load AI Core configuration
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
    
    const required = ['clientId', 'clientSecret', 'authUrl', 'baseUrl', 'deploymentUrl'];
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
            res.on('data', (chunk) => { data += chunk; });
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
        content: content.substring(0, 3000)
    };
}

/**
 * PHASE 1: Create prompt for Feature file generation
 */
function createFeaturePrompt(fileAnalysis) {
    const { filePath, testType, content, isAPI, isComponent } = fileAnalysis;
    
    let prompt = `You are an expert BDD test engineer. Generate a Cucumber/Gherkin feature file for the following ${testType} code from ${filePath}.\n\n`;
    prompt += `CODE TO ANALYZE:\n\`\`\`javascript\n${content}\n\`\`\`\n\n`;
    
    prompt += `REQUIREMENTS:\n`;
    prompt += `1. Write in Gherkin syntax (Feature, Scenario, Given, When, Then)\n`;
    prompt += `2. Use business-friendly language that stakeholders can understand\n`;
    prompt += `3. Focus on WHAT the system does, not HOW it does it\n`;
    prompt += `4. Include user stories (As a... I want... So that...)\n`;
    prompt += `5. Cover both success and failure scenarios\n`;
    prompt += `6. Use data tables for complex test data\n`;
    prompt += `7. Group related scenarios logically\n\n`;
    
    if (isAPI) {
        prompt += `API-SPECIFIC REQUIREMENTS:\n`;
        prompt += `- Describe API endpoints as business capabilities\n`;
        prompt += `- Include scenarios for all HTTP methods\n`;
        prompt += `- Cover validation, error handling, and edge cases\n`;
        prompt += `- Use examples for different data combinations\n\n`;
    } else if (isComponent) {
        prompt += `UI-SPECIFIC REQUIREMENTS:\n`;
        prompt += `- Describe user interactions and workflows\n`;
        prompt += `- Include scenarios for different user roles\n`;
        prompt += `- Cover accessibility and responsive design\n`;
        prompt += `- Use examples for different screen sizes\n\n`;
    }
    
    prompt += `OUTPUT FORMAT:\n`;
    prompt += `- Return ONLY valid Gherkin/Cucumber feature file content\n`;
    prompt += `- Start with Feature: declaration\n`;
    prompt += `- Include Background: if needed\n`;
    prompt += `- Use proper indentation (2 spaces)\n`;
    prompt += `- Do NOT include code blocks or explanations\n`;
    prompt += `- Do NOT wrap in markdown\n`;
    
    return prompt;
}

/**
 * PHASE 2: Create prompt for Step Definitions generation
 */
function createStepsPrompt(featureContent, fileAnalysis) {
    const { filePath, testType } = fileAnalysis;
    
    let prompt = `You are an expert test automation engineer. Generate Cucumber step definitions for the following feature file.\n\n`;
    prompt += `FEATURE FILE:\n\`\`\`gherkin\n${featureContent}\n\`\`\`\n\n`;
    
    prompt += `REQUIREMENTS:\n`;
    prompt += `1. Use @cucumber/cucumber syntax (Given, When, Then)\n`;
    prompt += `2. Use Playwright for API/UI interactions\n`;
    prompt += `3. Implement all steps from the feature file\n`;
    prompt += `4. Use proper async/await patterns\n`;
    prompt += `5. Include proper assertions with expect()\n`;
    prompt += `6. Handle data tables and parameters\n`;
    prompt += `7. Include setup and teardown hooks\n`;
    prompt += `8. Use shared context for test state\n\n`;
    
    prompt += `TECHNICAL REQUIREMENTS:\n`;
    prompt += `- Import: import { Given, When, Then, Before, After } from '@cucumber/cucumber'\n`;
    prompt += `- Import: import { expect } from '@playwright/test'\n`;
    prompt += `- Use Playwright's request context for API calls\n`;
    prompt += `- Use Playwright's page context for UI interactions\n`;
    prompt += `- Implement proper error handling\n`;
    prompt += `- Clean up test data in After hooks\n\n`;
    
    prompt += `OUTPUT FORMAT:\n`;
    prompt += `- Return ONLY valid JavaScript code\n`;
    prompt += `- Start with import statements\n`;
    prompt += `- Implement all step definitions\n`;
    prompt += `- Do NOT include explanations or markdown\n`;
    prompt += `- Ensure code is production-ready\n`;
    
    return prompt;
}

/**
 * Make AI request with retry logic
 */
async function makeAIRequest(prompt, config, accessToken, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await executeAIRequest(prompt, config, accessToken);
        } catch (error) {
            console.log(`  Attempt ${attempt}/${retries} failed: ${error.message}`);
            
            if (attempt === retries) {
                throw new Error(`Failed after ${retries} attempts`);
            }
            
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

/**
 * Execute AI request
 */
function executeAIRequest(prompt, config, accessToken) {
    return new Promise((resolve, reject) => {
        const modelProvider = (process.env.AI_CORE_MODEL_PROVIDER || 'openai').toLowerCase();
        const isAnthropic = modelProvider === 'anthropic';

        let deploymentUrl = config.deploymentUrl.replace(/\/(chat\/completions|invoke)\/?$/, '');
        deploymentUrl += isAnthropic ? '/invoke' : '/chat/completions';

        let requestData;
        if (isAnthropic) {
            requestData = JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 3000,
                temperature: 0.3,
                system: 'You are an expert BDD test engineer.',
                messages: [{ role: 'user', content: prompt }]
            });
        } else {
            requestData = JSON.stringify({
                messages: [
                    { role: 'system', content: 'You are an expert BDD test engineer.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 3000,
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
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        return;
                    }
                    
                    const response = JSON.parse(data);
                    const content = extractContent(response);
                    
                    if (!content || content.length < 50) {
                        reject(new Error('Generated content is too short'));
                        return;
                    }
                    
                    resolve(content);
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
 * Extract content from AI response
 */
function extractContent(response) {
    let content = '';
    
    if (response.content && Array.isArray(response.content)) {
        content = response.content.map(item => item.text || '').join('');
    } else if (response.choices && response.choices[0]) {
        content = response.choices[0].message?.content || response.choices[0].text || '';
    }
    
    // Extract from markdown code blocks if present
    const codeBlockMatch = content.match(/```(?:gherkin|javascript|js)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }
    
    return content.trim();
}

/**
 * Save generated feature file
 */
function saveFeatureFile(filePath, featureContent) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const featureFileName = `${fileName}.feature`;
    const featureFilePath = path.join(FEATURES_DIR, featureFileName);
    
    fs.mkdirSync(FEATURES_DIR, { recursive: true });
    
    const header = `# Auto-generated feature file for ${filePath}\n# Generated on: ${new Date().toISOString()}\n\n`;
    const fullContent = header + featureContent;
    
    fs.writeFileSync(featureFilePath, fullContent, 'utf8');
    console.log(`✓ Generated feature: ${featureFilePath}`);
    
    return { featureFilePath, featureContent };
}

/**
 * Save generated step definitions
 */
function saveStepDefinitions(filePath, stepsContent) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const stepsFileName = `${fileName}.steps.js`;
    const stepsFilePath = path.join(STEPS_DIR, stepsFileName);
    
    fs.mkdirSync(STEPS_DIR, { recursive: true });
    
    const header = `// Auto-generated step definitions for ${filePath}\n// Generated on: ${new Date().toISOString()}\n\n`;
    const fullContent = header + stepsContent;
    
    fs.writeFileSync(stepsFilePath, fullContent, 'utf8');
    console.log(`✓ Generated steps: ${stepsFilePath}`);
    
    return stepsFilePath;
}

/**
 * Main execution
 */
async function main() {
    console.log('=== BDD Test Generation Started ===\n');
    console.log('Phase 1: Generate Feature Files');
    console.log('Phase 2: Generate Step Definitions\n');
    
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
        console.log(`\n=== Processing: ${filePath} ===`);
        
        try {
            // Read file content
            const content = fs.readFileSync(filePath, 'utf8');
            const fileAnalysis = analyzeFile(filePath, content);
            console.log(`  Type: ${fileAnalysis.testType}`);
            
            // PHASE 1: Generate Feature File
            console.log(`\n  [Phase 1] Generating feature file...`);
            const featurePrompt = createFeaturePrompt(fileAnalysis);
            const featureContent = await makeAIRequest(featurePrompt, config, accessToken);
            const { featureFilePath } = saveFeatureFile(filePath, featureContent);
            
            // PHASE 2: Generate Step Definitions
            console.log(`  [Phase 2] Generating step definitions...`);
            const stepsPrompt = createStepsPrompt(featureContent, fileAnalysis);
            const stepsContent = await makeAIRequest(stepsPrompt, config, accessToken);
            saveStepDefinitions(filePath, stepsContent);
            
            successCount++;
            console.log(`\n✓ Completed BDD test generation for ${filePath}`);
            
        } catch (error) {
            console.error(`\n✗ Error: ${error.message}`);
            failCount++;
        }
    }
    
    console.log('\n=== BDD Test Generation Summary ===');
    console.log(`Total files: ${files.length}`);
    console.log(`Successfully generated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    if (successCount === 0) {
        console.error('\nNo BDD tests were generated successfully');
        process.exit(1);
    }
    
    console.log('\n✓ BDD test generation completed');
    console.log('\nGenerated files:');
    console.log(`  - Feature files: ${FEATURES_DIR}/`);
    console.log(`  - Step definitions: ${STEPS_DIR}/`);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});