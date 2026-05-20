import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import {
  buildOperationsCashClosurePathDefinition,
  buildOperationsCashSessionPathDefinitions,
  buildOperationsSnapshotPathDefinitions,
} from './operations.openapi.cash.content'
import { type OperationsOpenApiRefs, registerOperationsOpenApiPaths } from './operations.openapi.shared'

export function registerOperationsSnapshotOpenApiPaths(registry: OpenAPIRegistry, refs: OperationsOpenApiRefs) {
  registerOperationsOpenApiPaths(registry, buildOperationsSnapshotPathDefinitions(refs))
}

export function registerOperationsCashSessionOpenApiPaths(registry: OpenAPIRegistry, refs: OperationsOpenApiRefs) {
  registerOperationsOpenApiPaths(registry, buildOperationsCashSessionPathDefinitions(refs))
}

export function registerOperationsCashClosureOpenApiPath(registry: OpenAPIRegistry, refs: OperationsOpenApiRefs) {
  registry.registerPath(buildOperationsCashClosurePathDefinition(refs))
}
