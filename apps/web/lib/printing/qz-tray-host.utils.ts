'use client'

const LOCAL_QZ_HOSTS = ['localhost', '127.0.0.1', 'localhost.qz.io'] as const
const QZ_SECURE_PORTS = [8181, 8282, 8383, 8484] as const
const QZ_INSECURE_PORTS = [8182, 8283, 8384, 8485] as const

export const QZ_HOST_STORAGE_KEY = 'desk-imperial.qz-host'

export async function probeQzTrayHost(host: string, timeoutMs = 800): Promise<boolean> {
  const normalized = normalizeQzHost(host)
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    return false
  }

  const ports = window.location.protocol === 'https:' ? QZ_SECURE_PORTS : QZ_INSECURE_PORTS
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'

  return Promise.race(ports.map((port) => probeWebSocket(`${scheme}://${normalized}:${port}`, timeoutMs))).catch(
    () => false,
  )
}

export async function discoverQzHostsOnLan(baseHostHint?: string): Promise<string[]> {
  if (typeof window === 'undefined') {
    return []
  }

  const seeds = collectLanSeedHosts(baseHostHint)
  if (seeds.length === 0) {
    return []
  }

  const results = await Promise.all(seeds.map(async (seed) => ((await probeQzTrayHost(seed, 500)) ? seed : null)))
  return Array.from(new Set(results.filter((value): value is string => value !== null)))
}

export function getQzHost(): string {
  if (typeof window === 'undefined') {
    return 'localhost'
  }

  const stored = window.localStorage.getItem(QZ_HOST_STORAGE_KEY) ?? 'localhost'
  const normalized = normalizeQzHost(stored)
  if (normalized !== stored) {
    window.localStorage.setItem(QZ_HOST_STORAGE_KEY, normalized)
  }

  return normalized
}

export function setQzHost(host: string): string {
  const normalized = normalizeQzHost(host)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(QZ_HOST_STORAGE_KEY, normalized)
  }

  return normalized
}

export function normalizeQzHost(host: string): string {
  let trimmed = host.trim()
  const lowerTrimmed = trimmed.toLowerCase()

  for (const prefix of ['https://', 'http://', 'wss://', 'ws://']) {
    if (lowerTrimmed.startsWith(prefix)) {
      trimmed = trimmed.slice(prefix.length)
      break
    }
  }

  const pathSeparatorIndex = trimmed.indexOf('/')
  if (pathSeparatorIndex !== -1) {
    trimmed = trimmed.slice(0, pathSeparatorIndex)
  }

  const lastColonIndex = trimmed.lastIndexOf(':')
  if (lastColonIndex !== -1) {
    trimmed = trimmed.slice(0, lastColonIndex)
  }

  trimmed = trimmed.replace(/[^a-zA-Z0-9.-]/g, '')
  return trimmed || 'localhost'
}

export function buildQzHostCandidates(host: string) {
  const normalized = normalizeQzHost(host)
  if (isLocalQzHost(normalized)) {
    return [normalized]
  }

  return [normalized, 'localhost']
}

export function buildQzConnectionErrorMessage(host: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error ?? 'desconhecido')
  const looksBlockedByClient = /blocked by client|blocked: by client|net::ERR_BLOCKED_BY_CLIENT/i.test(detail)

  if (looksBlockedByClient) {
    return [
      'O navegador esta bloqueando a conexao com o QZ Tray (extensao de bloqueio ativa).',
      'Desative uBlock/AdGuard/Brave Shields para este site, ou libere websockets para localhost / localhost.qz.io.',
      `Detalhe: ${detail}`,
    ].join(' ')
  }

  if (!isLocalQzHost(host)) {
    return [
      `Nao foi possivel conectar ao QZ Tray em ${host}.`,
      'Se voce estiver neste PC, volte o host para localhost.',
      `Se voce estiver no celular, confirme o IP do PC e aceite o certificado em https://${host}:8181.`,
      `Detalhe: ${detail}`,
    ].join(' ')
  }

  return [
    `Nao foi possivel conectar ao QZ Tray em ${host}.`,
    'Confirme se o QZ Tray esta aberto, autorizado e com a impressora pareada neste PC.',
    `Detalhe: ${detail}`,
  ].join(' ')
}

function probeWebSocket(url: string, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    let settled = false
    let socket: WebSocket | null = null

    const finish = (value: boolean) => {
      if (settled) {
        return
      }

      settled = true
      try {
        socket?.close()
      } catch {
        // ignore
      }
      resolve(value)
    }

    try {
      socket = new WebSocket(url)
    } catch {
      finish(false)
      return
    }

    const timer = window.setTimeout(() => finish(false), timeoutMs)
    socket.onopen = () => {
      window.clearTimeout(timer)
      finish(true)
    }
    socket.onerror = () => {
      window.clearTimeout(timer)
      finish(false)
    }
  })
}

function collectLanSeedHosts(baseHostHint?: string): string[] {
  const hints = new Set<string>(['localhost', 'localhost.qz.io', '127.0.0.1'])
  const ipHint = baseHostHint && /^\d+\.\d+\.\d+\.\d+$/.test(baseHostHint) ? baseHostHint : null

  if (ipHint) {
    const prefix = ipHint.split('.').slice(0, 3).join('.')
    for (let index = 1; index <= 254; index += 1) {
      hints.add(`${prefix}.${index}`)
    }
  }

  return Array.from(hints)
}

function isLocalQzHost(host: string) {
  return LOCAL_QZ_HOSTS.includes(host as (typeof LOCAL_QZ_HOSTS)[number])
}
