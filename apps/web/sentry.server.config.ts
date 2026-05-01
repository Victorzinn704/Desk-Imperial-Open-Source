import * as Sentry from '@sentry/nextjs'
import { getSentryServerConfig } from './lib/observability/sentry'

const config = getSentryServerConfig()

Sentry.init({
  dsn: config.dsn,
  enabled: config.enabled,
  environment: config.environment,
  release: config.release,
  tracesSampleRate: config.tracesSampleRate,
  sendDefaultPii: config.sendDefaultPii,
  enableLogs: config.enableLogs,
})
