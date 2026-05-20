'use client'

import { useCallback, useState } from 'react'
import { Bluetooth, Cable, CheckCircle2, Printer, RefreshCw, Usb } from 'lucide-react'
import {
  getPreferredThermalProvider,
  isProviderSupported,
  listSupportedProviders,
  setPreferredThermalProvider,
  type ThermalPrintProvider,
} from '@/lib/printing'
import {
  ALL_PROVIDERS,
  getMessageToneClass,
  getProviderHint,
  getProviderLabel,
  getProviderShortLabel,
  getUnsupportedReason,
  type RouteController,
  type RouteState,
  useRouteController,
} from './thermal-print-settings-card.model'
import { QzHostPanel } from './thermal-print-settings-card.qz-panel'

type ThermalPrintSettingsCardProps = Readonly<{
  compact?: boolean
  enabledProviders?: readonly ThermalPrintProvider[]
}>

export function ThermalPrintSettingsCard({
  compact = false,
  enabledProviders = ALL_PROVIDERS,
}: ThermalPrintSettingsCardProps) {
  return (
    <section className={resolveShellClass(compact)}>
      <CardHeader />
      {enabledProviders.map((provider) => (
        <ProviderRow key={provider} provider={provider} />
      ))}
      {enabledProviders.length > 1 ? <PreferredProviderPicker /> : null}
    </section>
  )
}

function CardHeader() {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(0,140,255,0.24)] bg-[rgba(0,140,255,0.1)] text-[var(--accent,#008cff)]">
        <Printer className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
          Impressao termica
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Multi-rota com fallback</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
          Conecte uma ou mais rotas. Se a preferida falhar, o sistema tenta as outras automaticamente.
        </p>
      </div>
    </div>
  )
}

function ProviderRow({ provider }: { provider: ThermalPrintProvider }) {
  const supported = isProviderSupported(provider)
  const controller = useRouteController(provider)
  const handleAfterSave = useCallback(() => controller.test(), [controller])

  return (
    <div className="mt-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)]">
          {getProviderIcon(provider)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{getProviderLabel(provider)}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-soft)]">{getProviderHint(provider)}</p>
        </div>
        <RouteStateBadge state={controller.state} supported={supported} />
      </div>
      {provider === 'QZ_TRAY' ? <QzHostPanel onAfterSave={handleAfterSave} /> : null}
      {supported ? <RouteActions controller={controller} /> : <UnsupportedHint provider={provider} />}
      {controller.message ? (
        <p className={`mt-2 text-[11px] leading-5 ${getMessageToneClass(controller.state)}`}>{controller.message}</p>
      ) : null}
    </div>
  )
}

function RouteActions({ controller }: { controller: RouteController }) {
  const showPair = controller.provider !== 'QZ_TRAY'
  const handlePair = useCallback(() => {
    void controller.pair()
  }, [controller])
  const handleTest = useCallback(() => {
    void controller.test()
  }, [controller])
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {showPair ? (
        <button
          className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[var(--accent)] bg-[rgba(0,140,255,0.1)] text-[11px] font-semibold text-[var(--accent,#008cff)] disabled:opacity-60"
          disabled={controller.state === 'pairing'}
          type="button"
          onClick={handlePair}
        >
          {controller.state === 'pairing' ? <RefreshCw className="size-3.5 animate-spin" /> : null}
          Conectar
        </button>
      ) : null}
      <button
        className={`flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] text-[11px] font-semibold text-[var(--text-primary)] disabled:opacity-60 ${
          showPair ? '' : 'col-span-2'
        }`}
        disabled={controller.state === 'testing'}
        type="button"
        onClick={handleTest}
      >
        {controller.state === 'testing' ? <RefreshCw className="size-3.5 animate-spin" /> : null}
        Testar
      </button>
    </div>
  )
}

function UnsupportedHint({ provider }: { provider: ThermalPrintProvider }) {
  return (
    <p className="mt-2 rounded-[10px] border border-dashed border-[var(--border)] px-2 py-1.5 text-[11px] leading-4 text-[var(--text-soft)]">
      {getUnsupportedReason(provider)}
    </p>
  )
}

function RouteStateBadge({ state, supported }: { state: RouteState; supported: boolean }) {
  if (!supported) {
    return (
      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
        indisponivel
      </span>
    )
  }
  if (state === 'ok') {
    return (
      <span className="flex items-center gap-1 rounded-full border border-[rgba(54,245,124,0.4)] bg-[rgba(54,245,124,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#36f57c]">
        <CheckCircle2 className="size-3" />
        pronto
      </span>
    )
  }
  if (state === 'error') {
    return (
      <span className="rounded-full border border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#fca5a5]">
        falha
      </span>
    )
  }
  if (state === 'testing' || state === 'pairing') {
    return (
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
        testando
      </span>
    )
  }
  return (
    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
      aguardando
    </span>
  )
}

function PreferredProviderPicker() {
  const [providers] = useState<ThermalPrintProvider[]>(() =>
    typeof window === 'undefined' ? [] : listSupportedProviders(),
  )
  const [preferred, setPreferred] = useState<ThermalPrintProvider>(() =>
    typeof window === 'undefined' ? 'QZ_TRAY' : getPreferredThermalProvider(),
  )

  const choose = useCallback((provider: ThermalPrintProvider) => {
    setPreferred(provider)
    setPreferredThermalProvider(provider)
  }, [])

  if (providers.length <= 1) {
    return null
  }

  return (
    <div className="mt-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Rota preferida</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {providers.map((provider) => (
          <PreferredProviderButton key={provider} preferred={preferred} provider={provider} onChoose={choose} />
        ))}
      </div>
    </div>
  )
}

function PreferredProviderButton({
  onChoose,
  preferred,
  provider,
}: {
  onChoose: (provider: ThermalPrintProvider) => void
  preferred: ThermalPrintProvider
  provider: ThermalPrintProvider
}) {
  const handleClick = useCallback(() => {
    onChoose(provider)
  }, [onChoose, provider])

  return (
    <button
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
        provider === preferred
          ? 'border-[var(--accent)] bg-[rgba(0,140,255,0.12)] text-[var(--accent,#008cff)]'
          : 'border-[var(--border)] text-[var(--text-soft)]'
      }`}
      type="button"
      onClick={handleClick}
    >
      {getProviderShortLabel(provider)}
    </button>
  )
}

function getProviderIcon(provider: ThermalPrintProvider) {
  switch (provider) {
    case 'WEB_BLUETOOTH':
      return <Bluetooth className="size-4" />
    case 'WEB_SERIAL':
      return <Cable className="size-4" />
    case 'WEB_USB':
      return <Usb className="size-4" />
    default:
      return <Printer className="size-4" />
  }
}

function resolveShellClass(compact: boolean) {
  return compact
    ? 'rounded-[14px] border border-[var(--border)] p-3'
    : 'rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4'
}
