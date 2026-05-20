import { buildComandaMutationErrors } from './operations.openapi.comanda-errors.content'
import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildUpdateComandaStatusPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/status',
    summary: 'Update comanda status',
    request: {
      params: refs.comandaIdParam,
      body: { content: { 'application/json': { schema: refs.updateComandaStatusRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: { description: 'Comanda status updated.', schema: refs.comandaResponse, status: 201 },
      errors: buildComandaMutationErrors('Comanda not found.', 'Comanda status transition is invalid.'),
    },
  })
}
