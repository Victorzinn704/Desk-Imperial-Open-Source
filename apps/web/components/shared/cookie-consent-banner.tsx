'use client'

import { useEffect, useMemo, useState } from 'react'
import { Cookie, ShieldCheck } from 'lucide-react'
import { fetchCurrentUser, updateCookiePreferences } from '@/lib/api'
import {
  persistCookieConsent,
  readCookieConsentChoice,
  type CookieConsentChoice,
} from '@/lib/cookie-consent'
import { Button } from '@/components/shared/button'

export function CookieConsentBanner() {
  const [isReady, setIsReady] = useState(false)
  const [hasDecision, setHasDecision] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setHasDecision(Boolean(readCookieConsentChoice()))
    setIsReady(true)
  }, [])

  const content = useMemo(
    () => ({
      title: 'Este site usa cookies',
      description:
        'Usamos cookies necessarios para seguranca e sessao. Os opcionais ajudam com analise e comunicacao. Voce pode aceitar ou rejeitar todos.',
    }),
    [],
  )

  if (!isReady || hasDecision) {
    return null
  }

  const handleDecision = async (choice: CookieConsentChoice) => {
    setIsSubmitting(true)

    try {
      persistCookieConsent(choice)

      try {
        await fetchCurrentUser()
        await updateCookiePreferences({
          analytics: choice === 'accepted',
          marketing: choice === 'accepted',
        })
      } catch {
        // Visitors sem sessao autenticada continuam com a preferencia guardada localmente.
      }

      setHasDecision(true)
    } catch {
      setHasDecision(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-3xl rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(12,15,19,0.94)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(212,177,106,0.22)] bg-[rgba(212,177,106,0.08)] text-[var(--accent)]">
              <Cookie className="size-5" />
            </span>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">
                <ShieldCheck className="size-3.5" />
                Preferencias de cookies
              </div>
              <h2 className="mt-3 text-xl font-semibold text-white">{content.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
                {content.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              loading={isSubmitting}
              onClick={() => void handleDecision('rejected')}
              size="md"
              variant="secondary"
            >
              Rejeitar todos
            </Button>
            <Button
              loading={isSubmitting}
              onClick={() => void handleDecision('accepted')}
              size="md"
            >
              Aceitar todos
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
