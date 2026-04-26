import { describe, expect, it } from 'vitest'
import type { Mesa } from '@/components/pdv/pdv-types'
import type { PendingAction, StaffMobileShellQueryScope } from './staff-mobile-shell-types'
import { buildStaffQueryEnablement } from './use-staff-mobile-shell-queries'

function buildScope(
  activeTab: StaffMobileShellQueryScope['activeTab'],
  pendingAction: PendingAction | null = null,
): StaffMobileShellQueryScope {
  return { activeTab, pendingAction }
}

describe('buildStaffQueryEnablement', () => {
  it('desliga tudo que depende de usuário quando o shell está desabilitado', () => {
    expect(buildStaffQueryEnablement(false, buildScope('mesas'))).toEqual({
      kitchen: false,
      operations: false,
      ordersHistory: false,
      products: false,
    })
  })

  it('mantém operações sempre ligadas quando o shell está ativo', () => {
    expect(buildStaffQueryEnablement(true, buildScope('mesas')).operations).toBe(true)
  })

  it('liga produtos e cozinha quando o fluxo de pedido está ativo', () => {
    const mesa: Mesa = {
      id: 'mesa-1',
      numero: '1',
      capacidade: 4,
      status: 'livre',
    }

    expect(buildStaffQueryEnablement(true, buildScope('pedido')).products).toBe(true)
    expect(buildStaffQueryEnablement(true, buildScope('pedido')).kitchen).toBe(true)
    expect(buildStaffQueryEnablement(true, buildScope('mesas', { type: 'new', mesa })).products).toBe(true)
    expect(buildStaffQueryEnablement(true, buildScope('mesas', { type: 'new', mesa })).kitchen).toBe(true)
  })

  it('liga histórico somente na aba de histórico', () => {
    expect(buildStaffQueryEnablement(true, buildScope('historico')).ordersHistory).toBe(true)
    expect(buildStaffQueryEnablement(true, buildScope('pedidos')).ordersHistory).toBe(false)
  })
})
