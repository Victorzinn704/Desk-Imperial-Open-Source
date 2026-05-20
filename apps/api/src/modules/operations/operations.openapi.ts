import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import {
  registerOperationsCashClosureOpenApiPath,
  registerOperationsCashSessionOpenApiPaths,
  registerOperationsSnapshotOpenApiPaths,
} from './operations.openapi.cash.routes'
import {
  registerOperationsComandaOpenApiPaths,
  registerOperationsKitchenItemOpenApiPath,
} from './operations.openapi.comanda.routes'
import { registerOperationsMesaOpenApiPaths } from './operations.openapi.mesa.routes'
import { registerOperationsRefs } from './operations.openapi.refs'

export function registerOperationsOpenApi(registry: OpenAPIRegistry) {
  const refs = registerOperationsRefs(registry)
  registerOperationsSnapshotOpenApiPaths(registry, refs)
  registerOperationsCashSessionOpenApiPaths(registry, refs)
  registerOperationsComandaOpenApiPaths(registry, refs)
  registerOperationsCashClosureOpenApiPath(registry, refs)
  registerOperationsKitchenItemOpenApiPath(registry, refs)
  registerOperationsMesaOpenApiPaths(registry, refs)
}
