import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ComandaPaymentStatus } from '@prisma/client'
import type { AuthContext } from '../auth/auth.types'
import { PrismaService } from '../../database/prisma.service'
import { toComandaRecord } from './operations.types'
import { ComandaMutationContextService } from './comanda-mutation-context.service'
import { isOpenComandaStatus } from './operations-domain.utils'

@Injectable()
export class ComandaQueryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ComandaMutationContextService) private readonly context: ComandaMutationContextService,
  ) {}

  async getComandaDetails(auth: AuthContext, comandaId: string) {
    const workspaceOwnerUserId = this.context.resolveWorkspaceOwnerUserId(auth)
    const comanda = await this.loadComanda(workspaceOwnerUserId, comandaId)
    await this.assertStaffCanReadComanda(auth, workspaceOwnerUserId, comanda)

    return {
      comanda: toComandaRecord(comanda),
    }
  }

  private async loadComanda(workspaceOwnerUserId: string, comandaId: string) {
    const comanda = await this.prisma.comanda.findFirst({
      where: { id: comandaId, companyOwnerId: workspaceOwnerUserId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        payments: {
          where: { status: ComandaPaymentStatus.CONFIRMED },
          orderBy: { paidAt: 'asc' },
        },
      },
    })

    if (!comanda) {
      throw new NotFoundException('Comanda nao encontrada.')
    }

    return comanda
  }

  private async assertStaffCanReadComanda(
    auth: AuthContext,
    workspaceOwnerUserId: string,
    comanda: Awaited<ReturnType<ComandaQueryService['loadComanda']>>,
  ) {
    if (auth.role !== 'STAFF') {
      return
    }

    const actorEmployee = await this.context.resolveActorEmployee(workspaceOwnerUserId, auth)
    if (!actorEmployee) {
      throw new ForbiddenException('Seu acesso precisa estar vinculado a um funcionario ativo para consultar comandas.')
    }

    if (!isOpenComandaStatus(comanda.status) && comanda.currentEmployeeId !== actorEmployee.id) {
      throw new ForbiddenException('Seu acesso so pode consultar historico do seu proprio atendimento.')
    }
  }
}
