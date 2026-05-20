import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { ComandaStatus } from '@prisma/client'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { OperationsHelpersService } from './operations-helpers.service'
import { assertMesaAvailability, resolveMesaSelection } from './comanda-mesa.utils'
import { isOpenComandaStatus } from './operations-domain.utils'

export type ComandaMutationContext = {
  actorEmployee: Awaited<ReturnType<OperationsHelpersService['resolveEmployeeForStaff']>>
  auth: AuthContext
  workspaceOwnerUserId: string
}

const COMANDA_MESSAGES = {
  openForItemMutation: 'Nao e possivel adicionar itens em uma comanda encerrada ou cancelada.',
  openForPayment: 'Nao e possivel registrar pagamento em uma comanda encerrada ou cancelada.',
  openForReplace: 'Nao e possivel editar uma comanda encerrada ou cancelada.',
  kitchenStaffRequired: 'Seu acesso precisa estar vinculado a um funcionario ativo para operar a cozinha.',
} as const

@Injectable()
export class ComandaMutationContextService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OperationsHelpersService) private readonly helpers: OperationsHelpersService,
  ) {}

  async resolve(auth: AuthContext): Promise<ComandaMutationContext> {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveActorEmployee(workspaceOwnerUserId, auth)

    return { actorEmployee, auth, workspaceOwnerUserId }
  }

  resolveWorkspaceOwnerUserId(auth: AuthContext) {
    return resolveWorkspaceOwnerUserId(auth)
  }

  resolveActorEmployee(workspaceOwnerUserId: string, auth: AuthContext) {
    return this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
  }

  async requireKitchenStaffContext(auth: AuthContext) {
    const context = await this.resolve(auth)
    if (auth.role === 'STAFF' && !context.actorEmployee) {
      throw new ForbiddenException(COMANDA_MESSAGES.kitchenStaffRequired)
    }

    return context
  }

  requireOwner(auth: AuthContext, message: string) {
    assertOwnerRole(auth, message)
    return this.resolveWorkspaceOwnerUserId(auth)
  }

  resolveMesaSelection(params: {
    currentComandaId?: string | undefined
    mesaId?: string | null | undefined
    tableLabel: string
    workspaceOwnerUserId: string
  }) {
    return resolveMesaSelection(
      this.prisma,
      this.helpers,
      params.workspaceOwnerUserId,
      params.tableLabel,
      params.mesaId,
      params.currentComandaId,
      (resolvedMesaId, resolvedCurrentComandaId) =>
        this.assertMesaAvailability(resolvedMesaId, resolvedCurrentComandaId),
    )
  }

  assertMesaAvailability(mesaId: string, currentComandaId?: string) {
    return assertMesaAvailability(this.prisma, mesaId, currentComandaId)
  }

  assertOpenForItemMutation(status: ComandaStatus) {
    this.assertOpenStatus(status, COMANDA_MESSAGES.openForItemMutation)
  }

  assertOpenForReplace(status: ComandaStatus) {
    this.assertOpenStatus(status, COMANDA_MESSAGES.openForReplace)
  }

  assertOpenForPayment(status: ComandaStatus) {
    this.assertOpenStatus(status, COMANDA_MESSAGES.openForPayment)
  }

  private assertOpenStatus(status: ComandaStatus, message: string) {
    if (!isOpenComandaStatus(status)) {
      throw new ConflictException(message)
    }
  }
}
