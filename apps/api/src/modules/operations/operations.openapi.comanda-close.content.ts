import { buildComandaMutationErrors } from './operations.openapi.comanda-errors.content'
import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildCloseComandaPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/close',
    summary: 'Close a comanda',
    request: {
      params: refs.comandaIdParam,
      body: { content: { 'application/json': { schema: refs.closeComandaRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: { description: 'Comanda closed.', schema: refs.comandaResponse, status: 201 },
      errors: buildComandaMutationErrors('Comanda not found.', 'Comanda cannot be closed.'),
    },
  })
}
