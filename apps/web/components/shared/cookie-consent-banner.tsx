'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Check, Cookie } from 'lucide-react'
import { updateCookiePreferences } from '@/lib/api'
import { type CookieConsentChoice, persistCookieConsent, readCookieConsentChoice } from '@/lib/cookie-consent'
import { Button } from '@/components/shared/button'

const DEFAULT_COOKIE_PREFERENCES: CookieConsentChoice = {
  analytics: false,
  marketing: false,
}

export function CookieConsentBanner() {
  const pathname = usePathname()
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
      title: 'Cookies no Desk Imperial',
      description: 'Essenciais ativos. Você escolhe análise e comunicação.',
    }),
    [],
  )

  if (!isReady || hasDecision) {
    return null
  }

  const bottomOffsetClass = pathname === '/app/owner' || pathname === '/app/staff'
    ? 'bottom-[6.25rem] sm:bottom-[6.75rem]'
    : 'bottom-4 sm:bottom-5'

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
    <section
      aria-labelledby="cookie-consent-title"
      aria-modal="false"
      className={`fixed left-1/2 z-[2147483645] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-3 py-2 shadow-[0_14px_34px_rgba(0,0,0,0.14)] ${bottomOffsetClass}`}
      data-testid="cookie-consent-banner"
      role="dialog"
      style={{ backdropFilter: 'blur(14px)' }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--accent)]">
              <Cookie className="size-3.5" />
            </span>
            <div>
              <h2 className="text-xs font-semibold text-[var(--text-primary)] sm:text-[13px]" id="cookie-consent-title">
                {content.title}
              </h2>
              <p className="sr-only">
                {content.description}
              </p>
            </div>
          </div>

          <div className="mt-2 flex shrink-0 flex-wrap items-center gap-1.5 sm:mt-0">
            <ConsentPreferenceChip
              active={preferences.analytics}
              disabled={isSubmitting}
              label="Análise"
              onClick={() => togglePreference('analytics')}
            />
            <ConsentPreferenceChip
              active={preferences.marketing}
              disabled={isSubmitting}
              label="Comunicação"
              onClick={() => togglePreference('marketing')}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:flex-nowrap sm:justify-end">
          <Button
            className="h-7 rounded-[7px] px-2.5 text-xs"
            loading={isSubmitting}
            size="sm"
            variant="secondary"
            onClick={() => void handleDecision({ analytics: false, marketing: false })}
          >
            Essenciais
          </Button>
          <Button
            className="h-7 rounded-[7px] px-2.5 text-xs"
            loading={isSubmitting}
            size="sm"
            variant="secondary"
            onClick={() => void handleDecision(preferences)}
          >
            Salvar
          </Button>
          <Button
            className="h-7 rounded-[7px] px-2.5 text-xs"
            loading={isSubmitting}
            size="sm"
            onClick={() => void handleDecision({ analytics: true, marketing: true })}
          >
            Aceitar
          </Button>
        </div>
      </div>
    </section>
  )
}

function ConsentPreferenceChip({
  active,
  disabled,
  label,
  onClick,
}: Readonly<{
  active: boolean
  disabled: boolean
  label: string
  onClick: () => void
}>) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex h-7 items-center gap-1.5 rounded-[7px] border px-2 text-[11px] transition-colors ${
        active
          ? 'border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--text-primary)]'
          : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]'
      }`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <span
        className={`inline-flex size-3.5 items-center justify-center rounded-[4px] border ${
          active
            ? 'border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface)] text-transparent'
        }`}
      >
        <Check className="size-2.5" />
      </span>
      {label}
    </button>
  )
}
