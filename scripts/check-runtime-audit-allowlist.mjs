import { execSync } from 'node:child_process'
import process from 'node:process'

const ALLOWED_PACKAGES = new Set([
  '@nestjs/config',
  '@nestjs/core',
  '@nestjs/platform-express',
  '@nestjs/platform-socket.io',
  '@nestjs/swagger',
  '@nestjs/websockets',
  'lodash',
  'path-to-regexp',
])

const ALLOWED_ADVISORY_SOURCES = new Set([1115573, 1115582, 1115806, 1115810])
const ALLOWED_ADVISORY_URLS = new Set([
  'https://github.com/advisories/GHSA-j3q9-mxjg-w52f',
  'https://github.com/advisories/GHSA-27v5-c462-wpq7',
  'https://github.com/advisories/GHSA-r5fr-rjxr-66jc',
  'https://github.com/advisories/GHSA-f23m-r3pf-42rh',
])

const report = loadAuditReport()
const vulnerabilities = Object.entries(report.vulnerabilities ?? {})
const unexpected = []
const allowlisted = []

for (const [name, vulnerability] of vulnerabilities) {
  if (!['high', 'critical'].includes(vulnerability.severity)) {
    continue
  }

  const via = Array.isArray(vulnerability.via) ? vulnerability.via : []
  const effects = Array.isArray(vulnerability.effects) ? vulnerability.effects : []
  const isAllowlisted =
    ALLOWED_PACKAGES.has(name) && via.every(isAllowlistedVia) && effects.every((effect) => ALLOWED_PACKAGES.has(effect))

  const finding = {
    name,
    severity: vulnerability.severity,
    via: via.map(formatVia),
  }

  if (isAllowlisted) {
    allowlisted.push(finding)
    continue
  }

  unexpected.push(finding)
}

if (unexpected.length > 0) {
  console.error('Runtime security audit encontrou vulnerabilidades high/critical fora do allowlist temporario:')
  for (const vulnerability of unexpected) {
    console.error(`- ${vulnerability.name} (${vulnerability.severity}) via ${vulnerability.via.join(', ') || 'desconhecido'}`)
  }
  console.error(
    'Revise docs/security/dependency-risk-acceptance-2026-04-01.md antes de aceitar ou expandir esse allowlist.',
  )
  process.exit(1)
}

console.log(
  `Runtime security audit OK — ${allowlisted.length} findings high/critical permanecem apenas no allowlist documentado.`,
)
for (const vulnerability of allowlisted) {
  console.log(`- ${vulnerability.name} (${vulnerability.severity}) via ${vulnerability.via.join(', ')}`)
}

function loadAuditReport() {
  const auditCommand = process.platform === 'win32' ? 'npm.cmd audit --omit=dev --json' : 'npm audit --omit=dev --json'
  let rawOutput = ''

  try {
    rawOutput = execSync(auditCommand, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })
  } catch (error) {
    rawOutput = `${error.stdout ?? ''}`.trim() || `${error.stderr ?? ''}`.trim()
  }

  if (!rawOutput) {
    throw new Error('npm audit nao retornou saida JSON.')
  }

  try {
    return JSON.parse(rawOutput)
  } catch (error) {
    throw new Error(`Falha ao interpretar JSON do npm audit: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function isAllowlistedVia(entry) {
  if (typeof entry === 'string') {
    return ALLOWED_PACKAGES.has(entry)
  }

  if (!entry || typeof entry !== 'object') {
    return false
  }

  return ALLOWED_ADVISORY_SOURCES.has(entry.source) || ALLOWED_ADVISORY_URLS.has(entry.url)
}

function formatVia(entry) {
  if (typeof entry === 'string') {
    return entry
  }

  if (entry?.url && ALLOWED_ADVISORY_URLS.has(entry.url)) {
    return entry.url
  }

  if (entry?.source && ALLOWED_ADVISORY_SOURCES.has(entry.source)) {
    return `source:${entry.source}`
  }

  return entry?.name ?? 'desconhecido'
}
