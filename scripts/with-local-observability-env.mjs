import { spawn } from 'node:child_process'
import process from 'node:process'

const command = process.argv.slice(2)

if (command.length === 0) {
  console.error('Uso: node scripts/with-local-observability-env.mjs <comando...>')
  process.exit(1)
}

const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://desk_imperial:desk_imperial_change_me@localhost:5432/partner_portal_observability',
  DIRECT_URL:
    process.env.DIRECT_URL ??
    'postgresql://desk_imperial:desk_imperial_change_me@localhost:5432/partner_portal_observability',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318',
  OTEL_SERVICE_ENVIRONMENT: process.env.OTEL_SERVICE_ENVIRONMENT ?? 'local-observability',
  OTEL_METRICS_EXPORT_INTERVAL_MS: process.env.OTEL_METRICS_EXPORT_INTERVAL_MS ?? '5000',
  COOKIE_SECRET:
    process.env.COOKIE_SECRET ?? 'desk-imperial-local-observability-cookie-secret-2026',
  CSRF_SECRET:
    process.env.CSRF_SECRET ?? 'desk-imperial-local-observability-csrf-secret-2026-strong',
}

const child = spawn(command.join(' '), {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
  shell: true,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
