import { expect, gotoWithConsent, test } from './fixtures/auth-fixtures'

test.describe('Mobile Entry E2E', () => {
  test.use({
    viewport: { width: 1024, height: 768 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Mobile Safari/537.36',
  })

  test('owner autenticado em navegador móvel entra no shell /app/owner', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            userId: 'owner-1',
            sessionId: 'session-1',
            role: 'OWNER',
            workspaceOwnerUserId: 'owner-1',
            companyOwnerUserId: 'owner-1',
            employeeId: null,
            employeeCode: null,
            fullName: 'Pedro Alves',
            companyName: 'Bar do Pedrão',
            companyLocation: {
              streetLine1: null,
              streetNumber: null,
              addressComplement: null,
              district: null,
              city: null,
              state: null,
              postalCode: null,
              country: null,
              latitude: null,
              longitude: null,
              precision: 'city',
            },
            workforce: {
              hasEmployees: true,
              employeeCount: 4,
            },
            email: 'ceo@empresa.com',
            emailVerified: true,
            preferredCurrency: 'BRL',
            status: 'ACTIVE',
            evaluationAccess: null,
            cookiePreferences: {
              necessary: true,
              analytics: true,
              marketing: true,
            },
          },
        }),
      })
    })

    await gotoWithConsent(page, '/')

    await expect(page).toHaveURL(/\/app\/owner/)
  })
})
