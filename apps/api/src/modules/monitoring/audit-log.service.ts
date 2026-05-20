import { Injectable, Logger } from '@nestjs/common'
import { AuditSeverity, type Prisma } from '@prisma/client'
import { recordAuditLogRecordTelemetry } from '../../common/observability/business-telemetry.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'

export type AuditLogInput = {
  actorUserId?: string | null | undefined
  event: string
  resource: string
  resourceId?: string | null | undefined
  severity?: AuditSeverity | undefined
  metadata?: Prisma.InputJsonValue | undefined
  ipAddress?: string | null | undefined
  userAgent?: string | null | undefined
}

export type LastLoginEntry = {
  id: string
  browser: string
  os: string
  ipAddress: string | null
  createdAt: string
}

export type ActivityFeedEntry = {
  id: string
  event: string
  resource: string
  resourceId: string | null
  severity: AuditSeverity
  actorUserId: string | null
  actorName: string | null
  actorRole: 'OWNER' | 'STAFF' | null
  ipAddress: string | null
  createdAt: string
  metadata: Prisma.JsonValue | null
}

function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) {
    return { browser: 'Navegador desconhecido', os: 'Sistema desconhecido' }
  }

  let browser = 'Navegador'
  let os = 'Sistema desconhecido'

  if (ua.includes('Edg/')) {
    browser = 'Edge'
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    browser = 'Opera'
  } else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) {
    browser = 'Chrome'
  } else if (ua.includes('Chromium/')) {
    browser = 'Chromium'
  } else if (ua.includes('Firefox/')) {
    browser = 'Firefox'
  } else if (ua.includes('Safari/') && ua.includes('Version/')) {
    browser = 'Safari'
  }

  if (ua.includes('Windows NT')) {
    os = 'Windows'
  } else if (ua.includes('iPhone')) {
    os = 'iPhone'
  } else if (ua.includes('iPad')) {
    os = 'iPad'
  } else if (ua.includes('Android')) {
    os = 'Android'
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS'
  } else if (ua.includes('Linux')) {
    os = 'Linux'
  }

  return { browser, os }
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name)

  constructor(private readonly prisma: PrismaService) {}

  async getLastLoginsForUser(userId: string, limit = 10): Promise<LastLoginEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { actorUserId: userId, event: 'auth.login.succeeded' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, createdAt: true, ipAddress: true, userAgent: true },
    })

    return logs.map((log) => {
      const { browser, os } = parseUserAgent(log.userAgent)
      return {
        id: log.id,
        browser,
        os,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      }
    })
  }

  async getActivityFeedForAuth(auth: AuthContext, limit = 40): Promise<ActivityFeedEntry[]> {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorUserId = resolveAuthActorUserId(auth)
    const logs = await this.prisma.auditLog.findMany({
      where:
        auth.role === 'OWNER'
          ? {
              OR: [
                { actorUserId: workspaceOwnerUserId },
                {
                  actor: {
                    companyOwnerId: workspaceOwnerUserId,
                  },
                },
              ],
            }
          : {
              actorUserId,
            },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    })

    return logs.map((log) => ({
      id: log.id,
      event: log.event,
      resource: log.resource,
      resourceId: log.resourceId,
      severity: log.severity,
      actorUserId: log.actorUserId,
      actorName: log.actor?.fullName ?? null,
      actorRole: log.actor?.role ?? null,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      metadata: log.metadata ?? null,
    }))
  }

  async record(input: AuditLogInput) {
    const startedAt = performance.now()
    try {
      const data = {
        event: input.event,
        resource: input.resource,
        severity: input.severity ?? AuditSeverity.INFO,
        ...(input.actorUserId !== undefined ? { actorUserId: input.actorUserId } : {}),
        ...(input.resourceId !== undefined ? { resourceId: input.resourceId } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent !== undefined ? { userAgent: input.userAgent } : {}),
      }

      await this.prisma.auditLog.create({
        data,
      })
      recordAuditLogRecordTelemetry(performance.now() - startedAt, {
        'desk.audit.event': input.event,
        'desk.audit.resource': input.resource,
        'desk.audit.result': 'ok',
      })
    } catch (error) {
      recordAuditLogRecordTelemetry(performance.now() - startedAt, {
        'desk.audit.event': input.event,
        'desk.audit.resource': input.resource,
        'desk.audit.result': 'error',
      })
      this.logger.warn(`Nao foi possivel persistir audit log para o evento ${input.event}.`)
      this.logger.debug(error)
    }
  }
}
