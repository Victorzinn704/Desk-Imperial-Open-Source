const LOCAL_API_BASE_URL = 'http://localhost:4000'
const PRODUCTION_API_BASE_URL = 'https://api.deskimperial.online'

function normalizeConfiguredApiBaseUrl(value: string | undefined) {
  const normalized = value?.trim()
  if (!normalized) {
    return null
  }

  return normalized.replace(/\/$/, '')
}

function resolveBrowserApiBaseUrl() {
  if (typeof window === 'undefined') {
    return null
  }

  const hostname = window.location.hostname.toLowerCase()

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return LOCAL_API_BASE_URL
  }

  if (hostname === 'app.deskimperial.online' || hostname.endsWith('.deskimperial.online')) {
    return PRODUCTION_API_BASE_URL
  }

  if (hostname.startsWith('app.')) {
    return `${window.location.protocol}//api.${hostname.slice(4)}`
  }

  return `${window.location.protocol}//${window.location.host}`
}

export function resolveApiBaseUrl() {
  const configured = normalizeConfiguredApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)
  if (configured) {
    return configured
  }

  const browserResolved = resolveBrowserApiBaseUrl()
  if (browserResolved) {
    return browserResolved
  }

  return process.env.NODE_ENV === 'production' ? PRODUCTION_API_BASE_URL : LOCAL_API_BASE_URL
}

export { LOCAL_API_BASE_URL, PRODUCTION_API_BASE_URL }
