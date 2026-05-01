import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadSeedEnv() {
  if (typeof process.loadEnvFile !== 'function') {
    return
  }

  const candidatePaths = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps', 'web', '.env.local'),
    resolve(process.cwd(), 'apps', 'api', '.env.local'),
    resolve(__dirname, '..', '.env.local'),
    resolve(__dirname, '..', '.env'),
    resolve(__dirname, '..', '..', '..', '.env.local'),
    resolve(__dirname, '..', '..', '..', '.env'),
  ]

  for (const envPath of candidatePaths) {
    if (existsSync(envPath)) {
      process.loadEnvFile(envPath)
    }
  }
}
