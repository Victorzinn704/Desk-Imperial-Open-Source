export type StoredEmailVerificationChallenge = {
  email: string
  previewCode: string
  previewExpiresAt: string
  savedAt: string
}

type AuthChallengeStore = {
  emailVerification: Record<string, StoredEmailVerificationChallenge>
}

const STORAGE_KEY = 'desk-imperial:auth-challenges'

export function saveEmailVerificationChallenge(challenge: StoredEmailVerificationChallenge) {
  if (typeof window === 'undefined') {
    return
  }

  const store = readStore()
  store.emailVerification[normalizeEmail(challenge.email)] = challenge
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function readEmailVerificationChallenge(email: string) {
  if (typeof window === 'undefined') {
    return null
  }

  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    return null
  }

  const store = readStore()
  const challenge = store.emailVerification[normalizedEmail]

  if (!challenge) {
    return null
  }

  if (new Date(challenge.previewExpiresAt).getTime() <= Date.now()) {
    delete store.emailVerification[normalizedEmail]
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    return null
  }

  return challenge
}

export function clearEmailVerificationChallenge(email: string) {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    return
  }

  const store = readStore()
  delete store.emailVerification[normalizedEmail]
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function readStore(): AuthChallengeStore {
  if (typeof window === 'undefined') {
    return {
      emailVerification: {},
    }
  }

  const rawStore = window.sessionStorage.getItem(STORAGE_KEY)

  if (!rawStore) {
    return {
      emailVerification: {},
    }
  }

  try {
    const parsedStore = JSON.parse(rawStore) as Partial<AuthChallengeStore>
    return {
      emailVerification: parsedStore.emailVerification ?? {},
    }
  } catch {
    return {
      emailVerification: {},
    }
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}
