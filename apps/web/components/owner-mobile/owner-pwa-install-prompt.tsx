'use client'

import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'desk-owner-pwa-install-dismissed'

function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return true
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function isMobileSafari() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const ua = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/crios|fxios|edgios/.test(ua)
}

function isDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function dismissPrompt() {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // sessionStorage pode estar bloqueado em alguns webviews; neste caso o estado React ainda fecha o aviso.
  }
}

export function OwnerPwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandaloneDisplay() || isDismissed()) {
      return
    }

    const iosHintAvailable = isMobileSafari()
    const raf = window.requestAnimationFrame(() => {
      setShowIosHint(iosHintAvailable)
      setVisible(iosHintAvailable)
    })

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [])

  if (!visible || (!installEvent && !showIosHint)) {
    return null
  }

  const label = installEvent ? 'Instalar app' : 'Adicionar à tela inicial'
  const description = installEvent
    ? 'Use o Desk como app, com entrada direta no operacional.'
    : 'No iPhone, toque em compartilhar e depois em Adicionar à Tela de Início.'

  return (
    <OwnerPwaInstallPromptCard
      description={description}
      installEvent={installEvent}
      label={label}
      setInstallEvent={setInstallEvent}
      setVisible={setVisible}
    />
  )
}

function OwnerPwaInstallPromptCard({
  description,
  installEvent,
  label,
  setInstallEvent,
  setVisible,
}: Readonly<{
  description: string
  installEvent: BeforeInstallPromptEvent | null
  label: string
  setInstallEvent: (value: BeforeInstallPromptEvent | null) => void
  setVisible: (value: boolean) => void
}>) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 px-3"
      style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <section className="pointer-events-auto mx-auto max-w-[360px] rounded-[18px] border border-[rgba(0,140,255,0.24)] bg-[color-mix(in_srgb,var(--surface)_88%,rgba(0,140,255,0.12))] p-3 text-[var(--text-primary)] shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[rgba(0,140,255,0.16)] text-[var(--accent,#008cff)]">
            <Download className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{label}</p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{description}</p>
            <InstallButton installEvent={installEvent} setInstallEvent={setInstallEvent} setVisible={setVisible} />
          </div>
          <DismissButton setVisible={setVisible} />
        </div>
      </section>
    </div>
  )
}

function InstallButton({
  installEvent,
  setInstallEvent,
  setVisible,
}: Readonly<{
  installEvent: BeforeInstallPromptEvent | null
  setInstallEvent: (value: BeforeInstallPromptEvent | null) => void
  setVisible: (value: boolean) => void
}>) {
  if (!installEvent) {
    return null
  }

  return (
    <button
      className="mt-2 rounded-xl bg-[var(--accent,#008cff)] px-3 py-2 text-[11px] font-semibold text-white active:scale-[0.98]"
      type="button"
      onClick={() => void promptInstall(installEvent, setInstallEvent, setVisible)}
    >
      Abrir como app
    </button>
  )
}

function DismissButton({ setVisible }: Readonly<{ setVisible: (value: boolean) => void }>) {
  return (
    <button
      aria-label="Ocultar aviso de instalação"
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-soft,#7a8896)] active:bg-[var(--surface-muted)]"
      type="button"
      onClick={() => {
        dismissPrompt()
        setVisible(false)
      }}
    >
      <X className="size-4" />
    </button>
  )
}

async function promptInstall(
  installEvent: BeforeInstallPromptEvent,
  setInstallEvent: (value: BeforeInstallPromptEvent | null) => void,
  setVisible: (value: boolean) => void,
) {
  await installEvent.prompt()
  const choice = await installEvent.userChoice
  if (choice.outcome === 'accepted') {
    dismissPrompt()
    setVisible(false)
  }
  setInstallEvent(null)
}
