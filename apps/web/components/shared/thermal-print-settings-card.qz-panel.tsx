'use client'

import { useCallback, useState } from 'react'
import { RefreshCw, Save, Wifi } from 'lucide-react'
import { discoverQzHostsOnLan, getQzHost, normalizeQzHost, setQzHost } from '@/lib/printing'

type QzHostPanelProps = Readonly<{
  onAfterSave: () => Promise<void>
}>

type QzHostInputRowProps = Readonly<{
  draft: string
  isDirty: boolean
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onSaveClick: () => void
}>

type QzHostScanButtonProps = Readonly<{
  onClick: () => void
  scanning: boolean
}>

type QzHostScanResultsProps = Readonly<{
  hosts: readonly string[]
  onSelectHost: (host?: string) => void
}>

type QzHostChipProps = Readonly<{
  host: string
  onSelectHost: (host?: string) => void
}>

export function QzHostPanel({ onAfterSave }: QzHostPanelProps) {
  const {
    draft,
    handleInputChange,
    handleInputKeyDown,
    handleSaveClick,
    handleScanClick,
    isDirty,
    saveHost,
    scanResults,
    scanning,
  } = useQzHostPanelState(onAfterSave)

  return (
    <div className="mt-2 grid gap-2 rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--surface)] p-2">
      <QzHostInputRow
        draft={draft}
        isDirty={isDirty}
        onInputChange={handleInputChange}
        onInputKeyDown={handleInputKeyDown}
        onSaveClick={handleSaveClick}
      />
      <QzHostScanButton scanning={scanning} onClick={handleScanClick} />
      {scanResults.length > 0 ? <QzHostScanResults hosts={scanResults} onSelectHost={saveHost} /> : null}
    </div>
  )
}

function useQzHostPanelState(onAfterSave: () => Promise<void>) {
  const [draft, setDraft] = useState(() => getQzHost())
  const [saved, setSaved] = useState(() => getQzHost())
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<string[]>([])
  const saveHost = useCallback(
    (value?: string) => {
      const host = setQzHost(value ?? draft)
      setDraft(host)
      setSaved(host)
      void onAfterSave()
    },
    [draft, onAfterSave],
  )
  const scanHosts = useCallback(async () => {
    setScanning(true)
    try {
      const found = await discoverQzHostsOnLan(saved)
      setScanResults(found)
    } finally {
      setScanning(false)
    }
  }, [saved])
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value)
  }, [])
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        saveHost()
      }
    },
    [saveHost],
  )
  const handleSaveClick = useCallback(() => saveHost(), [saveHost])
  const handleScanClick = useCallback(() => void scanHosts(), [scanHosts])

  return {
    draft,
    handleInputChange,
    handleInputKeyDown,
    handleSaveClick,
    handleScanClick,
    isDirty: normalizeQzHost(draft) !== saved,
    saveHost,
    scanResults,
    scanning,
  }
}

function QzHostInputRow({ draft, isDirty, onInputChange, onInputKeyDown, onSaveClick }: QzHostInputRowProps) {
  return (
    <div className="flex gap-2">
      <input
        className="min-w-0 flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        placeholder="ex: localhost ou 192.168.1.10"
        value={draft}
        onChange={onInputChange}
        onKeyDown={onInputKeyDown}
      />
      <button
        className={`flex shrink-0 items-center gap-1 rounded-[8px] border px-2 py-1 text-[11px] font-semibold ${
          isDirty
            ? 'border-[var(--accent)] bg-[rgba(0,140,255,0.1)] text-[var(--accent,#008cff)]'
            : 'border-[var(--border)] text-[var(--text-soft)]'
        }`}
        type="button"
        onClick={onSaveClick}
      >
        <Save className="size-3" />
        Salvar
      </button>
    </div>
  )
}

function QzHostScanButton({ onClick, scanning }: QzHostScanButtonProps) {
  return (
    <button
      className="flex h-8 items-center justify-center gap-1 rounded-[8px] border border-[var(--border)] text-[11px] font-semibold text-[var(--text-soft)] disabled:opacity-60"
      disabled={scanning}
      type="button"
      onClick={onClick}
    >
      {scanning ? <RefreshCw className="size-3 animate-spin" /> : <Wifi className="size-3" />}
      Procurar QZ na rede
    </button>
  )
}

function QzHostScanResults({ hosts, onSelectHost }: QzHostScanResultsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {hosts.map((host) => (
        <QzHostChip host={host} key={host} onSelectHost={onSelectHost} />
      ))}
    </div>
  )
}

function QzHostChip({ host, onSelectHost }: QzHostChipProps) {
  const handleClick = useCallback(() => {
    onSelectHost(host)
  }, [host, onSelectHost])

  return (
    <button
      className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]"
      type="button"
      onClick={handleClick}
    >
      {host}
    </button>
  )
}
