'use client'

import type { CSSProperties, RefObject } from 'react'
import { Camera, CameraOff, RefreshCcw, ScanLine, X } from 'lucide-react'
import type { ScannerState } from './owner-barcode-scanner.engine'

type OwnerBarcodeScannerSheetViewProps = Readonly<{
  canRetry: boolean
  message: string
  onClose: () => void
  onRetry: () => void
  sheetStyle: CSSProperties
  showPreview: boolean
  state: ScannerState
  toneClass: string
  videoRef: RefObject<HTMLVideoElement | null>
}>

export function OwnerBarcodeScannerSheetView(props: OwnerBarcodeScannerSheetViewProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/70" role="presentation">
      <button
        aria-label="Fechar leitura por câmera"
        className="absolute inset-0 border-0 bg-transparent p-0"
        type="button"
        onClick={props.onClose}
      />
      <ScannerDialog {...props} />
    </div>
  )
}

function ScannerDialog({
  canRetry,
  message,
  onClose,
  onRetry,
  sheetStyle,
  showPreview,
  state,
  toneClass,
  videoRef,
}: OwnerBarcodeScannerSheetViewProps) {
  return (
    <section
      aria-labelledby="owner-barcode-scanner-title"
      aria-modal="true"
      className="relative z-[1] w-full rounded-t-[28px] border border-[var(--border)] bg-[var(--bg)] px-4 pb-5 pt-4 shadow-2xl"
      role="dialog"
      style={sheetStyle}
    >
      <ScannerHeader onClose={onClose} />
      <div className="mt-4 space-y-3">
        <ScannerBody message={message} showPreview={showPreview} state={state} videoRef={videoRef} />
        <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${toneClass}`}>{message}</div>
        <ScannerActions canRetry={canRetry} onClose={onClose} onRetry={onRetry} />
        <ScannerHelpText />
      </div>
    </section>
  )
}

function ScannerHeader({ onClose }: Readonly<{ onClose: () => void }>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
          Scanner móvel
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]" id="owner-barcode-scanner-title">
          Ler código pela câmera
        </h2>
      </div>
      <button
        aria-label="Fechar scanner"
        className="inline-flex size-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
        type="button"
        onClick={onClose}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function ScannerBody({
  message,
  showPreview,
  state,
  videoRef,
}: Readonly<{
  message: string
  showPreview: boolean
  state: ScannerState
  videoRef: RefObject<HTMLVideoElement | null>
}>) {
  return showPreview ? <ScannerPreview videoRef={videoRef} /> : <ScannerFallback message={message} state={state} />
}

function ScannerPreview({ videoRef }: Readonly<{ videoRef: RefObject<HTMLVideoElement | null> }>) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-black">
      <div className="relative aspect-[3/4] w-full bg-black">
        <video autoPlay muted playsInline className="h-full w-full object-cover" ref={videoRef} />
        <div className="pointer-events-none absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-[22px] border border-[rgba(255,255,255,0.72)] px-3 py-12 shadow-[0_0_0_9999px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            <ScanLine className="size-3.5" />
            enquadre o código
          </div>
        </div>
      </div>
    </div>
  )
}

function ScannerFallback({ message, state }: Readonly<{ message: string; state: ScannerState }>) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 text-center">
      <div className="space-y-3">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]">
          {state === 'unsupported' ? <CameraOff className="size-6" /> : <Camera className="size-6" />}
        </span>
        <p className="text-sm leading-6 text-[var(--text-soft)]">{message}</p>
      </div>
    </div>
  )
}

function ScannerActions({
  canRetry,
  onClose,
  onRetry,
}: Readonly<{
  canRetry: boolean
  onClose: () => void
  onRetry: () => void
}>) {
  return (
    <div className="flex items-center gap-2">
      {canRetry ? <RetryButton onRetry={onRetry} /> : null}
      <button
        className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)]"
        type="button"
        onClick={onClose}
      >
        Voltar ao EAN
      </button>
    </div>
  )
}

function RetryButton({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <button
      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-[rgba(0,140,255,0.28)] bg-[rgba(0,140,255,0.08)] px-4 text-sm font-semibold text-[var(--accent,#008cff)]"
      type="button"
      onClick={onRetry}
    >
      <RefreshCcw className="size-4" />
      Tentar novamente
    </button>
  )
}

function ScannerHelpText() {
  return (
    <p className="text-[11px] leading-5 text-[var(--text-soft)]">
      Android/Chrome tende a funcionar melhor aqui. Em navegadores sem leitura nativa, o fluxo continua por EAN manual
      ou leitor HID.
    </p>
  )
}
