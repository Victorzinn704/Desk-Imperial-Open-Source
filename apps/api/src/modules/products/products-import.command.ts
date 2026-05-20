import { BadRequestException } from '@nestjs/common'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import { parseProductImportCsv, type ProductImportRow } from './products-import.util'
import { upsertImportRow, validateImportRow } from './products-import.utils'
import type { ProductsServiceDependencies, UploadedCsvFile } from './products-service.types'
import { invalidateProductsCache, refreshProductsFinanceSummary } from './products-service.shared'

type ProductImportInput = {
  auth: AuthContext
  file: UploadedCsvFile | undefined
  context: RequestContext
}

type ProductImportSummary = {
  totalRows: number
  createdCount: number
  updatedCount: number
  failedCount: number
}

type ProductImportResult = {
  summary: ProductImportSummary
  errors: Array<{ line: number; message: string }>
}

export async function importProductsForUser(
  deps: ProductsServiceDependencies,
  input: ProductImportInput,
): Promise<ProductImportResult> {
  assertOwnerRole(input.auth, 'Apenas o dono pode importar produtos.')
  const workspaceUserId = resolveWorkspaceOwnerUserId(input.auth)
  const file = requireCsvFile(input.file)
  const parsedRows = parseImportCsvOrThrow(file)

  if (!parsedRows.length) {
    throw new BadRequestException('O arquivo CSV esta vazio ou sem linhas validas.')
  }

  const result = await importRows(deps, workspaceUserId, parsedRows)
  await recordProductImportAudit(deps, input, file.originalname, result.summary)
  refreshProductsFinanceSummary(deps, workspaceUserId)
  void invalidateProductsCache(deps, workspaceUserId)

  return result
}

function requireCsvFile(file: UploadedCsvFile | undefined) {
  if (!file) {
    throw new BadRequestException('Envie um arquivo CSV para importar os produtos.')
  }

  return file
}

function parseImportCsvOrThrow(file: UploadedCsvFile) {
  try {
    return parseProductImportCsv(file.buffer.toString('utf-8'))
  } catch (error) {
    throw new BadRequestException(error instanceof Error ? error.message : 'Nao foi possivel ler o CSV enviado.')
  }
}

async function importRows(
  deps: ProductsServiceDependencies,
  workspaceUserId: string,
  rows: ProductImportRow[],
): Promise<ProductImportResult> {
  const counters = { createdCount: 0, updatedCount: 0 }
  const errors: ProductImportResult['errors'] = []

  for (const row of rows) {
    try {
      const result = await importRow(deps, workspaceUserId, row)
      counters.createdCount += result === 'created' ? 1 : 0
      counters.updatedCount += result === 'updated' ? 1 : 0
    } catch (error) {
      errors.push({ line: row.line, message: resolveImportErrorMessage(error) })
    }
  }

  return {
    summary: {
      totalRows: rows.length,
      createdCount: counters.createdCount,
      updatedCount: counters.updatedCount,
      failedCount: errors.length,
    },
    errors,
  }
}

async function importRow(deps: ProductsServiceDependencies, workspaceUserId: string, row: ProductImportRow) {
  validateImportRow(row)
  return upsertImportRow(deps.prisma, workspaceUserId, row)
}

function resolveImportErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Falha inesperada ao importar a linha.'
}

async function recordProductImportAudit(
  deps: ProductsServiceDependencies,
  input: ProductImportInput,
  fileName: string,
  summary: ProductImportSummary,
) {
  await deps.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.auth),
    event: 'product.imported',
    resource: 'product',
    metadata: {
      fileName,
      totalRows: summary.totalRows,
      createdCount: summary.createdCount,
      updatedCount: summary.updatedCount,
      failedCount: summary.failedCount,
    },
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })
}
