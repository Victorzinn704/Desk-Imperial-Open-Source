import { Injectable, Logger } from '@nestjs/common'
import { AuditSeverity, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'

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
  if (!ua) return { browser: 'Navegador desconhecido', os: 'Sistema desconhecido' }

  let browser = 'Navegador'
  let os = 'Sistema desconhecido'

  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera'
  else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) browser = 'Chrome'
  else if (ua.includes('Chromium/')) browser = 'Chromium'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/') && ua.includes('Version/')) browser = 'Safari'

  if (ua.includes('Windows NT')) os = 'Windows'
  else if (ua.includes('iPhone')) os = 'iPhone'
  else if (ua.includes('iPad')) os = 'iPad'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'

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
              actorUserId: auth.userId,
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
