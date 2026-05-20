import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildOperationsCashClosurePathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/closures/close',
    summary: 'Close the consolidated cash closure for the day',
    request: {
      body: { content: { 'application/json': { schema: refs.closeCashClosureRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: {
        description: 'Cash closure closed.',
        schema: refs.cashClosureResponse,
        status: 201,
      },
      errors: [
        { status: 400, description: 'Invalid request payload.' },
        { status: 401, description: 'Authentication required.' },
        { status: 409, description: 'Business day still has open operations.' },
      ],
    },
  })
}
