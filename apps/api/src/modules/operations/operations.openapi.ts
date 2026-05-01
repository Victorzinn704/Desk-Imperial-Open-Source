import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import {
  cashClosureWithOptionalSnapshotResponseSchema,
  cashMovementWithOptionalSnapshotResponseSchema,
  cashSessionWithOptionalSnapshotResponseSchema,
  closeCashClosureBodySchema,
  closeCashSessionBodySchema,
  closeComandaBodySchema,
  comandaDetailsResponseSchema,
  comandaWithOptionalSnapshotResponseSchema,
  createCashMovementBodySchema,
  createComandaPaymentBodySchema,
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
  addComandaItemBodySchema,
  addComandaItemsBatchBodySchema,
  assignComandaBodySchema,
} from './operations.schemas'

function buildJsonResponse(schema: z.ZodType, description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema,
      },
    },
  }
}

function buildErrorResponse(description: string) {
  return {
    description,
  }
}

export function registerOperationsOpenApi(registry: OpenAPIRegistry) {
  const operationsLiveQuery = registry.register('OperationsLiveQuery', operationsLiveQuerySchema)
  const operationsResponseOptions = registry.register('OperationsResponseOptions', operationsResponseOptionsSchema)
  const openCashSessionRequest = registry.register('OpenCashSessionRequest', openCashSessionBodySchema)
  const createCashMovementRequest = registry.register('CreateCashMovementRequest', createCashMovementBodySchema)
  const closeCashSessionRequest = registry.register('CloseCashSessionRequest', closeCashSessionBodySchema)
  const closeCashClosureRequest = registry.register('CloseCashClosureRequest', closeCashClosureBodySchema)
  const openComandaRequest = registry.register('OpenComandaRequest', openComandaBodySchema)
  const addComandaItemRequest = registry.register('AddComandaItemRequest', addComandaItemBodySchema)
  const addComandaItemsBatchRequest = registry.register('AddComandaItemsBatchRequest', addComandaItemsBatchBodySchema)
  const replaceComandaRequest = registry.register('ReplaceComandaRequest', replaceComandaBodySchema)
  const assignComandaRequest = registry.register('AssignComandaRequest', assignComandaBodySchema)
  const updateComandaStatusRequest = registry.register('UpdateComandaStatusRequest', updateComandaStatusBodySchema)
  const closeComandaRequest = registry.register('CloseComandaRequest', closeComandaBodySchema)
  const createComandaPaymentRequest = registry.register('CreateComandaPaymentRequest', createComandaPaymentBodySchema)
  const updateKitchenItemStatusRequest = registry.register(
    'UpdateKitchenItemStatusRequest',
    updateKitchenItemStatusBodySchema,
  )
  const createMesaRequest = registry.register('CreateMesaRequest', createMesaBodySchema)
  const updateMesaRequest = registry.register('UpdateMesaRequest', updateMesaBodySchema)

  const operationsLiveResponse = registry.register('OperationsLiveResponse', operationsLiveResponseOpenApiSchema)
  const operationsKitchenResponse = registry.register(
    'OperationsKitchenResponse',
    operationsKitchenResponseOpenApiSchema,
  )
  const operationsSummaryResponse = registry.register(
    'OperationsSummaryResponse',
    operationsSummaryResponseOpenApiSchema,
  )
  const cashSessionResponse = registry.register(
    'OperationsCashSessionResponse',
    cashSessionWithOptionalSnapshotResponseSchema,
  )
  const cashMovementResponse = registry.register(
    'OperationsCashMovementResponse',
    cashMovementWithOptionalSnapshotResponseSchema,
  )
  const cashClosureResponse = registry.register(
    'OperationsCashClosureResponse',
    cashClosureWithOptionalSnapshotResponseSchema,
  )
  const comandaResponse = registry.register('OperationsComandaResponse', comandaWithOptionalSnapshotResponseSchema)
  const comandaDetailsResponse = registry.register('OperationsComandaDetailsResponse', comandaDetailsResponseSchema)
  const kitchenItemStatusResponse = registry.register(
    'OperationsKitchenItemStatusResponse',
    kitchenItemStatusUpdateResponseSchema,
  )
  const mesasListResponse = registry.register('OperationsMesaListResponse', mesasListResponseSchema)
  const mesaResponse = registry.register('OperationsMesaResponse', mesaResponseSchema)

  const cashSessionIdParam = registry.register(
    'OperationsCashSessionIdParam',
    z.object({ cashSessionId: z.string() }).strict(),
  )
  const comandaIdParam = registry.register('OperationsComandaIdParam', z.object({ comandaId: z.string() }).strict())
  const itemIdParam = registry.register('OperationsKitchenItemIdParam', z.object({ itemId: z.string() }).strict())
  const mesaIdParam = registry.register('OperationsMesaIdParam', z.object({ mesaId: z.string() }).strict())

  registry.registerPath({
    method: 'get',
    path: '/operations/live',
    tags: ['operations'],
    summary: 'Get live operations snapshot',
    request: {
      query: operationsLiveQuery,
    },
    responses: {
      200: buildJsonResponse(operationsLiveResponse, 'Operational live snapshot.'),
      400: buildErrorResponse('Invalid query parameters.'),
      401: buildErrorResponse('Authentication required.'),
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/operations/kitchen',
    tags: ['operations'],
    summary: 'Get kitchen queue view',
    request: {
      query: operationsLiveQuery,
    },
    responses: {
      200: buildJsonResponse(operationsKitchenResponse, 'Kitchen queue snapshot.'),
      400: buildErrorResponse('Invalid query parameters.'),
      401: buildErrorResponse('Authentication required.'),
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/operations/summary',
    tags: ['operations'],
    summary: 'Get operations summary view',
    request: {
      query: operationsLiveQuery,
    },
    responses: {
      200: buildJsonResponse(operationsSummaryResponse, 'Operations executive summary.'),
      400: buildErrorResponse('Invalid query parameters.'),
      401: buildErrorResponse('Authentication required.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/cash-sessions',
    tags: ['operations'],
    summary: 'Open a cash session',
    request: {
      body: {
        content: {
          'application/json': {
            schema: openCashSessionRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(cashSessionResponse, 'Cash session opened.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      409: buildErrorResponse('Cash session conflict.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/cash-sessions/{cashSessionId}/movements',
    tags: ['operations'],
    summary: 'Create a cash movement',
    request: {
      params: cashSessionIdParam,
      body: {
        content: {
          'application/json': {
            schema: createCashMovementRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(cashMovementResponse, 'Cash movement created.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Cash session not found.'),
      409: buildErrorResponse('Cash session is not open.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/cash-sessions/{cashSessionId}/close',
    tags: ['operations'],
    summary: 'Close a cash session',
    request: {
      params: cashSessionIdParam,
      body: {
        content: {
          'application/json': {
            schema: closeCashSessionRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(cashSessionResponse, 'Cash session closed.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Cash session not found.'),
      409: buildErrorResponse('Cash session cannot be closed yet.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/comandas',
    tags: ['operations'],
    summary: 'Open a comanda',
    request: {
      body: {
        content: {
          'application/json': {
            schema: openComandaRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(comandaResponse, 'Comanda opened.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      409: buildErrorResponse('Comanda conflict.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/items',
    tags: ['operations'],
    summary: 'Add one item to a comanda',
    request: {
      params: comandaIdParam,
      body: {
        content: {
          'application/json': {
            schema: addComandaItemRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(comandaResponse, 'Comanda item created.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Comanda or product not found.'),
      409: buildErrorResponse('Comanda cannot accept new items.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/items/batch',
    tags: ['operations'],
    summary: 'Add multiple items to a comanda',
    request: {
      params: comandaIdParam,
      body: {
        content: {
          'application/json': {
            schema: addComandaItemsBatchRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(comandaResponse, 'Comanda items created.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Comanda or product not found.'),
      409: buildErrorResponse('Comanda cannot accept new items.'),
    },
  })

  registry.registerPath({
    method: 'patch',
    path: '/operations/comandas/{comandaId}',
    tags: ['operations'],
    summary: 'Replace comanda data and items',
    request: {
      params: comandaIdParam,
      body: {
        content: {
          'application/json': {
            schema: replaceComandaRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      200: buildJsonResponse(comandaResponse, 'Comanda replaced.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Comanda not found.'),
      409: buildErrorResponse('Comanda cannot be edited.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/assign',
    tags: ['operations'],
    summary: 'Assign a comanda to an employee',
    request: {
      params: comandaIdParam,
      body: {
        content: {
          'application/json': {
            schema: assignComandaRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(comandaResponse, 'Comanda assignment updated.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Comanda or employee not found.'),
      409: buildErrorResponse('Employee cash session conflict.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/status',
    tags: ['operations'],
    summary: 'Update comanda status',
    request: {
      params: comandaIdParam,
      body: {
        content: {
          'application/json': {
            schema: updateComandaStatusRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(comandaResponse, 'Comanda status updated.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Comanda not found.'),
      409: buildErrorResponse('Comanda status transition is invalid.'),
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/operations/comandas/{comandaId}/details',
    tags: ['operations'],
    summary: 'Get comanda details',
    request: {
      params: comandaIdParam,
    },
    responses: {
      200: buildJsonResponse(comandaDetailsResponse, 'Comanda details.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Comanda not found.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/payments',
    tags: ['operations'],
    summary: 'Register a comanda payment',
    request: {
      params: comandaIdParam,
      body: {
        content: {
          'application/json': {
            schema: createComandaPaymentRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(comandaResponse, 'Comanda payment registered.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Comanda not found.'),
      409: buildErrorResponse('Comanda cannot receive payments.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/close',
    tags: ['operations'],
    summary: 'Close a comanda',
    request: {
      params: comandaIdParam,
      body: {
        content: {
          'application/json': {
            schema: closeComandaRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(comandaResponse, 'Comanda closed.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Comanda not found.'),
      409: buildErrorResponse('Comanda cannot be closed.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/closures/close',
    tags: ['operations'],
    summary: 'Close the consolidated cash closure for the day',
    request: {
      body: {
        content: {
          'application/json': {
            schema: closeCashClosureRequest,
          },
        },
      },
      query: operationsResponseOptions,
    },
    responses: {
      201: buildJsonResponse(cashClosureResponse, 'Cash closure closed.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      409: buildErrorResponse('Business day still has open operations.'),
    },
  })

  registry.registerPath({
    method: 'patch',
    path: '/operations/kitchen-items/{itemId}/status',
    tags: ['operations'],
    summary: 'Update kitchen item status',
    request: {
      params: itemIdParam,
      body: {
        content: {
          'application/json': {
            schema: updateKitchenItemStatusRequest,
          },
        },
      },
    },
    responses: {
      200: buildJsonResponse(kitchenItemStatusResponse, 'Kitchen item status updated.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Kitchen item not found.'),
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/operations/mesas',
    tags: ['operations'],
    summary: 'List mesas',
    responses: {
      200: buildJsonResponse(mesasListResponse, 'Mesa list.'),
      401: buildErrorResponse('Authentication required.'),
    },
  })

  registry.registerPath({
    method: 'post',
    path: '/operations/mesas',
    tags: ['operations'],
    summary: 'Create mesa',
    request: {
      body: {
        content: {
          'application/json': {
            schema: createMesaRequest,
          },
        },
      },
    },
    responses: {
      201: buildJsonResponse(mesaResponse, 'Mesa created.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      409: buildErrorResponse('Mesa label conflict.'),
    },
  })

  registry.registerPath({
    method: 'patch',
    path: '/operations/mesas/{mesaId}',
    tags: ['operations'],
    summary: 'Update mesa',
    request: {
      params: mesaIdParam,
      body: {
        content: {
          'application/json': {
            schema: updateMesaRequest,
          },
        },
      },
    },
    responses: {
      200: buildJsonResponse(mesaResponse, 'Mesa updated.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Mesa not found.'),
      409: buildErrorResponse('Mesa label conflict.'),
    },
  })
}
