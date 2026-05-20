import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const publicDir = join(process.cwd(), 'public')

describe('owner PWA manifest and service worker', () => {
  it('abre o PWA direto no shell operacional do owner', () => {
    const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.json'), 'utf8')) as {
      id: string
      start_url: string
      scope: string
      display: string
    }

    expect(manifest.id).toBe('/app/owner')
    expect(manifest.start_url).toBe('/app/owner')
    expect(manifest.scope).toBe('/app/')
    expect(manifest.display).toBe('standalone')
  })

  it('mantem icones instalaveis referenciados pelo manifest', () => {
    const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.json'), 'utf8')) as {
      icons: Array<{ src: string; purpose?: string }>
    }

    for (const icon of manifest.icons) {
      expect(existsSync(join(publicDir, icon.src))).toBe(true)
    }
    expect(manifest.icons.some((icon) => icon.purpose?.includes('maskable'))).toBe(true)
  })

  it('usa network-first para navegacao e nao prende HTML antigo no cache', () => {
    const sw = readFileSync(join(publicDir, 'sw.js'), 'utf8')

    expect(sw).toContain("const CACHE_NAME = 'desk-imperial-v3'")
    expect(sw).toContain("event.request.mode === 'navigate'")
    expect(sw).toContain("event.respondWith(networkFirst(event.request, '/app/owner'))")
  })
})
