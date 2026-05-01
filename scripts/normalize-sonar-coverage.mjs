import { spawnSync } from 'node:child_process'

const targets = [
  ['apps/api/coverage/lcov.info', 'apps/api'],
  ['apps/web/coverage/lcov.info', 'apps/web'],
]

for (const [reportPath, workspaceRoot] of targets) {
  const result = spawnSync(process.execPath, ['scripts/normalize-lcov-report.mjs', reportPath, workspaceRoot], {
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
