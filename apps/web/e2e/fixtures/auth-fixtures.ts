import { test as base, expect, type Locator, type Page } from '@playwright/test'

const CONSENT_STORAGE_KEY = 'partner-portal-cookie-consent'
const CONSENT_COOKIE_NAME = 'partner_portal_cookie_consent'
const CONSENT_VERSION = '2026.03.banner.v4'

export const test = base.extend({
  page: async ({ page }, runPage) => {
    await page.addInitScript(
      ({
        consentCookieName,
        consentStorageKey,
        consentVersion,
      }: {
        consentCookieName: string
        consentStorageKey: string
        consentVersion: string
      }) => {
        window.localStorage.setItem(
          consentStorageKey,
          JSON.stringify({
            preferences: {
              analytics: true,
              marketing: true,
            },
            updatedAt: new Date().toISOString(),
            version: consentVersion,
          }),
        )
        document.cookie = `${consentCookieName}=accepted; Path=/; SameSite=Lax`
      },
      {
        consentCookieName: CONSENT_COOKIE_NAME,
        consentStorageKey: CONSENT_STORAGE_KEY,
        consentVersion: CONSENT_VERSION,
      },
    )

    await runPage(page)
  },
})

export { expect }

export async function gotoWithConsent(page: Page, path: string) {
  await page.goto(path)
  await dismissCookieDialogIfPresent(page)
}

export async function dismissCookieDialogIfPresent(page: Page) {
  const acceptButton = page.getByRole('button', { name: 'Aceitar tudo' })
  const legacyAcceptButton = page.getByRole('button', { name: 'Aceitar e continuar' })
  if (await acceptButton.isVisible().catch(() => false)) {
    await acceptButton.click()
    return
  }

  if (await legacyAcceptButton.isVisible().catch(() => false)) {
    await legacyAcceptButton.click()
  }
}

export function ownerEmailInput(page: Page) {
  return page.getByPlaceholder('ceo@empresa.com')
}

export function passwordInput(page: Page) {
  return page.getByPlaceholder('••••••••')
}

export function staffPasswordInput(page: Page) {
  return page.getByPlaceholder('••••••••')
}

export function passwordToggleButton(page: Page, input: Locator) {
  return input.locator('..').getByRole('button').last()
}

export async function fillOwnerLogin(page: Page, email: string, password: string) {
  await ownerEmailInput(page).fill(email)
  await passwordInput(page).fill(password)
}
