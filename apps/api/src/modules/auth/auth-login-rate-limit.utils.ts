import type { AuthRateLimitService } from './auth-rate-limit.service'

type RateLimitState = Awaited<ReturnType<AuthRateLimitService['recordFailure']>>

export async function assertAllowedForKeys(keys: string[], assertion: (key: string) => Promise<void>) {
  await Promise.all(keys.map((key) => assertion(key)))
}

export async function recordAttemptsForKeys(keys: string[], recorder: (key: string) => Promise<RateLimitState>) {
  return Promise.all(keys.map((key) => recorder(key)))
}

export async function clearRateLimitKeys(keys: string[], rateLimitService: AuthRateLimitService) {
  await Promise.all(keys.map((key) => rateLimitService.clear(key)))
}

export function pickMostRestrictiveRateLimitState(states: RateLimitState[]): RateLimitState {
  const [initialState, ...remainingStates] = states
  if (!initialState) {
    return { count: 0, firstAttemptAt: 0, lockedUntil: null }
  }

  return remainingStates.reduce((current, candidate) => {
    const currentLockedUntil = current.lockedUntil ?? 0
    const candidateLockedUntil = candidate.lockedUntil ?? 0
    if (candidateLockedUntil > currentLockedUntil) {
      return candidate
    }
    if (candidateLockedUntil === currentLockedUntil && candidate.count > current.count) {
      return candidate
    }
    return current
  }, initialState)
}
