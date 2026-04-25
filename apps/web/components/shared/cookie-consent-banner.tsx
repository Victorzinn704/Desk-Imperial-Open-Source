'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Check, Cookie } from 'lucide-react'
import { updateCookiePreferences } from '@/lib/api'
import { type CookieConsentChoice, persistCookieConsent, readCookieConsentChoice } from '@/lib/cookie-consent'

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
      className={`fixed left-1/2 z-[2147483645] w-[min(360px,calc(100vw-24px))] -translate-x-1/2 rounded-[10px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-2.5 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.16)] ${bottomOffsetClass}`}
      data-testid="cookie-consent-banner"
      role="dialog"
      style={{ backdropFilter: 'blur(14px)' }}
    >
      <div className="grid gap-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--accent)]">
              <Cookie className="size-3.5" />
            </span>
            <div className="min-w-0">
              <h2
                className="truncate text-[12px] font-semibold leading-none text-[var(--text-primary)]"
                id="cookie-consent-title"
              >
                {content.title}
              </h2>
              <p className="sr-only">{content.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
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

        <div className="grid grid-cols-3 gap-1.5">
          <ConsentActionButton disabled={isSubmitting} onClick={() => void handleDecision({ analytics: false, marketing: false })}>
            Essenciais
          </ConsentActionButton>
          <ConsentActionButton disabled={isSubmitting} onClick={() => void handleDecision(preferences)}>
            Salvar
          </ConsentActionButton>
          <ConsentActionButton primary disabled={isSubmitting} onClick={() => void handleDecision({ analytics: true, marketing: true })}>
            Aceitar
          </ConsentActionButton>
        </div>
      </div>
    </section>
  )
}

function ConsentActionButton({
  children,
  disabled,
  onClick,
  primary = false,
}: Readonly<{
  children: ReactNode
  disabled: boolean
  onClick: () => void
  primary?: boolean
}>) {
  return (
    <button
      className={`h-8 rounded-[8px] px-2 text-[11px] font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
        primary
          ? 'bg-[var(--accent)] text-[var(--on-accent)]'
          : 'border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]'
      }`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
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
      className={`inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-[8px] border px-2 text-[11px] font-medium transition-colors ${
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
