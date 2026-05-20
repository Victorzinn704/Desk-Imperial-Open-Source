#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = new Set(process.argv.slice(2))
const strict = args.has('--strict')
const reportPath = resolveReportPath(process.argv)

const checks = [
  buildWorktreeCheck(),
  buildBranchSyncCheck(),
  buildGitHubActionsCheck(),
  buildHostRoleCheck('production-runtime', 'Oracle production runtime host'),
  buildHostRoleCheck('lab-staging-performance', 'Oracle lab/staging/performance host'),
  buildHostRoleCheck('runner-backup-light', 'Oracle runner/backup host'),
  buildFileCheck('docs/operations/staging-incident-rollback-runbook.md', 'Staging, incident and rollback runbook'),
  buildFileCheck('infra/oracle/runner/scripts/restore-check.sh', 'Restore drill script'),
  buildFileCheck('infra/oracle/ops/prometheus/alert.rules.yml', 'Prometheus/Alertmanager rules'),
  buildFileCheck('docs/operations/sentry-rollout-2026-05-01.md', 'Sentry rollout runbook'),
  buildFileCheck('docs/operations/performance-crisis-plan-2026-05-16.md', 'PWA/realtime performance plan'),
  buildFileCheck('docs/security/security-baseline.md', 'Security baseline'),
]

const report = buildReport(checks)
console.log(report)

if (reportPath) {
  mkdirSync(path.dirname(reportPath), { recursive: true })
  writeFileSync(reportPath, report)
}

if (strict && checks.some((check) => check.severity === 'critical' && check.status !== 'ok')) {
  process.exit(1)
}

function resolveReportPath(argv) {
  const reportIndex = argv.indexOf('--report')
  if (reportIndex === -1) {
    return null
  }

  const value = argv[reportIndex + 1]
  if (!value) {
    throw new Error('Use --report <path> para salvar o relatorio.')
  }

  return path.resolve(repoRoot, value)
}

function buildWorktreeCheck() {
  const status = runGit(['status', '--porcelain=v1']).trim()
  return {
    id: 'worktree-clean',
    area: 'git',
    status: status ? 'fail' : 'ok',
    severity: 'critical',
    evidence: status ? `${status.split(/\r?\n/).length} arquivo(s) alterado(s)` : 'sem alteracoes locais',
  }
}

function buildBranchSyncCheck() {
  const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { optional: true }).trim()
  if (!upstream) {
    return warningCheck('branch-sync', 'git', 'branch sem upstream configurado')
  }

  const counts = runGit(['rev-list', '--left-right', '--count', `HEAD...${upstream}`])
    .trim()
    .split(/\s+/)
  const ahead = Number(counts[0] ?? 0)
  const behind = Number(counts[1] ?? 0)
  const status = ahead === 0 && behind === 0 ? 'ok' : 'warn'

  return {
    id: 'branch-sync',
    area: 'git',
    status,
    severity: 'warning',
    evidence: `${ahead} commit(s) ahead, ${behind} behind de ${upstream}`,
  }
}

function buildGitHubActionsCheck() {
  const output = runCommand(
    'gh',
    ['run', 'list', '-L', '8', '--json', 'databaseId,workflowName,conclusion,status,createdAt'],
    {
      optional: true,
    },
  )
  if (!output.trim()) {
    return warningCheck('github-actions', 'ci', 'gh indisponivel ou sem autenticacao')
  }

  const runs = JSON.parse(output)
  const completed = runs.filter((run) => run.status === 'completed')
  const failures = completed.filter((run) => run.conclusion !== 'success')
  const status = failures.length === 0 && completed.length > 0 ? 'ok' : 'fail'

  return {
    id: 'github-actions',
    area: 'ci',
    status,
    severity: 'critical',
    evidence: summarizeRuns(completed, failures, fetchFailureAnnotation(failures)),
  }
}

function buildHostRoleCheck(role, label) {
  const inventory = readHostInventory()
  const host = inventory.hosts.find((candidate) => candidate.role === role)
  if (!host) {
    return criticalCheck(`host-${role}`, 'oracle', `${label} nao encontrado`)
  }

  const status = host.accessStatus === 'ok' ? 'ok' : 'warn'
  return {
    id: `host-${role}`,
    area: 'oracle',
    status,
    severity: 'warning',
    evidence: `${host.alias} (${host.publicIp}) access=${host.accessStatus}`,
  }
}

function buildFileCheck(relativePath, label) {
  const fullPath = path.join(repoRoot, relativePath)
  return {
    id: relativePath,
    area: 'runbook',
    status: existsSync(fullPath) ? 'ok' : 'fail',
    severity: 'warning',
    evidence: label,
  }
}

function readHostInventory() {
  const fullPath = path.join(repoRoot, 'infra/oracle/hosts/desk-hosts.json')
  if (!existsSync(fullPath)) {
    return { hosts: [] }
  }

  return JSON.parse(readFileSync(fullPath, 'utf8'))
}

function summarizeRuns(completed, failures, annotation) {
  if (completed.length === 0) {
    return 'nenhum run concluido encontrado'
  }

  if (failures.length === 0) {
    return `${completed.length} run(s) recente(s) concluido(s) com sucesso`
  }

  const names = failures.map((run) => `${run.workflowName}:${run.conclusion}`).join(', ')
  const annotationSuffix = annotation ? `; primeira anotacao: ${annotation}` : ''
  return `${failures.length}/${completed.length} run(s) recente(s) com falha (${names})${annotationSuffix}`
}

function fetchFailureAnnotation(failures) {
  const firstFailure = failures[0]
  if (!firstFailure?.databaseId) {
    return null
  }

  const repo = runCommand('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], {
    optional: true,
  }).trim()
  if (!repo) {
    return null
  }

  const runDetailsOutput = runCommand('gh', ['run', 'view', String(firstFailure.databaseId), '--json', 'jobs'], {
    optional: true,
  })
  if (!runDetailsOutput.trim()) {
    return null
  }

  const runDetails = JSON.parse(runDetailsOutput)
  const failedJob = runDetails.jobs?.find((job) => job.conclusion === 'failure' && job.databaseId)
  if (!failedJob) {
    return null
  }

  const annotationsOutput = runCommand('gh', ['api', `repos/${repo}/check-runs/${failedJob.databaseId}/annotations`], {
    optional: true,
  })
  if (!annotationsOutput.trim()) {
    return null
  }

  const annotations = JSON.parse(annotationsOutput)
  return annotations[0]?.message ?? null
}

function buildReport(entries) {
  const lines = [
    '# Operational Readiness Check',
    '',
    `Gerado em: ${new Date().toISOString()}`,
    '',
    '| Status | Area | Check | Severidade | Evidencia |',
    '| --- | --- | --- | --- | --- |',
    ...entries.map(renderCheckRow),
    '',
    renderSummary(entries),
  ]

  return lines.join('\n')
}

function renderCheckRow(check) {
  return `| ${check.status} | ${check.area} | ${check.id} | ${check.severity} | ${escapeTableCell(check.evidence)} |`
}

function renderSummary(entries) {
  const failedCritical = entries.filter((check) => check.severity === 'critical' && check.status !== 'ok')
  if (failedCritical.length > 0) {
    return `Resultado: BLOQUEADO por ${failedCritical.length} check(s) critico(s).`
  }

  const warnings = entries.filter((check) => check.status === 'warn' || check.status === 'fail')
  return warnings.length > 0 ? `Resultado: ATENCAO com ${warnings.length} aviso(s).` : 'Resultado: PRONTO.'
}

function warningCheck(id, area, evidence) {
  return { id, area, status: 'warn', severity: 'warning', evidence }
}

function criticalCheck(id, area, evidence) {
  return { id, area, status: 'fail', severity: 'critical', evidence }
}

function runGit(gitArgs, options = {}) {
  return runCommand('git', gitArgs, options)
}

function runCommand(command, commandArgs, options = {}) {
  try {
    return execFileSync(command, commandArgs, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', options.optional ? 'ignore' : 'pipe'],
    })
  } catch (error) {
    if (options.optional) {
      return ''
    }
    throw error
  }
}

function escapeTableCell(value) {
  return String(value).replaceAll('|', '\\|').replace(/\r?\n/g, '<br>')
}
