#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failOnAlert = process.argv.includes('--fail-on-alert')
const reportDir = path.join(repoRoot, 'review_audit', 'generated')
const jsonReportPath = path.join(reportDir, 'quality-warning-map.json')
const markdownReportPath = path.join(repoRoot, 'review_audit', '102_quality_warning_map.md')

const generatedAt = new Date().toISOString()

const eslint = collectEslint()
const coverage = collectCoverage()
const sonar = await collectSonar()
const alerts = buildAlerts({ eslint, coverage, sonar })
const plan = buildAttackPlan({ eslint, coverage, sonar })

const report = {
  generatedAt,
  alerts,
  eslint,
  sonar,
  coverage,
  plan,
  reports: {
    markdown: toRepoPath(markdownReportPath),
    json: toRepoPath(jsonReportPath),
  },
}

mkdirSync(reportDir, { recursive: true })
writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`)
writeFileSync(markdownReportPath, renderMarkdown(report))

printSummary(report)

if (failOnAlert && alerts.some((alert) => alert.level === 'critical')) {
  process.exit(1)
}

function collectEslint() {
  const workspaces = [
    { name: 'api', cwd: path.join(repoRoot, 'apps', 'api') },
    { name: 'web', cwd: path.join(repoRoot, 'apps', 'web') },
  ]

  const workspaceReports = workspaces.map((workspace) => {
    const result = runCommand('npx', ['eslint', '.', '--format', 'json'], workspace.cwd)
    const parsed = parseJsonOutput(result.stdout, `ESLint ${workspace.name}`)
    const files = parsed.map((fileReport) => summarizeEslintFile(workspace.name, fileReport))
    const messages = files.flatMap((file) => file.messages)

    return {
      workspace: workspace.name,
      status: result.status,
      stderr: result.stderr.trim(),
      filesAnalyzed: files.length,
      errorCount: sum(files, 'errorCount'),
      warningCount: sum(files, 'warningCount'),
      fixableErrorCount: sum(files, 'fixableErrorCount'),
      fixableWarningCount: sum(files, 'fixableWarningCount'),
      topRules: topBy(messages, (message) => message.ruleId ?? 'unknown', 20),
      topFiles: topBy(messages, (message) => message.filePath, 20),
      messages,
    }
  })

  const allMessages = workspaceReports.flatMap((workspace) => workspace.messages)

  return {
    status: workspaceReports.some((workspace) => workspace.errorCount > 0) ? 'error' : 'warning',
    workspaces: workspaceReports,
    totals: {
      filesAnalyzed: sum(workspaceReports, 'filesAnalyzed'),
      errors: sum(workspaceReports, 'errorCount'),
      warnings: sum(workspaceReports, 'warningCount'),
      fixableErrors: sum(workspaceReports, 'fixableErrorCount'),
      fixableWarnings: sum(workspaceReports, 'fixableWarningCount'),
    },
    topRules: topBy(allMessages, (message) => message.ruleId ?? 'unknown', 25),
    topFiles: topBy(allMessages, (message) => message.filePath, 25),
    messages: allMessages,
  }
}

function summarizeEslintFile(workspace, fileReport) {
  const filePath = toRepoPath(fileReport.filePath)
  const messages = fileReport.messages.map((message) => ({
    workspace,
    filePath,
    line: message.line ?? null,
    column: message.column ?? null,
    ruleId: message.ruleId ?? 'unknown',
    severity: message.severity === 2 ? 'error' : 'warning',
    message: message.message,
    fixable: Boolean(message.fix),
  }))

  return {
    filePath,
    errorCount: fileReport.errorCount ?? 0,
    warningCount: fileReport.warningCount ?? 0,
    fixableErrorCount: fileReport.fixableErrorCount ?? 0,
    fixableWarningCount: fileReport.fixableWarningCount ?? 0,
    messages,
  }
}

function collectCoverage() {
  const workspaces = [
    { name: 'api', path: path.join(repoRoot, 'apps', 'api', 'coverage', 'coverage-summary.json') },
    { name: 'web', path: path.join(repoRoot, 'apps', 'web', 'coverage', 'coverage-summary.json') },
  ]

  return workspaces.map((workspace) => {
    if (!existsSync(workspace.path)) {
      return {
        workspace: workspace.name,
        available: false,
        path: toRepoPath(workspace.path),
        reason: 'coverage-summary.json not found',
      }
    }

    const summary = JSON.parse(readFileSync(workspace.path, 'utf8'))
    const files = Object.entries(summary)
      .filter(([filePath]) => filePath !== 'total')
      .map(([filePath, metrics]) => {
        const uncoveredLines = Math.max(0, metrics.lines.total - metrics.lines.covered)
        return {
          filePath: normalizeCoveragePath(filePath),
          linesPct: metrics.lines.pct,
          linesToCover: metrics.lines.total,
          uncoveredLines,
          branchesPct: metrics.branches.pct,
          functionsPct: metrics.functions.pct,
          statementsPct: metrics.statements.pct,
        }
      })
      .sort((left, right) => right.uncoveredLines - left.uncoveredLines)

    return {
      workspace: workspace.name,
      available: true,
      path: toRepoPath(workspace.path),
      total: {
        linesPct: summary.total.lines.pct,
        branchesPct: summary.total.branches.pct,
        functionsPct: summary.total.functions.pct,
        statementsPct: summary.total.statements.pct,
      },
      topUncoveredFiles: files.slice(0, 20),
    }
  })
}

async function collectSonar() {
  const hostUrl = readEnv('SONAR_HOST_URL') || 'http://localhost:9000'
  const token = readEnv('SONAR_TOKEN')

  if (!token) {
    return {
      available: false,
      hostUrl,
      reason: 'SONAR_TOKEN not found in process or Windows user environment',
    }
  }

  try {
    const [qualityGate, measures, issues, hotspots, coverageTree] = await Promise.all([
      sonarFetch(hostUrl, token, '/api/qualitygates/project_status', { projectKey: 'desk-imperial' }),
      sonarFetch(hostUrl, token, '/api/measures/component', {
        component: 'desk-imperial',
        metricKeys:
          'bugs,vulnerabilities,code_smells,security_hotspots,coverage,duplicated_lines_density,ncloc,reliability_rating,security_rating,sqale_rating,alert_status',
      }),
      sonarFetch(hostUrl, token, '/api/issues/search', {
        componentKeys: 'desk-imperial',
        resolved: 'false',
        ps: '500',
        facets: 'types,severities,cleanCodeAttributeCategories,rules',
      }),
      sonarFetch(hostUrl, token, '/api/hotspots/search', {
        projectKey: 'desk-imperial',
        status: 'TO_REVIEW',
        ps: '100',
      }),
      sonarFetch(hostUrl, token, '/api/measures/component_tree', {
        component: 'desk-imperial',
        metricKeys: 'coverage,lines_to_cover,uncovered_lines',
        qualifiers: 'FIL',
        ps: '50',
        s: 'metric',
        metricSort: 'uncovered_lines',
        asc: 'false',
      }),
    ])

    return {
      available: true,
      hostUrl,
      dashboardUrl: `${hostUrl.replace(/\/$/, '')}/dashboard?id=desk-imperial`,
      qualityGate: qualityGate.projectStatus,
      measures: Object.fromEntries(
        measures.component.measures.map((measure) => [measure.metric, normalizeMeasureValue(measure.value)]),
      ),
      issues: {
        total: issues.total,
        effortMinutes: issues.effortTotal,
        facets: issues.facets,
        topIssues: issues.issues.slice(0, 50).map((issue) => ({
          key: issue.key,
          rule: issue.rule,
          severity: issue.severity,
          type: issue.type,
          component: issue.component.replace('desk-imperial:', ''),
          line: issue.line ?? null,
          message: issue.message,
          cleanCodeAttributeCategory: issue.cleanCodeAttributeCategory,
        })),
      },
      hotspots: {
        total: hotspots.paging?.total ?? hotspots.hotspots.length,
        top: hotspots.hotspots.slice(0, 50).map((hotspot) => ({
          key: hotspot.key,
          rule: hotspot.ruleKey,
          category: hotspot.securityCategory,
          probability: hotspot.vulnerabilityProbability,
          component: hotspot.component.replace('desk-imperial:', ''),
          line: hotspot.line ?? null,
          message: hotspot.message,
        })),
      },
      coverageTopUncovered: coverageTree.components.map((component) => ({
        filePath: component.path,
        coverage: Number(findMeasure(component.measures, 'coverage') ?? 0),
        linesToCover: Number(findMeasure(component.measures, 'lines_to_cover') ?? 0),
        uncoveredLines: Number(findMeasure(component.measures, 'uncovered_lines') ?? 0),
      })),
    }
  } catch (error) {
    return {
      available: false,
      hostUrl,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}

function buildAlerts({ eslint, coverage, sonar }) {
  const alerts = []

  if (eslint.totals.errors > 0) {
    alerts.push({
      level: 'critical',
      source: 'eslint',
      message: `${eslint.totals.errors} ESLint error(s) found`,
    })
  }

  if (eslint.totals.warnings > 0) {
    alerts.push({
      level: 'warning',
      source: 'eslint',
      message: `${eslint.totals.warnings} ESLint warning(s) found`,
    })
  }

  for (const workspaceCoverage of coverage) {
    if (!workspaceCoverage.available) {
      alerts.push({
        level: 'warning',
        source: `coverage:${workspaceCoverage.workspace}`,
        message: workspaceCoverage.reason,
      })
      continue
    }

    if (workspaceCoverage.total.linesPct < 80) {
      alerts.push({
        level: 'warning',
        source: `coverage:${workspaceCoverage.workspace}`,
        message: `line coverage is ${workspaceCoverage.total.linesPct}%`,
      })
    }
  }

  if (!sonar.available) {
    alerts.push({
      level: 'warning',
      source: 'sonar',
      message: sonar.reason,
    })
    return alerts
  }

  if (sonar.qualityGate?.status !== 'OK') {
    alerts.push({
      level: 'critical',
      source: 'sonar',
      message: `Quality Gate is ${sonar.qualityGate?.status ?? 'unknown'}`,
    })
  }

  if (Number(sonar.measures.bugs ?? 0) > 0 || Number(sonar.measures.vulnerabilities ?? 0) > 0) {
    alerts.push({
      level: 'critical',
      source: 'sonar',
      message: `bugs=${sonar.measures.bugs ?? 0}, vulnerabilities=${sonar.measures.vulnerabilities ?? 0}`,
    })
  }

  if (Number(sonar.measures.security_hotspots ?? 0) > 0) {
    alerts.push({
      level: 'warning',
      source: 'sonar',
      message: `${sonar.measures.security_hotspots} security hotspot(s) to review`,
    })
  }

  return alerts
}

function buildAttackPlan({ eslint, coverage, sonar }) {
  const coverageTargets = sonar.available
    ? sonar.coverageTopUncovered.slice(0, 8)
    : coverage.flatMap((workspace) => (workspace.available ? workspace.topUncoveredFiles.slice(0, 4) : []))
  const hotspotTotal = sonar.available ? Number(sonar.measures.security_hotspots ?? sonar.hotspots.total ?? 0) : 0

  return [
    {
      priority: 'P0',
      title: 'Security hotspots review',
      reason: sonar.available
        ? `Quality Gate fails while ${hotspotTotal} hotspot(s) remain unreviewed.`
        : 'Sonar is unavailable, so hotspot status cannot be trusted yet.',
      actions: buildHotspotActions(sonar),
    },
    {
      priority: 'P1',
      title: 'Coverage holes by uncovered lines',
      reason: 'Quality Gate fails on new coverage and global coverage is below the target for safe feature work.',
      actions: coverageTargets.map((target) => `${target.filePath}: ${target.uncoveredLines} uncovered line(s)`),
    },
    {
      priority: 'P2',
      title: 'High-volume mechanical Sonar smells',
      reason: 'These rules clear many issues with low behavior risk when tested per touched surface.',
      actions: [
        'S6759: convert React props to Readonly props by component cluster.',
        'S3358/S7735: replace nested or negated conditions with named statements.',
        'S7764: use globalThis/globalThis.window in browser guards.',
        'S7781/S6582: use replaceAll and optional chaining where behavior is identical.',
      ],
    },
    {
      priority: 'P3',
      title: 'Bloaters and complex flow refactors',
      reason: 'Large files need behavior tests before extraction.',
      actions: [
        'Start with operations-realtime-patching buildComandaFromPayload mapping extraction.',
        'Then staff/owner mobile shells after mobile coverage is active.',
        'Leave ComandaService for a dedicated contract-protected pass.',
      ],
    },
    {
      priority: 'P4',
      title: 'ESLint warning budget',
      reason: 'Warnings should become a managed budget instead of terminal noise.',
      actions: [
        `Current ESLint baseline: ${eslint.totals.warnings} warning(s), ${eslint.totals.errors} error(s).`,
        'Reduce by cluster and update this report after each cleanup.',
        'Do not enable fail-on-alert until the baseline is intentionally accepted.',
      ],
    },
  ]
}

function buildHotspotActions(sonar) {
  if (!sonar.available) {
    return ['Run Sonar locally and regenerate this map before changing security-sensitive code.']
  }

  if (sonar.hotspots.total === 0) {
    return ['No open hotspots. Keep reviewing every new hotspot before merging feature work.']
  }

  const actions = topBy(sonar.hotspots.top, (hotspot) => `${hotspot.rule} (${hotspot.category})`, 8).map(
    (hotspot) => `Review ${hotspot.key}: ${hotspot.count} hotspot(s).`,
  )

  actions.push('Only mark a hotspot false-positive after writing the rationale in Sonar.')
  return actions
}

function renderMarkdown(report) {
  return `${[
    '# Quality Warning Map',
    '',
    `**Generated at:** ${report.generatedAt}`,
    '**Scope:** current local workspace',
    '**Status:** alert active',
    '',
    '---',
    '',
    '## Executive Alert',
    '',
    ...renderAlerts(report.alerts),
    '',
    '---',
    '',
    '## ESLint Baseline',
    '',
    `- Files analyzed: ${report.eslint.totals.filesAnalyzed}`,
    `- Errors: ${report.eslint.totals.errors}`,
    `- Warnings: ${report.eslint.totals.warnings}`,
    `- Fixable warnings: ${report.eslint.totals.fixableWarnings}`,
    '',
    '### Top ESLint Rules',
    '',
    renderTable(
      ['Rule', 'Count'],
      report.eslint.topRules.slice(0, 15).map((item) => [item.key, item.count]),
    ),
    '',
    '### Top ESLint Files',
    '',
    renderTable(
      ['File', 'Count'],
      report.eslint.topFiles.slice(0, 15).map((item) => [item.key, item.count]),
    ),
    '',
    '---',
    '',
    '## Sonar Baseline',
    '',
    renderSonar(report.sonar),
    '',
    '---',
    '',
    '## Coverage Baseline',
    '',
    ...renderCoverage(report.coverage),
    '',
    '---',
    '',
    '## Attack Plan',
    '',
    ...renderPlan(report.plan),
    '',
    '---',
    '',
    '## Commands',
    '',
    '```powershell',
    'npm run quality:warnings',
    'npm run quality:scope:strict',
    'npm run quality:contracts',
    'npm run quality:preflight',
    '```',
    '',
    'The complete warning list is stored in `review_audit/generated/quality-warning-map.json`.',
    '',
  ].join('\n')}\n`
}

function renderAlerts(alerts) {
  if (alerts.length === 0) {
    return ['No alerts.']
  }

  return [
    renderTable(
      ['Level', 'Source', 'Message'],
      alerts.map((alert) => [alert.level, alert.source, alert.message]),
    ),
  ]
}

function renderSonar(sonar) {
  if (!sonar.available) {
    return `Sonar unavailable: ${sonar.reason}`
  }

  const qualityGateRows = (sonar.qualityGate.conditions ?? []).map((condition) => [
    condition.metricKey,
    condition.actualValue ?? '',
    condition.errorThreshold ?? '',
    condition.status,
  ])

  const issueRuleFacet = sonar.issues.facets.find((facet) => facet.property === 'rules')
  const ruleRows = (issueRuleFacet?.values ?? []).slice(0, 15).map((item) => [item.val, item.count])

  return [
    `Dashboard: ${sonar.dashboardUrl}`,
    '',
    `Quality Gate: ${sonar.qualityGate.status}`,
    '',
    renderTable(['Condition', 'Actual', 'Target', 'Status'], qualityGateRows),
    '',
    '### Measures',
    '',
    renderTable(
      ['Metric', 'Value'],
      Object.entries(sonar.measures).map(([key, value]) => [key, value]),
    ),
    '',
    '### Top Sonar Rules',
    '',
    renderTable(['Rule', 'Count'], ruleRows),
    '',
    '### Top Sonar Coverage Holes',
    '',
    renderTable(
      ['File', 'Coverage', 'Uncovered lines'],
      sonar.coverageTopUncovered.slice(0, 15).map((item) => [item.filePath, `${item.coverage}%`, item.uncoveredLines]),
    ),
    '',
    '### Hotspots To Review',
    '',
    renderTable(
      ['File', 'Rule', 'Category', 'Line'],
      sonar.hotspots.top.slice(0, 15).map((item) => [item.component, item.rule, item.category, item.line ?? '']),
    ),
  ].join('\n')
}

function renderCoverage(coverage) {
  return coverage.flatMap((workspace) => {
    if (!workspace.available) {
      return [`### ${workspace.workspace}`, '', workspace.reason, '']
    }

    return [
      `### ${workspace.workspace}`,
      '',
      renderTable(
        ['Metric', 'Pct'],
        [
          ['lines', `${workspace.total.linesPct}%`],
          ['branches', `${workspace.total.branchesPct}%`],
          ['functions', `${workspace.total.functionsPct}%`],
          ['statements', `${workspace.total.statementsPct}%`],
        ],
      ),
      '',
      renderTable(
        ['File', 'Lines pct', 'Uncovered lines'],
        workspace.topUncoveredFiles
          .slice(0, 10)
          .map((file) => [file.filePath, `${file.linesPct}%`, file.uncoveredLines]),
      ),
      '',
    ]
  })
}

function renderPlan(plan) {
  return plan.flatMap((item) => [
    `### ${item.priority} - ${item.title}`,
    '',
    item.reason,
    '',
    ...item.actions.map((action) => `- ${action}`),
    '',
  ])
}

function renderTable(headers, rows) {
  const headerLine = `| ${headers.join(' | ')} |`
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`
  const rowLines =
    rows.length === 0 ? [`| ${headers.map(() => 'none').join(' | ')} |`] : rows.map((row) => `| ${row.join(' | ')} |`)
  return [headerLine, separatorLine, ...rowLines].join('\n')
}

function printSummary(report) {
  console.log('Quality warning map')
  console.log(`- markdown: ${report.reports.markdown}`)
  console.log(`- json: ${report.reports.json}`)
  console.log(`- eslint warnings: ${report.eslint.totals.warnings}`)
  console.log(`- eslint errors: ${report.eslint.totals.errors}`)
  if (report.sonar.available) {
    console.log(`- sonar quality gate: ${report.sonar.qualityGate.status}`)
    console.log(`- sonar code smells: ${report.sonar.measures.code_smells}`)
    console.log(`- sonar hotspots: ${report.sonar.measures.security_hotspots}`)
  } else {
    console.log(`- sonar unavailable: ${report.sonar.reason}`)
  }
  console.log(`- alerts: ${report.alerts.length}`)
}

function runCommand(command, args, cwd) {
  const invocation =
    process.platform === 'win32'
      ? {
          command: process.env.ComSpec || 'cmd.exe',
          args: ['/d', '/s', '/c', [command, ...args].map(quoteWindowsArg).join(' ')],
        }
      : { command, args }

  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 128 * 1024 * 1024,
  })

  if (result.error) {
    throw result.error
  }

  return {
    status: result.status ?? 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

function quoteWindowsArg(value) {
  const text = String(value)
  if (/^[A-Za-z0-9_:@./=\\-]+$/u.test(text)) {
    return text
  }

  return `"${text.replaceAll('"', '\\"')}"`
}

function parseJsonOutput(output, label) {
  try {
    return JSON.parse(output)
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function sonarFetch(hostUrl, token, route, params) {
  const url = new URL(route, hostUrl)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Sonar ${route} failed with HTTP ${response.status}`)
  }

  return response.json()
}

function findMeasure(measures, metric) {
  return measures.find((measure) => measure.metric === metric)?.value
}

function normalizeMeasureValue(value) {
  if (value === undefined) {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) && String(value).trim() !== '' ? numeric : value
}

function normalizeCoveragePath(filePath) {
  return toRepoPath(path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath))
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/')
}

function topBy(items, keyGetter, limit) {
  const counts = new Map()
  for (const item of items) {
    const key = keyGetter(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, limit)
}

function sum(items, property) {
  return items.reduce((total, item) => total + Number(item[property] ?? 0), 0)
}

function readEnv(name) {
  const directValue = process.env[name]?.trim()
  if (directValue) {
    return directValue
  }

  if (process.platform !== 'win32') {
    return ''
  }

  const result = spawnSync('reg', ['query', 'HKCU\\Environment', '/v', name], {
    encoding: 'utf8',
    shell: false,
  })

  if (result.status !== 0 || !result.stdout) {
    return ''
  }

  const line = result.stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(name))

  if (!line) {
    return ''
  }

  return line.replace(new RegExp(`^${name}\\s+REG_\\w+\\s+`), '').trim()
}
