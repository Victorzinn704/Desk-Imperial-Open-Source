import { buildComandaItemMutationErrors } from './operations.openapi.comanda-errors.content'
import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildAddComandaItemPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/items',
    summary: 'Add one item to a comanda',
    request: {
      params: refs.comandaIdParam,
      body: { content: { 'application/json': { schema: refs.addComandaItemRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: { description: 'Comanda item created.', schema: refs.comandaResponse, status: 201 },
      errors: buildComandaItemMutationErrors('Comanda or product not found.'),
    },
  })
}

export function buildAddComandaItemsBatchPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/items/batch',
    summary: 'Add multiple items to a comanda',
    request: {
      params: refs.comandaIdParam,
      body: { content: { 'application/json': { schema: refs.addComandaItemsBatchRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: { description: 'Comanda items created.', schema: refs.comandaResponse, status: 201 },
      errors: buildComandaItemMutationErrors('Comanda or product not found.'),
    },
  })
}
