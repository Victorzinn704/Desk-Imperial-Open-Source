import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import {
  buildOperationsComandaPathDefinitions,
  buildOperationsKitchenItemPathDefinition,
} from './operations.openapi.comanda.content'
import { type OperationsOpenApiRefs, registerOperationsOpenApiPaths } from './operations.openapi.shared'

export function registerOperationsComandaOpenApiPaths(registry: OpenAPIRegistry, refs: OperationsOpenApiRefs) {
  registerOperationsOpenApiPaths(registry, buildOperationsComandaPathDefinitions(refs))
}

export function registerOperationsKitchenItemOpenApiPath(registry: OpenAPIRegistry, refs: OperationsOpenApiRefs) {
  registry.registerPath(buildOperationsKitchenItemPathDefinition(refs))
}
