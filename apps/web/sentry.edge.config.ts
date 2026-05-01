import * as Sentry from '@sentry/nextjs'
import { getSentryEdgeConfig } from './lib/observability/sentry'

const config = getSentryEdgeConfig()

Sentry.init({
  dsn: config.dsn,
  enabled: config.enabled,
  environment: config.environment,
  release: config.release,
  tracesSampleRate: config.tracesSampleRate,
  sendDefaultPii: config.sendDefaultPii,
  enableLogs: config.enableLogs,
})
