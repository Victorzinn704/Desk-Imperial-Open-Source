'use client'

import { useEffect, useMemo, useState } from 'react'
import { Cookie, ShieldCheck } from 'lucide-react'
import { updateCookiePreferences } from '@/lib/api'
import { persistCookieConsent, readCookieConsentChoice, type CookieConsentChoice } from '@/lib/cookie-consent'
import { Button } from '@/components/shared/button'

const DEFAULT_COOKIE_PREFERENCES: CookieConsentChoice = {
  analytics: false,
  marketing: false,
}

export function CookieConsentBanner() {
  const [isReady, setIsReady] = useState(false)
  const [hasDecision, setHasDecision] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preferences, setPreferences] = useState<CookieConsentChoice>(DEFAULT_COOKIE_PREFERENCES)

  useEffect(() => {
    const storedDecision = readCookieConsentChoice()
    if (storedDecision) {
      setPreferences(storedDecision)
      setHasDecision(true)
    } else {
      setHasDecision(false)
    }

    setIsReady(true)
  }, [])

  const content = useMemo(
    () => ({
      title: 'Este site usa cookies',
      description:
        'Usamos cookies necessários para segurança e sessão. Você pode escolher separadamente os opcionais de análise e comunicação.',
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
        await updateCookiePreferences({
          analytics: choice.analytics,
          marketing: choice.marketing,
        })
      } catch {
        // A preferencia local continua valendo mesmo sem sincronismo remoto.
      }

      setHasDecision(true)
    } catch {
      setHasDecision(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePreference = (key: keyof CookieConsentChoice) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  return (
    <>
      <section
        aria-labelledby="cookie-consent-title"
        aria-modal="false"
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
          background: 'rgba(12, 15, 19, 0.96)',
          boxShadow: '0 18px 64px rgba(0, 0, 0, 0.46)',
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
                Preferências de cookies
              </div>
              <h2 className="mt-3 text-xl font-semibold text-white" id="cookie-consent-title">
                {content.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">{content.description}</p>
              <div className="mt-3 grid gap-2 text-sm text-[var(--text-soft)] sm:grid-cols-2">
                <label className="flex items-center gap-2">
                  <input
                    checked={preferences.analytics}
                    className="size-4 accent-[var(--accent)]"
                    disabled={isSubmitting}
                    type="checkbox"
                    onChange={() => togglePreference('analytics')}
                  />
                  Cookies de analise (metricas de uso)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    checked={preferences.marketing}
                    className="size-4 accent-[var(--accent)]"
                    disabled={isSubmitting}
                    type="checkbox"
                    onChange={() => togglePreference('marketing')}
                  />
                  Cookies de marketing (comunicacao)
                </label>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Cookies necessarios permanecem ativos para autenticacao e seguranca.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              loading={isSubmitting}
              onClick={() => void handleDecision({ analytics: false, marketing: false })}
              size="md"
              variant="secondary"
            >
              Usar apenas essenciais
            </Button>
            <Button loading={isSubmitting} onClick={() => void handleDecision(preferences)} size="md" variant="secondary">
              Salvar escolhas
            </Button>
            <Button loading={isSubmitting} onClick={() => void handleDecision({ analytics: true, marketing: true })} size="md">
              Aceitar tudo
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
