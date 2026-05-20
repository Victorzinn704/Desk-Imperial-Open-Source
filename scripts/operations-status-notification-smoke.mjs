import { ApiSession } from './operations-status-notification-smoke/api-session.mjs'
import {
  cleanupSmoke,
  createSmokeState,
  createSmokeSummary,
  runSmokeScenario,
} from './operations-status-notification-smoke/scenario.mjs'

async function main() {
  const owner = new ApiSession('owner')
  const staff = new ApiSession('staff')
  const state = createSmokeState()
  const summary = createSmokeSummary()

  try {
    await runSmokeScenario({ owner, staff, state, summary })
    console.log(JSON.stringify(summary, null, 2))
  } finally {
    await cleanupSmoke(owner, state)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
