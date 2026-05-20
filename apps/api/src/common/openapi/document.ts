import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import type { OpenAPIObject } from 'openapi3-ts/oas31'
import rootPackage from '../../../../../package.json'
import { apiOpenApiRegistry } from './registry'
import { registerOperationsOpenApi } from '@/modules/operations/operations.openapi'

const defaultServers = [
  { url: 'http://localhost:4000/api/v1', description: 'Local development' },
  { url: 'https://staging.api.deskimperial.online/api/v1', description: 'Staging' },
  { url: 'https://api.deskimperial.online/api/v1', description: 'Production' },
] as const

let openApiRegistryInitialized = false

function ensureRegistry() {
  if (openApiRegistryInitialized) {
    return
  }

  registerOperationsOpenApi(apiOpenApiRegistry)
  openApiRegistryInitialized = true
}

export function generateApiOpenApiDocument(options?: {
  description?: string
  servers?: Array<{ url: string; description: string }>
  version?: string
}): OpenAPIObject {
  ensureRegistry()

  const generator = new OpenApiGeneratorV31(apiOpenApiRegistry.definitions)

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Desk Imperial API',
      version: options?.version ?? rootPackage.version,
      description:
        options?.description ??
        'Versioned API contracts generated from Zod schemas for Desk Imperial operational flows.',
      contact: {
        name: 'Desk Imperial',
      },
    },
    servers: options?.servers ?? [...defaultServers],
    tags: [
      {
        name: 'operations',
        description: 'Operational floor, cash session, comanda, kitchen and mesa flows.',
      },
    ],
  })
}
