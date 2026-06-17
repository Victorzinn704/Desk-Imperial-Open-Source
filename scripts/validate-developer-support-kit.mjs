#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const warnings = []

const supportFiles = [
  'docs/support/README.md',
  'docs/support/developer-support-prd.md',
  'docs/support/developer-support-test-debug-matrix.md',
  'docs/support/local-environment-validation.md',
  'docs/support/production-rollout.md',
  'docs/support/laravel-integration.md',
  'docs/support/api-troubleshooting.md',
  'docs/support/auth-flow-debug.md',
  'docs/support/common-api-errors.md',
  'docs/support/http-request-examples.md',
  'docs/support/sql-audit-playbook.md',
  'docs/support/reproduction-lab.md',
  'docs/support/logs-and-observability-debug.md',
  'docs/support/customer-diagnostic-template.md',
  'docs/operations/developer-support-playbook.md',
  'docs/operations/developer-support-http-examples.md',
  'docs/operations/developer-support-sql-audit-playbook.md',
  'docs/operations/developer-support-case-studies.md',
  'docs/operations/developer-support-diagnostic-template.md',
  'docs/case-studies/developer-support-cases.md',
  'docs/_meta/audit/developer-support-kit-architecture-audit-2026-06-16.md',
  'docs/api/desk-imperial-support.postman_collection.json',
  'examples/php-api-client/composer.json',
  'examples/php-api-client/README.md',
  'examples/php-api-client/src/DeskImperialClient.php',
  'examples/php-api-client/examples/health.php',
  'examples/php-api-client/examples/login.php',
  'examples/php-api-client/examples/error-handling.php',
  'examples/laravel-api-client/README.md',
  'examples/laravel-api-client/config/desk-imperial.php',
  'examples/laravel-api-client/app/Services/DeskImperialClient.php',
  'examples/laravel-api-client/tests/Feature/DeskImperialClientContractTest.php',
  'scripts/run-developer-support-collection-smoke.mjs',
  'scripts/run-developer-support-readiness-smoke.mjs',
]

const explicitlyAllowedNonOpenApiRoutes = new Map([
  ['GET /health', 'health operacional fora do contrato OpenAPI de operações'],
  ['GET /openapi.json', 'contrato gerado pelo bootstrap da API'],
  ['POST /auth/login', 'fluxo de autenticação documentado fora do OpenAPI de operações'],
  ['GET /auth/me', 'fluxo de sessão documentado fora do OpenAPI de operações'],
  ['GET /products', 'catálogo documentado em módulos/produto fora do OpenAPI de operações'],
  ['GET /employees', 'smoke de permissão owner/staff fora do OpenAPI de operações'],
])

const bannedLiteralPatterns = [
  /DATABASE_URL\s*=/iu,
  /JWT_SECRET\s*=/iu,
  /COOKIE_SECRET\s*=/iu,
  /CSRF_SECRET\s*=/iu,
  /MERCADO_PAGO_ACCESS_TOKEN\s*=/iu,
  /TELEGRAM_BOT_TOKEN\s*=/iu,
  /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/iu,
]

console.log('Developer Support Kit validation')

for (const file of supportFiles) {
  assertFileExists(file)
}

const openApi = readJson('packages/api-contract/openapi.json')
const collection = readJson('docs/api/desk-imperial-support.postman_collection.json')
validateCollectionVariables(collection)
validateCollectionRoutes(collection, openApi)
validateRequiredDocs()
validateNoBannedLiterals()

if (warnings.length > 0) {
  console.log('\nWarnings:')
  for (const warning of warnings) {
    console.log(`- ${warning}`)
  }
}

if (failures.length > 0) {
  console.error('\n[FAIL] Developer Support Kit inválido:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('\n[PASS] Developer Support Kit validado.')

function assertFileExists(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`arquivo obrigatório ausente: ${relativePath}`)
  }
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
  } catch (error) {
    failures.push(`JSON inválido em ${relativePath}: ${error.message}`)
    return {}
  }
}

function validateCollectionVariables(collection) {
  const variables = new Map((collection.variable ?? []).map((entry) => [entry.key, String(entry.value ?? '')]))
  const requiredVariables = [
    'baseUrl',
    'ownerEmail',
    'ownerPassword',
    'staffCompanyEmail',
    'staffEmployeeCode',
    'staffPassword',
    'supportTableLabel',
    'csrfToken',
    'comandaId',
    'productId',
  ]

  for (const variable of requiredVariables) {
    if (!variables.has(variable)) {
      failures.push(`coleção Postman sem variável obrigatória: ${variable}`)
    }
  }

  const baseUrl = variables.get('baseUrl')
  if (baseUrl !== 'http://localhost:4000/api/v1') {
    failures.push(`baseUrl da coleção deve apontar para localhost: ${baseUrl}`)
  }

  for (const [key, value] of variables) {
    if (key.toLowerCase().includes('password') && !value.startsWith('<')) {
      failures.push(`variável ${key} deve usar placeholder, não valor real`)
    }
  }
}

function validateCollectionRoutes(collection, openApi) {
  const openApiOperations = new Set()
  for (const [routePath, operations] of Object.entries(openApi.paths ?? {})) {
    for (const method of Object.keys(operations)) {
      openApiOperations.add(`${method.toUpperCase()} ${routePath}`)
    }
  }

  for (const item of flattenItems(collection.item ?? [])) {
    const operation = toOperationSignature(item)
    if (!operation) {
      failures.push(`item sem request válido na coleção: ${item.name ?? '<sem nome>'}`)
      continue
    }

    if (openApiOperations.has(operation)) {
      continue
    }

    if (explicitlyAllowedNonOpenApiRoutes.has(operation)) {
      warnings.push(`${operation}: ${explicitlyAllowedNonOpenApiRoutes.get(operation)}`)
      continue
    }

    failures.push(`rota da coleção não encontrada no OpenAPI nem na allowlist: ${operation}`)
  }
}

function flattenItems(items) {
  const result = []
  for (const item of items) {
    if (Array.isArray(item.item)) {
      result.push(...flattenItems(item.item))
      continue
    }
    result.push(item)
  }
  return result
}

function toOperationSignature(item) {
  const request = item.request
  if (!request?.method || !request.url) {
    return null
  }

  const pathParts = Array.isArray(request.url.path) ? request.url.path : []
  const normalizedPath = `/${pathParts.map(normalizePathPart).join('/')}`
  return `${String(request.method).toUpperCase()} ${normalizedPath}`
}

function normalizePathPart(part) {
  const value = String(part)
  const variableMatch = value.match(/^\{\{(.+)\}\}$/u)
  return variableMatch ? `{${variableMatch[1]}}` : value
}

function validateRequiredDocs() {
  const supportReadme = readText('docs/support/README.md')
  const requiredLinks = [
    'developer-support-prd.md',
    'developer-support-test-debug-matrix.md',
    'local-environment-validation.md',
    'production-rollout.md',
    'laravel-integration.md',
    'desk-imperial-support.postman_collection.json',
    'examples/php-api-client/',
    'examples/laravel-api-client/',
  ]

  for (const link of requiredLinks) {
    if (!supportReadme.includes(link)) {
      failures.push(`docs/support/README.md não referencia ${link}`)
    }
  }

  const prd = readText('docs/support/developer-support-prd.md')
  for (const marker of ['RF-001', 'RF-013', 'RF-014', 'RF-015', 'RF-016', 'RF-017', 'CU-001', 'CU-008']) {
    if (!prd.includes(marker)) {
      failures.push(`PRD de support sem marcador obrigatório: ${marker}`)
    }
  }

  const matrix = readText('docs/support/developer-support-test-debug-matrix.md')
  for (const marker of ['TD-001', 'TD-016', 'TD-017', 'TD-018', 'TD-019', 'Laravel', 'Point', 'CSRF']) {
    if (!matrix.includes(marker)) {
      failures.push(`matriz de teste/debug sem marcador obrigatório: ${marker}`)
    }
  }
}

function validateNoBannedLiterals() {
  for (const file of supportFiles.filter((candidate) => fs.existsSync(path.join(root, candidate)))) {
    const text = readText(file)
    for (const pattern of bannedLiteralPatterns) {
      if (pattern.test(text)) {
        failures.push(`possível segredo literal em ${file}: ${pattern}`)
      }
    }
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}
