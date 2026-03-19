/** @deprecated Rate limiting movido para o servidor. Este arquivo não deve ser usado em código novo. */

/**
 * PIN rate limiter — persisted in localStorage.
 * Max 3 failed attempts, then 5-minute block.
 * After 30 minutes of inactivity since last failure, resets automatically.
 *
 * @deprecated O rate limiting agora é gerenciado pelo backend (status 423).
 * Consulte apps/web/lib/admin-pin.ts para as funções de PIN atuais.
 */

const KEY_ATTEMPTS = 'desk_imperial_pin_attempts'
const KEY_BLOCKED_UNTIL = 'desk_imperial_pin_blocked_until'
const KEY_LAST_FAILURE = 'desk_imperial_pin_last_failure'

const MAX_ATTEMPTS = 3
const BLOCK_DURATION_MS = 5 * 60 * 1000   // 5 minutes
const INACTIVITY_RESET_MS = 30 * 60 * 1000 // 30 minutes idle → auto-reset

export type PinRateStatus =
  | { blocked: false; attemptsLeft: number }
  | { blocked: true; blockedUntil: number; secondsLeft: number }

export function getPinRateStatus(): PinRateStatus {
  const now = Date.now()

  // Auto-reset if last failure was > 30 min ago
  const lastFailure = Number(localStorage.getItem(KEY_LAST_FAILURE) ?? 0)
  if (lastFailure && now - lastFailure > INACTIVITY_RESET_MS) {
    resetPinAttempts()
  }

  const blockedUntil = Number(localStorage.getItem(KEY_BLOCKED_UNTIL) ?? 0)
  if (blockedUntil && now < blockedUntil) {
    return {
      blocked: true,
      blockedUntil,
      secondsLeft: Math.ceil((blockedUntil - now) / 1000),
    }
  }

  // Block expired — clear it
  if (blockedUntil && now >= blockedUntil) {
    resetPinAttempts()
  }

  const attempts = Number(localStorage.getItem(KEY_ATTEMPTS) ?? 0)
  return { blocked: false, attemptsLeft: MAX_ATTEMPTS - attempts }
}

export function recordPinFailure(): PinRateStatus {
  const now = Date.now()
  const attempts = Number(localStorage.getItem(KEY_ATTEMPTS) ?? 0) + 1

  localStorage.setItem(KEY_ATTEMPTS, String(attempts))
  localStorage.setItem(KEY_LAST_FAILURE, String(now))

  if (attempts >= MAX_ATTEMPTS) {
    const blockedUntil = now + BLOCK_DURATION_MS
    localStorage.setItem(KEY_BLOCKED_UNTIL, String(blockedUntil))
    return {
      blocked: true,
      blockedUntil,
      secondsLeft: Math.ceil(BLOCK_DURATION_MS / 1000),
    }
  }

  return { blocked: false, attemptsLeft: MAX_ATTEMPTS - attempts }
}

export function recordPinSuccess() {
  resetPinAttempts()
}

export function resetPinAttempts() {
  localStorage.removeItem(KEY_ATTEMPTS)
  localStorage.removeItem(KEY_BLOCKED_UNTIL)
  localStorage.removeItem(KEY_LAST_FAILURE)
}
