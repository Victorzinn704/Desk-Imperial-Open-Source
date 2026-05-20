import type * as api from '@/lib/api'

export function createCurrentUserResponse() {
  return {
    user: {
      userId: 'owner-1',
      sessionId: 'session-1',
      role: 'OWNER',
      workspaceOwnerUserId: 'owner-1',
      companyOwnerUserId: null,
      employeeId: null,
      employeeCode: null,
      fullName: 'Wilson Owner',
      companyName: 'Desk Imperial',
      companyLocation: createEmptyCompanyLocation(),
      workforce: {
        hasEmployees: true,
        employeeCount: 2,
      },
      email: 'owner@desk.test',
      emailVerified: true,
      preferredCurrency: 'BRL',
      status: 'ACTIVE',
      evaluationAccess: null,
      cookiePreferences: createCookiePreferences(),
    },
  } as Awaited<ReturnType<typeof api.fetchCurrentUser>>
}

export function createConsentOverview() {
  return {
    documents: [],
    legalAcceptances: [],
    cookiePreferences: createCookiePreferences(),
  } as Awaited<ReturnType<typeof api.fetchConsentOverview>>
}

export function createTelegramStatus() {
  return {
    enabled: true,
    workspaceEnabled: true,
    restrictionReason: null,
    botUsername: 'Desk_Imperial_bot',
    deeplinkBase: 'https://t.me/Desk_Imperial_bot',
    linked: false,
    account: null,
  } as Awaited<ReturnType<typeof api.fetchTelegramIntegrationStatus>>
}

export function createWorkspaceNotificationPreferences() {
  return {
    preferences: [
      createNotificationPreference('TELEGRAM', 'operations.comanda.status_changed'),
      createNotificationPreference('TELEGRAM', 'operations.kitchen_item.status_changed'),
    ],
  } as Awaited<ReturnType<typeof api.fetchWorkspaceNotificationPreferences>>
}

export function createUserNotificationPreferences() {
  return {
    preferences: [
      createNotificationPreference('WEB_TOAST', 'operations.comanda.status_changed'),
      createNotificationPreference('MOBILE_TOAST', 'operations.comanda.status_changed'),
    ],
  } as Awaited<ReturnType<typeof api.fetchUserNotificationPreferences>>
}

function createEmptyCompanyLocation() {
  return {
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
  }
}

function createCookiePreferences() {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
  }
}

function createNotificationPreference(channel: string, eventType: string) {
  return {
    channel,
    eventType,
    enabled: true,
    inherited: true,
  }
}
