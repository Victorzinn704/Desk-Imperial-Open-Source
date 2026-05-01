import fs from 'node:fs'
import path from 'node:path'

const nextPackagePath = path.join(process.cwd(), 'node_modules', 'next', 'package.json')

if (!fs.existsSync(nextPackagePath)) {
  process.exit(0)
}

const nextPackage = JSON.parse(fs.readFileSync(nextPackagePath, 'utf8'))
const dependencies = nextPackage.dependencies ?? {}

if (dependencies.postcss === '8.5.10') {
  process.exit(0)
}

if (dependencies.postcss !== '8.4.31') {
  console.warn(
    `[patch-next-postcss] Next ${nextPackage.version ?? 'unknown'} declares postcss ${dependencies.postcss}; skipping patch.`,
  )
  process.exit(0)
}

dependencies.postcss = '8.5.10'
nextPackage.dependencies = dependencies
fs.writeFileSync(nextPackagePath, `${JSON.stringify(nextPackage, null, 2)}\n`)
console.log('[patch-next-postcss] Patched Next postcss metadata to 8.5.10.')
