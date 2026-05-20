'use client'

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { type ScannerState, startBarcodeScanner } from './owner-barcode-scanner.engine'
import { OwnerBarcodeScannerSheetView } from './owner-barcode-scanner-sheet.view'

type OwnerBarcodeScannerSheetProps = Readonly<{
  open: boolean
  onClose: () => void
  onDetected: (code: string) => void
}>

function useScannerResources() {
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const zxingControlsRef = useRef<IScannerControls | null>(null)

  return useMemo(() => ({ streamRef, timerRef, videoRef, zxingControlsRef }), [])
}

function stopScannerResources({
  streamRef,
  timerRef,
  videoRef,
  zxingControlsRef,
}: ReturnType<typeof useScannerResources>) {
  zxingControlsRef.current?.stop()
  zxingControlsRef.current = null

  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  for (const track of streamRef.current?.getTracks() ?? []) {
    track.stop()
  }
  streamRef.current = null

  if (videoRef.current) {
    videoRef.current.pause()
    videoRef.current.srcObject = null
  }
}

function useScannerTone(state: ScannerState) {
  return useMemo(() => {
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
}

function useOwnerBarcodeScannerController({ onClose, onDetected, open }: OwnerBarcodeScannerSheetProps) {
  const resources = useScannerResources()
  const [state, setState] = useState<ScannerState>('idle')
  const [message, setMessage] = useState('Abrindo câmera traseira...')
  const [attempt, setAttempt] = useState(0)
  const stopScanner = useCallback(() => stopScannerResources(resources), [resources])
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
    void startBarcodeScanner({
      cancelled: () => cancelled,
      onClose,
      onDetected,
      setMessage,
      setState,
      stopScanner,
      ...resources,
    })

    return () => {
      cancelled = true
      stopScanner()
    }
  }, [attempt, onClose, onDetected, open, resources, stopScanner])

  return {
    canRetry: state === 'error',
    handleClose,
    message,
    retryScanner: useCallback(() => setAttempt((value) => value + 1), []),
    sheetStyle: useMemo<CSSProperties>(
      () => ({ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }),
      [],
    ),
    showPreview: state === 'idle' || state === 'starting' || state === 'ready',
    state,
    toneClass: useScannerTone(state),
    videoRef: resources.videoRef,
  }
}

export function OwnerBarcodeScannerSheet(props: OwnerBarcodeScannerSheetProps) {
  const controller = useOwnerBarcodeScannerController(props)

  if (!props.open) {
    return null
  }

  return (
    <OwnerBarcodeScannerSheetView
      canRetry={controller.canRetry}
      message={controller.message}
      sheetStyle={controller.sheetStyle}
      showPreview={controller.showPreview}
      state={controller.state}
      toneClass={controller.toneClass}
      videoRef={controller.videoRef}
      onClose={controller.handleClose}
      onRetry={controller.retryScanner}
    />
  )
}
