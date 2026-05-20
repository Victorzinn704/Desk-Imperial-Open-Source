import { CacheService } from '../../common/services/cache.service'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import type { OperationsRealtimeMutationName } from '../operations-realtime/operations-realtime.types'
import { publishCashOpenedRealtime, publishCashRealtime } from './cash-realtime-publish.utils'
import {
  type CloseCashClosureCommand,
  type CloseCashSessionCommand,
  type CreateCashMovementCommand,
  normalizeCloseCashClosureCommand,
  normalizeCloseCashSessionCommand,
  normalizeOpenCashSessionCommand,
  type OpenCashSessionCommand,
  resolveCashClosureAuditEvent,
  resolveCashClosureAuditSeverity,
} from './cash-session-command.utils'
import {
  buildCashClosurePayload,
  formatBusinessDateKey,
  invalidateOperationsLiveCache,
} from './operations-domain.utils'
import { toCashSessionRecord, toClosureRecord } from './operations.types'

type CashSessionRecordInput = Parameters<typeof toCashSessionRecord>[0]
type CashClosurePayloadInput = Parameters<typeof buildCashClosurePayload>[0]
type CashClosureRecordInput = NonNullable<Parameters<typeof toClosureRecord>[0]>
type CashClosureWithId = CashClosureRecordInput & { id: string }
type PublishedCashSession = Parameters<typeof publishCashRealtime>[0]['session']
type PublishedOpenedCashSession = Parameters<typeof publishCashOpenedRealtime>[2]

export function recordCashSessionOpened(input: {
  auditLogService: AuditLogService
  command: OpenCashSessionCommand
  sessionId: string
  employeeId: string | null
  opening: ReturnType<typeof normalizeOpenCashSessionCommand>
}) {
  return input.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.command.auth),
    event: 'operations.cash_session.opened',
    resource: 'cash_session',
    resourceId: input.sessionId,
    metadata: {
      businessDate: formatBusinessDateKey(input.opening.businessDate),
      employeeId: input.employeeId,
      openingCashAmount: input.opening.openingCashAmount,
    },
    ...requestAuditContext(input.command.context),
  })
}

export function recordCashMovementCreated(input: {
  auditLogService: AuditLogService
  command: CreateCashMovementCommand
  movementId: string
  sessionId: string
}) {
  return input.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.command.auth),
    event: 'operations.cash_movement.created',
    resource: 'cash_session',
    resourceId: input.sessionId,
    metadata: {
      movementId: input.movementId,
      type: input.command.dto.type,
      amount: input.command.dto.amount,
    },
    ...requestAuditContext(input.command.context),
  })
}

export function recordCashSessionClosed(input: {
  auditLogService: AuditLogService
  command: CloseCashSessionCommand
  sessionId: string
  closing: ReturnType<typeof normalizeCloseCashSessionCommand>
  refreshedSession: CashSessionRecordInput
}) {
  return input.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.command.auth),
    event: 'operations.cash_session.closed',
    resource: 'cash_session',
    resourceId: input.sessionId,
    metadata: {
      countedCashAmount: input.closing.countedCashAmount,
      differenceAmount: toCashSessionRecord(input.refreshedSession)?.differenceAmount,
    },
    ...requestAuditContext(input.command.context),
  })
}

export function recordCashClosureClosed(input: {
  auditLogService: AuditLogService
  command: CloseCashClosureCommand
  closing: ReturnType<typeof normalizeCloseCashClosureCommand>
  closure: CashClosureWithId
}) {
  return input.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.command.auth),
    event: resolveCashClosureAuditEvent(input.closing.forceClose),
    resource: 'cash_closure',
    resourceId: input.closure.id,
    severity: resolveCashClosureAuditSeverity(input.closing.forceClose),
    metadata: {
      businessDate: formatBusinessDateKey(input.closing.businessDate),
      countedCashAmount: input.closing.countedCashAmount,
      differenceAmount: toClosureRecord(input.closure)?.differenceAmount,
    },
    ...requestAuditContext(input.command.context),
  })
}

export function publishOpenedCashSession(input: {
  cache: CacheService
  operationsRealtimeService: OperationsRealtimeService
  command: OpenCashSessionCommand
  session: PublishedOpenedCashSession
  closure: CashClosurePayloadInput
  opening: ReturnType<typeof normalizeOpenCashSessionCommand>
  mutationStartedAtMs: number
}) {
  invalidateOperationsLiveCache(input.cache, input.opening.workspaceOwnerUserId, input.opening.businessDate)
  publishCashOpenedRealtime(input.operationsRealtimeService, input.command.auth, input.session, input.closure, {
    mutationName: 'open-cash-session',
    mutationStartedAtMs: input.mutationStartedAtMs,
  })
}

export function publishCashSessionMutation(input: {
  cache: CacheService
  operationsRealtimeService: OperationsRealtimeService
  command: CreateCashMovementCommand | CloseCashSessionCommand
  session: PublishedCashSession
  closure: CashClosurePayloadInput
  businessDate: Date
  workspaceOwnerUserId: string
  mutationName: OperationsRealtimeMutationName
  mutationStartedAtMs: number
}) {
  invalidateOperationsLiveCache(input.cache, input.workspaceOwnerUserId, input.businessDate)
  publishCashRealtime({
    operationsRealtimeService: input.operationsRealtimeService,
    auth: input.command.auth,
    session: input.session,
    closure: input.closure,
    businessDate: input.businessDate,
    instrumentation: {
      mutationName: input.mutationName,
      mutationStartedAtMs: input.mutationStartedAtMs,
    },
  })
}

export function publishCashClosureMutation(input: {
  cache: CacheService
  operationsRealtimeService: OperationsRealtimeService
  command: CloseCashClosureCommand
  closing: ReturnType<typeof normalizeCloseCashClosureCommand>
  syncedClosure: CashClosurePayloadInput
  mutationStartedAtMs: number
}) {
  invalidateOperationsLiveCache(input.cache, input.closing.workspaceOwnerUserId, input.closing.businessDate)
  input.operationsRealtimeService.publishCashClosureUpdated(
    input.command.auth,
    buildCashClosurePayload(input.syncedClosure),
    {
      mutationName: 'close-cash-closure',
      mutationStartedAtMs: input.mutationStartedAtMs,
    },
  )
}

function requestAuditContext(context: RequestContext) {
  return {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  }
}
