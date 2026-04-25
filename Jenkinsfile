pipeline {
    agent any
    
    environment {
        // AI Core credentials from Jenkins Credentials
        AI_CORE_CLIENT_ID = credentials('ai-core-client-id')
        AI_CORE_CLIENT_SECRET = credentials('ai-core-client-secret')
        AI_CORE_DEPLOYMENT_URL = credentials('ai-core-deployment-url')
        GITHUB_TOKEN = credentials('github-token')
        
        // AI Core static configuration
        AI_CORE_AUTH_URL = 'https://dm-canary.authentication.sap.hana.ondemand.com/oauth/token'
        AI_CORE_BASE_URL = 'https://api.ai.internalprod.eu-central-1.aws.ml.hana.ondemand.com'
        AI_CORE_RESOURCE_GROUP = 'default'
        AI_CORE_MODEL_PROVIDER = 'anthropic'
        
        // GitHub configuration
        GITHUB_REPO = 'gobmj/Automator'
        
        // Directories
        GENERATED_TESTS_DIR = 'playwright-tests/generated'
        REPORTS_DIR = 'reports'
        
        // Node version
        NODE_VERSION = '20.x'
    }
    
    triggers {
        // Trigger on GitHub push events
        githubPush()
    }
    
    options {
        // Keep last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        
        // Timeout after 30 minutes
        timeout(time: 30, unit: 'MINUTES')
        
        // Timestamps in console output
        timestamps()
    }
    
    stages {
        stage('🗺️  Pipeline Roadmap') {
            steps {
                script {
                    echo """
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║              AI-DRIVEN TEST AUTOMATION PIPELINE ROADMAP                   ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: INITIALIZATION & ANALYSIS                                       │
├───────────────────────────────────────────────────────────────────────────┤
│  1️⃣  Checkout              → Clone repository and get commit info        │
│  2️⃣  Detect Changes        → Analyze modified files                      │
│  3️⃣  Setup Environment     → Configure Node.js and dependencies          │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: AI TEST GENERATION                                              │
├───────────────────────────────────────────────────────────────────────────┤
│  4️⃣  Install Dependencies  → Backend, Frontend, Playwright               │
│  5️⃣  Generate Tests        → AI creates Playwright tests                 │
│  6️⃣  Run Unit Tests        → Execute existing test suites                │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: VALIDATION & REPORTING                                          │
├───────────────────────────────────────────────────────────────────────────┤
│  7️⃣  Execute Generated     → Run AI-generated Playwright tests           │
│  8️⃣  Validate & Report     → Compare results and generate reports        │
│  9️⃣  Archive Artifacts     → Save tests and reports                      │
└───────────────────────────────────────────────────────────────────────────┘

Total Stages: 9 | Estimated Duration: 5-10 minutes
                    """
                }
            }
        }
        
        stage('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') {
            steps {
                script {
                    echo """
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                    🚀 PHASE 1: INITIALIZATION & ANALYSIS                 ║
║                                                                           ║
║                    Progress: [████░░░░░░░░░░░░░░░░] 0%                   ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
                    """
                }
            }
        }
        
        stage('1️⃣  Checkout') {
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 1/9: Checkout Repository                                           │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    echo "Checking out code from repository..."
                    
                    // Checkout with full history for git diff
                    checkout scm
                    
                    // Get commit information
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                    
                    env.GIT_AUTHOR = sh(
                        script: 'git log -1 --pretty=%an',
                        returnStdout: true
                    ).trim()
                    
                    echo "✓ Commit: ${env.GIT_COMMIT_MSG}"
                    echo "✓ Author: ${env.GIT_AUTHOR}"
                    echo "✓ Checkout completed successfully"
                }
            }
        }
        
        stage('2️⃣  Detect Changes') {
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 2/9: Detect Code Changes                                           │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    echo "Analyzing modified files..."
                    
                    // Make script executable
                    sh 'chmod +x jenkins/scripts/detect-changes.sh'
                    
                    // Detect changed files
                    def changedFiles = sh(
                        script: './jenkins/scripts/detect-changes.sh',
                        returnStdout: true
                    ).trim()
                    
                    if (changedFiles) {
                        env.CHANGED_FILES = changedFiles
                        echo "✓ Modified files detected:"
                        echo "${changedFiles}"
                        
                        // Count files
                        def fileCount = changedFiles.split('\n').size()
                        echo "✓ Total files changed: ${fileCount}"
                    } else {
                        echo "ℹ️  No relevant files changed. Skipping test generation."
                        env.SKIP_TEST_GENERATION = 'true'
                    }
                }
            }
        }
        
        stage('3️⃣  Setup Environment') {
            when {
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 3/9: Setup Environment                                             │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    echo "Configuring build environment..."
                    echo "Using credentials from Jenkins Credentials Store"
                    
                    // Verify credentials are loaded
                    echo "✓ AI_CORE_CLIENT_ID: ${env.AI_CORE_CLIENT_ID ? 'Set' : 'Missing'}"
                    echo "✓ AI_CORE_CLIENT_SECRET: ${env.AI_CORE_CLIENT_SECRET ? 'Set' : 'Missing'}"
                    echo "✓ AI_CORE_DEPLOYMENT_URL: ${env.AI_CORE_DEPLOYMENT_URL ? 'Set' : 'Missing'}"
                    echo "✓ GITHUB_TOKEN: ${env.GITHUB_TOKEN ? 'Set' : 'Missing'}"
                    
                    // Make setup script executable
                    sh 'chmod +x jenkins/scripts/setup-env.sh'
                    
                    // Setup environment
                    sh './jenkins/scripts/setup-env.sh'
                    
                    // Verify Node.js installation
                    sh 'node --version'
                    sh 'npm --version'
                    
                    echo "✓ Environment setup completed"
                    echo """
Progress: [████████░░░░░░░░░░░░] 33% - Phase 1 Complete ✓
                    """
                }
            }
        }
        
        stage('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') {
            when {
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo """
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                    🤖 PHASE 2: AI TEST GENERATION                        ║
║                                                                           ║
║                    Progress: [████████░░░░░░░░░░] 33%                    ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
                    """
                }
            }
        }
        
        stage('4️⃣  Install Dependencies') {
            when {
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        script {
                            echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 4/9: Install Dependencies (Backend)                                │
└───────────────────────────────────────────────────────────────────────────┘
                            """
                        }
                        dir('backend') {
                            echo "Installing backend dependencies..."
                            sh 'npm ci'
                            echo "✓ Backend dependencies installed"
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        script {
                            echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 4/9: Install Dependencies (Frontend)                               │
└───────────────────────────────────────────────────────────────────────────┘
                            """
                        }
                        dir('frontend') {
                            echo "Installing frontend dependencies..."
                            sh 'npm ci'
                            echo "✓ Frontend dependencies installed"
                        }
                    }
                }
                stage('Playwright Dependencies') {
                    steps {
                        script {
                            echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 4/9: Install Dependencies (Playwright)                             │
└───────────────────────────────────────────────────────────────────────────┘
                            """
                        }
                        dir('playwright-tests') {
                            echo "Installing Playwright dependencies..."
                            sh 'npm ci || npm install'
                            echo "✓ Playwright dependencies installed"
                            echo "✓ Playwright browsers already installed in container"
                        }
                    }
                }
            }
        }
        
        stage('5️⃣  Generate Tests') {
            when {
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 5/9: AI Test Generation                                            │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    echo "🤖 Using AI to generate test cases..."
                    echo "📡 Connecting to SAP AI Core..."
                    
                    // Make script executable
                    sh 'chmod +x jenkins/scripts/generate-tests.js'
                    
                    // Generate tests using AI
                    def result = sh(
                        script: 'node jenkins/scripts/generate-tests.js',
                        returnStatus: true
                    )
                    
                    if (result == 0) {
                        echo "✓ Test generation completed successfully"
                        
                        // List generated tests
                        sh "ls -la ${GENERATED_TESTS_DIR}/ || echo 'No tests generated'"
                    } else {
                        echo "⚠️  Warning: Test generation encountered issues"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('6️⃣  Run Unit Tests') {
            parallel {
                stage('Backend Unit Tests') {
                    steps {
                        script {
                            echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 6/9: Run Unit Tests (Backend)                                      │
└───────────────────────────────────────────────────────────────────────────┘
                            """
                        }
                        dir('backend') {
                            echo "🧪 Running backend unit tests..."
                            sh 'npm test -- --testPathPattern=tests/unit --coverage --json --outputFile=../reports/backend-unit-tests.json || true'
                            echo "✓ Backend unit tests completed"
                        }
                    }
                }
                stage('Frontend Unit Tests') {
                    steps {
                        script {
                            echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 6/9: Run Unit Tests (Frontend)                                     │
└───────────────────────────────────────────────────────────────────────────┘
                            """
                        }
                        dir('frontend') {
                            echo "🧪 Running frontend unit tests..."
                            sh 'npm test -- --coverage --reporter=json --outputFile=../reports/frontend-unit-tests.json || true'
                            echo "✓ Frontend unit tests completed"
                        }
                    }
                }
            }
            post {
                always {
                    script {
                        echo """
Progress: [████████████████░░░░] 66% - Phase 2 Complete ✓
                        """
                    }
                }
            }
        }
        
        stage('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') {
            when {
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo """
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                    ✅ PHASE 3: VALIDATION & REPORTING                    ║
║                                                                           ║
║                    Progress: [████████████████░░░░] 66%                  ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
                    """
                }
            }
        }
        
        stage('7️⃣  Execute Generated Tests') {
            when {
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 7/9: Execute AI-Generated Tests                                    │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    
                    dir('playwright-tests') {
                        // Check if generated tests exist
                        def testsExist = sh(
                            script: "test -d ${GENERATED_TESTS_DIR} && ls ${GENERATED_TESTS_DIR}/*.spec.js 2>/dev/null",
                            returnStatus: true
                        ) == 0
                        
                        if (testsExist) {
                            echo "🎭 Executing AI-generated Playwright tests..."
                            
                            // Run Playwright tests
                            sh '''
                                npx playwright test generated/ \
                                    --reporter=html,json \
                                    --output=../reports/playwright \
                                    || true
                            '''
                            
                            echo "✓ Generated tests execution completed"
                        } else {
                            echo "ℹ️  No generated tests found to execute"
                        }
                    }
                }
            }
        }
        
        stage('8️⃣  Validate & Report') {
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 8/9: Validate Results & Generate Reports                           │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    
                    // Make validation script executable
                    sh 'chmod +x jenkins/scripts/validate-results.js'
                    
                    echo "📊 Validating test results..."
                    
                    // Validate test results
                    def validationResult = sh(
                        script: 'node jenkins/scripts/validate-results.js',
                        returnStatus: true
                    )
                    
                    if (validationResult == 0) {
                        echo "✓ Test validation completed successfully"
                    } else {
                        echo "⚠️  Test validation found discrepancies"
                        currentBuild.result = 'UNSTABLE'
                    }
                    
                    // Generate summary report
                    sh '''
                        echo "=== Test Execution Summary ===" > reports/summary.txt
                        echo "Build: ${BUILD_NUMBER}" >> reports/summary.txt
                        echo "Commit: ${GIT_COMMIT}" >> reports/summary.txt
                        echo "Author: ${GIT_AUTHOR}" >> reports/summary.txt
                        echo "Date: $(date)" >> reports/summary.txt
                        echo "" >> reports/summary.txt
                        echo "Changed Files:" >> reports/summary.txt
                        echo "${CHANGED_FILES}" >> reports/summary.txt
                    '''
                    
                    echo "✓ Reports generated successfully"
                }
            }
        }
        
        stage('9️⃣  Archive Artifacts') {
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 9/9: Archive Test Artifacts                                        │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    
                    echo "📦 Archiving artifacts..."
                    
                    // Archive test reports
                    archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
                    
                    // Archive generated tests
                    archiveArtifacts artifacts: 'playwright-tests/generated/**/*.spec.js', allowEmptyArchive: true
                    
                    // Archive Playwright HTML report if exists
                    archiveArtifacts artifacts: 'playwright-tests/playwright-report/**/*', allowEmptyArchive: true
                    
                    echo "✓ Artifacts archived successfully"
                    echo """
Progress: [████████████████████] 100% - Phase 3 Complete ✓
                    """
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo """
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                        🏁 PIPELINE COMPLETED                             ║
║                                                                           ║
║                    Build Result: ${currentBuild.result ?: 'SUCCESS'}                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

Summary:
  • Total Stages: 9
  • Build Number: ${env.BUILD_NUMBER}
  • Duration: ${currentBuild.durationString}
  • Commit: ${env.GIT_COMMIT_MSG}
  • Author: ${env.GIT_AUTHOR}
                """
            }
            
            // Clean up workspace
            cleanWs(
                deleteDirs: true,
                patterns: [
                    [pattern: 'node_modules', type: 'INCLUDE'],
                    [pattern: 'playwright-tests/generated', type: 'INCLUDE']
                ]
            )
        }
        
        success {
            echo "✅ Pipeline executed successfully!"
        }
        
        failure {
            echo "❌ Pipeline failed. Check logs for details."
        }
        
        unstable {
            echo "⚠️  Pipeline completed with warnings."
        }
    }
}