import { describe, expect, it } from 'vitest'
import { buildOwnerMobileFullLabHref } from './owner-mobile-links'

describe('buildOwnerMobileFullLabHref', () => {
  it('marca rota do design-lab como tela completa solicitada pelo PWA', () => {
    expect(buildOwnerMobileFullLabHref('/design-lab/financeiro')).toBe(
      '/design-lab/financeiro?forceDesktop=1&from=owner-mobile',
    )
  })

  it('preserva tabs existentes e adiciona o bypass mobile', () => {
    expect(buildOwnerMobileFullLabHref('/design-lab/config?tab=security')).toBe(
      '/design-lab/config?tab=security&forceDesktop=1&from=owner-mobile',
    )
  })
})

