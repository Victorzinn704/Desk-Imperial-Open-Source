import { spawn } from 'node:child_process'

const SERVICES = [
  { name: 'postgres', container: 'desk-imperial-postgres' },
  { name: 'redis', container: 'desk-imperial-redis' },
]

const timeoutMs = 90_000
const pollMs = 2_000

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim())
        return
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`))
    })
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readHealth(container) {
  try {
    const output = await run('docker', ['inspect', '--format', '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}', container])
    return output.trim()
  } catch (error) {
    return `unavailable:${error instanceof Error ? error.message : String(error)}`
  }
}

async function waitForHealth(service) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const status = await readHealth(service.container)
    if (status === 'healthy' || status === 'running') {
      console.log(`[infra] ${service.name} pronto (${status})`)
      return
    }

    console.log(`[infra] aguardando ${service.name} (${status})`)
    await sleep(pollMs)
  }

  throw new Error(`Timeout aguardando ${service.name} ficar saudável`)
}

async function main() {
  for (const service of SERVICES) {
    await waitForHealth(service)
  }
}

main().catch((error) => {
  console.error(`[infra] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
