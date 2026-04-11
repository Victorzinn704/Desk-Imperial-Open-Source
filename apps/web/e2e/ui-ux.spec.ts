import { expect, gotoWithConsent, ownerEmailInput, passwordInput, test } from './fixtures/auth-fixtures'

test.describe('UI UX E2E - Chromium Smoke', () => {
  test('TC-E2E-UI-001: login mantém hierarquia visual principal', async ({ page }) => {
    await gotoWithConsent(page, '/login')

    await expect(page.getByRole('heading', { level: 1, name: 'Entre e comande seu comércio' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Entre e comande seu comércio' })).toBeVisible()
    await expect(page.getByText('Seu acesso seguro')).toBeVisible()
  })

  test('TC-E2E-UI-002: login permanece utilizável em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await gotoWithConsent(page, '/login')

    await expect(ownerEmailInput(page)).toBeVisible()
    await expect(passwordInput(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar no portal' })).toBeVisible()
  })

  test('TC-E2E-UI-003: inputs possuem labels acessíveis e foco funcional', async ({ page }) => {
    await gotoWithConsent(page, '/login')

    await expect(page.getByText('Email Corporativo')).toBeVisible()
    await expect(page.getByText('Senha de Acesso')).toBeVisible()

    const emailInput = ownerEmailInput(page)
    await emailInput.focus()
    await expect(emailInput).toBeFocused()
  })

  test('TC-E2E-UI-004: tab order percorre o formulário sem travar', async ({ page }) => {
    await gotoWithConsent(page, '/login')

    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    await ownerEmailInput(page).focus()
    await ownerEmailInput(page).fill('teclado@empresa.com')
    await page.keyboard.press('Tab')
    await passwordInput(page).fill('SenhaViaTeclado')

    await expect(passwordInput(page)).toHaveValue('SenhaViaTeclado')
  })
})
