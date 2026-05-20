import { buildComandaMutationErrors } from './operations.openapi.comanda-errors.content'
import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildAssignComandaPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/assign',
    summary: 'Assign a comanda to an employee',
    request: {
      params: refs.comandaIdParam,
      body: { content: { 'application/json': { schema: refs.assignComandaRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: { description: 'Comanda assignment updated.', schema: refs.comandaResponse, status: 201 },
      errors: buildComandaMutationErrors('Comanda or employee not found.', 'Employee cash session conflict.'),
    },
  })
}
