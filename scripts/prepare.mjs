import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installationMode } from './security/braces-backport/runner.mjs'

// Production installs omit Husky itself; development installs retain the normal hooks.
if (process.env.HUSKY !== '0' && installationMode() === 'full') {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  process.chdir(root)
  const { default: husky } = await import('husky')
  process.stdout.write(husky())
}
