#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const BILLING_BLOCKED_UNTIL = '2026-05-31'
const DEFAULT_REPORT_ROOT = '.cache/offline-release'

const args = parseArgs(process.argv.slice(2))
const startedAt = new Date()
const reportDir = resolve(args.reportDir ?? join(DEFAULT_REPORT_ROOT, formatTimestamp(startedAt)))
const operationalReadinessReport = join(reportDir, 'operational-readiness.md')
const env = buildCommandEnv()
const metadata = collectMetadata()
const plan = buildPlan(args)

mkdirSync(reportDir, { recursive: true })

const results = []

if (!args.allowDirty) {
  results.push(checkCleanWorktree())
}

if (args.plan) {
  writeReport({
    args,
    metadata,
    reportDir,
    results: plan.map((step) => ({ ...step, status: 'planned', durationMs: 0 })),
    startedAt,
    verdict: 'PLANNED',
  })
  console.log(`Offline release gate plan written to ${relative(process.cwd(), join(reportDir, 'report.md'))}`)
  process.exit(0)
}

for (const step of plan) {
  results.push(runStep(step))
}

const verdict = resolveVerdict(results)
writeReport({ args, metadata, reportDir, results, startedAt, verdict })

console.log(`Offline release gate report: ${relative(process.cwd(), join(reportDir, 'report.md'))}`)

if (results.some((result) => result.required && result.status === 'failed')) {
  process.exit(1)
}

function parseArgs(rawArgs) {
  const parsed = {
    allowDirty: false,
    performance: false,
    plan: false,
    profile: 'standard',
    reportDir: null,
  }

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (arg === '--allow-dirty') {
      parsed.allowDirty = true
      continue
    }

    if (arg === '--performance') {
      parsed.performance = true
      continue
    }

    if (arg === '--plan') {
      parsed.plan = true
      continue
    }

    if (arg === '--profile') {
      parsed.profile = rawArgs[index + 1] ?? parsed.profile
      index += 1
      continue
    }

    if (arg.startsWith('--profile=')) {
      parsed.profile = arg.slice('--profile='.length)
      continue
    }

    if (arg === '--report-dir') {
      parsed.reportDir = rawArgs[index + 1] ?? parsed.reportDir
      index += 1
      continue
    }

    if (arg.startsWith('--report-dir=')) {
      parsed.reportDir = arg.slice('--report-dir='.length)
      continue
    }
  }

  if (!['quick', 'standard', 'full'].includes(parsed.profile)) {
    fail(`Perfil invalido: ${parsed.profile}. Use quick, standard ou full.`)
  }

  return parsed
}

function buildCommandEnv() {
  return {
    ...process.env,
    CI: process.env.CI ?? 'true',
    CONSENT_VERSION: process.env.CONSENT_VERSION ?? '2026.03',
    COOKIE_SECRET: process.env.COOKIE_SECRET ?? 'ci-only-cookie-secret-not-used-in-production-32c',
    CSRF_SECRET: process.env.CSRF_SECRET ?? 'ci-only-csrf-secret-not-used-in-production-32ch!',
    ENABLE_API_DOCS: process.env.ENABLE_API_DOCS ?? 'false',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? 'ci-only-encryption-key-not-used-in-prod-32c',
    HUSKY: process.env.HUSKY ?? '0',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV ?? 'test',
    NPM_CONFIG_FUND: process.env.NPM_CONFIG_FUND ?? 'false',
    PASSWORD_RESET_TTL_MINUTES: process.env.PASSWORD_RESET_TTL_MINUTES ?? '30',
    SESSION_TTL_HOURS: process.env.SESSION_TTL_HOURS ?? '24',
    TZ: process.env.TZ ?? 'America/Sao_Paulo',
  }
}

function collectMetadata() {
  const branch = capture('git branch --show-current')
  const upstream = capture('git rev-parse --abbrev-ref --symbolic-full-name @{u}', 'sem upstream')
  const aheadBehind = capture('git rev-list --left-right --count HEAD...@{u}', '0\t0')
    .split(/\s+/)
    .map((value) => Number.parseInt(value, 10))

  return {
    billingBlockedUntil: BILLING_BLOCKED_UNTIL,
    branch,
    generatedAt: startedAt.toISOString(),
    headSha: capture('git rev-parse HEAD'),
    nodeVersion: process.version,
    npmVersion: capture('npm -v', 'indisponivel'),
    remoteCiState: 'billing_blocked',
    repo: capture('git config --get remote.origin.url', 'unknown'),
    upstream,
    worktreeStatus: capture('git status --short', ''),
    ahead: Number.isFinite(aheadBehind[0]) ? aheadBehind[0] : 0,
    behind: Number.isFinite(aheadBehind[1]) ? aheadBehind[1] : 0,
  }
}

function buildPlan(options) {
  const quick = [
    step('git diff --check', 'Higiene de diff sem whitespace quebrado'),
    step('npm run quality:scope:strict', 'Escopo classificado e sem arquivo suspeito'),
    step('npm run quality:contracts', 'Contratos publicos preservados'),
    step('npm run lint:secrets', 'Secret scanning local seguro'),
  ]

  const standard = [
    ...quick,
    step('npm run repo:scan-public', 'Riscos de repo publico'),
    step('npm run lint', 'Lint de workspaces'),
    step('npm run lint:sast', 'SAST Semgrep local'),
    step('npm run audit:deps', 'SCA npm audit high+'),
    step('npm run security:audit-runtime', 'Allowlist de runtime auditavel'),
    step('npm run test:critical', 'Testes criticos API + web'),
    step('npm run typecheck', 'Typecheck repo-wide'),
    step('npm run openapi:check', 'OpenAPI gerado sem drift'),
    step('npm run build', 'Build final'),
    step('npm exec -- prettier --write apps/web/next-env.d.ts', 'Normaliza next-env gerado pelo build'),
  ]

  const full = [
    step('npm --workspace @partner/api run prisma:generate', 'Prisma Client atualizado'),
    step('npm run quality:local', 'Quality gate local completo'),
    step('npm run lint:secrets', 'Secret scanning local seguro'),
    step('npm run lint:sast', 'SAST Semgrep local'),
    step('npm run audit:deps', 'SCA npm audit high+'),
    step('npm run security:audit-runtime', 'Allowlist de runtime auditavel'),
    step('npm run openapi:check', 'OpenAPI gerado sem drift'),
    step('npm --workspace @partner/api run test:coverage:sonar', 'Cobertura backend'),
    step('npm --workspace @partner/api run test:e2e', 'E2E backend'),
    step('npm --workspace @partner/web run test:coverage:sonar', 'Cobertura frontend'),
    step('npm --workspace @partner/web exec -- playwright install chromium', 'Browser E2E instalado'),
    step('npm --workspace @partner/web run test:e2e', 'E2E frontend'),
    step('npm run build', 'Build final'),
    step('npm exec -- prettier --write apps/web/next-env.d.ts', 'Normaliza next-env gerado pelo build'),
  ]

  const selected = options.profile === 'quick' ? quick : options.profile === 'full' ? full : standard
  const generatedArtifactCheck = options.allowDirty
    ? []
    : [step('git diff --exit-code', 'Sem artefato gerado pendente')]
  const opsSnapshot = advisoryStep(
    `npm run ops:readiness -- --report "${normalizeCommandPath(operationalReadinessReport)}"`,
    'Snapshot operacional; Actions pode continuar bloqueado por billing',
  )

  return options.performance
    ? [
        ...selected,
        step('npm run perf:operations:local', 'Suite local controlada de performance'),
        ...generatedArtifactCheck,
        opsSnapshot,
      ]
    : [...selected, ...generatedArtifactCheck, opsSnapshot]
}

function step(command, description) {
  return {
    command,
    description,
    required: true,
    status: 'pending',
  }
}

function advisoryStep(command, description) {
  return {
    command,
    description,
    required: false,
    status: 'pending',
  }
}

function checkCleanWorktree() {
  const status = capture('git status --porcelain=v1', '')
  const passed = status.trim().length === 0
  const result = {
    command: 'git status --porcelain=v1',
    description: 'Worktree limpo antes do gate de release',
    durationMs: 0,
    logPath: null,
    required: true,
    status: passed ? 'passed' : 'failed',
  }

  if (!passed) {
    result.error = 'Worktree possui mudancas. Use --allow-dirty apenas para validacao durante desenvolvimento.'
  }

  return result
}

function runStep(stepToRun) {
  const started = Date.now()
  const logPath = join(reportDir, `${String(results.length + 1).padStart(2, '0')}-${slugify(stepToRun.command)}.log`)
  const output = spawnSync(stepToRun.command, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env,
    shell: true,
    windowsHide: true,
  })

  const log = [
    `$ ${stepToRun.command}`,
    '',
    '--- stdout ---',
    output.stdout ?? '',
    '--- stderr ---',
    output.stderr ?? '',
    `--- exitCode: ${output.status ?? 'signal'} ---`,
  ].join('\n')

  writeFileSync(logPath, log, 'utf8')

  return {
    ...stepToRun,
    durationMs: Date.now() - started,
    exitCode: output.status,
    logPath,
    status: output.status === 0 ? 'passed' : 'failed',
  }
}

function resolveVerdict(stepResults) {
  const requiredFailed = stepResults.some((result) => result.required && result.status === 'failed')
  if (requiredFailed) {
    return 'BLOQUEADO'
  }

  return metadata.remoteCiState === 'billing_blocked' ? 'LOCALMENTE_VALIDADO_CI_REMOTO_BLOQUEADO' : 'PRONTO'
}

function writeReport({
  args: reportArgs,
  metadata: reportMetadata,
  reportDir: outputDir,
  results: reportResults,
  startedAt: reportStartedAt,
  verdict,
}) {
  const reportPath = join(outputDir, 'report.md')
  const latestPath = join(DEFAULT_REPORT_ROOT, 'latest.md')
  const finishedAt = new Date()
  const content = renderReport({
    args: reportArgs,
    finishedAt,
    metadata: reportMetadata,
    reportDir: outputDir,
    results: reportResults,
    startedAt: reportStartedAt,
    verdict,
  })

  mkdirSync(dirname(reportPath), { recursive: true })
  mkdirSync(dirname(latestPath), { recursive: true })
  writeFileSync(reportPath, content, 'utf8')
  writeFileSync(latestPath, content, 'utf8')
}

function renderReport({
  args: reportArgs,
  finishedAt,
  metadata: reportMetadata,
  reportDir: outputDir,
  results: reportResults,
  startedAt: reportStartedAt,
  verdict,
}) {
  const commandRows = reportResults
    .map((result) =>
      [
        result.required ? 'sim' : 'nao',
        result.status,
        `${Math.round(result.durationMs / 1000)}s`,
        markdownCode(result.command),
        result.logPath ? markdownCode(relative(process.cwd(), result.logPath).replaceAll('\\', '/')) : '-',
        result.description,
      ].join(' | '),
    )
    .join('\n')

  const warningRows = buildWarnings(reportMetadata)
    .map((warning) => `- ${warning}`)
    .join('\n')

  return `# Offline Release Gate

**Generated at:** ${reportMetadata.generatedAt}
**Finished at:** ${finishedAt.toISOString()}
**Duration:** ${Math.round((finishedAt.getTime() - reportStartedAt.getTime()) / 1000)}s
**Verdict:** ${verdict}

## Context

| Field | Value |
| --- | --- |
| repo | ${markdownCode(reportMetadata.repo)} |
| branch | ${markdownCode(reportMetadata.branch)} |
| head_sha | ${markdownCode(reportMetadata.headSha)} |
| upstream | ${markdownCode(reportMetadata.upstream)} |
| ahead | ${reportMetadata.ahead} |
| behind | ${reportMetadata.behind} |
| node | ${markdownCode(reportMetadata.nodeVersion)} |
| npm | ${markdownCode(reportMetadata.npmVersion)} |
| remote_ci_state | ${markdownCode(reportMetadata.remoteCiState)} |
| billing_blocked_until | ${markdownCode(reportMetadata.billingBlockedUntil)} |
| local_gate_mode | ${markdownCode('billing-substitute')} |
| profile | ${markdownCode(reportArgs.profile)} |
| allow_dirty | ${reportArgs.allowDirty ? 'sim' : 'nao'} |
| performance | ${reportArgs.performance ? 'sim' : 'nao'} |
| report_dir | ${markdownCode(relative(process.cwd(), outputDir).replaceAll('\\', '/'))} |

## Required Local Evidence

- Escopo e higiene: ${markdownCode('quality:scope:strict')}, ${markdownCode('git diff --check')}
- Contratos: ${markdownCode('quality:contracts')}, ${markdownCode('openapi:check')}
- Seguranca: ${markdownCode('lint:secrets')}, ${markdownCode('lint:sast')}, ${markdownCode('audit:deps')}, ${markdownCode('security:audit-runtime')}
- Qualidade: ${markdownCode('lint')}, ${markdownCode('typecheck')}, ${markdownCode('test:critical')}, ${markdownCode('build')}
- Operacao: snapshot ${markdownCode('ops:readiness')} em modo informativo enquanto Actions esta bloqueado por billing.

## Commands

| Required | Status | Duration | Command | Log | Purpose |
| --- | --- | ---: | --- | --- | --- |
${commandRows}

## Warnings And Limits

${warningRows || '- Nenhum aviso adicional.'}

## Residual Risk

- Este gate nao prova runner Linux, branch protection, upload de SARIF/artifacts, Dependency Review, Qodana, SonarCloud ou status publico do GitHub Security.
- Enquanto o billing do GitHub Actions estiver bloqueado, o resultado correto e ${markdownCode('LOCALMENTE_VALIDADO_CI_REMOTO_BLOQUEADO')}, nao ${markdownCode('CI verde')}.
- Para release normal, regularizar billing, rerodar Actions no mesmo SHA e obter todos os checks verdes.
`
}

function buildWarnings(reportMetadata) {
  const warnings = [`GitHub Actions esta marcado como ${markdownCode('billing_blocked')} ate ${BILLING_BLOCKED_UNTIL}.`]

  if (!reportMetadata.nodeVersion.startsWith('v22.')) {
    warnings.push(
      `Node local e ${markdownCode(reportMetadata.nodeVersion)}; Actions usa Node 22.x. Use Node 22 para paridade mais forte.`,
    )
  }

  if (reportMetadata.ahead > 0 || reportMetadata.behind > 0) {
    warnings.push(
      `Branch nao esta perfeitamente sincronizada: ahead=${reportMetadata.ahead}, behind=${reportMetadata.behind}.`,
    )
  }

  return warnings
}

function capture(command, fallback = '') {
  const result = spawnSync(command, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
  })

  if (result.status !== 0) {
    return fallback
  }

  return (result.stdout ?? '').trim()
}

function formatTimestamp(date) {
  return date.toISOString().replaceAll(':', '').replaceAll('.', '-')
}

function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
    .slice(0, 80)
}

function markdownCode(value) {
  return `\`${String(value).replaceAll('`', "'")}\``
}

function normalizeCommandPath(value) {
  return value.replaceAll('\\', '/')
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
