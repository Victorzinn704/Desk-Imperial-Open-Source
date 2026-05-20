import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveApiBaseUrl } from './api-base-url'

describe('resolveApiBaseUrl', () => {
  const env = process.env as Record<string, string | undefined>
  const originalApiUrl = env.NEXT_PUBLIC_API_URL
  const originalNodeEnv = env.NODE_ENV

  afterEach(() => {
    if (originalApiUrl === undefined) {
      env.NEXT_PUBLIC_API_URL = undefined
    } else {
      env.NEXT_PUBLIC_API_URL = originalApiUrl
    }

    if (originalNodeEnv === undefined) {
      env.NODE_ENV = undefined
    } else {
      env.NODE_ENV = originalNodeEnv
    }

    vi.unstubAllGlobals()
  })

  it('usa a URL configurada quando NEXT_PUBLIC_API_URL existe', () => {
    env.NEXT_PUBLIC_API_URL = 'https://api.example.com/'

    expect(resolveApiBaseUrl()).toBe('https://api.example.com')
  })

  it('cai para a API pública quando o env vem vazio no app publicado', () => {
    env.NEXT_PUBLIC_API_URL = ''
    env.NODE_ENV = 'production'
    vi.stubGlobal('window', {
      location: {
        hostname: 'app.deskimperial.online',
        protocol: 'https:',
        host: 'app.deskimperial.online',
      },
    })

    expect(resolveApiBaseUrl()).toBe('https://api.deskimperial.online')
  })

  it('usa localhost:4000 quando o app roda em localhost', () => {
    env.NEXT_PUBLIC_API_URL = ''
    env.NODE_ENV = 'development'
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        protocol: 'http:',
        host: 'localhost:3000',
      },
    })

    expect(resolveApiBaseUrl()).toBe('http://localhost:4000')
  })

  it('preserva 127.0.0.1 quando o app roda nesse host', () => {
    env.NEXT_PUBLIC_API_URL = ''
    env.NODE_ENV = 'development'
    vi.stubGlobal('window', {
      location: {
        hostname: '127.0.0.1',
        protocol: 'http:',
        host: '127.0.0.1:3000',
      },
    })

    expect(resolveApiBaseUrl()).toBe('http://127.0.0.1:4000')
  })
})
