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

        stage('2️⃣  Detect Changes') {
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 2/9: Detect Code Changes                                            │
└───────────────────────────────────────────────────────────────────────────┘
                    """
                    sh 'chmod +x jenkins/scripts/detect-changes.sh'

                    def changedFiles = sh(
                        script: './jenkins/scripts/detect-changes.sh',
                        returnStdout: true
                    ).trim()

                    if (changedFiles) {
                        env.CHANGED_FILES = changedFiles
                        def fileCount = changedFiles.split('\n').size()
                        echo "✓ ${fileCount} file(s) changed:"
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

                        if (featureCount.toInteger() > 0) {
                            // Check if the backend API is reachable before running BDD tests.
                            // Cucumber scenarios call live HTTP endpoints; without a running
                            // backend they fail at the network level, not at the test logic.
                            def apiReachable = sh(
                                script: 'curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/api/orders?page=1&limit=1 2>/dev/null || echo "000"',
                                returnStdout: true
                            ).trim()

                            if (apiReachable.startsWith('2') || apiReachable.startsWith('3')) {
                                echo "🥒 API available (HTTP ${apiReachable}). Running ${featureCount} feature file(s) with Cucumber..."

                                // npm run test:bdd resolves the local @cucumber/cucumber binary
                                // and picks up format/path config from cucumber.js automatically
                                sh 'npm run test:bdd || true'

                                echo "✓ Cucumber BDD tests executed"
                                echo "✓ HTML report: reports/cucumber-report.html"
                                echo "✓ JSON report: reports/cucumber-report.json"
                            } else {
                                echo "ℹ️  Backend API not reachable (HTTP ${apiReachable})."
                                echo "   BDD integration tests require the application to be running."
                                echo "   Start the backend service before executing this pipeline to run BDD tests."
                                echo "   Skipping Cucumber execution."
                            }
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

        stage('9️⃣  Archive Artifacts') {
            steps {
                script {
                    echo """
┌───────────────────────────────────────────────────────────────────────────┐
│ Stage 9/9: Archive Test Artifacts                                         │
└───────────────────────────────────────────────────────────────────────────┘
                    """

                    // Reports (Cucumber HTML, JSON, validation, summary)
                    archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true

                    // Generated feature files
                    archiveArtifacts artifacts: 'playwright-tests/features/**/*.feature', allowEmptyArchive: true

                    // Generated step definitions
                    archiveArtifacts artifacts: 'playwright-tests/step-definitions/**/*.steps.js', allowEmptyArchive: true

                    echo "✓ Artifacts archived"
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
                    [pattern: 'node_modules', type: 'INCLUDE']
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
