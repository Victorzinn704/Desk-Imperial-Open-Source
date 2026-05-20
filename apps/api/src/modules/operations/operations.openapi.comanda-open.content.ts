import { buildDefaultConflictErrors } from './operations.openapi.comanda-errors.content'
import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildOpenComandaPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/comandas',
    summary: 'Open a comanda',
    request: {
      body: { content: { 'application/json': { schema: refs.openComandaRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: { description: 'Comanda opened.', schema: refs.comandaResponse, status: 201 },
      errors: buildDefaultConflictErrors('Comanda conflict.'),
    },
  })
}
