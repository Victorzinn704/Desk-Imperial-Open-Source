#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function parseArgs(args) {
  const parsed = {
    dryRun: true,
    force: false,
    report: '',
    target: '',
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--force') {
      parsed.force = true
      continue
    }
    if (arg === '--target') {
      parsed.target = resolveRequiredValue(args, index, arg)
      parsed.dryRun = false
      index += 1
      continue
    }
    if (arg === '--report') {
      parsed.report = resolveRequiredValue(args, index, arg)
      index += 1
      continue
    }
    if (arg === '--dry-run') {
      parsed.dryRun = true
      continue
    }

    throw new Error(`Argumento desconhecido: ${arg}`)
  }

  if (parsed.target && !parsed.force && existsSync(path.resolve(root, parsed.target))) {
    throw new Error('Use --force para substituir um diretorio de destino existente.')
  }

  return parsed
}

function resolveRequiredValue(args, index, arg) {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`Informe um valor para ${arg}.`)
  }
  return value
}

function getTrackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
}

function buildAudit(files) {
  const decisions = files.map((file) => classifyFile(normalizePath(file)))
  const includedFiles = decisions.filter((decision) => decision.action !== 'exclude')
  const excludedFiles = decisions.filter((decision) => decision.action === 'exclude')
  const blockingFindings = scanIncludedFiles(includedFiles)

  return {
    blockingFindings,
    excludedFiles,
    includedFiles,
    totalFiles: files.length,
  }
}

function classifyFile(file) {
  const excludeRule = excludeRules.find((rule) => rule.pattern.test(file))
  if (excludeRule) {
    return {
      action: 'exclude',
      file,
      reason: excludeRule.reason,
    }
  }

  const transformRule = transformRules.find((rule) => rule.pattern.test(file))
  if (transformRule) {
    return {
      action: 'transform',
      file,
      reason: transformRule.reason,
      transform: transformRule.transform,
    }
  }

  return {
    action: 'copy',
    file,
    reason: 'publicavel',
  }
}

function scanIncludedFiles(files) {
  const findings = []

  for (const decision of files) {
    const absoluteFile = path.join(root, decision.file)
    const content = readTextFile(absoluteFile)
    if (!content) {
      continue
    }

    const sanitizedContent = decision.action === 'transform' ? decision.transform(content) : content

    scanText(decision.file, sanitizedContent, findings)
  }

  return findings
}

function scanText(file, content, findings) {
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    for (const rule of blockingContentRules) {
      if (rule.pattern.test(line) && !rule.ignore?.(line)) {
        findings.push({
          description: rule.description,
          file,
          line: index + 1,
        })
      }
    }
  })
}

function prepareTarget(files, targetInput) {
  const target = resolveSafeTarget(targetInput)
  recreateTarget(target)

  for (const decision of files) {
    const source = path.join(root, decision.file)
    const targetFile = path.join(target, decision.file)
    mkdirSync(path.dirname(targetFile), { recursive: true })

    if (decision.action === 'transform') {
      writeFileSync(targetFile, normalizePublicText(decision.transform(readFileSync(source, 'utf8'))), 'utf8')
      continue
    }

    if (isTextLikeFile(decision.file)) {
      writeFileSync(targetFile, normalizePublicText(readFileSync(source, 'utf8')), 'utf8')
      continue
    }

    copyFileSync(source, targetFile)
  }
}

function resolveSafeTarget(targetInput) {
  const target = path.resolve(root, targetInput)
  const relative = path.relative(root, target)
  const outsideRoot = relative.startsWith('..') || path.isAbsolute(relative)

  if (!outsideRoot && relative !== '') {
    throw new Error('O destino da snapshot deve ficar fora do repositório privado.')
  }

  if (target === root || target.length < 10) {
    throw new Error(`Destino inseguro: ${target}`)
  }

  return target
}

function recreateTarget(target) {
  if (existsSync(target)) {
    rmSync(target, { force: true, recursive: true })
  }
  mkdirSync(target, { recursive: true })
}

function buildReport(audit) {
  const reasonCounts = countByReason(audit.excludedFiles)
  const actionCounts = countByAction(audit.includedFiles)
  const lines = [
    '# Open Source Snapshot Audit',
    '',
    `Data: ${new Date().toISOString()}`,
    '',
    '## Resultado',
    '',
    `- Arquivos privados analisados: ${audit.totalFiles}`,
    `- Arquivos publicaveis: ${audit.includedFiles.length}`,
    `- Arquivos excluidos/sanitizados por politica: ${audit.excludedFiles.length}`,
    `- Achados bloqueantes no conjunto publicavel: ${audit.blockingFindings.length}`,
    '',
    '## Acoes no conjunto publicavel',
    '',
    ...formatCounts(actionCounts),
    '',
    '## Exclusoes por motivo',
    '',
    ...formatCounts(reasonCounts),
    '',
    '## Achados bloqueantes',
    '',
    ...formatFindings(audit.blockingFindings),
    '',
    '## Arquivos excluidos',
    '',
    ...formatExcludedFiles(audit.excludedFiles),
  ]

  return `${lines.join('\n')}\n`
}

function countByAction(files) {
  return files.reduce((counts, decision) => {
    counts.set(decision.action, (counts.get(decision.action) ?? 0) + 1)
    return counts
  }, new Map())
}

function countByReason(files) {
  return files.reduce((counts, decision) => {
    counts.set(decision.reason, (counts.get(decision.reason) ?? 0) + 1)
    return counts
  }, new Map())
}

function formatCounts(counts) {
  if (counts.size === 0) {
    return ['- Nenhum item.']
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => `- ${name}: ${count}`)
}

function formatFindings(findings) {
  if (findings.length === 0) {
    return ['- Nenhum achado bloqueante.']
  }

  return findings.map((finding) => `- \`${finding.file}:${finding.line}\` - ${finding.description}`)
}

function formatExcludedFiles(files) {
  if (files.length === 0) {
    return ['- Nenhum arquivo excluido.']
  }

  return files.map((decision) => `- \`${decision.file}\` (${decision.reason})`)
}

function readTextFile(file) {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

function writeTextFile(fileInput, content) {
  const file = path.resolve(root, fileInput)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content, 'utf8')
}

function normalizePath(file) {
  return file.replaceAll(path.sep, '/')
}

function isTextLikeFile(file) {
  return textFileExtensions.has(path.extname(file).toLowerCase()) || textFileNames.has(path.basename(file))
}

function normalizePublicText(content) {
  return `${content
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n*$/u, '')}\n`
}

function sanitizeEnvExample(content) {
  return content
    .replace(/^POSTGRES_PASSWORD=.*$/m, 'POSTGRES_PASSWORD=<CHANGE_ME_POSTGRES_PASSWORD>')
    .replace(/^DATABASE_URL=.*$/m, 'DATABASE_URL=<LOCAL_POSTGRES_DATABASE_URL>')
    .replace(/^DIRECT_URL=.*$/m, 'DIRECT_URL=<LOCAL_POSTGRES_DIRECT_URL>')
    .replace(/^COOKIE_SECRET=.*$/m, 'COOKIE_SECRET=<LONG_RANDOM_COOKIE_SECRET>')
    .replace(/^CSRF_SECRET=.*$/m, 'CSRF_SECRET=<LONG_RANDOM_CSRF_SECRET>')
    .replace(/^ENCRYPTION_KEY=.*$/m, 'ENCRYPTION_KEY=<32_BYTE_BASE64_OR_HEX_KEY>')
    .replace(/^REDIS_PASSWORD=.*$/m, 'REDIS_PASSWORD=<CHANGE_ME_REDIS_PASSWORD>')
    .replace(/^REDIS_URL=.*$/m, 'REDIS_URL=redis://:<PASSWORD>@localhost:6379')
    .replace(/^DEMO_STAFF_PASSWORD=.*$/m, 'DEMO_STAFF_PASSWORD=<CHANGE_ME_DEMO_STAFF_PASSWORD>')
    .replace(/^GRAFANA_ADMIN_PASSWORD=.*$/m, 'GRAFANA_ADMIN_PASSWORD=<CHANGE_ME_GRAFANA_PASSWORD>')
}

function sanitizeKnipConfig(content) {
  const config = JSON.parse(content)
  const rootWorkspace = config.workspaces?.['.']
  if (!Array.isArray(rootWorkspace?.ignore) || !rootWorkspace.ignore.includes('.venv-aider/**')) {
    return content
  }

  return content.replace(/,\s*"\.venv-aider\/\*\*"/, '').replace(/"\.venv-aider\/\*\*",\s*/, '')
}

const transformRules = [
  {
    pattern: /^\.env\.example$/,
    reason: 'env example sanitizado',
    transform: sanitizeEnvExample,
  },
  {
    pattern: /^knip\.json$/,
    reason: 'knip public config sanitizado',
    transform: sanitizeKnipConfig,
  },
]

const textFileNames = new Set([
  '.dockerignore',
  '.editorconfig',
  '.env.example',
  '.gitattributes',
  '.gitignore',
  '.gitleaks.toml',
  '.prettierignore',
  '.prettierrc',
  'CODEOWNERS',
  'Dockerfile',
  'LICENSE',
])

const textFileExtensions = new Set([
  '.cjs',
  '.cmd',
  '.conf',
  '.css',
  '.csv',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ps1',
  '.py',
  '.sh',
  '.sql',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
])

const excludeRules = [
  { pattern: /^\.claude\//, reason: 'memoria operacional local' },
  { pattern: /^\.dual-graph\//, reason: 'artefato local de agente' },
  { pattern: /^\.playwright-cli\//, reason: 'artefato gerado de navegacao' },
  { pattern: /^__pycache__\//, reason: 'artefato gerado' },
  { pattern: /^review_audit\//, reason: 'auditoria interna gerada' },
  { pattern: /^infra\/oracle\//, reason: 'topologia real de infraestrutura' },
  { pattern: /^infra\/scripts\/oracle-/, reason: 'automacao operacional de ambiente real' },
  { pattern: /^docs\/operations\/vm-inventory-current-\d{4}-\d{2}-\d{2}\.md$/, reason: 'inventario real de maquinas' },
  {
    pattern: /^docs\/operations\/oracle-access-hardening-runbook-\d{4}-\d{2}-\d{2}\.md$/,
    reason: 'runbook de acesso real',
  },
  {
    pattern: /^docs\/operations\/windows-tailscale-ssh-audit-\d{4}-\d{2}-\d{2}\.md$/,
    reason: 'acesso remoto workstation',
  },
  { pattern: /^docs\/operations\/macbook-remote-workstation-setup\.md$/, reason: 'acesso remoto workstation' },
  {
    pattern: /^docs\/operations\/vm-functional-separation-\d{4}-\d{2}-\d{2}\.md$/,
    reason: 'inventario real de maquinas',
  },
  {
    pattern:
      /^docs\/release\/.*(canonical-host-map|lohana|network-exposure|observability-vm|oracle|oci|postgres-ampere).*\.md$/,
    reason: 'historico interno de infraestrutura',
  },
  { pattern: /^docs\/release\/deploy-\d{4}-\d{2}-\d{2}-local-release\.md$/, reason: 'historico interno de deploy' },
  {
    pattern: /^docs\/release\/retomada-\d{4}-\d{2}-\d{2}-product-catalog-base\.md$/,
    reason: 'historico interno de execucao',
  },
  { pattern: /^docs\/release\/sonarqube-local-.*\.json$/, reason: 'artefato local de analise' },
  {
    pattern: /^docs\/security\/security-baseline-scan-\d{4}-\d{2}-\d{2}\.md$/,
    reason: 'scan interno com superficie real',
  },
  { pattern: /^resumo-expandido-desk-imperial\.(docx|pdf)$/, reason: 'artefato gerado de portfolio' },
  { pattern: /^build_resumo_expandido.*\.py$/, reason: 'script local de portfolio' },
  { pattern: /^(lab-|overview|ref-shadcn).*\.png$/, reason: 'imagem solta de auditoria/design' },
  {
    pattern:
      /^scripts\/(add-mac-ssh-key-admin|audit-remote-workstation|connect-tailscale|install-mac-admin-ssh-key-admin|restart-tailscale|run-remote-workstation|setup-remote-workstation).*/,
    reason: 'automacao local de workstation',
  },
]

const blockingContentRules = [
  {
    description: 'chave privada PEM',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
  {
    description: 'token Telegram BotFather',
    pattern: /\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/,
  },
  {
    description: 'OpenRouter key',
    pattern: /\bsk-or-v1-[A-Za-z0-9]{20,}\b/,
  },
  {
    description: 'Gemini API key',
    pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/,
  },
  {
    description: 'Brevo API key',
    pattern: /\bxkeysib-[A-Za-z0-9_-]{20,}\b/,
    ignore: (line) => /your-|real-key|actual-api-key|abc123/.test(line),
  },
  {
    description: 'Mercado Pago credential',
    pattern: /\b(APP_USR|TEST)-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    description: 'QZ material privado',
    pattern: /\bQZ_TRAY_PRIVATE_KEY_(ENCRYPTED_PATH|ENCRYPTION_KEY|SHA256)=\S+/,
    ignore: (line) => line.includes('<') || line.endsWith('='),
  },
  {
    description: 'IP literal conhecido de infraestrutura real',
    pattern:
      /\b(?:163\.176\.171\.242|147\.15\.60\.224|147\.15\.72\.64|167\.126\.17\.2|134\.65\.240\.222|134\.65\.19\.53|10\.220\.10\.\d{1,3}|10\.10\.1\.\d{1,3}|100\.82\.139\.107|100\.100\.142\.50)\b/,
  },
]

main()

function main() {
  const options = parseArgs(process.argv.slice(2))
  const trackedFiles = getTrackedFiles()
  const audit = buildAudit(trackedFiles)

  if (options.target) {
    prepareTarget(audit.includedFiles, options.target)
  }

  const report = buildReport(audit)

  if (options.report) {
    writeTextFile(options.report, report)
  }

  process.stdout.write(report)

  if (audit.blockingFindings.length > 0) {
    process.exit(1)
  }
}
