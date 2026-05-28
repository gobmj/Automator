#!/usr/bin/env node

/**
 * generate-pdf-report.js
 * Generates a human-readable PDF report from test execution results.
 *
 * Reads:  reports/backend-unit-tests.json
 *         reports/frontend-unit-tests.json
 *         reports/cucumber-report.json
 *         reports/validation-report.json
 *         reports/summary.txt
 *
 * Writes: reports/test-execution-report.pdf
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const REPORTS_DIR  = process.env.REPORTS_DIR || 'reports';
const OUTPUT_FILE  = path.join(REPORTS_DIR, 'test-execution-report.pdf');

// ─── Colour palette ────────────────────────────────────────────────────────
const C = {
    black:      '#1a1a2e',
    primary:    '#16213e',
    accent:     '#0f3460',
    teal:       '#1a6b6b',
    green:      '#2e7d32',
    red:        '#c62828',
    orange:     '#e65100',
    grey:       '#546e7a',
    lightGrey:  '#eceff1',
    white:      '#ffffff',
    rule:       '#b0bec5',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function loadJSON(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

function loadText(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
}

function statusColour(status) {
    if (!status) return C.grey;
    const s = status.toLowerCase();
    if (s === 'passed'  || s === 'pass')    return C.green;
    if (s === 'failed'  || s === 'fail')    return C.red;
    if (s === 'warning' || s === 'unstable') return C.orange;
    return C.grey;
}

function statusIcon(status) {
    if (!status) return '?';
    const s = status.toLowerCase();
    if (s === 'passed'  || s === 'pass')    return '✓';
    if (s === 'failed'  || s === 'fail')    return '✗';
    if (s === 'warning' || s === 'unstable') return '⚠';
    return '–';
}

function fmtDuration(ms) {
    if (ms == null || isNaN(ms)) return 'N/A';
    if (ms < 1000)  return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
}

function pct(num, total) {
    if (!total) return '–';
    return `${((num / total) * 100).toFixed(1)}%`;
}

// ─── PDF helpers ────────────────────────────────────────────────────────────
function rule(doc, y) {
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y)
        .strokeColor(C.rule).lineWidth(0.5).stroke();
}

function sectionHeader(doc, title, colour = C.primary) {
    ensureSpace(doc, 50);
    doc.moveDown(0.4);
    doc.rect(50, doc.y, doc.page.width - 100, 22).fill(colour);
    doc.fillColor(C.white)
        .font('Helvetica-Bold').fontSize(11)
        .text(title, 60, doc.y - 19, { continued: false });
    doc.fillColor(C.black).font('Helvetica').fontSize(10);
    doc.moveDown(0.6);
}

function kv(doc, key, value, { keyColour = C.grey, valueColour = C.black } = {}) {
    const x = 60;
    const valX = 230;
    const y = doc.y;
    doc.fillColor(keyColour).font('Helvetica-Bold').fontSize(10)
        .text(key, x, y, { continued: false });
    doc.fillColor(valueColour).font('Helvetica').fontSize(10)
        .text(String(value ?? 'N/A'), valX, y, { continued: false });
    doc.y = y + 16;
}

function badge(doc, label, colour, x, y, width = 80) {
    doc.roundedRect(x, y, width, 18, 4).fill(colour);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
        .text(label, x, y + 4, { width, align: 'center' });
    doc.fillColor(C.black).font('Helvetica').fontSize(10);
}

function progressBar(doc, x, y, w, filled, total, fillColour = C.teal) {
    const ratio = total > 0 ? Math.min(filled / total, 1) : 0;
    doc.rect(x, y, w, 10).fill(C.lightGrey);
    if (ratio > 0) doc.rect(x, y, Math.round(w * ratio), 10).fill(fillColour);
    doc.rect(x, y, w, 10).strokeColor(C.rule).lineWidth(0.5).stroke();
    doc.fillColor(C.black);
}

function ensureSpace(doc, needed) {
    if (doc.y + needed > doc.page.height - 60) doc.addPage();
}

// ─── Data parsers (mirror validate-results.js) ──────────────────────────────
function parseUnitResults(raw) {
    if (!raw) return null;
    const s = { total: 0, passed: 0, failed: 0, skipped: 0, coverage: null };
    if (raw.numTotalTests !== undefined) {
        s.total   = raw.numTotalTests   || 0;
        s.passed  = raw.numPassedTests  || 0;
        s.failed  = raw.numFailedTests  || 0;
        s.skipped = raw.numPendingTests || 0;
    } else if (raw.testResults) {
        raw.testResults.forEach(suite =>
            (suite.assertionResults || []).forEach(t => {
                s.total++;
                if (t.status === 'passed')       s.passed++;
                else if (t.status === 'failed')  s.failed++;
                else                             s.skipped++;
            })
        );
    }
    if (raw.coverageMap || raw.coverage) {
        const cm = raw.coverageMap || raw.coverage;
        const cov = { lines: { pct: 0 }, functions: { pct: 0 } };
        let lt = 0, lc = 0, ft = 0, fc = 0;
        Object.values(cm).forEach(f => {
            lt += f.lines?.total || 0;
            lc += f.lines?.covered || 0;
            ft += f.functions?.total || 0;
            fc += f.functions?.covered || 0;
        });
        cov.lines.pct     = lt > 0 ? +((lc / lt) * 100).toFixed(2) : 0;
        cov.functions.pct = ft > 0 ? +((fc / ft) * 100).toFixed(2) : 0;
        s.coverage = cov;
    }
    return s;
}

function parseCucumber(raw) {
    if (!Array.isArray(raw)) return null;
    const s = { features: raw.length, total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 0 };
    let durNs = 0;
    for (const feat of raw) {
        for (const scenario of (feat.elements || [])) {
            s.total++;
            const steps = scenario.steps || [];
            const statuses = steps.map(st => st.result?.status);
            durNs += steps.reduce((a, st) => a + (st.result?.duration || 0), 0);
            if (statuses.includes('failed'))                          s.failed++;
            else if (statuses.includes('pending') || statuses.includes('undefined')) s.pending++;
            else if (statuses.includes('skipped'))                    s.skipped++;
            else                                                      s.passed++;
        }
    }
    s.durationMs = Math.round(durNs / 1_000_000);
    return s;
}

// ─── Section renderers ──────────────────────────────────────────────────────
function renderCoverPage(doc, buildInfo, overallStatus) {
    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.primary);

    // Title block
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(28)
        .text('Test Execution Report', 50, 140, { align: 'center', width: doc.page.width - 100 });
    doc.font('Helvetica').fontSize(14).fillColor('#90caf9')
        .text('AI-Driven BDD Test Automation Pipeline', 50, 182, { align: 'center', width: doc.page.width - 100 });

    // Status badge (large)
    const statusLabel = `${statusIcon(overallStatus)}  ${(overallStatus || 'UNKNOWN').toUpperCase()}`;
    const badgeW = 180, badgeX = (doc.page.width - badgeW) / 2;
    doc.roundedRect(badgeX, 230, badgeW, 36, 8).fill(statusColour(overallStatus));
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(16)
        .text(statusLabel, badgeX, 241, { width: badgeW, align: 'center' });

    // Divider
    doc.moveTo(100, 290).lineTo(doc.page.width - 100, 290)
        .strokeColor('#4fc3f7').lineWidth(1).stroke();

    // Build metadata
    const meta = [
        ['Build',   buildInfo.build    || 'N/A'],
        ['Branch',  buildInfo.branch   || 'master'],
        ['Commit',  buildInfo.commit   || 'N/A'],
        ['Author',  buildInfo.author   || 'N/A'],
        ['Date',    buildInfo.date     || new Date().toISOString()],
    ];
    doc.font('Helvetica').fontSize(12).fillColor('#b0bec5');
    let my = 312;
    for (const [k, v] of meta) {
        doc.fillColor('#78909c').font('Helvetica-Bold').text(`${k}:`, 120, my);
        doc.fillColor('#eceff1').font('Helvetica').text(String(v), 220, my);
        my += 22;
    }

    // Footer
    doc.fillColor('#4a6572').font('Helvetica').fontSize(9)
        .text(`Generated ${new Date().toLocaleString()}`, 50, doc.page.height - 40,
              { align: 'center', width: doc.page.width - 100 });

    doc.addPage();
}

function renderExecutiveSummary(doc, backendUnit, frontendUnit, cucumberData, validation) {
    sectionHeader(doc, '  EXECUTIVE SUMMARY', C.accent);

    const overallStatus = validation?.summary?.overallStatus || 'unknown';
    const y0 = doc.y;

    // Overall status badge inline
    doc.fillColor(C.grey).font('Helvetica-Bold').fontSize(10)
        .text('Overall Status', 60, y0);
    badge(doc, `${statusIcon(overallStatus)}  ${overallStatus.toUpperCase()}`,
          statusColour(overallStatus), 160, y0 - 2, 100);
    doc.y = y0 + 24;

    // Quick-stat table (3 columns)
    const stats = [
        { label: 'Backend Tests',  value: backendUnit  ? `${backendUnit.passed}/${backendUnit.total}`  : 'N/A', colour: backendUnit?.failed  ? C.red : C.green },
        { label: 'Frontend Tests', value: frontendUnit ? `${frontendUnit.passed}/${frontendUnit.total}` : 'N/A', colour: frontendUnit?.failed ? C.red : C.green },
        { label: 'BDD Scenarios',  value: cucumberData ? `${cucumberData.passed}/${cucumberData.total}` : 'N/A', colour: cucumberData?.failed  ? C.red : C.green },
    ];
    const colW = (doc.page.width - 110) / 3;
    let cx = 55;
    for (const st of stats) {
        ensureSpace(doc, 60);
        const sy = doc.y;
        doc.rect(cx, sy, colW - 8, 54).fill(C.lightGrey);
        doc.fillColor(C.grey).font('Helvetica').fontSize(9)
            .text(st.label, cx + 6, sy + 6, { width: colW - 20 });
        doc.fillColor(st.colour).font('Helvetica-Bold').fontSize(18)
            .text(st.value, cx + 6, sy + 20, { width: colW - 20 });
        cx += colW;
    }
    doc.y += 58;
    doc.moveDown(0.5);

    // Discrepancies
    const disc = validation?.discrepancies || [];
    if (disc.length) {
        ensureSpace(doc, 20 + disc.length * 18);
        doc.fillColor(C.grey).font('Helvetica-Bold').fontSize(10)
            .text('Discrepancies & Warnings', 60, doc.y);
        doc.moveDown(0.3);
        for (const d of disc) {
            const icon = d.severity === 'high' ? '✗' : '⚠';
            const col  = d.severity === 'high' ? C.red : C.orange;
            doc.fillColor(col).font('Helvetica-Bold').fontSize(10)
                .text(`  ${icon}  `, 60, doc.y, { continued: true });
            doc.fillColor(C.black).font('Helvetica').fontSize(10)
                .text(`[${(d.severity || '').toUpperCase()}] ${d.message}`, { continued: false });
        }
        doc.moveDown(0.4);
    }

    // Recommendations
    const recs = validation?.recommendations || [];
    if (recs.length) {
        ensureSpace(doc, 20 + recs.length * 18);
        doc.fillColor(C.grey).font('Helvetica-Bold').fontSize(10)
            .text('Recommendations', 60, doc.y);
        doc.moveDown(0.3);
        recs.forEach((r, i) => {
            doc.fillColor(C.teal).font('Helvetica-Bold').fontSize(10)
                .text(`  ${i + 1}.  `, 60, doc.y, { continued: true });
            doc.fillColor(C.black).font('Helvetica').fontSize(10)
                .text(r, { continued: false });
        });
        doc.moveDown(0.4);
    }

    rule(doc, doc.y + 4);
    doc.moveDown(0.6);
}

function renderUnitTestSection(doc, label, data) {
    sectionHeader(doc, `  ${label.toUpperCase()} UNIT TESTS`, C.teal);

    if (!data) {
        doc.fillColor(C.grey).font('Helvetica').fontSize(10)
            .text('  No results available.', 60, doc.y);
        doc.moveDown(0.6);
        return;
    }

    kv(doc, 'Total tests',   data.total);
    kv(doc, 'Passed',        data.passed,  { valueColour: data.passed  === data.total ? C.green : C.black });
    kv(doc, 'Failed',        data.failed,  { valueColour: data.failed  > 0            ? C.red   : C.green });
    kv(doc, 'Skipped',       data.skipped, { valueColour: C.grey });
    kv(doc, 'Pass rate',     pct(data.passed, data.total));

    // Progress bar
    ensureSpace(doc, 30);
    const barX = 230, barW = 260, barY = doc.y - 12;
    progressBar(doc, barX, barY, barW, data.passed, data.total,
                data.failed > 0 ? C.orange : C.green);
    doc.moveDown(0.4);

    // Coverage
    if (data.coverage) {
        doc.fillColor(C.grey).font('Helvetica-Bold').fontSize(10)
            .text('  Code Coverage', 60, doc.y);
        doc.moveDown(0.3);
        kv(doc, 'Line coverage',     `${data.coverage.lines.pct}%`,
           { valueColour: +data.coverage.lines.pct < 70 ? C.orange : C.green });
        kv(doc, 'Function coverage', `${data.coverage.functions.pct}%`,
           { valueColour: +data.coverage.functions.pct < 70 ? C.orange : C.green });
    }

    rule(doc, doc.y + 4);
    doc.moveDown(0.6);
}

function renderBDDSection(doc, cucumberRaw, cucumberData) {
    sectionHeader(doc, '  BDD / CUCUMBER TEST RESULTS', C.accent);

    if (!cucumberData) {
        doc.fillColor(C.grey).font('Helvetica').fontSize(10)
            .text('  No BDD test results found.', 60, doc.y);
        doc.moveDown(0.6);
        return;
    }

    kv(doc, 'Feature files',   cucumberData.features);
    kv(doc, 'Total scenarios', cucumberData.total);
    kv(doc, 'Passed',          cucumberData.passed,  { valueColour: cucumberData.passed  > 0                 ? C.green  : C.grey });
    kv(doc, 'Failed',          cucumberData.failed,  { valueColour: cucumberData.failed  > 0                 ? C.red    : C.green });
    kv(doc, 'Skipped',         cucumberData.skipped, { valueColour: C.grey });
    kv(doc, 'Pending/Undef.',  cucumberData.pending, { valueColour: cucumberData.pending > 0                 ? C.orange : C.green });
    kv(doc, 'Duration',        fmtDuration(cucumberData.durationMs));
    kv(doc, 'Pass rate',       pct(cucumberData.passed, cucumberData.total));

    ensureSpace(doc, 30);
    const barX = 230, barW = 260, barY = doc.y - 12;
    progressBar(doc, barX, barY, barW, cucumberData.passed, cucumberData.total,
                cucumberData.failed > 0 ? C.red : C.green);
    doc.moveDown(0.6);

    // Per-feature breakdown
    if (Array.isArray(cucumberRaw) && cucumberRaw.length > 0) {
        ensureSpace(doc, 30);
        doc.fillColor(C.grey).font('Helvetica-Bold').fontSize(10)
            .text('  Feature Breakdown', 60, doc.y);
        doc.moveDown(0.4);

        for (const feat of cucumberRaw) {
            ensureSpace(doc, 34);
            const scenarios = feat.elements || [];
            const fPassed  = scenarios.filter(sc =>
                (sc.steps || []).every(s => s.result?.status === 'passed')).length;
            const fFailed  = scenarios.filter(sc =>
                (sc.steps || []).some(s  => s.result?.status === 'failed')).length;
            const fStatus  = fFailed > 0 ? 'failed' : 'passed';

            const fy = doc.y;
            doc.rect(60, fy, doc.page.width - 120, 26).fill(C.lightGrey);
            badge(doc, `${statusIcon(fStatus)}  ${fStatus.toUpperCase()}`,
                  statusColour(fStatus), doc.page.width - 160, fy + 4, 90);
            doc.fillColor(C.black).font('Helvetica-Bold').fontSize(10)
                .text(feat.name || feat.uri || 'Unnamed feature', 68, fy + 8,
                      { width: doc.page.width - 250, ellipsis: true });
            doc.y = fy + 30;

            doc.fillColor(C.grey).font('Helvetica').fontSize(9)
                .text(`  ${scenarios.length} scenario(s)  |  ${fPassed} passed  |  ${fFailed} failed`,
                      70, doc.y);
            doc.moveDown(0.5);

            // Individual scenarios
            for (const sc of scenarios) {
                ensureSpace(doc, 20);
                const steps    = sc.steps || [];
                const scFailed = steps.some(s => s.result?.status === 'failed');
                const scPend   = steps.some(s => ['pending', 'undefined'].includes(s.result?.status));
                const scStatus = scFailed ? 'failed' : scPend ? 'pending' : 'passed';
                const scDurMs  = Math.round(
                    steps.reduce((a, s) => a + (s.result?.duration || 0), 0) / 1_000_000
                );

                doc.fillColor(statusColour(scStatus)).font('Helvetica-Bold').fontSize(9)
                    .text(`    ${statusIcon(scStatus)}  `, 70, doc.y, { continued: true });
                doc.fillColor(C.black).font('Helvetica').fontSize(9)
                    .text(`${sc.name || 'Unnamed scenario'}`, { continued: true });
                doc.fillColor(C.grey).fontSize(8)
                    .text(`  (${fmtDuration(scDurMs)})`, { continued: false });
            }
            doc.moveDown(0.3);
        }
    }

    rule(doc, doc.y + 4);
    doc.moveDown(0.6);
}

function renderBuildInfo(doc, summaryText) {
    sectionHeader(doc, '  BUILD INFORMATION', C.primary);

    if (!summaryText) {
        doc.fillColor(C.grey).font('Helvetica').fontSize(10)
            .text('  No build summary available.', 60, doc.y);
        doc.moveDown(0.6);
        return;
    }

    doc.fillColor(C.black).font('Courier').fontSize(9);
    const lines = summaryText.split('\n');
    for (const line of lines) {
        ensureSpace(doc, 14);
        doc.text(`  ${line}`, 60, doc.y, { continued: false });
    }

    rule(doc, doc.y + 4);
    doc.moveDown(0.6);
}

function renderFooter(doc, pageNum) {
    const bottom = doc.page.height - 30;
    doc.fillColor(C.grey).font('Helvetica').fontSize(8)
        .text(
            `Test Execution Report  |  Page ${pageNum}  |  Generated ${new Date().toLocaleString()}`,
            50, bottom,
            { align: 'center', width: doc.page.width - 100 }
        );
}

// ─── Main ───────────────────────────────────────────────────────────────────
function main() {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });

    // Load data
    const backendRaw    = loadJSON(path.join(REPORTS_DIR, 'backend-unit-tests.json'));
    const frontendRaw   = loadJSON(path.join(REPORTS_DIR, 'frontend-unit-tests.json'));
    const cucumberRaw   = loadJSON(path.join(REPORTS_DIR, 'cucumber-report.json'));
    const validation    = loadJSON(path.join(REPORTS_DIR, 'validation-report.json'));
    const summaryText   = loadText(path.join(REPORTS_DIR, 'summary.txt'));

    const backendUnit   = parseUnitResults(backendRaw);
    const frontendUnit  = parseUnitResults(frontendRaw);
    const cucumberData  = parseCucumber(cucumberRaw);

    // Parse build info from summary.txt
    const buildInfo = { build: 'N/A', commit: 'N/A', author: 'N/A', date: new Date().toISOString() };
    if (summaryText) {
        const m = {
            build:  summaryText.match(/Build:\s*(.+)/),
            commit: summaryText.match(/Commit:\s*(.+)/),
            author: summaryText.match(/Author:\s*(.+)/),
            date:   summaryText.match(/Date:\s*(.+)/),
        };
        if (m.build)  buildInfo.build  = m.build[1].trim();
        if (m.commit) buildInfo.commit = m.commit[1].trim().slice(0, 12);
        if (m.author) buildInfo.author = m.author[1].trim();
        if (m.date)   buildInfo.date   = m.date[1].trim();
    }

    const overallStatus = validation?.summary?.overallStatus || 'unknown';

    // Build PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const out = fs.createWriteStream(OUTPUT_FILE);
    doc.pipe(out);

    // Pages
    renderCoverPage(doc, buildInfo, overallStatus);
    renderExecutiveSummary(doc, backendUnit, frontendUnit, cucumberData, validation);
    renderUnitTestSection(doc, 'Backend', backendUnit);
    renderUnitTestSection(doc, 'Frontend', frontendUnit);
    renderBDDSection(doc, cucumberRaw, cucumberData);
    renderBuildInfo(doc, summaryText);

    // Add page numbers to all pages (cover is page 1)
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        renderFooter(doc, i + 1);
    }

    doc.end();

    out.on('finish', () => {
        const size = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
        console.log(`✓ PDF report generated: ${OUTPUT_FILE} (${size} KB)`);
    });
    out.on('error', err => {
        console.error('Error writing PDF:', err.message);
        process.exit(1);
    });
}

main();
