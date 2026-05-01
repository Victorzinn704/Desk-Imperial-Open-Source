import type { OperationsHelpersService } from './operations-helpers.service'
import { buildOptionalOperationsSnapshot } from './operations-domain.utils'
import { toCashMovementRecord, toCashSessionRecord, toClosureRecord } from './operations.types'
import type { OperationsResponseOptionsDto } from './operations.schemas'

export async function buildCashSessionResponse(
  helpers: OperationsHelpersService,
  workspaceOwnerUserId: string,
  businessDate: Date,
  session: Parameters<typeof toCashSessionRecord>[0],
  options?: OperationsResponseOptionsDto,
) {
  return {
    cashSession: toCashSessionRecord(session),
    ...(await buildOptionalOperationsSnapshot(helpers, workspaceOwnerUserId, businessDate, options)),
  }
}

export async function buildCashMovementResponse(
  helpers: OperationsHelpersService,
  workspaceOwnerUserId: string,
  businessDate: Date,
  movement: Parameters<typeof toCashMovementRecord>[0],
  session: Parameters<typeof toCashSessionRecord>[0],
  options?: OperationsResponseOptionsDto,
) {
  return {
    movement: toCashMovementRecord(movement),
    cashSession: toCashSessionRecord(session),
    ...(await buildOptionalOperationsSnapshot(helpers, workspaceOwnerUserId, businessDate, options)),
  }
}

export async function buildCashClosureResponse(
  helpers: OperationsHelpersService,
  workspaceOwnerUserId: string,
  businessDate: Date,
  closure: Parameters<typeof toClosureRecord>[0],
  options?: OperationsResponseOptionsDto,
) {
  return {
    closure: toClosureRecord(closure),
    ...(await buildOptionalOperationsSnapshot(helpers, workspaceOwnerUserId, businessDate, options)),
  }
}
