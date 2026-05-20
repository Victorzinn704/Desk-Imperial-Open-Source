'use client'

import type { MutableRefObject, RefObject } from 'react'
import type { IScannerControls } from '@zxing/browser'

export type ScannerState = 'idle' | 'starting' | 'ready' | 'unsupported' | 'error'

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

type BrowserMultiFormatReaderDecode = (
  constraints: MediaStreamConstraints,
  previewElem: HTMLVideoElement,
  callbackFn: (result?: { getText: () => string }) => void,
) => Promise<IScannerControls>

type StartScannerOptions = Readonly<{
  cancelled: () => boolean
  onClose: () => void
  onDetected: (code: string) => void
  setMessage: (message: string) => void
  setState: (state: ScannerState) => void
  stopScanner: () => void
  streamRef: MutableRefObject<MediaStream | null>
  timerRef: MutableRefObject<number | null>
  videoRef: RefObject<HTMLVideoElement | null>
  zxingControlsRef: MutableRefObject<IScannerControls | null>
}>

type BarcodeDetectorScannerOptions = StartScannerOptions & Readonly<{ BarcodeDetector: BarcodeDetectorConstructor }>

const preferredBarcodeFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] as const
const cameraConstraintCandidates: readonly MediaStreamConstraints[] = [
  { audio: false, video: { facingMode: { exact: 'environment' } } },
  { audio: false, video: { facingMode: { ideal: 'environment' }, height: { ideal: 720 }, width: { ideal: 1280 } } },
  { audio: false, video: { facingMode: 'environment' } },
  { audio: false, video: true },
]

export async function startBarcodeScanner(options: StartScannerOptions) {
  const unavailableMessage = resolveCameraUnavailableMessage()
  if (unavailableMessage) {
    showScannerUnavailable(options, unavailableMessage)
    return
  }

  options.setState('starting')
  options.setMessage('Abrindo câmera traseira...')

  const BarcodeDetector = getBarcodeDetector()
  if (!BarcodeDetector) {
    await startZxingScanner(options)
    return
  }

  await startBarcodeDetectorScanner({ ...options, BarcodeDetector })
}

function resolveCameraUnavailableMessage() {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!(window.isSecureContext || isLocalhost)) {
    return 'A câmera do navegador exige HTTPS. Abra o Desk Imperial pelo endereço seguro do app.'
  }

  const canUseCamera = typeof navigator.mediaDevices?.getUserMedia === 'function'
  return canUseCamera ? null : 'A câmera não está disponível neste dispositivo. Continue com o fluxo manual.'
}

function showScannerUnavailable({ setMessage, setState }: StartScannerOptions, message: string) {
  setState('unsupported')
  setMessage(message)
}

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  const maybeDetector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
  return maybeDetector ?? null
}

async function startBarcodeDetectorScanner(options: BarcodeDetectorScannerOptions) {
  try {
    const detector = await createNativeBarcodeDetector(options.BarcodeDetector)
    const stream = await requestCameraStream()
    if (options.cancelled()) {
      stopMediaStream(stream)
      return
    }

    options.streamRef.current = stream
    const video = await attachStreamToVideo(options.videoRef, stream)
    if (!video || options.cancelled()) {
      return
    }

    options.setState('ready')
    options.setMessage('Aponte a câmera para o código de barras.')
    scheduleBarcodeDetectionLoop({ ...options, detector })
  } catch (error) {
    failCameraStart(options, error)
  }
}

async function createNativeBarcodeDetector(BarcodeDetector: BarcodeDetectorConstructor) {
  const supportedFormats = BarcodeDetector.getSupportedFormats ? await BarcodeDetector.getSupportedFormats() : []
  const formats = supportedFormats.length
    ? preferredBarcodeFormats.filter((format) => supportedFormats.includes(format))
    : [...preferredBarcodeFormats]

  return new BarcodeDetector({
    formats: formats.length > 0 ? [...formats] : undefined,
  })
}

async function attachStreamToVideo(videoRef: RefObject<HTMLVideoElement | null>, stream: MediaStream) {
  const video = videoRef.current
  if (!video) {
    stopMediaStream(stream)
    return null
  }

  video.srcObject = stream
  await video.play()
  return video
}

function scheduleBarcodeDetectionLoop(options: StartScannerOptions & { detector: BarcodeDetectorInstance }) {
  const scanFrame = async () => {
    if (options.cancelled()) {
      return
    }

    try {
      const detectedCode = await detectCodeFromCurrentFrame(options.detector, options.videoRef.current)
      if (detectedCode) {
        finishDetection(options, detectedCode)
        return
      }

      options.timerRef.current = window.setTimeout(() => void scanFrame(), 320)
    } catch {
      options.setState('error')
      options.setMessage(
        'A câmera abriu, mas a leitura não conseguiu decodificar o código. Tente aproximar ou melhorar a luz.',
      )
    }
  }

  options.timerRef.current = window.setTimeout(() => void scanFrame(), 320)
}

async function detectCodeFromCurrentFrame(detector: BarcodeDetectorInstance, video: HTMLVideoElement | null) {
  if (!video || video.readyState < 2) {
    return null
  }

  const barcodes = await detector.detect(video)
  return barcodes
    .map((result) => normalizeDetectedCode(result.rawValue))
    .find((value): value is string => Boolean(value))
}

function finishDetection({ onClose, onDetected, stopScanner }: StartScannerOptions, code: string) {
  stopScanner()
  onDetected(code)
  onClose()
}

async function startZxingScanner(options: StartScannerOptions) {
  const video = await waitForVideoElement(options.videoRef)
  if (!video) {
    options.setState('error')
    options.setMessage('A câmera não conseguiu montar a prévia de leitura. Continue com EAN manual ou leitor HID.')
    return
  }

  try {
    const reader = await createZxingReader()
    options.setMessage('Abrindo leitura compatível por câmera...')
    const controls = await decodeWithZxingCameraFallback(reader, video, (code) => finishZxingDetection(options, code))
    if (options.cancelled()) {
      controls.stop()
      return
    }

    options.zxingControlsRef.current = controls
    options.setState('ready')
    options.setMessage('Aponte a câmera para o código de barras.')
  } catch (error) {
    failCameraStart(options, error)
  }
}

async function createZxingReader() {
  const { BarcodeFormat, BrowserMultiFormatReader } = await import('@zxing/browser')
  const reader = new BrowserMultiFormatReader()
  reader.possibleFormats = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ]
  return reader
}

function finishZxingDetection(options: StartScannerOptions, code: string) {
  if (!options.cancelled()) {
    finishDetection(options, code)
  }
}

async function requestCameraStream() {
  let lastError: unknown = null

  for (const constraints of cameraConstraintCandidates) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      lastError = error
      if (isCameraPermissionDenied(error)) {
        break
      }
    }
  }

  throw lastError ?? new Error('Camera indisponivel.')
}

async function decodeWithZxingCameraFallback(
  reader: { decodeFromConstraints: BrowserMultiFormatReaderDecode },
  video: HTMLVideoElement,
  onDetected: (code: string) => void,
) {
  let lastError: unknown = null

  for (const constraints of cameraConstraintCandidates) {
    try {
      return await reader.decodeFromConstraints(constraints, video, (result) => {
        const detectedCode = normalizeDetectedCode(result?.getText())
        if (detectedCode) {
          onDetected(detectedCode)
        }
      })
    } catch (error) {
      lastError = error
      if (isCameraPermissionDenied(error)) {
        break
      }
    }
  }

  throw lastError ?? new Error('Leitura por camera indisponivel.')
}

function failCameraStart({ setMessage, setState, stopScanner }: StartScannerOptions, error: unknown) {
  setState('error')
  setMessage(buildCameraStartErrorMessage(error))
  stopScanner()
}

function normalizeDetectedCode(rawValue: string | null | undefined) {
  const digits = rawValue?.replace(/\D/g, '') ?? ''
  return digits.length > 0 ? digits : null
}

function isCameraPermissionDenied(error: unknown) {
  return error instanceof Error && /Permission|NotAllowed|Security/i.test(`${error.name} ${error.message}`)
}

function buildCameraStartErrorMessage(error: unknown) {
  if (isCameraPermissionDenied(error)) {
    return 'O acesso à câmera foi negado. Libere a câmera do navegador para usar a leitura nativa.'
  }

  return 'Não foi possível iniciar a câmera neste navegador. Tente Chrome Android/HTTPS ou continue com EAN manual.'
}

function stopMediaStream(stream: MediaStream) {
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

function waitForVideoElement(videoRef: RefObject<HTMLVideoElement | null>) {
  if (videoRef.current) {
    return Promise.resolve(videoRef.current)
  }

  return new Promise<HTMLVideoElement | null>((resolve) => {
    window.requestAnimationFrame(() => resolve(videoRef.current))
  })
}
