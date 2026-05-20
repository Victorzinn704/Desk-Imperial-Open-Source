import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildOperationsKitchenItemPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'patch',
    path: '/operations/kitchen-items/{itemId}/status',
    summary: 'Update kitchen item status',
    request: {
      params: refs.itemIdParam,
      body: { content: { 'application/json': { schema: refs.updateKitchenItemStatusRequest } } },
    },
    responses: {
      success: {
        description: 'Kitchen item status updated.',
        schema: refs.kitchenItemStatusResponse,
        status: 200,
      },
      errors: [
        { status: 400, description: 'Invalid request payload.' },
        { status: 401, description: 'Authentication required.' },
        { status: 404, description: 'Kitchen item not found.' },
      ],
    },
  })
}
