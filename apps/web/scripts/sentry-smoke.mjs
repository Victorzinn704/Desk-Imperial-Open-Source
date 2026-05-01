import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const appDir = process.cwd()
const buildIdPath = path.join(appDir, '.next', 'BUILD_ID')
const port = Number(process.env.SENTRY_SMOKE_PORT || '3100')
const baseUrl = `http://127.0.0.1:${port}`
const reportDir = path.join(appDir, '.cache', 'sentry')
const reportPath = path.join(reportDir, `sentry-web-smoke-${Date.now()}.json`)

await main()

async function main() {
  if (!existsSync(buildIdPath)) {
    console.error('Build do Next ausente. Rode `npm --workspace @partner/web run build` antes do smoke do Sentry.')
    process.exit(1)
  }

  const startTime = Date.now()
  const server = spawn(process.execPath, ['./scripts/start.mjs'], {
    cwd: appDir,
    env: {
      ...process.env,
      PORT: String(port),
      SENTRY_EXAMPLE_ENABLED: 'true',
      NODE_OPTIONS: mergeNodeOptions(process.env.NODE_OPTIONS, '--max-old-space-size=1024'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stdoutBuffer = ''
  let stderrBuffer = ''

  server.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString()
  })

  server.stderr.on('data', (chunk) => {
    stderrBuffer += chunk.toString()
  })

  try {
    await waitForServer(`${baseUrl}/sentry-example-page`)

    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage'],
    })

    try {
      const page = await browser.newPage()
      await page.goto(`${baseUrl}/sentry-example-page`, { waitUntil: 'networkidle' })

      const tunnelResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/sentry-tunnel') &&
          response.request().method() === 'POST' &&
          response.request().postData()?.includes('Desk Imperial Next.js browser test error') === true,
        { timeout: 20_000 },
      )

      await page.getByRole('button', { name: 'Enviar erro do navegador' }).click()
      const tunnelResponse = await tunnelResponsePromise
      const browserStatus = await page.getByTestId('sentry-browser-status').textContent()

      const apiResponsePromise = page.waitForResponse(
        (response) => response.url().includes('/api/sentry-example-api') && response.request().method() === 'GET',
        { timeout: 20_000 },
      )

      await page.getByRole('button', { name: 'Enviar erro do servidor' }).click()
      await apiResponsePromise
      await page.waitForFunction(() =>
        document.querySelector('[data-testid="sentry-api-status"]')?.textContent?.includes('sent'),
      )
      const apiStatus = await page.getByTestId('sentry-api-status').textContent()

      const report = {
        ok: tunnelResponse.ok() && browserStatus?.includes('sent') && apiStatus?.includes('sent'),
        durationMs: Date.now() - startTime,
        baseUrl,
        tunnel: {
          url: tunnelResponse.url(),
          status: tunnelResponse.status(),
          ok: tunnelResponse.ok(),
        },
        browserStatus,
        apiStatus,
        stdoutTail: tail(stdoutBuffer),
        stderrTail: tail(stderrBuffer),
      }

      await mkdir(reportDir, { recursive: true })
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

      if (!report.ok) {
        console.error(`Smoke do Sentry falhou. Relatorio: ${reportPath}`)
        process.exitCode = 1
        return
      }

      console.log(`Smoke do Sentry ok. Relatorio: ${reportPath}`)
    } finally {
      await browser.close()
    }
  } finally {
    await stopProcess(server)
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' })
      if (response.ok || response.status === 404) {
        return
      }
    } catch {
      // servidor ainda subindo
    }

    await sleep(500)
  }

  throw new Error(`Servidor do smoke nao respondeu a tempo em ${url}.`)
}

function mergeNodeOptions(existing, nextOption) {
  const current = existing?.trim()
  if (!current) {
    return nextOption
  }

  if (current.includes(nextOption)) {
    return current
  }

  return `${current} ${nextOption}`
}

function tail(value) {
  return value.slice(-2_000)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function stopProcess(child) {
  if (!child.pid || child.exitCode !== null) {
    return
  }

  child.kill('SIGTERM')

  const deadline = Date.now() + 10_000
  while (child.exitCode === null && Date.now() < deadline) {
    await sleep(200)
  }

  if (child.exitCode === null) {
    child.kill('SIGKILL')
  }
}
