import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildOperationsCashSessionPathDefinitions(refs: OperationsOpenApiRefs) {
  return [
    buildOpenCashSessionPathDefinition(refs),
    buildCashMovementPathDefinition(refs),
    buildCloseCashSessionPathDefinition(refs),
  ] as const
}

function buildOpenCashSessionPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/cash-sessions',
    summary: 'Open a cash session',
    request: {
      body: { content: { 'application/json': { schema: refs.openCashSessionRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: {
        description: 'Cash session opened.',
        schema: refs.cashSessionResponse,
        status: 201,
      },
      errors: [
        { status: 400, description: 'Invalid request payload.' },
        { status: 401, description: 'Authentication required.' },
        { status: 409, description: 'Cash session conflict.' },
      ],
    },
  })
}

function buildCashMovementPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/cash-sessions/{cashSessionId}/movements',
    summary: 'Create a cash movement',
    request: {
      params: refs.cashSessionIdParam,
      body: { content: { 'application/json': { schema: refs.createCashMovementRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: {
        description: 'Cash movement created.',
        schema: refs.cashMovementResponse,
        status: 201,
      },
      errors: [
        { status: 400, description: 'Invalid request payload.' },
        { status: 401, description: 'Authentication required.' },
        { status: 404, description: 'Cash session not found.' },
        { status: 409, description: 'Cash session is not open.' },
      ],
    },
  })
}

function buildCloseCashSessionPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/cash-sessions/{cashSessionId}/close',
    summary: 'Close a cash session',
    request: {
      params: refs.cashSessionIdParam,
      body: { content: { 'application/json': { schema: refs.closeCashSessionRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: {
        description: 'Cash session closed.',
        schema: refs.cashSessionResponse,
        status: 201,
      },
      errors: [
        { status: 400, description: 'Invalid request payload.' },
        { status: 401, description: 'Authentication required.' },
        { status: 404, description: 'Cash session not found.' },
        { status: 409, description: 'Cash session cannot be closed yet.' },
      ],
    },
  })
}
