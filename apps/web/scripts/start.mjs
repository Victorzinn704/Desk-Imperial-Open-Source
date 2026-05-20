import path from 'node:path'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const require = createRequire(import.meta.url)
const port = process.env.PORT || '3000'
const nextBin = require.resolve('next/dist/bin/next')

const child = spawn(process.execPath, [path.normalize(nextBin), 'start', '--port', port], {
  stdio: 'inherit',
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
