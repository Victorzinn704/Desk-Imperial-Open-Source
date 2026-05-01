import {
  gotoWithConsent,
  test,
  expect,
  fillOwnerLogin,
  ownerEmailInput,
  passwordInput,
  passwordToggleButton,
} from './fixtures/auth-fixtures'

test.describe('Auth E2E - Chromium Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithConsent(page, '/login')
  })

  test('TC-E2E-AUTH-001: carrega a página de login com o formulário da empresa', async ({ page }) => {
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Entre e comande seu comércio',
      }),
    ).toBeVisible()
    await expect(page.getByText('Email Corporativo')).toBeVisible()
    await expect(ownerEmailInput(page)).toBeVisible()
    await expect(passwordInput(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar no portal' })).toBeVisible()
  })

  test('TC-E2E-AUTH-002: alterna entre os modos empresa e funcionário', async ({ page }) => {
    await expect(page.getByText('Email Corporativo')).toBeVisible()

    await page.getByRole('button', { name: 'Funcionário' }).click()

    await expect(page.getByText('Email da Empresa')).toBeVisible()
    await expect(page.getByText('ID do Funcionário')).toBeVisible()
    await expect(page.getByPlaceholder('VD-001')).toBeVisible()
    await expect(page.getByPlaceholder('••••••')).toBeVisible()
  })

  test('TC-E2E-AUTH-003: bloqueia submit vazio e mantém o usuário na tela de login', async ({ page }) => {
    await page.getByRole('button', { name: 'Entrar no portal' }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('Digite um e-mail válido.')).toBeVisible()
    await expect(page.getByText('A senha da empresa precisa ter pelo menos 8 caracteres.')).toBeVisible()
  })

  test('TC-E2E-AUTH-004: expõe o CTA de demo da empresa', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Acessar Sessão Demo Empresa/i })).toBeVisible()
  })

  test('TC-E2E-AUTH-005: alterna visibilidade da senha no modo empresa', async ({ page }) => {
    const input = passwordInput(page)
    const toggleButton = passwordToggleButton(page, input)

    await input.fill('MinhaSenha@123')
    await expect(input).toHaveAttribute('type', 'password')

    await toggleButton.click()
    await expect(input).toHaveAttribute('type', 'text')

    await toggleButton.click()
    await expect(input).toHaveAttribute('type', 'password')
  })

  test('TC-E2E-AUTH-006: o link de cadastro sai do login com sucesso', async ({ page }) => {
    await page.getByRole('link', { name: 'Solicitar acesso' }).click()
    await expect(page).toHaveURL(/\/cadastro$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Crie e ative seu acesso' })).toBeVisible()
  })

  test('TC-E2E-AUTH-007: o cadastro permite voltar para login', async ({ page }) => {
    await gotoWithConsent(page, '/cadastro')

    await expect(page.getByRole('heading', { level: 1, name: 'Crie e ative seu acesso' })).toBeVisible()
    await page.getByRole('button', { name: /Ir para o Portal/i }).click()

    await expect(page).toHaveURL(/\/login$/)
  })

  test('TC-E2E-AUTH-008: login com credenciais inválidas devolve erro sem sair da tela', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Credenciais inválidas.',
        }),
      })
    })

    await fillOwnerLogin(page, 'erro@empresa.com', 'SenhaErrada123')
    await page.getByRole('button', { name: 'Entrar no portal' }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('Credenciais inválidas.', { exact: true })).toBeVisible({ timeout: 10_000 })
  })
})
