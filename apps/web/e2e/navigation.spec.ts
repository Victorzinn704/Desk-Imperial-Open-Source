import { gotoWithConsent, test, expect } from './fixtures/auth-fixtures'

const protectedRoutes = ['/app', '/app/owner', '/app/staff']

test.describe('Navigation E2E - Chromium Smoke', () => {
  test('TC-E2E-NAV-001: login é acessível sem erro de carregamento', async ({ page }) => {
    const response = await page.goto('/login')
    await gotoWithConsent(page, '/login')

    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByRole('button', { name: 'Entrar no portal' })).toBeVisible()
  })

  test('TC-E2E-NAV-002: cadastro é acessível sem erro de carregamento', async ({ page }) => {
    const response = await page.goto('/cadastro')
    await gotoWithConsent(page, '/cadastro')

    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByRole('button', { name: /Criar conta e validar empresa/i })).toBeVisible()
  })

  for (const route of protectedRoutes) {
    test(`TC-E2E-NAV-REDIRECT: ${route} redireciona para login sem sessão`, async ({ page }) => {
      await gotoWithConsent(page, route)

      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByRole('button', { name: 'Entrar no portal' })).toBeVisible()
    })
  }

  test('TC-E2E-NAV-003: rota inexistente não quebra a aplicação', async ({ page }) => {
    const response = await page.goto('/rota-que-nao-existe-xyz')

    expect(response?.status()).toBeLessThan(500)
    await expect(page.locator('body')).toContainText(/404|não encontrado|not found/i)
  })

  test('TC-E2E-NAV-004: back e forward funcionam entre login e cadastro', async ({ page }) => {
    await gotoWithConsent(page, '/login')
    await page.getByRole('link', { name: 'Solicitar acesso' }).click()
    await expect(page).toHaveURL(/\/cadastro$/)

    await page.goBack()
    await expect(page).toHaveURL(/\/login$/)

    await page.goForward()
    await expect(page).toHaveURL(/\/cadastro$/)
  })
})
