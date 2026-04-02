import type { Page } from '@playwright/test'
import { gotoWithConsent, test, expect, fillOwnerLogin } from './fixtures/auth-fixtures'

type E2EWindow = Window & {
  __E2E_UNHANDLED_REJECTIONS__?: string[]
}

type SilentFailureWatch = {
  pageErrors: string[]
  consoleErrors: string[]
}

test.describe('Critical Flows E2E - Chromium', () => {
  test('TC-E2E-CRIT-001: login carrega sem falhas silenciosas', async ({ page }) => {
    const watch = await startSilentFailureWatch(page)

    await gotoWithConsent(page, '/login')

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Entre e comande seu comércio',
      }),
    ).toBeVisible()

    await assertNoSilentFailures(page, watch)
  })

  test('TC-E2E-CRIT-002: erro de credenciais nao gera quebra silenciosa', async ({ page }) => {
    const watch = await startSilentFailureWatch(page)

    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Credenciais invalidas.' }),
      })
    })

    await gotoWithConsent(page, '/login')
    await fillOwnerLogin(page, 'erro@empresa.com', 'SenhaErrada123')
    await page.getByRole('button', { name: 'Entrar no portal' }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText(/inval|erro|incorret/i)).toBeVisible({ timeout: 10_000 })

    await assertNoSilentFailures(page, watch)
  })

  test('TC-E2E-CRIT-003: rota protegida redireciona sem exception em runtime', async ({ page }) => {
    const watch = await startSilentFailureWatch(page)

    await gotoWithConsent(page, '/app')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Entrar no portal' })).toBeVisible()

    await assertNoSilentFailures(page, watch)
  })
})

async function startSilentFailureWatch(page: Page): Promise<SilentFailureWatch> {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []

  await page.addInitScript(() => {
    const windowWithBuffer = window as E2EWindow
    windowWithBuffer.__E2E_UNHANDLED_REJECTIONS__ = []

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason)
      const currentValue = windowWithBuffer.__E2E_UNHANDLED_REJECTIONS__
      if (Array.isArray(currentValue)) {
        currentValue.push(reason)
      }
    })
  })

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return
    }

    const content = message.text()
    if (isIgnorableConsoleError(content)) {
      return
    }

    consoleErrors.push(content)
  })

  return {
    pageErrors,
    consoleErrors,
  }
}

async function assertNoSilentFailures(page: Page, watch: SilentFailureWatch) {
  const unhandledRejections = await page.evaluate(() => {
    const windowWithBuffer = window as E2EWindow
    const value = windowWithBuffer.__E2E_UNHANDLED_REJECTIONS__
    return Array.isArray(value) ? value.map((entry) => String(entry)) : []
  })

  const violations = [
    ...watch.pageErrors.map((error) => `pageerror: ${error}`),
    ...watch.consoleErrors.map((error) => `console.error: ${error}`),
    ...unhandledRejections.map((error) => `unhandledrejection: ${error}`),
  ]

  if (violations.length > 0) {
    throw new Error(`Falhas silenciosas detectadas durante fluxo critico:\n${violations.join('\n')}`)
  }
}

function isIgnorableConsoleError(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('favicon.ico') ||
    normalized.includes('chrome-extension://') ||
    normalized.includes('source map') ||
    normalized.includes('failed to load resource: the server responded with a status of 401') ||
    normalized.includes('failed to load resource: net::err_connection_refused')
  )
}
