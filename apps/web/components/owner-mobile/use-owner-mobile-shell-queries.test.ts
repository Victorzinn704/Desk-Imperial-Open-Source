import { describe, expect, it } from 'vitest'
import type { Mesa } from '@/components/pdv/pdv-types'
import { buildOwnerQueryEnablement, type OwnerMobileShellQueryScope } from './use-owner-mobile-shell-queries'

function buildScope(
  activeTab: OwnerMobileShellQueryScope['activeTab'],
  pdvView: OwnerMobileShellQueryScope['pdvView'] = 'mesas',
  pendingAction: OwnerMobileShellQueryScope['pendingAction'] = null,
): OwnerMobileShellQueryScope {
  return { activeTab, pdvView, pendingAction }
}

describe('buildOwnerQueryEnablement', () => {
  it('desliga tudo que depende de usuário quando o shell está desabilitado', () => {
    expect(buildOwnerQueryEnablement(false, buildScope('today'))).toEqual({
      finance: false,
      kitchen: false,
      operations: false,
      orders: false,
      products: false,
      summary: false,
    })
  })

  it('mantém cozinha aquecida no resumo e no PDV mobile', () => {
    expect(buildOwnerQueryEnablement(true, buildScope('today')).kitchen).toBe(true)
    expect(buildOwnerQueryEnablement(true, buildScope('pdv', 'mesas')).kitchen).toBe(true)
    expect(buildOwnerQueryEnablement(true, buildScope('pdv', 'cozinha')).kitchen).toBe(true)
  })

  it('mantém produtos e cozinha prontos durante uma ação pendente', () => {
    const mesa: Mesa = {
      capacidade: 4,
      id: 'mesa-1',
      numero: '1',
      status: 'livre',
    }

    const enablement = buildOwnerQueryEnablement(true, buildScope('comandas', 'mesas', { type: 'new', mesa }))

    expect(enablement.kitchen).toBe(true)
    expect(enablement.products).toBe(true)
  })

  it('liga consultas comerciais somente nas abas correspondentes', () => {
    expect(buildOwnerQueryEnablement(true, buildScope('today')).orders).toBe(true)
    expect(buildOwnerQueryEnablement(true, buildScope('today')).summary).toBe(true)
    expect(buildOwnerQueryEnablement(true, buildScope('financeiro')).finance).toBe(true)
    expect(buildOwnerQueryEnablement(true, buildScope('conta')).finance).toBe(false)
  })
})
