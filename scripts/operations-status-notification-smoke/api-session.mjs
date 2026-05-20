import { SMOKE_CONFIG } from './config.mjs'

const SESSION_COOKIE_NAMES = new Set(['__Host-partner_session', 'partner_session'])

export class ApiSession {
  constructor(name) {
    this.name = name
    this.cookies = []
    this.csrfToken = ''
    this.sessionToken = ''
  }

  async loginDemo(loginMode, employeeCode) {
    return this.request('/auth/demo', {
      method: 'POST',
      body: JSON.stringify(loginMode === 'STAFF' ? { employeeCode, loginMode } : { loginMode }),
    })
  }

  async request(path, options = {}) {
    const response = await fetch(`${SMOKE_CONFIG.apiBaseUrl}${path}`, {
      ...options,
      headers: this.buildHeaders(options),
    })
    this.captureCookies(response)

    const payload = await readResponsePayload(response)
    this.captureCsrfToken(payload)
    assertSuccessfulResponse({ path, payload, response, sessionName: this.name, method: options.method })

    return payload
  }

  buildHeaders(options) {
    const headers = new Headers(options.headers ?? {})
    if (this.cookies.length > 0) {
      headers.set('cookie', this.cookies.join('; '))
    }
    if (options.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
    if (isStateChangingMethod(options.method) && this.csrfToken) {
      headers.set('x-csrf-token', this.csrfToken)
    }
    return headers
  }

  captureCookies(response) {
    for (const setCookie of readSetCookies(response)) {
      this.captureCookie(setCookie)
    }
  }

  captureCookie(setCookie) {
    const keyValue = setCookie.split(';')[0]
    const separatorIndex = keyValue.indexOf('=')
    if (separatorIndex <= 0) {
      return
    }

    const cookieName = keyValue.slice(0, separatorIndex)
    const cookieValue = keyValue.slice(separatorIndex + 1)
    this.cookies = this.cookies.filter((entry) => !entry.startsWith(`${cookieName}=`))
    this.cookies.push(keyValue)

    if (SESSION_COOKIE_NAMES.has(cookieName)) {
      this.sessionToken = cookieValue
    }
  }

  captureCsrfToken(payload) {
    if (hasStringField(payload, 'csrfToken')) {
      this.csrfToken = payload.csrfToken
    }
  }
}

function readSetCookies(response) {
  return typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
}

async function readResponsePayload(response) {
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? response.json() : response.text()
}

function isStateChangingMethod(method) {
  return Boolean(method && method !== 'GET')
}

function assertSuccessfulResponse({ path, payload, response, sessionName, method }) {
  if (response.ok) {
    return
  }

  throw new Error(`${sessionName} ${method ?? 'GET'} ${path} falhou (${response.status}): ${formatApiError(payload)}`)
}

function formatApiError(payload) {
  return hasMessageField(payload) ? JSON.stringify(payload.message) : JSON.stringify(payload)
}

function hasMessageField(payload) {
  return isObject(payload) && 'message' in payload
}

function hasStringField(payload, fieldName) {
  return isObject(payload) && fieldName in payload && typeof payload[fieldName] === 'string'
}

function isObject(value) {
  return Boolean(value && typeof value === 'object')
}
