import { BadRequestException } from '@nestjs/common'
import { AuditSeverity, CashClosureStatus, CashMovementType } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import type { AuthContext } from '../auth/auth.types'
import type {
  CloseCashClosureDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
  OpenCashSessionDto,
  OperationsResponseOptionsDto,
} from './operations.schemas'
import { resolveBusinessDate } from './operations-domain.utils'

export type OpenCashSessionCommand = {
  auth: AuthContext
  dto: OpenCashSessionDto
  context: RequestContext
  options?: OperationsResponseOptionsDto | undefined
}

export type CreateCashMovementCommand = {
  auth: AuthContext
  cashSessionId: string
  dto: CreateCashMovementDto
  context: RequestContext
  options?: OperationsResponseOptionsDto | undefined
}

export type CloseCashSessionCommand = {
  auth: AuthContext
  cashSessionId: string
  dto: CloseCashSessionDto
  context: RequestContext
  options?: OperationsResponseOptionsDto | undefined
}

export type CloseCashClosureCommand = {
  auth: AuthContext
  dto: CloseCashClosureDto
  context: RequestContext
  options?: OperationsResponseOptionsDto | undefined
}

export function normalizeOpenCashSessionCommand(command: OpenCashSessionCommand) {
  return {
    workspaceOwnerUserId: resolveWorkspaceOwnerUserId(command.auth),
    businessDate: resolveBusinessDate(command.dto.businessDate),
    openingCashAmount: roundCurrency(command.dto.openingCashAmount),
    notes: sanitizePlainText(command.dto.notes, 'Observacoes da abertura', {
      allowEmpty: true,
      rejectFormula: false,
    }),
  }
}

export function normalizeCashMovementCommand(command: CreateCashMovementCommand) {
  if (command.dto.type === CashMovementType.OPENING_FLOAT) {
    throw new BadRequestException('O tipo OPENING_FLOAT e reservado para a abertura do caixa.')
  }

  return {
    workspaceOwnerUserId: resolveWorkspaceOwnerUserId(command.auth),
    amount: roundCurrency(command.dto.amount),
    note: sanitizePlainText(command.dto.note, 'Observacao da movimentacao', {
      allowEmpty: true,
      rejectFormula: false,
    }),
  }
}

export function normalizeCloseCashSessionCommand(command: CloseCashSessionCommand) {
  return {
    workspaceOwnerUserId: resolveWorkspaceOwnerUserId(command.auth),
    countedCashAmount: roundCurrency(command.dto.countedCashAmount),
    notes: sanitizePlainText(command.dto.notes, 'Observacoes do fechamento', {
      allowEmpty: true,
      rejectFormula: false,
    }),
  }
}

export function normalizeCloseCashClosureCommand(command: CloseCashClosureCommand) {
  return {
    workspaceOwnerUserId: resolveWorkspaceOwnerUserId(command.auth),
    businessDate: resolveBusinessDate(command.dto.businessDate),
    countedCashAmount: roundCurrency(command.dto.countedCashAmount),
    forceClose: command.dto.forceClose ?? false,
    notes: sanitizePlainText(command.dto.notes, 'Observacoes do fechamento consolidado', {
      allowEmpty: true,
      rejectFormula: false,
    }),
  }
}

export function requireCashOpeningEmployeeId(auth: AuthContext, employee: { id: string } | null | undefined) {
  if (auth.role !== 'STAFF') {
    return null
  }

  if (!employee?.id) {
    throw new BadRequestException('Seu acesso precisa estar vinculado a um funcionario ativo para abrir caixa.')
  }

  return employee.id
}

export function shouldBlockCashClosureClose(input: {
  forceClose: boolean
  openSessionsCount: number
  openComandasCount: number
}) {
  return !input.forceClose && (input.openSessionsCount > 0 || input.openComandasCount > 0)
}

export function resolveClosedCashClosureStatus(forceClose: boolean) {
  return forceClose ? CashClosureStatus.FORCE_CLOSED : CashClosureStatus.CLOSED
}

export function resolveCashClosureAuditSeverity(forceClose: boolean) {
  return forceClose ? AuditSeverity.WARN : AuditSeverity.INFO
}

export function resolveCashClosureAuditEvent(forceClose: boolean) {
  return forceClose ? 'operations.cash_closure.force_closed' : 'operations.cash_closure.closed'
}
