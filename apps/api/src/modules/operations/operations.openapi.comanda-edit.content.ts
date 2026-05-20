import { buildComandaMutationErrors } from './operations.openapi.comanda-errors.content'
import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildReplaceComandaPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'patch',
    path: '/operations/comandas/{comandaId}',
    summary: 'Replace comanda data and items',
    request: {
      params: refs.comandaIdParam,
      body: { content: { 'application/json': { schema: refs.replaceComandaRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: { description: 'Comanda replaced.', schema: refs.comandaResponse, status: 200 },
      errors: buildComandaMutationErrors('Comanda not found.', 'Comanda cannot be edited.'),
    },
  })
}
