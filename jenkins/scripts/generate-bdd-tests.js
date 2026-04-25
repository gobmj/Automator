#!/usr/bin/env node

/**
 * generate-bdd-tests.js
 * AI-driven BDD test generation using SAP AI Core
 *
 * GENERATION_PHASE controls which phase runs:
 *   'features' - Phase 1: generate Gherkin .feature files from changed source files
 *   'steps'    - Phase 2: generate step definition .js files from existing feature files
 *   'both'     - run both phases sequentially (default)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CHANGED_FILES = process.env.CHANGED_FILES || '';
const FEATURES_DIR = process.env.FEATURES_DIR || 'playwright-tests/features';
const STEPS_DIR = process.env.STEPS_DIR || 'playwright-tests/step-definitions';
const GENERATION_PHASE = (process.env.GENERATION_PHASE || 'both').toLowerCase();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// File analysis
// ---------------------------------------------------------------------------

function analyzeFile(filePath, content) {
    const isController = filePath.includes('controller');
    const isService = filePath.includes('service');
    const isComponent = /\.(jsx|tsx)$/.test(filePath);
    const isAPI = isController || isService;

    return {
        filePath,
        isBackend: filePath.startsWith('backend/'),
        isFrontend: filePath.startsWith('frontend/'),
        isAPI,
        isComponent,
        testType: isAPI ? 'api' : isComponent ? 'ui' : 'unit',
        content: content.substring(0, 3000)
    };
}

function featureFilePathFor(sourceFilePath) {
    const name = path.basename(sourceFilePath, path.extname(sourceFilePath));
    return path.join(FEATURES_DIR, `${name}.feature`);
}

function stepFilePathFor(sourceFilePath) {
    const name = path.basename(sourceFilePath, path.extname(sourceFilePath));
    return path.join(STEPS_DIR, `${name}.steps.js`);
}

// ---------------------------------------------------------------------------
// AI prompts
// ---------------------------------------------------------------------------

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
        prompt += `- Include scenarios for all HTTP methods present\n`;
        prompt += `- Cover validation, error handling, and edge cases\n`;
        prompt += `- Use Scenario Outline with Examples for data-driven cases\n\n`;
    } else if (isComponent) {
        prompt += `UI-SPECIFIC REQUIREMENTS:\n`;
        prompt += `- Describe user interactions and workflows\n`;
        prompt += `- Cover loading states, error states, and empty states\n`;
        prompt += `- Use examples for different input combinations\n\n`;
    }

    prompt += `OUTPUT FORMAT:\n`;
    prompt += `- Return ONLY valid Gherkin/Cucumber feature file content\n`;
    prompt += `- Start with Feature: declaration\n`;
    prompt += `- Include Background: if common setup is needed\n`;
    prompt += `- Use 2-space indentation\n`;
    prompt += `- Do NOT wrap in markdown code blocks\n`;

    return prompt;
}

function createStepsPrompt(featureContent, _fileAnalysis) {

    let prompt = `You are an expert test automation engineer. Generate Cucumber step definitions for the following feature file.\n\n`;
    prompt += `FEATURE FILE:\n\`\`\`gherkin\n${featureContent}\n\`\`\`\n\n`;

    prompt += `REQUIREMENTS:\n`;
    prompt += `1. Use @cucumber/cucumber ESM import syntax\n`;
    prompt += `2. Use Playwright for all HTTP API and UI interactions\n`;
    prompt += `3. Implement every step referenced in the feature file\n`;
    prompt += `4. Use async/await throughout\n`;
    prompt += `5. Include Before/After hooks for setup and teardown\n`;
    prompt += `6. Store shared state on \`this\` (World object)\n\n`;

    prompt += `TECHNICAL REQUIREMENTS:\n`;
    prompt += `- import { Given, When, Then, Before, After } from '@cucumber/cucumber'\n`;
    prompt += `- import { request, expect } from '@playwright/test'\n`;
    prompt += `- In Before hook: this.apiContext = await request.newContext({ baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api' })\n`;
    prompt += `- In After hook: if (this.apiContext) await this.apiContext.dispose()\n`;
    prompt += `- Use this.response, this.responseData for sharing state between steps\n\n`;

    prompt += `OUTPUT FORMAT:\n`;
    prompt += `- Return ONLY valid JavaScript/ESM code\n`;
    prompt += `- Start with import statements\n`;
    prompt += `- Do NOT wrap in markdown code blocks\n`;
    prompt += `- Ensure the code can be executed by cucumber-js immediately\n`;

    return prompt;
}

// ---------------------------------------------------------------------------
// AI request
// ---------------------------------------------------------------------------

async function makeAIRequest(prompt, config, accessToken, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await executeAIRequest(prompt, config, accessToken);
        } catch (error) {
            console.log(`  Attempt ${attempt}/${retries} failed: ${error.message}`);
            if (attempt === retries) throw new Error(`Failed after ${retries} attempts`);
            const wait = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, wait));
        }
    }
}

function executeAIRequest(prompt, config, accessToken) {
    return new Promise((resolve, reject) => {
        const isAnthropic = (process.env.AI_CORE_MODEL_PROVIDER || 'openai').toLowerCase() === 'anthropic';

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
                'Content-Length': Buffer.byteLength(requestData),
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
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        req.write(requestData);
        req.end();
    });
}

function extractContent(response) {
    let content = '';

    if (response.content && Array.isArray(response.content)) {
        content = response.content.map(item => item.text || '').join('');
    } else if (response.choices && response.choices[0]) {
        content = response.choices[0].message?.content || response.choices[0].text || '';
    }

    const codeBlock = content.match(/```(?:gherkin|javascript|js)?\n([\s\S]*?)```/);
    if (codeBlock) return codeBlock[1].trim();

    return content.trim();
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

function saveFeatureFile(sourceFilePath, featureContent) {
    const featureFilePath = featureFilePathFor(sourceFilePath);
    fs.mkdirSync(FEATURES_DIR, { recursive: true });

    const header = `# Auto-generated feature file for ${sourceFilePath}\n# Generated on: ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(featureFilePath, header + featureContent, 'utf8');
    console.log(`  ✓ Feature file saved: ${featureFilePath}`);
    return featureFilePath;
}

function saveStepDefinitions(sourceFilePath, stepsContent) {
    const stepsFilePath = stepFilePathFor(sourceFilePath);
    fs.mkdirSync(STEPS_DIR, { recursive: true });

    const header = `// Auto-generated step definitions for ${sourceFilePath}\n// Generated on: ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(stepsFilePath, header + stepsContent, 'utf8');
    console.log(`  ✓ Step definitions saved: ${stepsFilePath}`);
    return stepsFilePath;
}

// ---------------------------------------------------------------------------
// Phase runners
// ---------------------------------------------------------------------------

async function runPhaseFeatures(files, config, accessToken) {
    console.log('\n=== Phase 1: Generating Feature Files ===\n');
    let success = 0;
    let fail = 0;

    for (const filePath of files) {
        console.log(`\nProcessing: ${filePath}`);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const fileAnalysis = analyzeFile(filePath, content);
            console.log(`  Test type: ${fileAnalysis.testType}`);

            const prompt = createFeaturePrompt(fileAnalysis);
            const featureContent = await makeAIRequest(prompt, config, accessToken);
            saveFeatureFile(filePath, featureContent);
            success++;
        } catch (error) {
            console.error(`  ✗ Error: ${error.message}`);
            fail++;
        }
    }

    return { success, fail };
}

async function runPhaseSteps(files, config, accessToken) {
    console.log('\n=== Phase 2: Generating Step Definitions ===\n');
    let success = 0;
    let fail = 0;

    for (const filePath of files) {
        console.log(`\nProcessing: ${filePath}`);
        const featureFilePath = featureFilePathFor(filePath);

        if (!fs.existsSync(featureFilePath)) {
            console.log(`  ⚠ Feature file not found: ${featureFilePath} — skipping`);
            fail++;
            continue;
        }

        try {
            const featureContent = fs.readFileSync(featureFilePath, 'utf8');
            const sourceContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
            const fileAnalysis = analyzeFile(filePath, sourceContent);

            const prompt = createStepsPrompt(featureContent, fileAnalysis);
            const stepsContent = await makeAIRequest(prompt, config, accessToken);
            saveStepDefinitions(filePath, stepsContent);
            success++;
        } catch (error) {
            console.error(`  ✗ Error: ${error.message}`);
            fail++;
        }
    }

    return { success, fail };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log('=== BDD Test Generation ===');
    console.log(`Phase: ${GENERATION_PHASE}\n`);

    if (!CHANGED_FILES || CHANGED_FILES.trim() === '') {
        console.log('No changed files to process');
        return;
    }

    const config = loadConfig();
    console.log('✓ Configuration loaded');

    console.log('Authenticating with SAP AI Core...');
    const accessToken = await getAccessToken(config);
    console.log('✓ Authentication successful');

    const files = CHANGED_FILES.split('\n').filter(f => f.trim());
    console.log(`\nFiles to process: ${files.length}`);

    let totalSuccess = 0;
    let totalFail = 0;

    if (GENERATION_PHASE === 'features' || GENERATION_PHASE === 'both') {
        const result = await runPhaseFeatures(files, config, accessToken);
        totalSuccess += result.success;
        totalFail += result.fail;
    }

    if (GENERATION_PHASE === 'steps' || GENERATION_PHASE === 'both') {
        const result = await runPhaseSteps(files, config, accessToken);
        totalSuccess += result.success;
        totalFail += result.fail;
    }

    console.log('\n=== Summary ===');
    console.log(`Files processed: ${files.length}`);
    console.log(`Succeeded: ${totalSuccess}`);
    console.log(`Failed: ${totalFail}`);

    if (totalSuccess === 0) {
        console.error('\n✗ No files were generated successfully');
        process.exit(1);
    }

    console.log('\n✓ BDD test generation completed');
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
