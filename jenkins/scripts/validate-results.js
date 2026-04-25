#!/usr/bin/env node

/**
 * validate-results.js
 * Validates BDD test results against baseline unit tests
 * Reads Cucumber JSON output and unit test JSON reports
 */

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = process.env.REPORTS_DIR || 'reports';
const BACKEND_UNIT_TESTS = path.join(REPORTS_DIR, 'backend-unit-tests.json');
const FRONTEND_UNIT_TESTS = path.join(REPORTS_DIR, 'frontend-unit-tests.json');
const CUCUMBER_RESULTS = path.join(REPORTS_DIR, 'cucumber-report.json');
const VALIDATION_REPORT = path.join(REPORTS_DIR, 'validation-report.json');

function loadJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠ Not found: ${filePath}`);
            return null;
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error.message);
        return null;
    }
}

// Parse Jest/Vitest results
function parseUnitTestResults(results) {
    if (!results) return null;

    const summary = { total: 0, passed: 0, failed: 0, skipped: 0, coverage: null };

    if (results.numTotalTests !== undefined) {
        summary.total = results.numTotalTests || 0;
        summary.passed = results.numPassedTests || 0;
        summary.failed = results.numFailedTests || 0;
        summary.skipped = results.numPendingTests || 0;
    } else if (results.testResults) {
        results.testResults.forEach(suite => {
            (suite.assertionResults || []).forEach(test => {
                summary.total++;
                if (test.status === 'passed') summary.passed++;
                else if (test.status === 'failed') summary.failed++;
                else summary.skipped++;
            });
        });
    }

    if (results.coverageMap || results.coverage) {
        summary.coverage = extractCoverage(results.coverageMap || results.coverage);
    }

    return summary;
}

function extractCoverage(coverageData) {
    if (!coverageData) return null;

    const coverage = {
        lines: { total: 0, covered: 0, pct: 0 },
        functions: { total: 0, covered: 0, pct: 0 }
    };

    Object.values(coverageData).forEach(file => {
        if (file.lines) {
            coverage.lines.total += file.lines.total || 0;
            coverage.lines.covered += file.lines.covered || 0;
        }
        if (file.functions) {
            coverage.functions.total += file.functions.total || 0;
            coverage.functions.covered += file.functions.covered || 0;
        }
    });

    if (coverage.lines.total > 0) {
        coverage.lines.pct = (coverage.lines.covered / coverage.lines.total * 100).toFixed(2);
    }
    if (coverage.functions.total > 0) {
        coverage.functions.pct = (coverage.functions.covered / coverage.functions.total * 100).toFixed(2);
    }

    return coverage;
}

// Parse Cucumber JSON output
// Cucumber JSON format: array of features, each with elements (scenarios), each with steps
function parseCucumberResults(cucumberJson) {
    if (!cucumberJson || !Array.isArray(cucumberJson)) return null;

    const summary = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
        features: cucumberJson.length,
        duration: 0,
        durationMs: 0
    };

    for (const feature of cucumberJson) {
        for (const scenario of (feature.elements || [])) {
            summary.total++;

            const steps = scenario.steps || [];
            const stepStatuses = steps.map(s => s.result && s.result.status);

            summary.duration += steps.reduce((acc, s) => acc + (s.result?.duration || 0), 0);

            if (stepStatuses.includes('failed')) {
                summary.failed++;
            } else if (stepStatuses.includes('pending') || stepStatuses.includes('undefined')) {
                summary.pending++;
            } else if (stepStatuses.includes('skipped')) {
                summary.skipped++;
            } else {
                summary.passed++;
            }
        }
    }

    // Cucumber stores duration in nanoseconds
    summary.durationMs = Math.round(summary.duration / 1_000_000);

    return summary;
}

function compareResults(unitTests, bddTests) {
    const discrepancies = [];
    if (!unitTests || !bddTests) return discrepancies;

    const unitPassRate = unitTests.total > 0 ? (unitTests.passed / unitTests.total * 100) : 0;
    const bddPassRate = bddTests.total > 0 ? (bddTests.passed / bddTests.total * 100) : 0;

    if (Math.abs(unitPassRate - bddPassRate) > 10) {
        discrepancies.push({
            type: 'pass_rate_difference',
            severity: 'warning',
            message: `Pass rate: unit ${unitPassRate.toFixed(1)}% vs BDD ${bddPassRate.toFixed(1)}%`
        });
    }

    if (bddTests.failed > 0 && unitTests.failed === 0) {
        discrepancies.push({
            type: 'new_failures',
            severity: 'high',
            message: `BDD tests found ${bddTests.failed} failure(s) not caught by unit tests`
        });
    }

    if (bddTests.pending > 0) {
        discrepancies.push({
            type: 'pending_steps',
            severity: 'warning',
            message: `${bddTests.pending} scenario(s) have undefined/pending steps`
        });
    }

    return discrepancies;
}

function generateValidationReport(backendUnit, frontendUnit, bddTests) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            unitTests: { backend: backendUnit, frontend: frontendUnit },
            bddTests,
            overallStatus: 'unknown'
        },
        discrepancies: [],
        recommendations: []
    };

    if (backendUnit && bddTests) {
        report.discrepancies.push(
            ...compareResults(backendUnit, bddTests).map(d => ({ ...d, source: 'backend' }))
        );
    }
    if (frontendUnit && bddTests) {
        report.discrepancies.push(
            ...compareResults(frontendUnit, bddTests).map(d => ({ ...d, source: 'frontend' }))
        );
    }

    const high = report.discrepancies.filter(d => d.severity === 'high').length;
    const warnings = report.discrepancies.filter(d => d.severity === 'warning').length;

    report.summary.overallStatus = high > 0 ? 'failed' : warnings > 0 ? 'warning' : 'passed';

    if (bddTests && bddTests.failed > 0) {
        report.recommendations.push('Review and fix failing BDD scenarios');
    }
    if (bddTests && bddTests.pending > 0) {
        report.recommendations.push('Implement missing step definitions for pending scenarios');
    }
    if (report.discrepancies.some(d => d.type === 'new_failures')) {
        report.recommendations.push('BDD failures may reveal real issues — investigate before releasing');
    }

    return report;
}

function printReport(report) {
    console.log('\n=== Test Validation Report ===\n');

    console.log('Unit Tests:');
    if (report.summary.unitTests.backend) {
        const b = report.summary.unitTests.backend;
        console.log(`  Backend:  ${b.passed}/${b.total} passed (${b.failed} failed)`);
        if (b.coverage) {
            console.log(`    Coverage: lines ${b.coverage.lines.pct}%, functions ${b.coverage.functions.pct}%`);
        }
    }
    if (report.summary.unitTests.frontend) {
        const f = report.summary.unitTests.frontend;
        console.log(`  Frontend: ${f.passed}/${f.total} passed (${f.failed} failed)`);
    }

    console.log('\nBDD Tests (Cucumber):');
    if (report.summary.bddTests) {
        const g = report.summary.bddTests;
        console.log(`  Features:  ${g.features}`);
        console.log(`  Scenarios: ${g.passed} passed, ${g.failed} failed, ${g.skipped} skipped, ${g.pending} pending`);
        console.log(`  Duration:  ${g.durationMs}ms`);
    } else {
        console.log('  No BDD test results found');
    }

    console.log('\nDiscrepancies:');
    if (report.discrepancies.length === 0) {
        console.log('  ✓ None');
    } else {
        report.discrepancies.forEach(d => {
            const icon = d.severity === 'high' ? '✗' : '⚠';
            console.log(`  ${icon} [${d.severity.toUpperCase()}] ${d.message}`);
        });
    }

    if (report.recommendations.length > 0) {
        console.log('\nRecommendations:');
        report.recommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    }

    const icons = { passed: '✓', warning: '⚠', failed: '✗', unknown: '?' };
    console.log(`\n${icons[report.summary.overallStatus]} Overall: ${report.summary.overallStatus.toUpperCase()}\n`);
}

function main() {
    console.log('=== Test Results Validation ===\n');

    fs.mkdirSync(REPORTS_DIR, { recursive: true });

    const backendUnit = parseUnitTestResults(loadJSON(BACKEND_UNIT_TESTS));
    const frontendUnit = parseUnitTestResults(loadJSON(FRONTEND_UNIT_TESTS));
    const bddTests = parseCucumberResults(loadJSON(CUCUMBER_RESULTS));

    const report = generateValidationReport(backendUnit, frontendUnit, bddTests);

    fs.writeFileSync(VALIDATION_REPORT, JSON.stringify(report, null, 2), 'utf8');
    console.log(`✓ Validation report saved: ${VALIDATION_REPORT}`);

    printReport(report);

    if (report.summary.overallStatus === 'failed') {
        console.error('Validation failed due to high severity issues');
        process.exit(1);
    }
}

main();
