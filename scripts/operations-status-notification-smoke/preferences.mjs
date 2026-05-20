import { NOTIFICATION_EVENTS } from './config.mjs'

const USER_PREFERENCE_ROUND_TRIP = Object.freeze({
  path: '/notifications/preferences/me',
  requiredPreferences: [{ channel: 'WEB_TOAST', eventType: NOTIFICATION_EVENTS.comandaStatus }],
  restoreKey: 'restoredUserPreferences',
  summaryKey: 'userPreferenceRoundTrip',
  toggle: (entry) => entry.channel === 'WEB_TOAST' && entry.eventType === NOTIFICATION_EVENTS.comandaStatus,
})

const WORKSPACE_PREFERENCE_ROUND_TRIP = Object.freeze({
  path: '/notifications/telegram/preferences',
  requiredPreferences: [
    { eventType: NOTIFICATION_EVENTS.comandaStatus },
    { eventType: NOTIFICATION_EVENTS.kitchenStatus },
  ],
  restoreKey: 'restoredPreferences',
  summaryKey: 'preferenceRoundTrip',
  toggle: (entry) => entry.eventType === NOTIFICATION_EVENTS.kitchenStatus,
})

export async function exercisePreferenceRoundTrips(owner, summary, state) {
  await exercisePreferenceRoundTrip(owner, summary, state, USER_PREFERENCE_ROUND_TRIP)
  await exercisePreferenceRoundTrip(owner, summary, state, WORKSPACE_PREFERENCE_ROUND_TRIP)
}

async function exercisePreferenceRoundTrip(owner, summary, state, roundTrip) {
  const before = await fetchPreferences(owner, roundTrip.path)
  assertRequiredPreferences(before, roundTrip.requiredPreferences)

  state[roundTrip.restoreKey] = toPreferenceRestorePayload(before)
  const afterToggle = await postPreferences(owner, roundTrip.path, togglePreferences(before, roundTrip.toggle))
  const afterRestore = await postPreferences(owner, roundTrip.path, state[roundTrip.restoreKey])

  summary[roundTrip.summaryKey] = {
    afterRestore,
    afterToggle,
    before,
  }
}

export async function restorePreferenceSnapshot(owner, path, preferences, label) {
  if (!preferences) {
    return
  }

  try {
    await postPreferences(owner, path, preferences)
  } catch (error) {
    console.error(`Falha ao restaurar preferências ${label}:`, error instanceof Error ? error.message : error)
  }
}

export async function restoreSmokePreferences(owner, state) {
  await restorePreferenceSnapshot(
    owner,
    WORKSPACE_PREFERENCE_ROUND_TRIP.path,
    state.restoredPreferences,
    'do workspace',
  )
  await restorePreferenceSnapshot(owner, USER_PREFERENCE_ROUND_TRIP.path, state.restoredUserPreferences, 'do usuário')
}

async function fetchPreferences(owner, path) {
  const response = await owner.request(path)
  return response.preferences ?? []
}

async function postPreferences(owner, path, preferences) {
  const response = await owner.request(path, {
    method: 'POST',
    body: JSON.stringify({ preferences }),
  })
  return response.preferences
}

function assertRequiredPreferences(preferences, requirements) {
  const missingRequirement = requirements.find(
    (requirement) => !preferences.some((entry) => matchesRequirement(entry, requirement)),
  )
  if (missingRequirement) {
    throw new Error(`Preferência esperada não encontrada: ${JSON.stringify(missingRequirement)}.`)
  }
}

function matchesRequirement(entry, requirement) {
  return Object.entries(requirement).every(([key, value]) => entry[key] === value)
}

function togglePreferences(preferences, predicate) {
  return preferences.map((entry) => ({
    channel: entry.channel,
    enabled: predicate(entry) ? !entry.enabled : entry.enabled,
    eventType: entry.eventType,
  }))
}

function toPreferenceRestorePayload(preferences) {
  return preferences.map(({ channel, enabled, eventType }) => ({ channel, enabled, eventType }))
}
