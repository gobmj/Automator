pipeline {
    agent any
    
    environment {
        // AI Core Configuration
        AI_CONFIG_FILE = 'jenkins/config/ai-config.json'
        
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
        stage('Checkout') {
            when {
                branch 'master'
            }
            steps {
                script {
                    echo "=== Stage: Checkout ==="
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
                    
                    echo "Commit: ${env.GIT_COMMIT_MSG}"
                    echo "Author: ${env.GIT_AUTHOR}"
                }
            }
        }
        
        stage('Detect Changes') {
            when {
                branch 'master'
            }
            steps {
                script {
                    echo "=== Stage: Detect Changes ==="
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
                        echo "Modified files detected:"
                        echo "${changedFiles}"
                        
                        // Count files
                        def fileCount = changedFiles.split('\n').size()
                        echo "Total files changed: ${fileCount}"
                    } else {
                        echo "No relevant files changed. Skipping test generation."
                        env.SKIP_TEST_GENERATION = 'true'
                    }
                }
            }
        }
        
        stage('Setup Environment') {
            when {
                branch 'master'
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo "=== Stage: Setup Environment ==="
                    
                    // Make setup script executable
                    sh 'chmod +x jenkins/scripts/setup-env.sh'
                    
                    // Setup environment
                    sh './jenkins/scripts/setup-env.sh'
                    
                    // Verify Node.js installation
                    sh 'node --version'
                    sh 'npm --version'
                    
                    echo "Environment setup completed"
                }
            }
        }
        
        stage('Install Dependencies') {
            when {
                branch 'master'
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            echo "Installing backend dependencies..."
                            sh 'npm ci'
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            echo "Installing frontend dependencies..."
                            sh 'npm ci'
                        }
                    }
                }
                stage('Playwright Dependencies') {
                    steps {
                        dir('playwright-tests') {
                            echo "Installing Playwright dependencies..."
                            sh 'npm ci || npm install'
                            sh 'npx playwright install --with-deps chromium'
                        }
                    }
                }
            }
        }
        
        stage('Generate Tests') {
            when {
                branch 'master'
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo "=== Stage: Generate Tests ==="
                    echo "Using AI to generate test cases..."
                    
                    // Make script executable
                    sh 'chmod +x jenkins/scripts/generate-tests.js'
                    
                    // Generate tests using AI
                    def result = sh(
                        script: 'node jenkins/scripts/generate-tests.js',
                        returnStatus: true
                    )
                    
                    if (result == 0) {
                        echo "Test generation completed successfully"
                        
                        // List generated tests
                        sh "ls -la ${GENERATED_TESTS_DIR}/ || echo 'No tests generated'"
                    } else {
                        echo "Warning: Test generation encountered issues"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Run Unit Tests') {
            when {
                branch 'master'
            }
            parallel {
                stage('Backend Unit Tests') {
                    steps {
                        dir('backend') {
                            echo "Running backend unit tests..."
                            sh 'npm test -- --coverage --json --outputFile=../reports/backend-unit-tests.json || true'
                        }
                    }
                }
                stage('Frontend Unit Tests') {
                    steps {
                        dir('frontend') {
                            echo "Running frontend unit tests..."
                            sh 'npm test -- --coverage --json --outputFile=../reports/frontend-unit-tests.json || true'
                        }
                    }
                }
            }
        }
        
        stage('Execute Generated Tests') {
            when {
                branch 'master'
                expression { env.SKIP_TEST_GENERATION != 'true' }
            }
            steps {
                script {
                    echo "=== Stage: Execute Generated Tests ==="
                    
                    dir('playwright-tests') {
                        // Check if generated tests exist
                        def testsExist = sh(
                            script: "test -d ${GENERATED_TESTS_DIR} && ls ${GENERATED_TESTS_DIR}/*.spec.js 2>/dev/null",
                            returnStatus: true
                        ) == 0
                        
                        if (testsExist) {
                            echo "Executing AI-generated Playwright tests..."
                            
                            // Run Playwright tests
                            sh '''
                                npx playwright test generated/ \
                                    --reporter=html,json \
                                    --output=../reports/playwright \
                                    || true
                            '''
                            
                            echo "Generated tests execution completed"
                        } else {
                            echo "No generated tests found to execute"
                        }
                    }
                }
            }
        }
        
        stage('Validate & Report') {
            when {
                branch 'master'
            }
            steps {
                script {
                    echo "=== Stage: Validate & Report ==="
                    
                    // Make validation script executable
                    sh 'chmod +x jenkins/scripts/validate-results.js'
                    
                    // Validate test results
                    def validationResult = sh(
                        script: 'node jenkins/scripts/validate-results.js',
                        returnStatus: true
                    )
                    
                    if (validationResult == 0) {
                        echo "Test validation completed successfully"
                    } else {
                        echo "Test validation found discrepancies"
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
                }
            }
        }
        
        stage('Archive Artifacts') {
            when {
                branch 'master'
            }
            steps {
                script {
                    echo "=== Stage: Archive Artifacts ==="
                    
                    // Archive test reports
                    archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
                    
                    // Archive generated tests
                    archiveArtifacts artifacts: 'playwright-tests/generated/**/*.spec.js', allowEmptyArchive: true
                    
                    // Publish HTML reports
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'reports',
                        reportFiles: 'summary.txt',
                        reportName: 'Test Summary'
                    ])
                    
                    // Publish Playwright HTML report if exists
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'playwright-tests/playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright Test Report'
                    ])
                    
                    echo "Artifacts archived successfully"
                }
            }
        }
    }
    
    post {
        always {
            echo "=== Pipeline Completed ==="
            echo "Build Result: ${currentBuild.result ?: 'SUCCESS'}"
            
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
            echo "✓ Pipeline executed successfully!"
        }
        
        failure {
            echo "✗ Pipeline failed. Check logs for details."
        }
        
        unstable {
            echo "⚠ Pipeline completed with warnings."
        }
    }
}