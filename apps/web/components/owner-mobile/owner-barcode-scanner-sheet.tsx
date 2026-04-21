'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, RefreshCcw, ScanLine, X } from 'lucide-react'

const preferredBarcodeFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] as const

type BarcodeDetectorResult = {
  rawValue?: string | null
}

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>
}

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance
  getSupportedFormats?: () => Promise<string[]>
}

type ScannerState = 'idle' | 'starting' | 'ready' | 'unsupported' | 'error'

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  if (typeof window === 'undefined') {
    return null
  }

  const maybeDetector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
  return maybeDetector ?? null
}

function normalizeDetectedCode(rawValue: string | null | undefined) {
  const digits = rawValue?.replace(/\D/g, '') ?? ''
  return digits.length > 0 ? digits : null
}

export function OwnerBarcodeScannerSheet({
  open,
  onClose,
  onDetected,
}: Readonly<{
  open: boolean
  onClose: () => void
  onDetected: (code: string) => void
}>) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const [state, setState] = useState<ScannerState>('idle')
  const [message, setMessage] = useState('Abrindo câmera traseira...')
  const [attempt, setAttempt] = useState(0)

  const stopScanner = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }
  }, [])

  const handleClose = useCallback(() => {
    stopScanner()
    onClose()
  }, [onClose, stopScanner])

  useEffect(() => {
    if (!open) {
      stopScanner()
      return
    }

    let cancelled = false

    async function startScanner() {
      const BarcodeDetector = getBarcodeDetector()
      if (!BarcodeDetector) {
        setState('unsupported')
        setMessage('Este navegador ainda não oferece leitura nativa por câmera. Continue com EAN manual ou leitor HID.')
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unsupported')
        setMessage('A câmera não está disponível neste dispositivo. Continue com o fluxo manual.')
        return
      }

      setState('starting')
      setMessage('Abrindo câmera traseira...')

      try {
        const supportedFormats = BarcodeDetector.getSupportedFormats
          ? await BarcodeDetector.getSupportedFormats()
          : []
        const formats = supportedFormats.length
          ? preferredBarcodeFormats.filter((format) => supportedFormats.includes(format))
          : [...preferredBarcodeFormats]
        const detector = new BarcodeDetector({
          formats: formats.length > 0 ? [...formats] : undefined,
        })
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (cancelled) {
          for (const track of stream.getTracks()) {
            track.stop()
          }
          return
        }

        streamRef.current = stream

        const video = videoRef.current
        if (!video) {
          stopScanner()
          return
        }

        video.srcObject = stream
        await video.play()

        if (cancelled) {
          return
        }

        setState('ready')
        setMessage('Aponte a câmera para o código de barras.')

        const scanFrame = async () => {
          if (cancelled) {
            return
          }

          try {
            const currentVideo = videoRef.current
            if (currentVideo && currentVideo.readyState >= 2) {
              const barcodes = await detector.detect(currentVideo)
              const detectedCode = barcodes
                .map((result) => normalizeDetectedCode(result.rawValue))
                .find((value): value is string => Boolean(value))

              if (detectedCode) {
                stopScanner()
                onDetected(detectedCode)
                onClose()
                return
              }
            }

            timerRef.current = window.setTimeout(scanFrame, 320)
          } catch {
            setState('error')
            setMessage('A câmera abriu, mas a leitura não conseguiu decodificar o código. Tente aproximar ou melhorar a luz.')
          }
        }

        timerRef.current = window.setTimeout(scanFrame, 320)
      } catch (error) {
        const fallbackMessage =
          error instanceof Error && /Permission|NotAllowed/i.test(error.name + error.message)
            ? 'O acesso à câmera foi negado. Libere a câmera do navegador para usar a leitura nativa.'
            : 'Não foi possível iniciar a câmera traseira neste momento. Continue com EAN manual ou leitor HID.'
        setState('error')
        setMessage(fallbackMessage)
        stopScanner()
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      stopScanner()
    }
  }, [attempt, onClose, onDetected, open, stopScanner])

  const canRetry = state === 'error'
  const showPreview = state === 'starting' || state === 'ready'
  const toneClass = useMemo(() => {
    if (state === 'ready') {
      return 'border-[rgba(54,245,124,0.22)] bg-[rgba(54,245,124,0.08)] text-[#36f57c]'
    }
    if (state === 'unsupported') {
      return 'border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.08)] text-[#fbbf24]'
    }
    if (state === 'error') {
      return 'border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] text-[#fca5a5]'
    }
    return 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]'
  }, [state])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/70" role="presentation">
      <button
        aria-label="Fechar leitura por câmera"
        className="absolute inset-0 border-0 bg-transparent p-0"
        type="button"
        onClick={handleClose}
      />

      <section
        aria-labelledby="owner-barcode-scanner-title"
        aria-modal="true"
        className="relative z-[1] w-full rounded-t-[28px] border border-[var(--border)] bg-[var(--bg)] px-4 pb-5 pt-4 shadow-2xl"
        role="dialog"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Scanner móvel</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]" id="owner-barcode-scanner-title">
              Ler código pela câmera
            </h2>
          </div>
          <button
            aria-label="Fechar scanner"
            className="inline-flex size-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
            type="button"
            onClick={handleClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {showPreview ? (
            <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-black">
              <div className="relative aspect-[3/4] w-full bg-black">
                <video
                  autoPlay
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  ref={videoRef}
                />
                <div className="pointer-events-none absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-[22px] border border-[rgba(255,255,255,0.72)] px-3 py-12 shadow-[0_0_0_9999px_rgba(0,0,0,0.24)]">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    <ScanLine className="size-3.5" />
                    enquadre o código
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 text-center">
              <div className="space-y-3">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]">
                  {state === 'unsupported' ? <CameraOff className="size-6" /> : <Camera className="size-6" />}
                </span>
                <p className="text-sm leading-6 text-[var(--text-soft)]">{message}</p>
              </div>
            </div>
          )}

          <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${toneClass}`}>{message}</div>

          <div className="flex items-center gap-2">
            {canRetry ? (
              <button
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-[rgba(0,140,255,0.28)] bg-[rgba(0,140,255,0.08)] px-4 text-sm font-semibold text-[var(--accent,#008cff)]"
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                <RefreshCcw className="size-4" />
                Tentar novamente
              </button>
            ) : null}
            <button
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)]"
              type="button"
              onClick={handleClose}
            >
              Voltar ao EAN
            </button>
          </div>

          <p className="text-[11px] leading-5 text-[var(--text-soft)]">
            Android/Chrome tende a funcionar melhor aqui. Em navegadores sem leitura nativa, o fluxo continua por EAN manual ou leitor HID.
          </p>
        </div>
      </section>
    </div>
  )
}
