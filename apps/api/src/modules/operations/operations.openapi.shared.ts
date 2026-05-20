import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import type { z } from 'zod'

export type OperationsOpenApiRefs = ReturnType<(typeof import('./operations.openapi.refs'))['registerOperationsRefs']>
export type OperationsOpenApiPathDefinition = Parameters<OpenAPIRegistry['registerPath']>[0]
type OperationsOpenApiSuccess = {
  description: string
  schema: z.ZodType
  status: 200 | 201
}

type OperationsOpenApiError = {
  description: string
  status: 400 | 401 | 404 | 409 | 502
}

export function buildJsonResponse(schema: z.ZodType, description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema,
      },
    },
  }
}

export function buildErrorResponse(description: string) {
  return {
    description,
  }
}

export function buildOperationsJsonPath(config: {
  method: OperationsOpenApiPathDefinition['method']
  path: string
  request?: OperationsOpenApiPathDefinition['request']
  responses: {
    errors: ReadonlyArray<OperationsOpenApiError>
    success: OperationsOpenApiSuccess
  }
  summary: string
}): OperationsOpenApiPathDefinition {
  return {
    method: config.method,
    path: config.path,
    tags: ['operations'],
    summary: config.summary,
    ...(config.request ? { request: config.request } : {}),
    responses: buildOperationsResponses(config.responses),
  }
}

export function registerOperationsOpenApiPaths(
  registry: OpenAPIRegistry,
  definitions: ReadonlyArray<OperationsOpenApiPathDefinition>,
) {
  for (const definition of definitions) {
    registry.registerPath(definition)
  }
}

function buildOperationsResponses(responses: {
  errors: ReadonlyArray<OperationsOpenApiError>
  success: OperationsOpenApiSuccess
}) {
  return Object.fromEntries([
    [responses.success.status, buildJsonResponse(responses.success.schema, responses.success.description)],
    ...responses.errors.map((error) => [error.status, buildErrorResponse(error.description)]),
  ])
}
