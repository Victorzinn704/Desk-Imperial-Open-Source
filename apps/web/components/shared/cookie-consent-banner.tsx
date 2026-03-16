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

  useEffect(() => {
    if (!isReady || hasDecision) {
      document.body.classList.remove('cookie-consent-open')
      document.documentElement.classList.remove('cookie-consent-open')
      return
    }

    document.body.classList.add('cookie-consent-open')
    document.documentElement.classList.add('cookie-consent-open')

    return () => {
      document.body.classList.remove('cookie-consent-open')
      document.documentElement.classList.remove('cookie-consent-open')
    }
  }, [hasDecision, isReady])

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
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2147483644,
          background: 'rgba(5, 7, 10, 0.58)',
          backdropFilter: 'blur(3px)',
        }}
      />
      <section
        aria-labelledby="cookie-consent-title"
        aria-modal="true"
        data-testid="cookie-consent-banner"
        role="dialog"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: '24px',
          transform: 'translateX(-50%)',
          width: 'min(920px, calc(100vw - 24px))',
          zIndex: 2147483645,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '28px',
          background: 'rgba(12, 15, 19, 0.985)',
          boxShadow: '0 32px 120px rgba(0, 0, 0, 0.56)',
          backdropFilter: 'blur(18px)',
          padding: '20px',
        }}
      >
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
              <h2 className="mt-3 text-xl font-semibold text-white" id="cookie-consent-title">
                {content.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
                {content.description}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                O site so libera a navegacao depois da sua escolha.
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
              Usar apenas essenciais
            </Button>
            <Button
              loading={isSubmitting}
              onClick={() => void handleDecision('accepted')}
              size="md"
            >
              Aceitar e continuar
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
