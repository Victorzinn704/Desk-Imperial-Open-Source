import { initializeFrontendFaro } from './lib/observability/faro'

initializeFrontendFaro()

export function onRouterTransitionStart() {
  // Hook required by Next instrumentation API; Faro route/navigation events are auto-instrumented.
}
