import { describe, expect, it } from 'vitest'
import {
  buildOperationsExecutiveKpis,
  buildPerformerKpis,
  buildPerformerRanking,
  buildTopProducts,
  countKitchenPendingItems,
} from './operations-kpis'
import { buildOperationsSnapshot } from '@/test/operations-fixtures'

describe('operations-kpis', () => {
  const snapshot = buildOperationsSnapshot({
    closure: {
      grossRevenueAmount: 320,
      realizedProfitAmount: 140,
      expectedCashAmount: 500,
      openComandasCount: 2,
      openSessionsCount: 1,
    },
    employees: [
      {
        employeeId: 'emp-1',
        employeeCode: 'E01',
        displayName: 'Marina',
        comandas: [
          {
            id: 'c-1',
            status: 'CLOSED',
            tableLabel: '1',
            totalAmount: 120,
            openedAt: '2026-03-28T10:00:00.000Z',
            items: [{ id: 'i-1', productName: 'Pão de queijo', quantity: 2, unitPrice: 20, kitchenStatus: 'READY' }],
          },
          {
            id: 'c-2',
            status: 'OPEN',
            tableLabel: '2',
            totalAmount: 80,
            openedAt: '2026-03-28T11:00:00.000Z',
            items: [{ id: 'i-2', productName: 'Café', quantity: 1, unitPrice: 10, kitchenStatus: 'QUEUED' }],
          },
        ],
      },
      {
        employeeId: 'emp-2',
        employeeCode: 'E02',
        displayName: 'Carlos',
        comandas: [
          {
            id: 'c-3',
            status: 'OPEN',
            tableLabel: '3',
            totalAmount: 50,
            openedAt: '2026-03-28T11:30:00.000Z',
            items: [{ id: 'i-3', productName: 'Suco', quantity: 1, unitPrice: 15, kitchenStatus: 'IN_PREPARATION' }],
          },
        ],
      },
    ],
    unassigned: {
      comandas: [
        {
          id: 'c-4',
          status: 'CLOSED',
          tableLabel: 'BALCÃO',
          totalAmount: 200,
          openedAt: '2026-03-28T09:30:00.000Z',
          items: [
            { id: 'i-4', productName: 'Cerveja', quantity: 4, unitPrice: 25, kitchenStatus: 'DELIVERED' },
            { id: 'i-5', productName: 'Café', quantity: 1, unitPrice: 10, kitchenStatus: null },
          ],
        },
      ],
    },
  })

  it('calcula KPIs executivos com fechamento e projeção aberta', () => {
    const kpis = buildOperationsExecutiveKpis(snapshot)

    expect(kpis.receitaRealizada).toBe(320)
    expect(kpis.faturamentoAberto).toBe(130)
    expect(kpis.projecaoTotal).toBe(450)
    expect(kpis.lucroRealizado).toBe(140)
    expect(kpis.lucroEsperado).toBe(270)
    expect(kpis.caixaEsperado).toBe(500)
    expect(kpis.openComandasCount).toBe(2)
    expect(kpis.openSessionsCount).toBe(1)
  })

  it('calcula KPIs do performer com recorte individual', () => {
    const performer = buildPerformerKpis(snapshot, 'emp-1')

    expect(performer.receitaRealizada).toBe(120)
    expect(performer.receitaEsperada).toBe(200)
    expect(performer.openComandasCount).toBe(1)
  })

  it('conta itens pendentes de cozinha', () => {
    expect(countKitchenPendingItems(snapshot)).toBe(2)
  })

  it('monta ranking de atendimento incluindo o owner', () => {
    const ranking = buildPerformerRanking(snapshot, 'Wilson')

    expect(ranking[0]).toMatchObject({ nome: 'Marina', valor: 200, comandas: 2 })
    expect(ranking[1]).toMatchObject({ nome: 'Wilson', valor: 200, comandas: 1 })
    expect(ranking[2]).toMatchObject({ nome: 'Carlos', valor: 50, comandas: 1 })
  })

  it('agrega top products por valor vendido', () => {
    const topProducts = buildTopProducts(snapshot)

    expect(topProducts[0]).toMatchObject({ nome: 'Cerveja', qtd: 4, valor: 100 })
    expect(topProducts[1]).toMatchObject({ nome: 'Pão de queijo', qtd: 2, valor: 40 })
    expect(topProducts[2]).toMatchObject({ nome: 'Café', qtd: 2, valor: 20 })
  })
})
