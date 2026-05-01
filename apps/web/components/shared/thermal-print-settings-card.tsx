'use client'

import { useState } from 'react'
import { Printer, RefreshCw, Save } from 'lucide-react'
import {
  getPreferredThermalProvider,
  getQzHost,
  normalizeQzHost,
  resolveThermalPrinterSelection,
  setQzHost,
} from '@/lib/printing'

type TestState = 'idle' | 'testing' | 'ok' | 'error'
type ThermalPrintSettingsController = ReturnType<typeof useThermalPrintSettings>

type ThermalPrintSettingsCardProps = Readonly<{
  compact?: boolean
}>

export function ThermalPrintSettingsCard({ compact = false }: ThermalPrintSettingsCardProps) {
  const controller = useThermalPrintSettings()

  return (
    <section className={resolveShellClass(compact)}>
      <ThermalPrintHeader />
      <ThermalPrintHostField controller={controller} />
      <ThermalPrintStatusMessage message={controller.message} state={controller.state} />
    </section>
  )
}

function useThermalPrintSettings() {
  const initialHost = getQzHost()
  const [draft, setDraft] = useState(initialHost)
  const [saved, setSaved] = useState(initialHost)
  const [state, setState] = useState<TestState>('idle')
  const [message, setMessage] = useState('')

  function saveHost() {
    const host = setQzHost(draft)
    setDraft(host)
    setSaved(host)
    setState('idle')
    setMessage(host === 'localhost' ? 'Usando QZ Tray neste computador.' : `Celular apontando para ${host}.`)
    return host
  }

  async function testConnection() {
    const host = saveHost()
    setState('testing')
    setMessage(`Testando QZ Tray em ${host}...`)
    await resolveConnectionTest(setState, setMessage)
  }

  return {
    draft,
    isDirty: normalizeQzHost(draft) !== saved,
    message,
    saveHost,
    setDraft,
    state,
    testConnection,
  }
}

function ThermalPrintHeader() {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(0,140,255,0.24)] bg-[rgba(0,140,255,0.1)] text-[var(--accent,#008cff)]">
        <Printer className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
          Impressao no celular
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">QZ Tray da rede</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
          No celular, informe o IP do computador que esta com QZ Tray aberto e a YYX0808 pareada.
        </p>
      </div>
    </div>
  )
}

function ThermalPrintHostField({ controller }: { controller: ThermalPrintSettingsController }) {
  return (
    <div className="mt-3 grid gap-2">
      <input
        className="h-11 w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        inputMode="decimal"
        placeholder="Ex: 192.168.1.10"
        value={controller.draft}
        onChange={(event) => controller.setDraft(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && controller.saveHost()}
      />
      <ThermalPrintActions controller={controller} />
    </div>
  )
}

function ThermalPrintActions({ controller }: { controller: ThermalPrintSettingsController }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button className={resolveSaveButtonClass(controller.isDirty)} type="button" onClick={controller.saveHost}>
        <Save className="size-3.5" />
        Salvar
      </button>
      <button
        className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] transition active:scale-[0.98] disabled:opacity-60"
        disabled={controller.state === 'testing'}
        type="button"
        onClick={() => void controller.testConnection()}
      >
        <RefreshCw className={`size-3.5 ${controller.state === 'testing' ? 'animate-spin' : ''}`} />
        Testar
      </button>
    </div>
  )
}

async function resolveConnectionTest(setState: (state: TestState) => void, setMessage: (message: string) => void) {
  try {
    const selection = await resolveThermalPrinterSelection(getPreferredThermalProvider())
    if (!selection.printerId) {
      throw new Error('QZ Tray respondeu, mas nenhuma impressora foi encontrada.')
    }
    setState('ok')
    setMessage(`Pronto: ${selection.printer?.name ?? selection.printerId}`)
  } catch (error) {
    setState('error')
    setMessage(error instanceof Error ? error.message : 'Nao foi possivel conectar ao QZ Tray.')
  }
}

function ThermalPrintStatusMessage({ message, state }: { message: string; state: TestState }) {
  return message ? <p className={`mt-2 text-xs leading-5 ${resolveMessageClass(state)}`}>{message}</p> : null
}

function resolveShellClass(compact: boolean) {
  return compact
    ? 'rounded-[14px] border border-[var(--border)] p-3'
    : 'rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4'
}

function resolveSaveButtonClass(isDirty: boolean) {
  return [
    'flex h-11 items-center justify-center gap-2 rounded-[12px] border text-xs font-semibold transition active:scale-[0.98]',
    isDirty
      ? 'border-[var(--accent)] bg-[rgba(0,140,255,0.12)] text-[var(--accent,#008cff)]'
      : 'border-[var(--border)] text-[var(--text-soft)]',
  ].join(' ')
}

function resolveMessageClass(state: TestState) {
  if (state === 'ok') {
    return 'text-[#36f57c]'
  }
  if (state === 'error') {
    return 'text-[#fca5a5]'
  }
  return 'text-[var(--text-soft)]'
}
