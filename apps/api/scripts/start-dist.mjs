import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import process from 'node:process'

const candidates = ['dist/apps/api/src/main.js', 'dist/src/main.js', 'dist/main.js']
const entrypoint = candidates.find((candidate) => existsSync(candidate))

if (!entrypoint) {
  globalThis.console.error('Nenhum entrypoint compilado do Nest foi encontrado em dist.')
  process.exit(1)
}

const child = spawn(process.execPath, [entrypoint], {
  stdio: 'inherit',
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
