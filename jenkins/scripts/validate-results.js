#!/usr/bin/env node

/**
 * validate-results.js
 * Validates AI-generated test results against baseline unit tests
 * Compares coverage and identifies discrepancies
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REPORTS_DIR = process.env.REPORTS_DIR || 'reports';
const BACKEND_UNIT_TESTS = path.join(REPORTS_DIR, 'backend-unit-tests.json');
const FRONTEND_UNIT_TESTS = path.join(REPORTS_DIR, 'frontend-unit-tests.json');
const PLAYWRIGHT_RESULTS = path.join('playwright-tests', 'test-results.json');
const VALIDATION_REPORT = path.join(REPORTS_DIR, 'validation-report.json');

// Load test results
function loadTestResults(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠ Test results not found: ${filePath}`);
            return null;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error.message);
        return null;
    }
}

// Parse Jest/Vitest results
function parseUnitTestResults(results) {
    if (!results) return null;
    
    const summary = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        coverage: null
    };
    
    // Handle different Jest/Vitest result formats
    if (results.numTotalTests !== undefined) {
        // Jest format
        summary.total = results.numTotalTests || 0;
        summary.passed = results.numPassedTests || 0;
        summary.failed = results.numFailedTests || 0;
        summary.skipped = results.numPendingTests || 0;
    } else if (results.testResults) {
        // Alternative format
        results.testResults.forEach(suite => {
            if (suite.assertionResults) {
                suite.assertionResults.forEach(test => {
                    summary.total++;
                    if (test.status === 'passed') summary.passed++;
                    else if (test.status === 'failed') summary.failed++;
                    else summary.skipped++;
                });
            }
        });
    }
    
    // Extract coverage if available
    if (results.coverageMap || results.coverage) {
        summary.coverage = extractCoverage(results.coverageMap || results.coverage);
    }
    
    return summary;
}

// Extract coverage information
function extractCoverage(coverageData) {
    if (!coverageData) return null;
    
    const coverage = {
        lines: { total: 0, covered: 0, pct: 0 },
        statements: { total: 0, covered: 0, pct: 0 },
        functions: { total: 0, covered: 0, pct: 0 },
        branches: { total: 0, covered: 0, pct: 0 }
    };
    
    // Aggregate coverage from all files
    Object.values(coverageData).forEach(fileCoverage => {
        if (fileCoverage.lines) {
            coverage.lines.total += fileCoverage.lines.total || 0;
            coverage.lines.covered += fileCoverage.lines.covered || 0;
        }
        if (fileCoverage.statements) {
            coverage.statements.total += fileCoverage.statements.total || 0;
            coverage.statements.covered += fileCoverage.statements.covered || 0;
        }
        if (fileCoverage.functions) {
            coverage.functions.total += fileCoverage.functions.total || 0;
            coverage.functions.covered += fileCoverage.functions.covered || 0;
        }
        if (fileCoverage.branches) {
            coverage.branches.total += fileCoverage.branches.total || 0;
            coverage.branches.covered += fileCoverage.branches.covered || 0;
        }
    });
    
    // Calculate percentages
    if (coverage.lines.total > 0) {
        coverage.lines.pct = (coverage.lines.covered / coverage.lines.total * 100).toFixed(2);
    }
    if (coverage.statements.total > 0) {
        coverage.statements.pct = (coverage.statements.covered / coverage.statements.total * 100).toFixed(2);
    }
    if (coverage.functions.total > 0) {
        coverage.functions.pct = (coverage.functions.covered / coverage.functions.total * 100).toFixed(2);
    }
    if (coverage.branches.total > 0) {
        coverage.branches.pct = (coverage.branches.covered / coverage.branches.total * 100).toFixed(2);
    }
    
    return coverage;
}

// Parse Playwright results
function parsePlaywrightResults(results) {
    if (!results) return null;
    
    const summary = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
    };
    
    if (results.suites) {
        results.suites.forEach(suite => {
            if (suite.specs) {
                suite.specs.forEach(spec => {
                    summary.total++;
                    if (spec.ok) summary.passed++;
                    else if (spec.tests && spec.tests.some(t => t.status === 'skipped')) {
                        summary.skipped++;
                    } else {
                        summary.failed++;
                    }
                    summary.duration += spec.duration || 0;
                });
            }
        });
    }
    
    return summary;
}

// Compare results and identify discrepancies
function compareResults(unitTests, generatedTests) {
    const discrepancies = [];
    
    if (!unitTests || !generatedTests) {
        return discrepancies;
    }
    
    // Compare pass rates
    const unitPassRate = unitTests.total > 0 ? (unitTests.passed / unitTests.total * 100) : 0;
    const generatedPassRate = generatedTests.total > 0 ? (generatedTests.passed / generatedTests.total * 100) : 0;
    
    if (Math.abs(unitPassRate - generatedPassRate) > 10) {
        discrepancies.push({
            type: 'pass_rate_difference',
            severity: 'warning',
            message: `Pass rate difference: Unit tests ${unitPassRate.toFixed(1)}% vs Generated tests ${generatedPassRate.toFixed(1)}%`,
            unitValue: unitPassRate,
            generatedValue: generatedPassRate
        });
    }
    
    // Check if generated tests found issues that unit tests didn't
    if (generatedTests.failed > 0 && unitTests.failed === 0) {
        discrepancies.push({
            type: 'new_failures',
            severity: 'high',
            message: `Generated tests found ${generatedTests.failed} failure(s) not caught by unit tests`,
            count: generatedTests.failed
        });
    }
    
    // Check test coverage
    if (generatedTests.total < unitTests.total * 0.5) {
        discrepancies.push({
            type: 'low_coverage',
            severity: 'warning',
            message: `Generated tests (${generatedTests.total}) cover less than 50% of unit test scenarios (${unitTests.total})`,
            unitCount: unitTests.total,
            generatedCount: generatedTests.total
        });
    }
    
    return discrepancies;
}

// Generate validation report
function generateValidationReport(backendUnit, frontendUnit, playwrightTests) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            unitTests: {
                backend: backendUnit,
                frontend: frontendUnit
            },
            generatedTests: playwrightTests,
            overallStatus: 'unknown'
        },
        discrepancies: [],
        recommendations: []
    };
    
    // Compare backend results
    if (backendUnit && playwrightTests) {
        const backendDiscrepancies = compareResults(backendUnit, playwrightTests);
        report.discrepancies.push(...backendDiscrepancies.map(d => ({ ...d, source: 'backend' })));
    }
    
    // Compare frontend results
    if (frontendUnit && playwrightTests) {
        const frontendDiscrepancies = compareResults(frontendUnit, playwrightTests);
        report.discrepancies.push(...frontendDiscrepancies.map(d => ({ ...d, source: 'frontend' })));
    }
    
    // Determine overall status
    const highSeverityIssues = report.discrepancies.filter(d => d.severity === 'high').length;
    const warningIssues = report.discrepancies.filter(d => d.severity === 'warning').length;
    
    if (highSeverityIssues > 0) {
        report.summary.overallStatus = 'failed';
    } else if (warningIssues > 0) {
        report.summary.overallStatus = 'warning';
    } else {
        report.summary.overallStatus = 'passed';
    }
    
    // Generate recommendations
    if (playwrightTests && playwrightTests.failed > 0) {
        report.recommendations.push('Review and fix failing generated tests');
    }
    
    if (report.discrepancies.some(d => d.type === 'low_coverage')) {
        report.recommendations.push('Consider improving AI test generation to cover more scenarios');
    }
    
    if (report.discrepancies.some(d => d.type === 'new_failures')) {
        report.recommendations.push('Investigate failures found by generated tests - they may indicate real issues');
    }
    
    return report;
}

// Print report to console
function printReport(report) {
    console.log('\n=== Test Validation Report ===\n');
    
    // Unit tests summary
    console.log('Unit Tests:');
    if (report.summary.unitTests.backend) {
        const b = report.summary.unitTests.backend;
        console.log(`  Backend: ${b.passed}/${b.total} passed (${b.failed} failed, ${b.skipped} skipped)`);
        if (b.coverage) {
            console.log(`    Coverage: Lines ${b.coverage.lines.pct}%, Functions ${b.coverage.functions.pct}%`);
        }
    }
    if (report.summary.unitTests.frontend) {
        const f = report.summary.unitTests.frontend;
        console.log(`  Frontend: ${f.passed}/${f.total} passed (${f.failed} failed, ${f.skipped} skipped)`);
        if (f.coverage) {
            console.log(`    Coverage: Lines ${f.coverage.lines.pct}%, Functions ${f.coverage.functions.pct}%`);
        }
    }
    
    // Generated tests summary
    console.log('\nGenerated Tests (Playwright):');
    if (report.summary.generatedTests) {
        const g = report.summary.generatedTests;
        console.log(`  Total: ${g.passed}/${g.total} passed (${g.failed} failed, ${g.skipped} skipped)`);
        console.log(`  Duration: ${(g.duration / 1000).toFixed(2)}s`);
    } else {
        console.log('  No generated tests executed');
    }
    
    // Discrepancies
    console.log('\nDiscrepancies:');
    if (report.discrepancies.length === 0) {
        console.log('  ✓ No significant discrepancies found');
    } else {
        report.discrepancies.forEach((d, i) => {
            const icon = d.severity === 'high' ? '✗' : '⚠';
            console.log(`  ${icon} [${d.severity.toUpperCase()}] ${d.message}`);
        });
    }
    
    // Recommendations
    if (report.recommendations.length > 0) {
        console.log('\nRecommendations:');
        report.recommendations.forEach((rec, i) => {
            console.log(`  ${i + 1}. ${rec}`);
        });
    }
    
    // Overall status
    console.log(`\nOverall Status: ${report.summary.overallStatus.toUpperCase()}`);
    
    const statusIcons = {
        passed: '✓',
        warning: '⚠',
        failed: '✗',
        unknown: '?'
    };
    console.log(`${statusIcons[report.summary.overallStatus]} Validation ${report.summary.overallStatus}\n`);
}

// Main execution
function main() {
    console.log('=== Test Results Validation Started ===\n');
    
    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    // Load test results
    console.log('Loading test results...');
    const backendUnitResults = loadTestResults(BACKEND_UNIT_TESTS);
    const frontendUnitResults = loadTestResults(FRONTEND_UNIT_TESTS);
    const playwrightResults = loadTestResults(PLAYWRIGHT_RESULTS);
    
    // Parse results
    const backendUnit = parseUnitTestResults(backendUnitResults);
    const frontendUnit = parseUnitTestResults(frontendUnitResults);
    const playwrightTests = parsePlaywrightResults(playwrightResults);
    
    // Generate validation report
    const report = generateValidationReport(backendUnit, frontendUnit, playwrightTests);
    
    // Save report
    fs.writeFileSync(VALIDATION_REPORT, JSON.stringify(report, null, 2), 'utf8');
    console.log(`✓ Validation report saved: ${VALIDATION_REPORT}\n`);
    
    // Print report
    printReport(report);
    
    // Exit with appropriate code
    if (report.summary.overallStatus === 'failed') {
        console.error('Validation failed due to high severity issues');
        process.exit(1);
    } else if (report.summary.overallStatus === 'warning') {
        console.log('Validation completed with warnings');
        process.exit(0);
    } else {
        console.log('✓ Validation completed successfully');
        process.exit(0);
    }
}

// Run main function
main();