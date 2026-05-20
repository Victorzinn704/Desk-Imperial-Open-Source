import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { buildErrorResponse, buildJsonResponse, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function registerOperationsMesaOpenApiPaths(registry: OpenAPIRegistry, refs: OperationsOpenApiRefs) {
  registerListMesasPath(registry, refs)
  registerCreateMesaPath(registry, refs)
  registerUpdateMesaPath(registry, refs)
}

function registerListMesasPath(registry: OpenAPIRegistry, refs: OperationsOpenApiRefs) {
  registry.registerPath({
    method: 'get',
    path: '/operations/mesas',
    tags: ['operations'],
    summary: 'List mesas',
    responses: {
      200: buildJsonResponse(refs.mesasListResponse, 'Mesa list.'),
      401: buildErrorResponse('Authentication required.'),
    },
  })
}

function registerCreateMesaPath(registry: OpenAPIRegistry, refs: OperationsOpenApiRefs) {
  registry.registerPath({
    method: 'post',
    path: '/operations/mesas',
    tags: ['operations'],
    summary: 'Create mesa',
    request: {
      body: {
        content: {
          'application/json': {
            schema: refs.createMesaRequest,
          },
        },
      },
    },
    responses: {
      201: buildJsonResponse(refs.mesaResponse, 'Mesa created.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      409: buildErrorResponse('Mesa label conflict.'),
    },
  })
}

function registerUpdateMesaPath(registry: OpenAPIRegistry, refs: OperationsOpenApiRefs) {
  registry.registerPath({
    method: 'patch',
    path: '/operations/mesas/{mesaId}',
    tags: ['operations'],
    summary: 'Update mesa',
    request: {
      params: refs.mesaIdParam,
      body: {
        content: {
          'application/json': {
            schema: refs.updateMesaRequest,
          },
        },
      },
    },
    responses: {
      200: buildJsonResponse(refs.mesaResponse, 'Mesa updated.'),
      400: buildErrorResponse('Invalid request payload.'),
      401: buildErrorResponse('Authentication required.'),
      404: buildErrorResponse('Mesa not found.'),
      409: buildErrorResponse('Mesa label conflict.'),
    },
  })
}
