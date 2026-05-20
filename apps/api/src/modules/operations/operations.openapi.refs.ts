import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import {
  addComandaItemBodySchema,
  addComandaItemsBatchBodySchema,
  assignComandaBodySchema,
  cashClosureWithOptionalSnapshotResponseSchema,
  cashMovementWithOptionalSnapshotResponseSchema,
  cashSessionWithOptionalSnapshotResponseSchema,
  closeCashClosureBodySchema,
  closeCashSessionBodySchema,
  closeComandaBodySchema,
  comandaDetailsResponseSchema,
  comandaTerminalPaymentIntentResponseSchema,
  comandaWithOptionalSnapshotResponseSchema,
  createCashMovementBodySchema,
  createComandaPaymentBodySchema,
  createComandaTerminalPaymentIntentBodySchema,
  createMesaBodySchema,
  kitchenItemStatusUpdateResponseSchema,
  mesaResponseSchema,
  mesasListResponseSchema,
  openCashSessionBodySchema,
  openComandaBodySchema,
  operationsKitchenResponseOpenApiSchema,
  operationsLiveQuerySchema,
  operationsLiveResponseOpenApiSchema,
  operationsResponseOptionsSchema,
  operationsSummaryResponseOpenApiSchema,
  replaceComandaBodySchema,
  updateComandaStatusBodySchema,
  updateKitchenItemStatusBodySchema,
  updateMesaBodySchema,
} from './operations.schemas'

export function registerOperationsRefs(registry: OpenAPIRegistry) {
  const params = registerOperationsPathParams(registry)

  return {
    addComandaItemRequest: registry.register('AddComandaItemRequest', addComandaItemBodySchema),
    addComandaItemsBatchRequest: registry.register('AddComandaItemsBatchRequest', addComandaItemsBatchBodySchema),
    assignComandaRequest: registry.register('AssignComandaRequest', assignComandaBodySchema),
    cashClosureResponse: registry.register('CashClosureResponse', cashClosureWithOptionalSnapshotResponseSchema),
    cashMovementResponse: registry.register('CashMovementResponse', cashMovementWithOptionalSnapshotResponseSchema),
    cashSessionIdParam: params.cashSessionIdParam,
    cashSessionResponse: registry.register('CashSessionResponse', cashSessionWithOptionalSnapshotResponseSchema),
    closeCashClosureRequest: registry.register('CloseCashClosureRequest', closeCashClosureBodySchema),
    closeCashSessionRequest: registry.register('CloseCashSessionRequest', closeCashSessionBodySchema),
    closeComandaRequest: registry.register('CloseComandaRequest', closeComandaBodySchema),
    comandaDetailsResponse: registry.register('ComandaDetailsResponse', comandaDetailsResponseSchema),
    comandaIdParam: params.comandaIdParam,
    comandaResponse: registry.register('ComandaResponse', comandaWithOptionalSnapshotResponseSchema),
    createCashMovementRequest: registry.register('CreateCashMovementRequest', createCashMovementBodySchema),
    createComandaPaymentRequest: registry.register('CreateComandaPaymentRequest', createComandaPaymentBodySchema),
    createComandaTerminalPaymentIntentRequest: registerTerminalPaymentIntentRequest(registry),
    createMesaRequest: registry.register('CreateMesaRequest', createMesaBodySchema),
    itemIdParam: params.itemIdParam,
    kitchenItemStatusResponse: registry.register(
      'KitchenItemStatusUpdateResponse',
      kitchenItemStatusUpdateResponseSchema,
    ),
    mesaIdParam: params.mesaIdParam,
    mesaResponse: registry.register('MesaResponse', mesaResponseSchema),
    mesasListResponse: registry.register('MesasListResponse', mesasListResponseSchema),
    openCashSessionRequest: registry.register('OpenCashSessionRequest', openCashSessionBodySchema),
    openComandaRequest: registry.register('OpenComandaRequest', openComandaBodySchema),
    operationsKitchenResponse: registry.register('OperationsKitchenResponse', operationsKitchenResponseOpenApiSchema),
    operationsLiveQuery: registry.register('OperationsLiveQuery', operationsLiveQuerySchema),
    operationsLiveResponse: registry.register('OperationsLiveResponse', operationsLiveResponseOpenApiSchema),
    operationsResponseOptions: registry.register('OperationsResponseOptions', operationsResponseOptionsSchema),
    operationsSummaryResponse: registry.register('OperationsSummaryResponse', operationsSummaryResponseOpenApiSchema),
    replaceComandaRequest: registry.register('ReplaceComandaRequest', replaceComandaBodySchema),
    terminalPaymentIntentResponse: registerTerminalPaymentIntentResponse(registry),
    updateComandaStatusRequest: registry.register('UpdateComandaStatusRequest', updateComandaStatusBodySchema),
    updateKitchenItemStatusRequest: registry.register(
      'UpdateKitchenItemStatusRequest',
      updateKitchenItemStatusBodySchema,
    ),
    updateMesaRequest: registry.register('UpdateMesaRequest', updateMesaBodySchema),
  }
}

function registerOperationsPathParams(registry: OpenAPIRegistry) {
  return {
    cashSessionIdParam: registry.register('OperationsCashSessionIdParam', z.object({ cashSessionId: z.string() })),
    comandaIdParam: registry.register('OperationsComandaIdParam', z.object({ comandaId: z.string() })),
    itemIdParam: registry.register('OperationsKitchenItemIdParam', z.object({ itemId: z.string() })),
    mesaIdParam: registry.register('OperationsMesaIdParam', z.object({ mesaId: z.string() })),
  }
}

function registerTerminalPaymentIntentRequest(registry: OpenAPIRegistry) {
  return registry.register('CreateComandaTerminalPaymentIntentRequest', createComandaTerminalPaymentIntentBodySchema)
}

function registerTerminalPaymentIntentResponse(registry: OpenAPIRegistry) {
  return registry.register('TerminalPaymentIntentResponse', comandaTerminalPaymentIntentResponseSchema)
}
