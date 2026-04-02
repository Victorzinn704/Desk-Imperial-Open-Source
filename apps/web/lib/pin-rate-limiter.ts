/**
 * @deprecated Rate limiting de PIN foi migrado para o backend (Redis).
 * O servidor retorna HTTP 423 quando o PIN está bloqueado.
 * Consulte apps/web/lib/admin-pin.ts para as funções de PIN atuais.
 *
 * As funções abaixo são no-ops mantidas apenas para compatibilidade de tipo caso
 * algum import residual exista. Não adicionam nenhuma lógica de rate limit local.
 */

export type PinRateStatus =
  | { blocked: false; attemptsLeft: number }
  | { blocked: true; blockedUntil: number; secondsLeft: number }

/** @deprecated No-op — backend Redis gerencia o rate limiting de PIN. */
export function getPinRateStatus(): PinRateStatus {
  return { blocked: false, attemptsLeft: 3 }
}

/** @deprecated No-op — backend Redis gerencia o rate limiting de PIN. */
export function recordPinFailure(): PinRateStatus {
  return { blocked: false, attemptsLeft: 3 }
}

/** @deprecated No-op — backend Redis gerencia o rate limiting de PIN. */
export function recordPinSuccess(): void {
  // no-op
}

/** @deprecated No-op — backend Redis gerencia o rate limiting de PIN. */
export function resetPinAttempts(): void {
  // no-op
}
