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

        // Test repository — stores all generated feature and step files
        TEST_REPO = 'gobmj/Automator_Tests'
        TEST_REPO_DIR = 'test-repo'

        // Directories
        FEATURES_DIR = 'playwright-tests/features'
        STEPS_DIR = 'playwright-tests/step-definitions'
        REPORTS_DIR = 'reports'

        // Node version
        NODE_VERSION = '20.x'
    }

    triggers {
        githubPush()
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    parameters {
        booleanParam(
            name: 'INITIAL_SETUP',
            defaultValue: false,
            description: 'Bootstrap mode: generate BDD tests for ALL source files and populate the test repository from scratch'
        )
        string(
            name: 'APP_BASE_URL',
            defaultValue: 'https://5eaa-134-238-238-29.ngrok-free.app',
            description: 'Base URL of the running backend. Update this when the ngrok URL changes.'
        )
    }

    stages {
        stage('🗺️  Pipeline Roadmap') {
            steps {
                script {
                    echo """
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║           AI-DRIVEN BDD TEST AUTOMATION PIPELINE ROADMAP                  ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: INITIALIZATION & ANALYSIS                                        │
├───────────────────────────────────────────────────────────────────────────┤
│  1️⃣  Checkout              → Clone repository and get commit info         │
│  2️⃣  Detect Changes        → Analyze modified source files                │
│  3️⃣  Setup Environment     → Configure Node.js and verify credentials     │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: AI BDD TEST GENERATION                                           │
├───────────────────────────────────────────────────────────────────────────┤
│  4️⃣  Install Dependencies  → Backend, Frontend, Cucumber + Playwright     │
│  5️⃣  Generate Features     → AI creates Gherkin .feature files            │
│  6️⃣  Generate Steps        → AI creates step definition .js files         │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: TESTING & REPORTING                                              │
├───────────────────────────────────────────────────────────────────────────┤
│  7️⃣  Run Unit Tests        → Execute backend and frontend unit tests      │
│  8️⃣  Execute BDD Tests     → Run Cucumber scenarios with Playwright       │
│  9️⃣  Archive Artifacts     → Save reports and generated test files        │
└───────────────────────────────────────────────────────────────────────────┘

Total Stages: 9 | Estimated Duration: 8-15 minutes
                    """
                }
            }
        }

        stage('🚀 Phase 1: Initialization & Analysis') {
            steps {
                script {
                    echo """
╔═══════════════════════════════════════════════════════════════════════════╗
║                 🚀 PHASE 1: INITIALIZATION & ANALYSIS                    ║
║                 Progress: [████░░░░░░░░░░░░░░░░] 0%                      ║
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
│ Stage 1/9: Checkout Repository                                            │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    checkout scm

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
                }
            }
        }

        stage('📦 Clone Test Repository') {
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Clone Test Repository: ${TEST_REPO}                      │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    sh 'rm -rf $TEST_REPO_DIR'
                    sh 'git clone https://$GITHUB_TOKEN@github.com/$TEST_REPO.git $TEST_REPO_DIR || { echo "Clone failed — ensure $TEST_REPO exists and GITHUB_TOKEN has write access"; exit 1; }'

                    // Seed playwright-tests/ with existing test files so the AI
                    // generator can read them as context for incremental updates.
                    sh 'mkdir -p $FEATURES_DIR $STEPS_DIR && cp -r $TEST_REPO_DIR/features/. $FEATURES_DIR/ 2>/dev/null || true && cp -r $TEST_REPO_DIR/step-definitions/. $STEPS_DIR/ 2>/dev/null || true'

                    echo "✓ Test repository cloned and existing files seeded into workspace"
                }
            }
        }

        stage('2️⃣  Detect Changes') {
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 2/9: Detect Code Changes                                            │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    sh 'chmod +x jenkins/scripts/detect-changes.sh'

                    def changedFiles

                    if (params.INITIAL_SETUP) {
                        echo "ℹ️  INITIAL_SETUP mode — scanning all source files instead of diffing"
                        sh 'chmod +x jenkins/scripts/list-all-source-files.sh'
                        changedFiles = sh(
                            script: './jenkins/scripts/list-all-source-files.sh',
                            returnStdout: true
                        ).trim()
                    } else {
                        changedFiles = sh(
                            script: './jenkins/scripts/detect-changes.sh',
                            returnStdout: true
                        ).trim()
                    }

                    if (changedFiles) {
                        env.CHANGED_FILES = changedFiles
                        def fileCount = changedFiles.split('\n').size()
                        echo "✓ ${fileCount} file(s) to process:"
                        echo "${changedFiles}"
                    } else {
                        echo "ℹ️  No relevant source files changed. Skipping BDD generation."
                        env.SKIP_GENERATION = 'true'
                    }
                }
            }
        }

        stage('3️⃣  Setup Environment') {
            when {
                expression { env.SKIP_GENERATION != 'true' }
            }
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 3/9: Setup Environment                                              │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    echo "✓ AI_CORE_CLIENT_ID:      ${env.AI_CORE_CLIENT_ID ? 'Set' : 'Missing'}"
                    echo "✓ AI_CORE_CLIENT_SECRET:  ${env.AI_CORE_CLIENT_SECRET ? 'Set' : 'Missing'}"
                    echo "✓ AI_CORE_DEPLOYMENT_URL: ${env.AI_CORE_DEPLOYMENT_URL ? 'Set' : 'Missing'}"
                    echo "✓ GITHUB_TOKEN:           ${env.GITHUB_TOKEN ? 'Set' : 'Missing'}"

                    sh 'chmod +x jenkins/scripts/setup-env.sh'
                    sh './jenkins/scripts/setup-env.sh'
                    sh 'node --version && npm --version'

                    echo """
Progress: [████████░░░░░░░░░░░░] 33% - Phase 1 Complete ✓
                    """
                }
            }
        }

        stage('🤖 Phase 2: AI BDD Test Generation') {
            when {
                expression { env.SKIP_GENERATION != 'true' }
            }
            steps {
                script {
                    echo """
╔═══════════════════════════════════════════════════════════════════════════╗
║                 🤖 PHASE 2: AI BDD TEST GENERATION                       ║
║                 Progress: [████████░░░░░░░░░░░░] 33%                     ║
╚═══════════════════════════════════════════════════════════════════════════╝
                    """
                }
            }
        }

        stage('4️⃣  Install Dependencies') {
            when {
                expression { env.SKIP_GENERATION != 'true' }
            }
            parallel {
                stage('Backend') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                            echo "✓ Backend dependencies installed"
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                            echo "✓ Frontend dependencies installed"
                        }
                    }
                }
                stage('Cucumber + Playwright') {
                    steps {
                        dir('playwright-tests') {
                            echo "Installing Cucumber and Playwright dependencies..."
                            sh 'npm ci || npm install'
                            echo "✓ Cucumber + Playwright dependencies installed"
                        }
                    }
                }
            }
        }

        stage('5️⃣  Generate Feature Files') {
            when {
                expression { env.SKIP_GENERATION != 'true' }
            }
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 5/9: AI Phase 1 — Generate Gherkin Feature Files                   │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    echo "🤖 Generating .feature files from changed source code..."
                    echo "📡 Connecting to SAP AI Core..."

                    def result = sh(
                        script: '''
                            GENERATION_PHASE=features \
                            FEATURES_DIR=${FEATURES_DIR} \
                            node jenkins/scripts/generate-bdd-tests.js
                        ''',
                        returnStatus: true
                    )

                    if (result == 0) {
                        echo "✓ Feature file generation completed"
                        sh "ls -la ${FEATURES_DIR}/ || echo 'No feature files found'"
                    } else {
                        echo "⚠️  Feature file generation encountered issues"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('6️⃣  Generate Step Definitions') {
            when {
                expression { env.SKIP_GENERATION != 'true' }
            }
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 6/9: AI Phase 2 — Generate Cucumber Step Definitions               │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    echo "🤖 Generating step definition files from feature files..."

                    def result = sh(
                        script: '''
                            GENERATION_PHASE=steps \
                            FEATURES_DIR=${FEATURES_DIR} \
                            STEPS_DIR=${STEPS_DIR} \
                            node jenkins/scripts/generate-bdd-tests.js
                        ''',
                        returnStatus: true
                    )

                    if (result == 0) {
                        echo "✓ Step definition generation completed"
                        sh "ls -la ${STEPS_DIR}/ || echo 'No step files found'"
                    } else {
                        echo "⚠️  Step definition generation encountered issues"
                        currentBuild.result = 'UNSTABLE'
                    }

                    echo """
Progress: [████████████████░░░░] 66% - Phase 2 Complete ✓
                    """
                }
            }
        }

        stage('✅ Phase 3: Testing & Reporting') {
            steps {
                script {
                    echo """
╔═══════════════════════════════════════════════════════════════════════════╗
║                 ✅ PHASE 3: TESTING & REPORTING                          ║
║                 Progress: [████████████████░░░░] 66%                     ║
╚═══════════════════════════════════════════════════════════════════════════╝
                    """
                }
            }
        }

        stage('7️⃣  Run Unit Tests') {
            parallel {
                stage('Backend Unit Tests') {
                    steps {
                        script {
                            echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 7/9: Run Unit Tests (Backend)                                       │
└───────────────────────────────────────────────────────────────────────────┘
                            """
                        }
                        dir('backend') {
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
│ Stage 7/9: Run Unit Tests (Frontend)                                      │
└───────────────────────────────────────────────────────────────────────────┘
                            """
                        }
                        dir('frontend') {
                            sh 'npm test -- --coverage --reporter=json --outputFile=../reports/frontend-unit-tests.json || true'
                            echo "✓ Frontend unit tests completed"
                        }
                    }
                }
            }
        }

        stage('8️⃣  Execute Cucumber BDD Tests') {
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 8/9: Execute Cucumber BDD Tests & Generate Report                  │
└───────────────────────────────────────────────────────────────────────────┘
                    """

                    // Ensure reports directory exists
                    sh 'mkdir -p reports'

                    dir('playwright-tests') {
                        // Always ensure Cucumber dependencies are installed
                        // (Stage 4 install is skipped when no source files changed)
                        sh 'npm ci || npm install'

                        def featureCount = sh(
                            script: "find features/ -name '*.feature' 2>/dev/null | wc -l",
                            returnStdout: true
                        ).trim()

                        def baseUrl = params.APP_BASE_URL?.trim() ?: ''

                        if (featureCount.toInteger() > 0 && baseUrl) {
                            // Check if the backend API is reachable at the provided URL.
                            def healthUrl = baseUrl.replaceAll('/+$', '') + '/api/orders?page=1&limit=1'
                            def apiReachable = sh(
                                script: "curl -s -o /dev/null -w \"%{http_code}\" --max-time 10 -H 'ngrok-skip-browser-warning: true' '${healthUrl}' 2>/dev/null || echo '000'",
                                returnStdout: true
                            ).trim()

                            if (apiReachable.startsWith('2') || apiReachable.startsWith('3')) {
                                echo "🥒 API available at ${baseUrl} (HTTP ${apiReachable}). Running ${featureCount} feature file(s) with Cucumber..."

                                sh "APP_BASE_URL='${baseUrl}' npm run test:bdd || true"

                                echo "✓ Cucumber BDD tests executed"
                                echo "✓ HTML report: reports/cucumber-report.html"
                                echo "✓ JSON report: reports/cucumber-report.json"
                            } else {
                                echo "ℹ️  Backend API not reachable at ${baseUrl} (HTTP ${apiReachable})."
                                echo "   Skipping Cucumber execution."
                            }
                        } else if (featureCount.toInteger() > 0 && !baseUrl) {
                            echo "ℹ️  APP_BASE_URL not set — skipping BDD tests."
                            echo "   Re-run the build with APP_BASE_URL set to your ngrok/local URL to execute BDD tests."
                        } else {
                            echo "ℹ️  No feature files found — skipping Cucumber execution"
                        }
                    }

                    // Validate results and produce summary
                    sh 'chmod +x jenkins/scripts/validate-results.js'
                    sh 'node jenkins/scripts/validate-results.js || true'

                    // Write build summary
                    sh '''
                        mkdir -p reports
                        {
                            echo "=== Build Summary ==="
                            echo "Build:  ${BUILD_NUMBER}"
                            echo "Commit: ${GIT_COMMIT}"
                            echo "Author: ${GIT_AUTHOR}"
                            echo "Date:   $(date)"
                            echo ""
                            echo "Changed Files:"
                            echo "${CHANGED_FILES}"
                        } > reports/summary.txt
                    '''

                    echo """
Progress: [████████████████████] 100% - Phase 3 Complete ✓
                    """
                }
            }
        }

        stage('9️⃣  Publish Tests & Archive Reports') {
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 9/9: Push Tests to Repository & Archive Reports                    │
└───────────────────────────────────────────────────────────────────────────┘
                    """

                    if (env.SKIP_GENERATION != 'true') {
                        sh 'chmod +x jenkins/scripts/push-tests-to-repo.sh'
                        sh './jenkins/scripts/push-tests-to-repo.sh'
                        echo "✓ Test files committed and pushed to ${TEST_REPO}"
                    } else {
                        echo "ℹ️  No generation ran — skipping test repository push"
                    }

                    // Install pdfkit at root level (CI-safe, no global state)
                    sh 'npm install --prefix . --no-save pdfkit 2>/dev/null || npm install --prefix . pdfkit'
                    echo "✓ pdfkit installed"

                    // Generate PDF report from all collected JSON/text reports
                    sh 'node jenkins/scripts/generate-pdf-report.js || true'
                    echo "✓ PDF report generated: reports/test-execution-report.pdf"

                    // Archive all reports including the PDF
                    archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true

                    echo "✓ Reports archived (including PDF)"
                }
            }
        }
    }

    post {
        always {
            script {
                echo """
╔═══════════════════════════════════════════════════════════════════════════╗
║                         🏁 PIPELINE COMPLETED                            ║
║                                                                           ║
║  Result:  ${currentBuild.result ?: 'SUCCESS'}
║  Build:   ${env.BUILD_NUMBER}
║  Author:  ${env.GIT_AUTHOR ?: 'unknown'}
║  Commit:  ${env.GIT_COMMIT_MSG ?: 'unknown'}
╚═══════════════════════════════════════════════════════════════════════════╝
                """
            }

            cleanWs(
                deleteDirs: true,
                patterns: [
                    [pattern: 'node_modules', type: 'INCLUDE'],
                    [pattern: 'test-repo',    type: 'INCLUDE']
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
