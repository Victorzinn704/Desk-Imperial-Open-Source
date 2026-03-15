import { Injectable, Logger } from '@nestjs/common'
import { AuditSeverity, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

export type AuditLogInput = {
  actorUserId?: string | null
  event: string
  resource: string
  resourceId?: string | null
  severity?: AuditSeverity
  metadata?: Prisma.InputJsonValue
  ipAddress?: string | null
  userAgent?: string | null
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name)

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          event: input.event,
          resource: input.resource,
          resourceId: input.resourceId,
          severity: input.severity ?? AuditSeverity.INFO,
          metadata: input.metadata,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      })
    } catch (error) {
      this.logger.warn(`Nao foi possivel persistir audit log para o evento ${input.event}.`)
      this.logger.debug(error)
    }
  }
}
