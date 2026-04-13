#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const strict = process.argv.includes('--strict')

const knownScopes = [
  {
    name: 'recuperacao-runtime',
    description: 'logica recuperada ou contrato publico reconstruido',
    patterns: [
      /^apps\/api\/src\/common\/services\/period-classifier\.service\.ts$/,
      /^apps\/api\/test\/period-classifier\.service\.spec\.ts$/,
      /^apps\/api\/src\/modules\/operations\/comanda-/,
      /^apps\/api\/src\/modules\/operations\/comanda\.service\.ts$/,
      /^apps\/api\/src\/modules\/operations\/operations-helpers\.service\.ts$/,
      /^apps\/api\/test\/products\.service\.spec\.ts$/,
      /^apps\/web\/lib\/api\.ts$/,
      /^apps\/web\/package\.json$/,
      /^apps\/web\/components\/operations\//,
      /^apps\/web\/components\/dashboard\/finance-orders-table\.test\.tsx$/,
      /^apps\/web\/components\/owner-mobile\/owner-mobile-shell\.test\.tsx$/,
      /^apps\/web\/components\/staff-mobile\/staff-mobile-shell\.test\.tsx$/,
    ],
  },
  {
    name: 'limpeza-lint-mecanica',
    description: 'sem mudanca de comportamento esperada',
    patterns: [
      /^apps\/api\/src\/modules\/auth\/auth-login-alerts\.utils\.ts$/,
      /^apps\/api\/src\/modules\/auth\/auth-login\.service\.ts$/,
      /^apps\/api\/src\/modules\/finance\/finance-channels\.util\.ts$/,
      /^apps\/api\/src\/modules\/finance\/finance-top-analytics\.util\.ts$/,
      /^apps\/api\/src\/modules\/operations\/cash-session\.service\.ts$/,
      /^apps\/api\/src\/modules\/orders\/orders\.service\.ts$/,
      /^apps\/api\/src\/modules\/products\/products-import\.utils\.ts$/,
      /^apps\/api\/src\/modules\/products\/products\.service\.ts$/,
    ],
  },
  {
    name: 'documentacao-planejamento',
    description: 'auditoria, plano e docs sem efeito runtime direto',
    patterns: [/^review_audit\//, /^docs\/architecture\//, /^\.claude\/napkin\.md$/],
  },
  {
    name: 'camada-verificacao',
    description: 'scripts e package scripts que criam guardrails locais',
    patterns: [
      /^package\.json$/,
      /^scripts\/check-public-contracts\.mjs$/,
      /^scripts\/check-worktree-scope\.mjs$/,
      /^scripts\/quality-preflight\.mjs$/,
    ],
  },
  {
    name: 'gerado-ou-suspeito',
    description: 'nao misturar em commit funcional sem revisao explicita',
    strictFailure: true,
    patterns: [/^apps\/web\/next-env\.d\.ts$/, /^apps\/api\/nest-cli\.json$/],
  },
]

const output = execFileSync('git', ['status', '--porcelain=v1'], { encoding: 'utf8' })
const entries = output
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => ({
    status: line.slice(0, 2).trim() || 'M',
    path: line.slice(3).replaceAll('\\', '/'),
  }))

const groups = new Map(knownScopes.map((scope) => [scope.name, []]))
const unknown = []

for (const entry of entries) {
  const scope = knownScopes.find((candidate) => candidate.patterns.some((pattern) => pattern.test(entry.path)))
  if (!scope) {
    unknown.push(entry)
    continue
  }
  groups.get(scope.name).push(entry)
}

console.log('Worktree scope check')
console.log(`- changed entries: ${entries.length}`)

for (const scope of knownScopes) {
  const files = groups.get(scope.name)
  console.log(`\n[${scope.name}] ${scope.description}`)
  if (files.length === 0) {
    console.log('- none')
    continue
  }
  for (const file of files) {
    console.log(`- ${file.status.padEnd(2)} ${file.path}`)
  }
}

if (unknown.length > 0) {
  console.log('\n[desconhecido] revisar antes de commitar')
  for (const file of unknown) {
    console.log(`- ${file.status.padEnd(2)} ${file.path}`)
  }
}

const strictFailures = [
  ...knownScopes
    .filter((scope) => scope.strictFailure)
    .flatMap((scope) => groups.get(scope.name).map((entry) => `${entry.path} (${scope.name})`)),
  ...unknown.map((entry) => `${entry.path} (desconhecido)`),
]

if (strict && strictFailures.length > 0) {
  console.error('\n[FAIL] Escopo contem arquivos suspeitos/desconhecidos:')
  for (const failure of strictFailures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(
  strictFailures.length > 0
    ? '\n[WARN] Ha arquivos que pedem revisao antes do commit.'
    : '\n[PASS] Escopo classificado.',
)
