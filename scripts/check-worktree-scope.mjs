#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const strict = process.argv.includes('--strict')

const knownScopes = [
  {
    name: 'seguranca-auth-injecao',
    description: 'hardening de autenticacao contra payloads maliciosos e cobertura de regressao',
    patterns: [
      /^apps\/api\/src\/modules\/auth\/auth-(email-verification|login|login-actor|login-rate-limit|password|shared|staff-login-user)\./,
      /^apps\/api\/src\/modules\/auth\/auth-(email-verification-delivery|one-time-code|password-delivery)\.utils\.ts$/,
      /^apps\/api\/src\/modules\/auth\/auth\.service\.ts$/,
      /^apps\/api\/src\/modules\/auth\/dto\/login\.dto\.ts$/,
      /^apps\/api\/test\/auth\.service.*\.spec\.ts$/,
      /^apps\/api\/test\/helpers\/auth-service-test-/,
      /^docs\/security\/backend-injection-audit-20\d{2}-\d{2}-\d{2}\.md$/,
    ],
  },
  {
    name: 'seguranca-backend-hardening',
    description: 'hardening defensivo de bootstrap, webhook, upload, realtime e telemetria',
    patterns: [
      /^apps\/api\/src\/config\/env\.validation\.ts$/,
      /^apps\/api\/src\/instrument\.ts$/,
      /^apps\/api\/src\/main(\.bootstrap)?\.ts$/,
      /^apps\/api\/src\/modules\/auth\/auth-registration\.service\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/notifications\.controller\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/notifications\.module\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/infra\/telegram\//,
      /^apps\/api\/src\/modules\/notifications\/telegram-(auth|bot|link)\.service\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/telegram-bot-command-auth\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/telegram-bot-command\.types\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/telegram-bot\.dependencies\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/telegram-bot(\.(messages|parsers)|-outbox)\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/telegram-bot-commands\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/telegram-bot-fsm\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/telegram-bot-info\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/telegram-bot-start-command\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/telegram-message-format\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/telegram\.types\.ts$/,
      /^apps\/api\/src\/modules\/operations-realtime\/operations-realtime\.gateway\.ts$/,
      /^apps\/api\/src\/modules\/products\/products\.controller\.ts$/,
      /^apps\/api\/test\/admin-pin\.service(\.spec|\.fixtures)?\.ts$/,
      /^apps\/api\/test\/auth\.service\.spec\.ts$/,
      /^apps\/api\/test\/env\.validation\.spec\.ts$/,
      /^apps\/api\/test\/notifications\.telegram\.controller\.spec\.ts$/,
      /^apps\/api\/test\/notifications\.service\.spec\.ts$/,
      /^apps\/api\/test\/operations-realtime\.gateway\.spec\.ts$/,
      /^apps\/api\/test\/telegram-bot\.messages\.spec\.ts$/,
      /^apps\/api\/test\/telegram-(bot|link)\.service(\.spec|\.fixtures)?\.ts$/,
      /^apps\/web\/lib\/observability\/faro(-telemetry\.test)?\.ts$/,
    ],
  },
  {
    name: 'pagamentos-mercado-pago-point',
    description: 'contrato inicial de cobranca Mercado Pago Point para comandas',
    patterns: [
      /^\.env\.example$/,
      /^apps\/api\/prisma\/schema\.prisma$/,
      /^apps\/api\/prisma\/migrations\/20\d{12}_add_payment_terminal_intents\//,
      /^apps\/api\/src\/modules\/operations\/(comanda-terminal-payment(-reconcile)?\.(service|utils)|mercado-pago-(point\.client|webhook\.controller|webhook-(runtime|worker)\.service|webhook-signature\.util)|operations\.controller|operations\.module|operations\.openapi(\.refs)?|operations\.schemas)\.ts$/,
      /^apps\/api\/test\/comanda-terminal-payment(-reconcile)?\.service\.spec\.ts$/,
      /^apps\/api\/test\/mercado-pago-webhook\.controller\.spec\.ts$/,
      /^apps\/web\/components\/owner-mobile\/owner-(close-payment-controls|terminal-payment-action)\.tsx$/,
      /^apps\/web\/components\/owner-mobile\/owner-comanda-card(-close-action|-sections)?\.tsx$/,
      /^apps\/web\/components\/owner-mobile\/owner-comandas-view(-model)?\.tsx?$/,
      /^apps\/web\/components\/owner-mobile\/owner-mobile-shell-(content|model)\.tsx?$/,
      /^apps\/web\/components\/owner-mobile\/owner-mobile-shell\.(test|test-data)\.tsx?$/,
      /^apps\/web\/components\/owner-mobile\/use-owner-mobile-(comanda-payment|shell|terminal-payment)-mutation(s)?(\.test)?\.tsx?$/,
      /^apps\/web\/lib\/api(-operations|-operations-cash|-operations-mesas|\.test)?\.ts$/,
      /^packages\/api-contract\/openapi\.json$/,
      /^packages\/types\/src\/contracts\.ts$/,
      /^docs\/operations\/mercado-pago-point\.md$/,
      /^scripts\/(list-mercado-pago-terminals|set-mercado-pago-secrets|set-mercado-pago-terminal-pdv)\.ps1$/,
    ],
  },
  {
    name: 'operacoes-ux-integracoes',
    description: 'refatoracao de operacoes, UX de PDV/salao, imagens reais e docs operacionais',
    patterns: [
      /^README\.md$/,
      /^apps\/api\/src\/modules\/operations\/operations\.openapi\.[^/]+\.ts$/,
      /^apps\/web\/components\/dashboard\/salao\/hooks\/use-mesa-drag(?:[-.][^/]+)?\.tsx?$/,
      /^apps\/web\/components\/pdv\/comanda-modal\/components\/catalog-pane\.tsx$/,
      /^apps\/web\/components\/pdv\/(use-pdv-board-draft-mutations|pdv-optimistic-comanda)\.ts$/,
      /^apps\/web\/components\/shared\/product-thumb(\.test)?\.tsx$/,
      /^apps\/web\/components\/shared\/use-catalog-visual-suggestions\.test\.tsx$/,
      /^apps\/web\/lib\/api\.standard-endpoint-cases\.ts$/,
      /^apps\/web\/lib\/brazilian-packaged-beverage-catalog(\.test)?\.ts$/,
      /^apps\/web\/lib\/curated-packaged-beverage-photos\.ts$/,
      /^apps\/web\/lib\/product-visuals(\.test)?\.ts$/,
      /^apps\/web\/lib\/printing\//,
      /^apps\/web\/app\/api\/printing\//,
      /^apps\/web\/app\/api\/printing\/qz\//,
      /^docs\/(INDEX|README)\.md$/,
      /^docs\/operations\/(product-image-quality-audit|production-operational-readiness|realtime-performance-runbook|thermal-printing)\.md$/,
      /^docs\/product\/catalog-intelligence\.md$/,
    ],
  },
  {
    name: 'recuperacao-runtime',
    description: 'logica recuperada ou contrato publico reconstruido',
    patterns: [
      /^apps\/api\/src\/common\/services\/period-classifier\.service\.ts$/,
      /^apps\/api\/test\/period-classifier\.service\.spec\.ts$/,
      /^apps\/api\/src\/modules\/operations\/comanda-/,
      /^apps\/api\/src\/modules\/operations\/comanda\.service\.ts$/,
      /^apps\/api\/src\/modules\/operations\/comanda\.constants\.ts$/,
      /^apps\/api\/src\/modules\/operations\/operations-comanda-helpers\.utils\.ts$/,
      /^apps\/api\/src\/modules\/operations\/operations-domain\.utils\.ts$/,
      /^apps\/api\/src\/modules\/operations\/operations\.module\.ts$/,
      /^apps\/api\/test\/comanda.*\.spec\.ts$/,
      /^apps\/api\/test\/helpers\/comanda-service-.*\.ts$/,
      /^apps\/api\/test\/helpers\/operations-helpers-harness\.ts$/,
      /^apps\/api\/test\/helpers\/publisher-test-env\.ts$/,
      /^apps\/api\/test\/operations-helpers\..*\.spec\.ts$/,
      /^apps\/api\/test\/operations-domain\.utils\.spec\.ts$/,
      /^apps\/api\/test\/operations-realtime\.publishers\.spec\.ts$/,
      /^apps\/api\/src\/modules\/operations\/operations-helpers\.service\.ts$/,
      /^apps\/api\/src\/modules\/operations\/operations-(kitchen-view|live-snapshot|query-builders|summary-view)\./,
      /^apps\/api\/src\/modules\/operations-realtime\//,
      /^apps\/api\/test\/products\.service\.spec\.ts$/,
      /^apps\/web\/lib\/api\.ts$/,
      /^apps\/web\/package\.json$/,
      /^apps\/web\/components\/operations\//,
      /^apps\/web\/lib\/operations\/operations-(performance-diagnostics|query)(?:\.[^/]+)?\.ts$/,
      /^apps\/web\/components\/dashboard\/finance-orders-table\.test\.tsx$/,
      /^apps\/web\/components\/owner-mobile\/owner-mobile-shell\.test\.tsx$/,
      /^apps\/web\/components\/owner-mobile\/owner-mobile-shell\./,
      /^apps\/web\/components\/owner-mobile\/use-owner-mobile-shell-(controller|queries)\.ts$/,
      /^apps\/web\/components\/staff-mobile\/staff-mobile-shell\.test\.tsx$/,
      /^apps\/web\/components\/staff-mobile\/use-staff-mobile-shell-(controller|queries)\.ts$/,
    ],
  },
  {
    name: 'limpeza-lint-mecanica',
    description: 'sem mudanca de comportamento esperada',
    patterns: [
      /^apps\/api\/src\/common\/utils\/is-kitchen-category\.util\.ts$/,
      /^apps\/api\/src\/common\/utils\/otel\.util\.ts$/,
      /^apps\/api\/test\/is-kitchen-category\.util\.spec\.ts$/,
      /^apps\/api\/src\/common\/constants\/password\.ts$/,
      /^apps\/api\/src\/modules\/currency\/currency\.service\.ts$/,
      /^apps\/api\/src\/modules\/currency\/currency-rates\.utils\.ts$/,
      /^apps\/api\/test\/currency\.service\.spec\.ts$/,
      /^apps\/api\/src\/modules\/auth\/auth-login-alerts\.utils\.ts$/,
      /^apps\/api\/src\/modules\/auth\/auth-(login-actor|registration|session)/,
      /^apps\/api\/src\/modules\/auth\/auth\.module\.ts$/,
      /^apps\/api\/test\/auth\.service.*\.spec\.ts$/,
      /^apps\/api\/src\/modules\/auth\/auth-login\.service\.ts$/,
      /^apps\/api\/src\/modules\/finance\/finance-analytics\.util\.ts$/,
      /^apps\/api\/src\/modules\/finance\/finance-channels\.util\.ts$/,
      /^apps\/api\/src\/modules\/finance\/finance-revenue-timeline\.util\.ts$/,
      /^apps\/api\/src\/modules\/finance\/finance\.service\.ts$/,
      /^apps\/api\/src\/modules\/finance\/pillars(\.service|-summary\.builder)\.ts$/,
      /^apps\/api\/src\/modules\/finance\/finance-summary-/,
      /^apps\/api\/src\/modules\/finance\/finance-top-analytics\.util\.ts$/,
      /^apps\/api\/src\/modules\/geocoding\/geocoding/,
      /^apps\/api\/src\/modules\/mailer\/brevo-mailer\.client\.ts$/,
      /^apps\/api\/src\/modules\/mailer\/mailer\.service\.ts$/,
      /^apps\/api\/src\/modules\/mailer\/mailer\.types\.ts$/,
      /^apps\/api\/src\/modules\/market-intelligence\/market-intelligence/,
      /^apps\/api\/src\/modules\/operations\/cash-(realtime-publish|response)\.utils\.ts$/,
      /^apps\/api\/src\/modules\/operations\/cash-session-/,
      /^apps\/api\/src\/modules\/operations\/cash-session\.service\.ts$/,
      /^apps\/api\/src\/modules\/operations\/operations\.service\.ts$/,
      /^apps\/api\/test\/cash-session\.service\.spec\.ts$/,
      /^apps\/api\/src\/modules\/orders\/orders\.service\.ts$/,
      /^apps\/api\/src\/modules\/orders\/orders-(buyer-fields|cache|cancel|create|list|service)/,
      /^apps\/api\/src\/modules\/orders\/orders\.types\.ts$/,
      /^apps\/api\/src\/modules\/products\/product-combo-consumption\.util\.ts$/,
      /^apps\/api\/src\/modules\/products\/products-import\.util\.ts$/,
      /^apps\/api\/src\/modules\/products\/products-import\.utils\.ts$/,
      /^apps\/api\/src\/modules\/products\/products\.service\.ts$/,
      /^apps\/api\/src\/modules\/products\/products-(create|import|list|restock|service|status|update)\./,
      /^apps\/api\/src\/modules\/products\/products-record\.mapper\.ts$/,
      /^apps\/api\/src\/modules\/products\/products\.types\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/notification-preferences\.service\.ts$/,
      /^apps\/api\/src\/modules\/notifications\/notifications(\.service|-realtime-resolver)\./,
      /^apps\/web\/components\/admin-pin\/admin-pin-dialog\.tsx$/,
      /^apps\/web\/components\/auth\/verify-email-form/,
      /^apps\/web\/components\/auth\/login-form/,
      /^apps\/web\/app\/design-lab\/salao\/page\.tsx$/,
      /^apps\/web\/components\/ai\/ai-consultant-workspace\.tsx$/,
      /^apps\/web\/components\/design-lab\/lab-primitives\.tsx$/,
      /^apps\/web\/components\/dashboard\/dashboard-shell/,
      /^apps\/web\/app\/layout\.tsx$/,
      /^apps\/web\/app\/app\/owner\/page\.tsx$/,
      /^apps\/web\/app\/app\/owner\/owner-app\.(client|states)\.tsx$/,
      /^apps\/web\/components\/dashboard\/caixa-panel\.tsx$/,
      /^apps\/web\/components\/dashboard\/dashboard-wireframe-header(\.parts)?\.tsx$/,
      /^apps\/web\/components\/dashboard\/environments\/financeiro-/,
      /^apps\/web\/components\/dashboard\/finance-orders-table/,
      /^apps\/web\/components\/dashboard\/overview-recent-orders\.tsx$/,
      /^apps\/web\/components\/calendar\/commercial-calendar/,
      /^apps\/web\/components\/dashboard\/environments\/overview-/,
      /^apps\/web\/components\/dashboard\/environments\/overview-environment/,
      /^apps\/web\/components\/dashboard\/environments\/pdv-environment/,
      /^apps\/web\/components\/dashboard\/environments\/use-pdv-environment-controller\.ts$/,
      /^apps\/web\/components\/dashboard\/environments\/portfolio-environment/,
      /^apps\/web\/components\/dashboard\/environments\/portfolio-radar\.content\.ts$/,
      /^apps\/web\/components\/dashboard\/environments\/portfolio-products-panel\.tsx$/,
      /^apps\/web\/components\/dashboard\/product-card/,
      /^apps\/web\/components\/dashboard\/product-form/,
      /^apps\/web\/components\/dashboard\/use-product-form-/,
      /^apps\/web\/components\/dashboard\/salao-/,
      /^apps\/web\/components\/dashboard\/salao\/components\/modern-operacional-card/,
      /^apps\/web\/components\/dashboard\/salao\/components\/mesa-form-modal/,
      /^apps\/web\/components\/dashboard\/settings\/components\/pin-remove-confirmation\.tsx$/,
      /^apps\/web\/components\/dashboard\/settings\/components\/pin-setup-card/,
      /^apps\/web\/components\/dashboard\/settings\/components\/pin-setup-form\.tsx$/,
      /^apps\/web\/components\/dashboard\/settings\/components\/recent-access-summary\.tsx$/,
      /^apps\/web\/components\/dashboard\/settings\/components\/telegram-integration-card/,
      /^apps\/web\/components\/dashboard\/settings\/components\/use-pin-setup-card-controller\.ts$/,
      /^apps\/web\/components\/lite\/lite-pdv-kanban\.tsx$/,
      /^apps\/web\/components\/marketing\/founder-contact-card\.tsx$/,
      /^apps\/web\/components\/marketing\/space-background\.tsx$/,
      /^apps\/web\/components\/pdv\/comanda-modal\/components\/product-card/,
      /^apps\/web\/components\/pdv\/pdv-board\.tsx$/,
      /^apps\/web\/components\/pdv\/pdv-operations[^/]*\.ts$/,
      /^apps\/web\/components\/pdv\/pdv-(historico|mesas-kanban)/,
      /^apps\/web\/app\/(robots|sitemap)\.ts$/,
      /^apps\/web\/components\/staff-mobile\/mobile-historico-view\.tsx$/,
      /^apps\/web\/components\/shared\/brand-mark\.tsx$/,
      /^apps\/web\/components\/shared\/use-offline-queue\.ts$/,
      /^apps\/web\/lib\/admin-pin\.ts$/,
      /^apps\/web\/lib\/api-core(?:\.[^/]+)?\.ts$/,
      /^apps\/web\/lib\/cookie-consent\.ts$/,
      /^apps\/web\/lib\/is-kitchen-category\.ts$/,
      /^apps\/web\/lib\/is-kitchen-category\.test\.ts$/,
      /^apps\/web\/lib\/observability\/faro\.ts$/,
      /^apps\/web\/lib\/operations\/operations-kpis\.ts$/,
      /^apps\/web\/lib\/operations\/operations-kpis\.test\.ts$/,
      /^apps\/web\/lib\/operations\/operations-adapters\.ts$/,
      /^apps\/web\/lib\/operations\/operations-adapters\.test\.ts$/,
      /^apps\/web\/lib\/operations\/operations-optimistic\.ts$/,
      /^apps\/web\/lib\/operations\/operations-optimistic(\.test|-record|\.test-fixtures)?\.ts$/,
      /^apps\/web\/scripts\/start\.mjs$/,
      /^apps\/web\/lib\/pin-input\.ts$/,
      /^apps\/web\/lib\/pin-input\.test\.ts$/,
      /^packages\/types\/src\/validation-patterns\.ts$/,
    ],
  },
  {
    name: 'documentacao-planejamento',
    description: 'auditoria, plano e docs sem efeito runtime direto',
    patterns: [
      /^review_audit\//,
      /^CONTRIBUTING\.md$/,
      /^docs\/README\.md$/,
      /^docs\/current-state\.md$/,
      /^docs\/architecture\//,
      /^docs\/_meta\/contribution\.md$/,
      /^docs\/security\/dependency-risk-acceptance-20\d{2}-\d{2}-\d{2}\.md$/,
      /^docs\/security\/(security-baseline|security-testing-workflow-20\d{2}-\d{2}-\d{2}|threat-model-critical-flows)\.md$/,
      /^\.claude\/napkin\.md$/,
      /^\.dual-graph\/context-store\.json$/,
    ],
  },
  {
    name: 'camada-verificacao',
    description: 'scripts e package scripts que criam guardrails locais',
    patterns: [
      /^\.github\/actions\//,
      /^\.github\/pull_request_template\.md$/,
      /^\.github\/ISSUE_TEMPLATE\//,
      /^\.github\/workflows\//,
      /^\.gitignore$/,
      /^20\d{2}-\d{2}-\d{2}-.*\.txt$/,
      /^apps\/api\/tsconfig\.json$/,
      /^apps\/api\/package\.json$/,
      /^apps\/web\/tsconfig\.json$/,
      /^infra\/scripts\/oracle-builder-deploy\.ps1$/,
      /^infra\/scripts\/oracle-builder-deploy\.helpers\.ps1$/,
      /^package\.json$/,
      /^package-lock\.json$/,
      /^sonar-project\.properties$/,
      /^scripts\/check-public-contracts\.mjs$/,
      /^scripts\/check-worktree-scope\.mjs$/,
      /^scripts\/offline-release-gate\.mjs$/,
      /^scripts\/scan-repo-secrets\.mjs$/,
      /^scripts\/quality-warning-map\.mjs$/,
      /^scripts\/quality-preflight\.mjs$/,
      /^scripts\/qz-tray-demo-certificate\.txt$/,
      /^scripts\/run-with-sanitized-node-options\.mjs$/,
      /^scripts\/set-qz-tray-certificate\.ps1$/,
      /^scripts\/lib\//,
      /^scripts\/lib\/node-options-sanitizer\.mjs$/,
      /^scripts\/operations-status-notification-smoke\.mjs$/,
      /^scripts\/operations-status-notification-smoke\//,
      /^scripts\/operational-readiness-check\.mjs$/,
      /^scripts\/run-local-performance-suite\.mjs$/,
      /^apps\/web\/scripts\/operations-mobile-perf-(report|smoke)\.mjs$/,
      /^tsconfig\.base\.json$/,
    ],
  },
  {
    name: 'infra-observabilidade',
    description: 'hardening de alertas e logs sem alterar regra de negocio',
    patterns: [
      /^infra\/oracle\/ops\/\.env\.example$/,
      /^infra\/oracle\/ops\/compose\.yaml$/,
      /^infra\/oracle\/ops\/alertmanager\/render-config\.sh$/,
      /^infra\/oracle\/ops\/loki\/config\.yaml$/,
      /^infra\/docker\/observability\/alertmanager\/render-config\.sh$/,
      /^infra\/docker\/observability\/loki\/config\.yaml$/,
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
