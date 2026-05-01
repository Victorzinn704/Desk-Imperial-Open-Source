import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveApiBaseUrl } from './api-base-url'

describe('resolveApiBaseUrl', () => {
  const env = process.env as Record<string, string | undefined>
  const originalApiUrl = env.NEXT_PUBLIC_API_URL
  const originalNodeEnv = env.NODE_ENV

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete env.NEXT_PUBLIC_API_URL
    } else {
      env.NEXT_PUBLIC_API_URL = originalApiUrl
    }

    if (originalNodeEnv === undefined) {
      delete env.NODE_ENV
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
})
