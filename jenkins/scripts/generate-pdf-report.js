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

const REPORTS_DIR = process.env.REPORTS_DIR || 'reports';
const OUTPUT_FILE = path.join(REPORTS_DIR, 'test-execution-report.pdf');

// ─── Colour palette ────────────────────────────────────────────────────────
const C = {
    black:     '#1a1a2e',
    primary:   '#16213e',
    accent:    '#0f3460',
    teal:      '#1a6b6b',
    green:     '#2e7d32',
    greenBg:   '#e8f5e9',
    red:       '#c62828',
    redBg:     '#ffebee',
    orange:    '#e65100',
    orangeBg:  '#fff3e0',
    grey:      '#546e7a',
    midGrey:   '#90a4ae',
    lightGrey: '#eceff1',
    dimGrey:   '#cfd8dc',
    white:     '#ffffff',
    rule:      '#b0bec5',
    codeBg:    '#263238',
    codeText:  '#cfd8dc',
};

const PAGE_W   = 595.28;   // A4 width  in points
const MARGIN   = 45;
const CONTENT  = PAGE_W - MARGIN * 2;

// ─── Utility ────────────────────────────────────────────────────────────────
function loadJSON(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

function loadText(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
}

function scenarioStatus(steps) {
    const statuses = (steps || []).map(s => s.result?.status);
    if (statuses.includes('failed'))    return 'failed';
    if (statuses.includes('pending') || statuses.includes('undefined')) return 'pending';
    if (statuses.includes('skipped'))   return 'skipped';
    if (statuses.every(s => s === 'passed')) return 'passed';
    return 'unknown';
}

function statusColour(status) {
    const s = (status || '').toLowerCase();
    if (s === 'passed')  return C.green;
    if (s === 'failed')  return C.red;
    if (s === 'pending' || s === 'undefined') return C.orange;
    if (s === 'skipped') return C.midGrey;
    return C.grey;
}

function statusBg(status) {
    const s = (status || '').toLowerCase();
    if (s === 'passed')  return C.greenBg;
    if (s === 'failed')  return C.redBg;
    if (s === 'pending' || s === 'undefined') return C.orangeBg;
    return C.lightGrey;
}

function statusIcon(status) {
    const s = (status || '').toLowerCase();
    if (s === 'passed')  return '✓';
    if (s === 'failed')  return '✗';
    if (s === 'pending' || s === 'undefined') return '~';
    if (s === 'skipped') return '-';
    return '?';
}

function fmtDuration(ms) {
    if (ms == null || isNaN(ms) || ms < 0) return '';
    if (ms === 0)   return '0ms';
    if (ms < 1000)  return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function nsToMs(ns) {
    return Math.round((ns || 0) / 1_000_000);
}

function pct(num, total) {
    if (!total) return '–';
    return `${((num / total) * 100).toFixed(1)}%`;
}

function featureName(feat) {
    return feat.name || path.basename(feat.uri || '', '.feature') || 'Unnamed Feature';
}

// ─── PDF drawing helpers ─────────────────────────────────────────────────────
function ensureSpace(doc, needed) {
    if (doc.y + needed > doc.page.height - 55) doc.addPage();
}

function hRule(doc, colour = C.rule, weight = 0.5) {
    doc.save()
        .moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
        .strokeColor(colour).lineWidth(weight).stroke()
        .restore();
    doc.moveDown(0.3);
}

function sectionBand(doc, title, colour = C.primary) {
    ensureSpace(doc, 40);
    doc.moveDown(0.3);
    const y = doc.y;
    doc.rect(MARGIN, y, CONTENT, 24).fill(colour);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11)
        .text(title, MARGIN + 10, y + 6, { width: CONTENT - 20, continued: false });
    doc.fillColor(C.black).font('Helvetica').fontSize(10);
    doc.y = y + 30;
}

function badge(doc, label, fillColour, x, y, w = 72, h = 16) {
    doc.save()
        .roundedRect(x, y, w, h, 3).fill(fillColour)
        .fillColor(C.white).font('Helvetica-Bold').fontSize(8)
        .text(label, x, y + 4, { width: w, align: 'center' })
        .restore();
    doc.fillColor(C.black).font('Helvetica').fontSize(10);
}

function miniProgressBar(doc, x, y, w, filled, total, fillColour = C.teal) {
    const ratio = total > 0 ? Math.min(filled / total, 1) : 0;
    doc.save()
        .rect(x, y, w, 8).fill(C.lightGrey)
        .rect(x, y, Math.max(1, Math.round(w * ratio)), 8).fill(fillColour)
        .rect(x, y, w, 8).strokeColor(C.rule).lineWidth(0.4).stroke()
        .restore();
}

function kv(doc, key, value, keyColour = C.grey, valColour = C.black, indent = MARGIN + 12) {
    ensureSpace(doc, 18);
    const vy = doc.y;
    doc.fillColor(keyColour).font('Helvetica-Bold').fontSize(9.5)
        .text(key, indent, vy, { continued: false });
    doc.fillColor(valColour).font('Helvetica').fontSize(9.5)
        .text(String(value ?? 'N/A'), indent + 155, vy, { continued: false });
    doc.y = vy + 15;
}

// ─── Data parsers ─────────────────────────────────────────────────────────────
function computeCoverageFromIstanbul(cm) {
    let lt = 0, lc = 0, ft = 0, fc = 0;
    Object.values(cm).forEach(f => {
        if (f.s !== undefined) {
            // Istanbul raw format: s = statement hit counts, f = function hit counts
            const stmts = Object.values(f.s || {});
            lt += stmts.length;
            lc += stmts.filter(v => v > 0).length;
            const fns = Object.values(f.f || {});
            ft += fns.length;
            fc += fns.filter(v => v > 0).length;
        } else {
            // Jest summary format with lines/functions sub-objects
            lt += f.lines?.total    || 0;  lc += f.lines?.covered    || 0;
            ft += f.functions?.total || 0; fc += f.functions?.covered || 0;
        }
    });
    return {
        lines:     { pct: lt > 0 ? +((lc / lt) * 100).toFixed(1) : 0 },
        functions: { pct: ft > 0 ? +((fc / ft) * 100).toFixed(1) : 0 },
    };
}

function parseUnitResults(raw, coverageFinalPath) {
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
                if (t.status === 'passed')      s.passed++;
                else if (t.status === 'failed') s.failed++;
                else                            s.skipped++;
            })
        );
    }
    // Coverage may be embedded in the JSON or in a separate coverage-final.json
    const cm = raw.coverageMap || raw.coverage
        || (coverageFinalPath ? loadJSON(coverageFinalPath) : null);
    if (cm) {
        s.coverage = computeCoverageFromIstanbul(cm);
    }
    return s;
}

function parseCucumber(raw) {
    if (!Array.isArray(raw)) return null;
    const s = { features: 0, scenarios: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 0 };
    let durNs = 0;
    for (const feat of raw) {
        // count only non-background elements as features
        const scenarios = (feat.elements || []).filter(e => e.type !== 'background');
        if (scenarios.length > 0 || feat.elements?.length > 0) s.features++;
        for (const sc of (feat.elements || [])) {
            if (sc.type === 'background') continue;
            s.scenarios++;
            const st = scenarioStatus(sc.steps);
            s[st === 'unknown' ? 'skipped' : st]++;
            durNs += (sc.steps || []).reduce((a, step) => a + (step.result?.duration || 0), 0);
        }
    }
    s.durationMs = nsToMs(durNs);
    return s;
}

// ─── Cover page ───────────────────────────────────────────────────────────────
function renderCoverPage(doc, buildInfo, overallStatus, backendUnit, frontendUnit, cucumberData) {
    doc.rect(0, 0, PAGE_W, doc.page.height).fill(C.primary);

    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(26)
        .text('Test Execution Report', MARGIN, 130, { align: 'center', width: CONTENT });
    doc.fillColor('#90caf9').font('Helvetica').fontSize(13)
        .text('AI-Driven BDD Test Automation Pipeline', MARGIN, 168, { align: 'center', width: CONTENT });

    const totalPassed = (backendUnit?.passed  || 0) + (frontendUnit?.passed  || 0) + (cucumberData?.passed  || 0);
    const totalTests  = (backendUnit?.total   || 0) + (frontendUnit?.total   || 0) + (cucumberData?.scenarios || 0);
    const countLabel  = totalTests > 0 ? `${totalPassed}/${totalTests}` : '';
    const statusLabel = (overallStatus || 'UNKNOWN').toUpperCase();
    const bLabel      = countLabel ? `${countLabel}  ${statusLabel}` : statusLabel;

    const bW = 200, bX = (PAGE_W - bW) / 2;
    doc.roundedRect(bX, 212, bW, 34, 7).fill(statusColour(overallStatus));
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(15)
        .text(bLabel, bX, 222, { width: bW, align: 'center' });

    doc.save().moveTo(110, 264).lineTo(PAGE_W - 110, 264)
        .strokeColor('#4fc3f7').lineWidth(0.8).stroke().restore();

    const meta = [
        ['Build',  buildInfo.build  || 'N/A'],
        ['Branch', buildInfo.branch || 'master'],
        ['Commit', buildInfo.commit || 'N/A'],
        ['Author', buildInfo.author || 'N/A'],
        ['Date',   buildInfo.date   || new Date().toISOString()],
    ];
    let my = 284;
    for (const [k, v] of meta) {
        doc.fillColor('#78909c').font('Helvetica-Bold').fontSize(11).text(`${k}:`, 115, my);
        doc.fillColor('#eceff1').font('Helvetica').fontSize(11).text(String(v), 210, my);
        my += 22;
    }

    doc.fillColor('#37474f').font('Helvetica').fontSize(8)
        .text(`Generated ${new Date().toLocaleString()}`, MARGIN, doc.page.height - 38,
              { align: 'center', width: CONTENT });
    doc.addPage();
}

// ─── Executive summary ────────────────────────────────────────────────────────
function renderExecutiveSummary(doc, backendUnit, frontendUnit, cucumberData, validation) {
    sectionBand(doc, '  EXECUTIVE SUMMARY', C.accent);

    const overallStatus = validation?.summary?.overallStatus || 'unknown';
    const y0 = doc.y;
    doc.fillColor(C.grey).font('Helvetica-Bold').fontSize(9.5)
        .text('Overall Status', MARGIN + 12, y0);
    badge(doc, overallStatus.toUpperCase(),
          statusColour(overallStatus), MARGIN + 175, y0 - 2, 90, 17);
    doc.y = y0 + 22;

    // Stat tiles
    const tiles = [
        { label: 'Backend Tests',   value: backendUnit  ? `${backendUnit.passed}/${backendUnit.total}`   : 'N/A', col: backendUnit?.failed  ? C.red : C.green },
        { label: 'Frontend Tests',  value: frontendUnit ? `${frontendUnit.passed}/${frontendUnit.total}` : 'N/A', col: frontendUnit?.failed ? C.red : C.green },
        { label: 'BDD Scenarios',   value: cucumberData ? `${cucumberData.passed}/${cucumberData.scenarios}` : 'N/A', col: cucumberData?.failed ? C.red : C.green },
        { label: 'Feature Files',   value: cucumberData ? String(cucumberData.features) : 'N/A', col: C.teal },
    ];
    const tileW = (CONTENT - 12) / 4;
    let tx = MARGIN;
    for (const t of tiles) {
        ensureSpace(doc, 52);
        const ty = doc.y;
        doc.rect(tx, ty, tileW - 6, 50).fill(C.lightGrey);
        doc.fillColor(C.grey).font('Helvetica').fontSize(8)
            .text(t.label, tx + 5, ty + 5, { width: tileW - 16 });
        doc.fillColor(t.col).font('Helvetica-Bold').fontSize(20)
            .text(t.value, tx + 5, ty + 19, { width: tileW - 16 });
        tx += tileW;
    }
    doc.y += 54;

    // Progress bars row
    const sections = [
        { label: 'Backend',  p: backendUnit?.passed  || 0, t: backendUnit?.total    || 0, col: C.teal },
        { label: 'Frontend', p: frontendUnit?.passed || 0, t: frontendUnit?.total   || 0, col: C.teal },
        { label: 'BDD',      p: cucumberData?.passed || 0, t: cucumberData?.scenarios || 0, col: cucumberData?.failed ? C.red : C.green },
    ];
    const barW = (CONTENT - 12) / 3;
    let bx = MARGIN;
    for (const sec of sections) {
        const by = doc.y;
        doc.fillColor(C.grey).font('Helvetica').fontSize(8).text(sec.label, bx, by);
        miniProgressBar(doc, bx, by + 11, barW - 8, sec.p, sec.t, sec.col);
        doc.fillColor(C.grey).font('Helvetica').fontSize(7.5)
            .text(`${sec.p}/${sec.t}  ${pct(sec.p, sec.t)}`, bx, by + 21, { width: barW - 8, align: 'right' });
        bx += barW;
    }
    doc.y += 32;
    doc.moveDown(0.4);

    // BDD duration if available
    if (cucumberData?.durationMs) {
        kv(doc, 'BDD Total Duration', fmtDuration(cucumberData.durationMs));
    }

    // Discrepancies
    const disc = validation?.discrepancies || [];
    if (disc.length) {
        doc.moveDown(0.3);
        doc.fillColor(C.grey).font('Helvetica-Bold').fontSize(9.5)
            .text('Discrepancies', MARGIN + 12, doc.y);
        doc.moveDown(0.25);
        for (const d of disc) {
            ensureSpace(doc, 16);
            const col = d.severity === 'high' ? C.red : C.orange;
            doc.fillColor(col).font('Helvetica-Bold').fontSize(9)
                .text(`  ${d.severity === 'high' ? '✗' : '⚠'}  `, MARGIN + 12, doc.y, { continued: true });
            doc.fillColor(C.black).font('Helvetica').fontSize(9)
                .text(`[${(d.severity || '').toUpperCase()}] ${d.message}`, { continued: false });
        }
    }

    // Recommendations
    const recs = validation?.recommendations || [];
    if (recs.length) {
        doc.moveDown(0.4);
        doc.fillColor(C.grey).font('Helvetica-Bold').fontSize(9.5)
            .text('Recommendations', MARGIN + 12, doc.y);
        doc.moveDown(0.25);
        recs.forEach((r, i) => {
            ensureSpace(doc, 16);
            doc.fillColor(C.teal).font('Helvetica-Bold').fontSize(9)
                .text(`  ${i + 1}.  `, MARGIN + 12, doc.y, { continued: true });
            doc.fillColor(C.black).font('Helvetica').fontSize(9).text(r, { continued: false });
        });
    }

    doc.moveDown(0.5);
    hRule(doc);
}

// ─── Unit test sections ───────────────────────────────────────────────────────
function renderUnitSection(doc, label, data) {
    sectionBand(doc, `  ${label.toUpperCase()} UNIT TESTS`, C.teal);

    if (!data) {
        doc.fillColor(C.grey).font('Helvetica').fontSize(9.5)
            .text('  No results available.', MARGIN + 12, doc.y);
        doc.moveDown(0.5);
        hRule(doc);
        return;
    }

    kv(doc, 'Total tests',  data.total);
    kv(doc, 'Passed',       data.passed,  C.grey, data.passed === data.total ? C.green : C.black);
    kv(doc, 'Failed',       data.failed,  C.grey, data.failed  > 0 ? C.red : C.green);
    kv(doc, 'Skipped',      data.skipped, C.grey, C.midGrey);
    kv(doc, 'Pass rate',    pct(data.passed, data.total));

    ensureSpace(doc, 20);
    const barY = doc.y + 2;
    miniProgressBar(doc, MARGIN + 167, barY, 200, data.passed, data.total,
                    data.failed > 0 ? C.orange : C.green);
    doc.y = barY + 12;
    doc.moveDown(0.4);

    if (data.coverage) {
        ensureSpace(doc, 52);
        doc.fillColor(C.grey).font('Helvetica-Bold').fontSize(9.5)
            .text('  Code Coverage', MARGIN + 12, doc.y);
        doc.moveDown(0.25);
        kv(doc, 'Line coverage',     `${data.coverage.lines.pct}%`,     C.grey,
           +data.coverage.lines.pct     < 70 ? C.orange : C.green);
        kv(doc, 'Function coverage', `${data.coverage.functions.pct}%`, C.grey,
           +data.coverage.functions.pct < 70 ? C.orange : C.green);
    }

    doc.moveDown(0.3);
    hRule(doc);
}

// ─── Parse .feature files from disk ─────────────────────────────────────────
function parseFeatureFiles(featuresDir) {
    const features = [];
    if (!fs.existsSync(featuresDir)) return features;
    const files = fs.readdirSync(featuresDir).filter(f => f.endsWith('.feature')).sort();
    for (const file of files) {
        const content = fs.readFileSync(path.join(featuresDir, file), 'utf8');
        let featureName = path.basename(file, '.feature');
        const scenarios = [];
        for (const line of content.split('\n')) {
            const t = line.trim();
            if (t.startsWith('Feature:')) featureName = t.replace('Feature:', '').trim();
            else if (t.startsWith('Scenario Outline:')) scenarios.push(t.replace('Scenario Outline:', '').trim());
            else if (t.startsWith('Scenario:')) scenarios.push(t.replace('Scenario:', '').trim());
        }
        if (scenarios.length > 0) features.push({ file, featureName, scenarios });
    }
    return features;
}

// ─── BDD section — scenario summary table ────────────────────────────────────
function renderBDDSection(doc, featuresDir, cucumberRaw) {
    sectionBand(doc, '  BDD TEST SCENARIOS', C.accent);

    // Build result lookup from cucumber JSON if present: "featureName::scenarioName" -> status
    const resultMap = {};
    if (Array.isArray(cucumberRaw) && cucumberRaw.length) {
        for (const feat of cucumberRaw) {
            const fName = feat.name || '';
            for (const el of (feat.elements || [])) {
                if (el.type === 'background') continue;
                resultMap[`${fName}::${el.name}`] = scenarioStatus(el.steps);
            }
        }
    }
    const hasResults = Object.keys(resultMap).length > 0;

    const features = parseFeatureFiles(featuresDir);

    if (!features.length) {
        doc.fillColor(C.grey).font('Helvetica').fontSize(9.5)
            .text('  No BDD feature files found.', MARGIN + 12, doc.y, { width: CONTENT - 24 });
        doc.moveDown(0.5);
        hRule(doc);
        return;
    }

    // Count totals
    let total = 0, passed = 0, failed = 0, notRun = 0;
    for (const feat of features) {
        for (const sc of feat.scenarios) {
            total++;
            const st = resultMap[`${feat.featureName}::${sc}`];
            if (st === 'passed')      passed++;
            else if (st === 'failed') failed++;
            else                      notRun++;
        }
    }

    // Summary stats
    kv(doc, 'Feature files',    features.length);
    kv(doc, 'Total scenarios',  total);
    if (hasResults) {
        kv(doc, 'Passed',  passed,  C.grey, passed  > 0 ? C.green  : C.grey);
        kv(doc, 'Failed',  failed,  C.grey, failed  > 0 ? C.red    : C.green);
        kv(doc, 'Not run', notRun,  C.grey, C.midGrey);
        kv(doc, 'Pass rate', pct(passed, total));
        ensureSpace(doc, 20);
        const barY = doc.y + 2;
        miniProgressBar(doc, MARGIN + 167, barY, 200, passed, total,
                        failed > 0 ? C.red : C.green);
        doc.y = barY + 14;
    } else {
        kv(doc, 'Execution status', 'Not run — no live backend during this build', C.grey, C.orange);
    }
    doc.moveDown(0.5);

    // Table header
    const C_NUM  = MARGIN + 4;
    const C_FEAT = MARGIN + 28;
    const C_SC   = MARGIN + 155;
    const C_STAT = PAGE_W - MARGIN - 62;

    ensureSpace(doc, 22);
    const headY = doc.y;
    doc.rect(MARGIN, headY - 2, CONTENT, 16).fill(C.primary);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8)
        .text('#',        C_NUM,  headY, { continued: false })
        .text('Feature',  C_FEAT, headY, { continued: false })
        .text('Scenario', C_SC,   headY, { continued: false })
        .text('Status',   C_STAT, headY, { continued: false });
    doc.y = headY + 18;

    let rowNum = 0, even = false;
    for (const feat of features) {
        for (const sc of feat.scenarios) {
            rowNum++;
            ensureSpace(doc, 15);
            const rawStatus = resultMap[`${feat.featureName}::${sc}`];
            const status    = rawStatus || 'not_run';
            const ry        = doc.y;

            if (even) doc.rect(MARGIN, ry - 1, CONTENT, 14).fill('#f5f5f5');
            even = !even;

            doc.fillColor(C.midGrey).font('Helvetica').fontSize(7)
                .text(String(rowNum), C_NUM, ry + 1, { width: 22, continued: false });

            doc.fillColor(C.grey).font('Helvetica').fontSize(7.5)
                .text(feat.featureName, C_FEAT, ry + 1,
                      { width: C_SC - C_FEAT - 6, ellipsis: true, continued: false });

            doc.fillColor(C.black).font('Helvetica').fontSize(7.5)
                .text(sc, C_SC, ry + 1,
                      { width: C_STAT - C_SC - 8, ellipsis: true, continued: false });

            const badgeLabel = status === 'not_run' ? 'NOT RUN'
                             : status === 'passed'  ? 'PASSED'
                             : status === 'failed'  ? 'FAILED'
                             : status.toUpperCase();
            const badgeCol   = status === 'not_run' ? C.midGrey : statusColour(status);
            doc.roundedRect(C_STAT, ry, 58, 12, 2).fill(badgeCol);
            doc.fillColor(C.white).font('Helvetica-Bold').fontSize(6.5)
                .text(badgeLabel, C_STAT, ry + 2, { width: 58, align: 'center', continued: false });

            doc.y = ry + 14;
        }
    }

    doc.moveDown(0.5);
    hRule(doc);
}

// ─── Build info ───────────────────────────────────────────────────────────────
function renderBuildInfo(doc, summaryText) {
    sectionBand(doc, '  BUILD INFORMATION', C.primary);

    if (!summaryText) {
        doc.fillColor(C.grey).font('Helvetica').fontSize(9.5)
            .text('  No build summary available.', MARGIN + 12, doc.y);
        doc.moveDown(0.5);
        return;
    }

    doc.fillColor(C.black).font('Courier').fontSize(8.5);
    for (const line of summaryText.split('\n')) {
        ensureSpace(doc, 13);
        doc.text('  ' + line, MARGIN + 12, doc.y, { continued: false });
    }
    doc.moveDown(0.4);
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function renderFooter(doc, pageNum, total) {
    const y = doc.page.height - 28;
    doc.save()
        .moveTo(MARGIN, y - 4).lineTo(PAGE_W - MARGIN, y - 4)
        .strokeColor(C.dimGrey).lineWidth(0.4).stroke()
        .fillColor(C.midGrey).font('Helvetica').fontSize(7.5)
        .text(
            `Test Execution Report  |  Page ${pageNum} of ${total}  |  Generated ${new Date().toLocaleString()}`,
            MARGIN, y, { align: 'center', width: CONTENT }
        )
        .restore();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });

    const backendRaw  = loadJSON(path.join(REPORTS_DIR, 'backend-unit-tests.json'));
    const frontendRaw = loadJSON(path.join(REPORTS_DIR, 'frontend-unit-tests.json'));
    const cucumberRaw = loadJSON(path.join(REPORTS_DIR, 'cucumber-report.json'));
    const validation  = loadJSON(path.join(REPORTS_DIR, 'validation-report.json'));
    const summaryText = loadText(path.join(REPORTS_DIR, 'summary.txt'));

    const backendUnit  = parseUnitResults(backendRaw,  path.join('backend',  'coverage', 'coverage-final.json'));
    const frontendUnit = parseUnitResults(frontendRaw, path.join('frontend', 'coverage', 'coverage-final.json'));
    const cucumberData = parseCucumber(cucumberRaw);

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

    // bottom: 0 prevents PDFKit auto-paginating when we intentionally draw near the page bottom
    // (cover "Generated" text, footer). Manual page breaks are handled by ensureSpace().
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, left: MARGIN, right: MARGIN, bottom: 0 },
        bufferPages: true,
        autoFirstPage: true,
    });
    const out = fs.createWriteStream(OUTPUT_FILE);
    doc.pipe(out);

    const FEATURES_DIR = process.env.FEATURES_DIR || 'playwright-tests/features';

    renderCoverPage(doc, buildInfo, overallStatus, backendUnit, frontendUnit, cucumberData);
    renderExecutiveSummary(doc, backendUnit, frontendUnit, cucumberData, validation);
    renderUnitSection(doc, 'Backend', backendUnit);
    renderUnitSection(doc, 'Frontend', frontendUnit);
    renderBDDSection(doc, FEATURES_DIR, cucumberRaw);
    renderBuildInfo(doc, summaryText);

    // Page numbers
    const range = doc.bufferedPageRange();
    const total = range.count;
    for (let i = 0; i < total; i++) {
        doc.switchToPage(range.start + i);
        renderFooter(doc, i + 1, total);
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
