/**
 * @file comanda.service.branches.spec.ts
 * @module Operations/Comanda
 *
 * Cobre caminhos felizes e efeitos colaterais de comanda (cozinha, caixa, cache e realtime),
 * servindo como referencia de comportamento para contribuidores externos.
 */

import { KitchenItemStatus, Prisma } from '@prisma/client'
import { COMANDA_ID, makeOwnerAuth, makeRequest, WITHOUT_LIVE_SNAPSHOT } from './helpers/comanda-service-fixtures'
import { createComandaServiceHarness } from './helpers/comanda-service-harness'
import {
  arrangeAssignComandaScenario,
  arrangeBatchItemsScenario,
  arrangeCancelComandaScenario,
  arrangeCatalogItemScenario,
  arrangeCloseComandaScenario,
  arrangeReadyKitchenItemScenario,
  arrangeReplaceComandaScenario,
} from './helpers/comanda-service-scenarios'

describe('ComandaService branch happy paths', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('adiciona item de catalogo e publica evento para cozinha', async () => {
    const harness = createComandaServiceHarness()
    const payload = arrangeCatalogItemScenario(harness)

    const result = await harness.service.addComandaItem(
      makeOwnerAuth(),
      COMANDA_ID,
      payload,
      makeRequest(),
      WITHOUT_LIVE_SNAPSHOT,
    )

    expect(result.comanda.id).toBe(COMANDA_ID)
    expect(harness.realtime.publishKitchenItemQueued).toHaveBeenCalledTimes(1)
    expect(harness.realtime.publishComandaUpdated).toHaveBeenCalledTimes(1)
    expect(harness.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
    )
  })

  it('adiciona itens em lote e publica replaceKitchenItems no realtime', async () => {
    const harness = createComandaServiceHarness()
    const payload = arrangeBatchItemsScenario(harness)

    await harness.service.addComandaItems(makeOwnerAuth(), COMANDA_ID, payload, makeRequest(), WITHOUT_LIVE_SNAPSHOT)

    expect(harness.realtime.publishComandaUpdated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ replaceKitchenItems: true }),
      expect.anything(),
    )
    expect(harness.realtime.publishKitchenItemQueued).toHaveBeenCalledTimes(1)
  })

  it('substitui comanda preservando estado de cozinha de item equivalente', async () => {
    const harness = createComandaServiceHarness()
    const payload = arrangeReplaceComandaScenario(harness)

    await harness.service.replaceComanda(makeOwnerAuth(), COMANDA_ID, payload, makeRequest(), WITHOUT_LIVE_SNAPSHOT)

    expect(harness.prisma.comandaItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ kitchenStatus: KitchenItemStatus.READY })],
      }),
    )
    expect(harness.prisma.product.findMany).not.toHaveBeenCalled()
    expect(harness.realtime.publishComandaUpdated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ replaceKitchenItems: true }),
      expect.anything(),
    )
  })

  it('atribui comanda para funcionario com caixa aberto', async () => {
    const harness = createComandaServiceHarness()
    const payload = arrangeAssignComandaScenario(harness)

    await harness.service.assignComanda(makeOwnerAuth(), COMANDA_ID, payload, makeRequest(), WITHOUT_LIVE_SNAPSHOT)

    expect(harness.prisma.comanda.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cashSessionId: 'cash-open-1', currentEmployeeId: 'employee-1' }),
      }),
    )
    expect(harness.realtime.publishComandaUpdated).toHaveBeenCalledTimes(1)
  })

  it('cancela comanda e publica atualizacao de cash closure', async () => {
    const harness = createComandaServiceHarness()
    const payload = arrangeCancelComandaScenario(harness)

    await harness.service.updateComandaStatus(
      makeOwnerAuth(),
      COMANDA_ID,
      payload,
      makeRequest(),
      WITHOUT_LIVE_SNAPSHOT,
    )

    expect(harness.realtime.publishComandaUpdated).toHaveBeenCalledTimes(1)
    expect(harness.realtime.publishCashClosureUpdated).toHaveBeenCalledTimes(1)
  })

  it('atualiza item de cozinha para READY e reflete status da comanda', async () => {
    const harness = createComandaServiceHarness()
    const payload = arrangeReadyKitchenItemScenario(harness)

    const result = await harness.service.updateKitchenItemStatus(makeOwnerAuth(), 'item-1', payload, makeRequest())

    expect(result).toEqual({ itemId: 'item-1', status: 'READY' })
    expect(harness.realtime.publishKitchenItemUpdated).toHaveBeenCalledTimes(1)
    expect(harness.realtime.publishComandaUpdated).toHaveBeenCalledTimes(1)
  })

  it('fecha comanda, sincroniza caixa e publica eventos financeiros', async () => {
    const harness = createComandaServiceHarness()
    const payload = arrangeCloseComandaScenario(harness, 0)

    await harness.service.closeComanda(makeOwnerAuth(), COMANDA_ID, payload, makeRequest(), WITHOUT_LIVE_SNAPSHOT)

    expect(harness.helpers.ensureOrderForClosedComanda).toHaveBeenCalledTimes(1)
    expect(harness.realtime.publishComandaClosed).toHaveBeenCalledTimes(1)
    expect(harness.realtime.publishCashUpdated).toHaveBeenCalledTimes(1)
    expect(harness.realtime.publishCashClosureUpdated).toHaveBeenCalledTimes(1)
    expect(harness.cache.del).toHaveBeenCalledTimes(1)
    expect(harness.finance.invalidateAndWarmSummary).toHaveBeenCalledWith('owner-1')
  })

  it('fecha comanda sem criar pagamento final quando o saldo ja esta quitado', async () => {
    const harness = createComandaServiceHarness()
    const payload = arrangeCloseComandaScenario(harness, 120)

    await harness.service.closeComanda(makeOwnerAuth(), COMANDA_ID, payload, makeRequest(), WITHOUT_LIVE_SNAPSHOT)

    expect(harness.prisma.comandaPayment.create).not.toHaveBeenCalled()
  })
})
