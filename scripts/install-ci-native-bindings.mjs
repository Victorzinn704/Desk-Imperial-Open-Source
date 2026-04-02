import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()

if (process.platform !== 'linux' || process.arch !== 'x64') {
  console.log(`Skipping CI native bindings on ${process.platform}/${process.arch}.`)
  process.exit(0)
}

const rolldownPackagePath = path.join(rootDir, 'node_modules', 'rolldown', 'package.json')
const tailwindOxidePackagePath = path.join(rootDir, 'node_modules', '@tailwindcss', 'oxide', 'package.json')

if (!fs.existsSync(rolldownPackagePath) || !fs.existsSync(tailwindOxidePackagePath)) {
  console.log('Skipping CI native bindings because required parent packages are not installed yet.')
  process.exit(0)
}

const rolldownVersion = JSON.parse(fs.readFileSync(rolldownPackagePath, 'utf8')).version
const tailwindOxideVersion = JSON.parse(fs.readFileSync(tailwindOxidePackagePath, 'utf8')).version
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const packages = [
  `@rolldown/binding-linux-x64-gnu@${rolldownVersion}`,
  `@tailwindcss/oxide-linux-x64-gnu@${tailwindOxideVersion}`,
]

console.log(`Installing Linux native bindings for CI: ${packages.join(', ')}`)
execSync(`${npmCommand} install --no-save ${packages.join(' ')}`, {
  cwd: rootDir,
  stdio: 'inherit',
})
