import { buildComandaReadErrors } from './operations.openapi.comanda-errors.content'
import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildComandaDetailsPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'get',
    path: '/operations/comandas/{comandaId}/details',
    summary: 'Get comanda details',
    request: { params: refs.comandaIdParam },
    responses: {
      success: { description: 'Comanda details.', schema: refs.comandaDetailsResponse, status: 200 },
      errors: buildComandaReadErrors(),
    },
  })
}
