import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildOperationsSnapshotPathDefinitions(refs: OperationsOpenApiRefs) {
  return [
    buildOperationsLivePathDefinition(refs),
    buildOperationsKitchenPathDefinition(refs),
    buildOperationsSummaryPathDefinition(refs),
  ] as const
}

function buildQueryErrors() {
  return [
    { status: 400 as const, description: 'Invalid query parameters.' },
    { status: 401 as const, description: 'Authentication required.' },
  ] as const
}

function buildOperationsLivePathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'get',
    path: '/operations/live',
    summary: 'Get live operations snapshot',
    request: { query: refs.operationsLiveQuery },
    responses: {
      success: {
        description: 'Operational live snapshot.',
        schema: refs.operationsLiveResponse,
        status: 200,
      },
      errors: buildQueryErrors(),
    },
  })
}

function buildOperationsKitchenPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'get',
    path: '/operations/kitchen',
    summary: 'Get kitchen queue view',
    request: { query: refs.operationsLiveQuery },
    responses: {
      success: {
        description: 'Kitchen queue snapshot.',
        schema: refs.operationsKitchenResponse,
        status: 200,
      },
      errors: buildQueryErrors(),
    },
  })
}

function buildOperationsSummaryPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'get',
    path: '/operations/summary',
    summary: 'Get operations summary view',
    request: { query: refs.operationsLiveQuery },
    responses: {
      success: {
        description: 'Operations executive summary.',
        schema: refs.operationsSummaryResponse,
        status: 200,
      },
      errors: buildQueryErrors(),
    },
  })
}
