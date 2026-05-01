#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const RELEASE_DIR = path.join(process.cwd(), 'docs', 'release')
const STRICT_REPORT_RE = /^sonarqube-local-strict-scan-.*\.json$/i
const BASE_REPORT_RE = /^sonarqube-local-scan-.*\.json$/i

function parseArgs(argv) {
  const args = {}

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]

    if ((token === '--current' || token === '-c') && argv[i + 1]) {
      args.current = argv[i + 1]
      i += 1
      continue
    }

    if ((token === '--previous' || token === '-p') && argv[i + 1]) {
      args.previous = argv[i + 1]
      i += 1
      continue
    }

    if (token === '--help' || token === '-h') {
      args.help = true
      continue
    }
  }

  return args
}

function printUsage() {
  console.log('Usage: node scripts/check-sonar-regression.mjs [--current <report>] [--previous <report>]')
  console.log('Examples:')
  console.log('  node scripts/check-sonar-regression.mjs')
  console.log(
    '  node scripts/check-sonar-regression.mjs --current docs/release/sonarqube-local-strict-scan-2026-04-03.json',
  )
  console.log(
    '  node scripts/check-sonar-regression.mjs --previous docs/release/sonarqube-local-scan-2026-04-03.json --current docs/release/sonarqube-local-strict-scan-2026-04-03.json',
  )
}

function toAbsolutePath(filePath) {
  if (!filePath) {
    return null
  }

  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
}

async function listReleaseReports() {
  const entries = await fs.readdir(RELEASE_DIR, { withFileTypes: true })
  const reports = []

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    const fullPath = path.join(RELEASE_DIR, entry.name)
    const stat = await fs.stat(fullPath)

    reports.push({
      name: entry.name,
      fullPath,
      mtimeMs: stat.mtimeMs,
    })
  }

  reports.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return reports
}

async function detectCurrentReport() {
  const reports = await listReleaseReports()
  const strict = reports.find((report) => STRICT_REPORT_RE.test(report.name))

  if (strict) {
    return strict.fullPath
  }

  const base = reports.find((report) => BASE_REPORT_RE.test(report.name))
  return base ? base.fullPath : null
}

async function detectPreviousReport(currentPath) {
  const currentAbsolute = toAbsolutePath(currentPath)
  const reports = await listReleaseReports()

  const base = reports.find((report) => BASE_REPORT_RE.test(report.name) && report.fullPath !== currentAbsolute)

  return base ? base.fullPath : null
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  return JSON.parse(content)
}

function asNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const normalized = String(value).replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function getMeasure(report, key) {
  const measures = Array.isArray(report?.measures) ? report.measures : []
  const measure = measures.find((item) => item.metric === key)

  if (!measure) {
    return null
  }

  if (measure.period && typeof measure.period === 'object') {
    return asNumber(measure.period.value)
  }

  return asNumber(measure.value)
}

function getQualityGateFailures(report) {
  const conditions = Array.isArray(report?.qualityGate?.conditions) ? report.qualityGate.conditions : []

  return conditions.filter((condition) => condition.status === 'ERROR')
}

function compareMetric(previous, current, key, mode) {
  const from = getMeasure(previous, key)
  const to = getMeasure(current, key)

  if (from === null || to === null) {
    return { key, from, to, status: 'unknown' }
  }

  if (mode === 'higher') {
    return {
      key,
      from,
      to,
      status: to >= from ? 'ok' : 'regressed',
    }
  }

  return {
    key,
    from,
    to,
    status: to <= from ? 'ok' : 'regressed',
  }
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return 'n/a'
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function printComparison(result) {
  const icon = result.status === 'ok' ? 'OK' : result.status === 'regressed' ? 'REGRESSION' : 'UNKNOWN'
  console.log(`- ${result.key}: ${formatNumber(result.from)} -> ${formatNumber(result.to)} (${icon})`)
}

function relativeOrAbsolute(filePath) {
  const relative = path.relative(process.cwd(), filePath)
  return relative.startsWith('..') ? filePath : relative
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printUsage()
    process.exit(0)
  }

  const currentPath = toAbsolutePath(args.current) || (await detectCurrentReport())

  if (!currentPath) {
    console.error('[FAIL] Nenhum report Sonar encontrado em docs/release.')
    console.error('Informe explicitamente com --current.')
    process.exit(1)
  }

  const previousPath = toAbsolutePath(args.previous) || (await detectPreviousReport(currentPath))

  const currentReport = await readJson(currentPath)
  const previousReport = previousPath ? await readJson(previousPath) : null

  const failures = []
  const gateStatus = currentReport?.qualityGate?.status ?? 'UNKNOWN'

  console.log('Sonar regression check')
  console.log(`- current: ${relativeOrAbsolute(currentPath)}`)
  console.log(`- previous: ${previousPath ? relativeOrAbsolute(previousPath) : 'none'}`)
  console.log(`- gate: ${gateStatus}`)

  if (gateStatus !== 'OK') {
    failures.push(`Quality Gate em estado ${gateStatus}.`)

    const failedConditions = getQualityGateFailures(currentReport)
    if (failedConditions.length > 0) {
      console.log('- failed conditions:')
      for (const condition of failedConditions) {
        console.log(
          `  - ${condition.metricKey} ${condition.comparator} ${condition.errorThreshold} (actual ${condition.actualValue})`,
        )
      }
    }
  }

  if (previousReport) {
    const checks = [
      compareMetric(previousReport, currentReport, 'new_coverage', 'higher'),
      compareMetric(previousReport, currentReport, 'new_duplicated_lines_density', 'lower'),
      compareMetric(previousReport, currentReport, 'new_violations', 'lower'),
      compareMetric(previousReport, currentReport, 'new_blocker_violations', 'lower'),
      compareMetric(previousReport, currentReport, 'new_critical_violations', 'lower'),
    ]

    console.log('- comparison:')
    for (const check of checks) {
      printComparison(check)
      if (check.status === 'regressed') {
        failures.push(`Metrica ${check.key} piorou (${formatNumber(check.from)} -> ${formatNumber(check.to)}).`)
      }
    }
  }

  if (failures.length > 0) {
    console.error('[FAIL] Regressao de qualidade detectada:')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log('[PASS] Sem regressao detectada no report atual.')
}

main().catch((error) => {
  console.error('[FAIL] Erro ao validar regressao Sonar.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
