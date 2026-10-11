import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { applyOrVerify } from './security/braces-backport/runner.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const legacy = spawnSync(process.execPath, [path.join(root, 'scripts/patch-next-postcss.mjs')], {
  cwd: root,
  stdio: 'inherit',
})
if (legacy.error) throw legacy.error
if (legacy.status !== 0) process.exit(legacy.status ?? 1)
const report = await applyOrVerify({
  root,
  configFile: path.join(root, 'scripts/security/braces-backport/reviewed-config.json'),
  command: 'apply',
  mode: 'auto',
})
process.stdout.write(
  `Verified braces backport: ${report.status}; mode=${report.mode}; copies=${report.copies.length}\n`,
)
