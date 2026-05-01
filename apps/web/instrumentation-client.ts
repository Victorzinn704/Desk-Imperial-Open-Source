import * as Sentry from '@sentry/nextjs'
import { initializeFrontendFaro } from './lib/observability/faro'
import { initializeFrontendSentry } from './lib/observability/sentry'

initializeFrontendSentry(Sentry)
initializeFrontendFaro()

export function onRouterTransitionStart() {
  // Hook required by Next instrumentation API; Sentry/Faro route events are auto-instrumented.
}
