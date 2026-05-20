import { buildComandaMutationErrors } from './operations.openapi.comanda-errors.content'
import { buildOperationsJsonPath, type OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildRegisterComandaPaymentPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/payments',
    summary: 'Register a comanda payment',
    request: {
      params: refs.comandaIdParam,
      body: { content: { 'application/json': { schema: refs.createComandaPaymentRequest } } },
      query: refs.operationsResponseOptions,
    },
    responses: {
      success: { description: 'Comanda payment registered.', schema: refs.comandaResponse, status: 201 },
      errors: buildComandaMutationErrors('Comanda not found.', 'Comanda cannot receive payments.'),
    },
  })
}

export function buildCreateComandaTerminalPaymentIntentPathDefinition(refs: OperationsOpenApiRefs) {
  return buildOperationsJsonPath({
    method: 'post',
    path: '/operations/comandas/{comandaId}/terminal-payment-intents',
    summary: 'Create a Mercado Pago Point payment intent for a comanda',
    request: {
      params: refs.comandaIdParam,
      body: { content: { 'application/json': { schema: refs.createComandaTerminalPaymentIntentRequest } } },
    },
    responses: {
      success: {
        description: 'Terminal payment intent created.',
        schema: refs.terminalPaymentIntentResponse,
        status: 201,
      },
      errors: [
        { status: 400, description: 'Invalid request payload or terminal configuration.' },
        { status: 401, description: 'Authentication required.' },
        { status: 404, description: 'Comanda not found.' },
        { status: 409, description: 'Comanda or terminal already has a pending payment.' },
        { status: 502, description: 'Mercado Pago Point rejected the request.' },
      ],
    },
  })
}
