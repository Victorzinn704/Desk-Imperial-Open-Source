'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type EvaluationAccess = {
  sessionExpiresAt: string
  dailyLimitMinutes: number
} | null

/**
 * Countdown timer for demo/evaluation sessions.
 * Ticks every second and calls `onExpire` when the session ends.
 * Uses a ref for the callback to avoid re-triggering the effect on every render.
 */
export function useEvaluationCountdown(evaluationAccess: EvaluationAccess, onExpire?: () => void) {
  const [countdownNow, setCountdownNow] = useState(() => Date.now())
  const onExpireRef = useRef(onExpire)
  useLayoutEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    if (!evaluationAccess) {
      return
    }

    const expirationTime = new Date(evaluationAccess.sessionExpiresAt).getTime()

    const intervalId = globalThis.setInterval(() => setCountdownNow(Date.now()), 1000)
    const timeoutId = globalThis.setTimeout(
      () => onExpireRef.current?.(),
      Math.max(0, expirationTime - Date.now()) + 150,
    )

    return () => {
      globalThis.clearInterval(intervalId)
      globalThis.clearTimeout(timeoutId)
    }
  }, [evaluationAccess])

  if (!evaluationAccess) {
    return { remainingSeconds: 0, isEvaluation: false as const }
  }

  const remainingSeconds = Math.max(
    0,
    Math.ceil((new Date(evaluationAccess.sessionExpiresAt).getTime() - countdownNow) / 1000),
  )

  return { remainingSeconds, isEvaluation: true as const }
}
