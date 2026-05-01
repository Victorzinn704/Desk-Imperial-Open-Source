import { ForbiddenException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { TelegramAccountStatus } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import type { AuthContext } from '../auth/auth.types'
import { hashToken, resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { PrismaService } from '../../database/prisma.service'
import type { MailerService } from '../mailer/mailer.service'
import type { AuditLogService } from '../monitoring/audit-log.service'
import type { TelegramAdapter } from './infra/telegram/telegram.adapter'
import type {
  TelegramHealthResponse,
  TelegramIntegrationStatusResponse,
  TelegramLinkTokenResponse,
  TelegramUnlinkResponse,
} from './telegram.types'

type ConsumeLinkTokenResult =
  | {
      ok: true
      workspaceOwnerUserId: string
      userId: string
      companyName: string | null
    }
  | {
      ok: false
      reason: 'invalid' | 'expired' | 'already_used' | 'workspace_disabled'
    }

@Injectable()
export class TelegramLinkService {
  private readonly logger = new Logger(TelegramLinkService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly mailerService: MailerService,
    private readonly telegramAdapter: TelegramAdapter,
  ) {}

  async createLinkToken(auth: AuthContext, context: RequestContext): Promise<TelegramLinkTokenResponse> {
    this.assertWorkspaceEnabled(auth.workspaceOwnerUserId)

    const botUsername = this.telegramAdapter.getBotUsername()
    if (!botUsername) {
      throw new ServiceUnavailableException('TELEGRAM_BOT_USERNAME ausente.')
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await this.prisma.telegramLinkToken.create({
      data: {
        token: tokenHash,
        userId: auth.userId,
        workspaceOwnerUserId: auth.workspaceOwnerUserId,
        expiresAt,
        ipAddress: context.ipAddress,
      },
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'telegram.link_token.generated',
      resource: 'telegram_link_token',
      resourceId: tokenHash,
      metadata: {
        workspaceOwnerUserId: auth.workspaceOwnerUserId,
        expiresAt: expiresAt.toISOString(),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      token,
      deeplink: this.telegramAdapter.buildDeeplink(token),
      expiresAt: expiresAt.toISOString(),
      botUsername,
    }
  }

  async getStatus(auth: AuthContext): Promise<TelegramIntegrationStatusResponse> {
    const botUsername = this.telegramAdapter.getBotUsername()
    const enabled = this.telegramAdapter.isBotEnabled()
    const workspaceEnabled = enabled && this.telegramAdapter.isWorkspaceEnabled(auth.workspaceOwnerUserId)

    const account = await this.prisma.telegramAccount.findFirst({
      where: {
        userId: auth.userId,
        workspaceOwnerUserId: auth.workspaceOwnerUserId,
        status: TelegramAccountStatus.ACTIVE,
      },
      orderBy: { linkedAt: 'desc' },
    })

    return {
      enabled,
      workspaceEnabled,
      restrictionReason: this.resolveRestrictionReason(enabled, workspaceEnabled),
      botUsername,
      deeplinkBase: botUsername ? `https://t.me/${botUsername}` : null,
      linked: Boolean(account),
      account: this.buildAccountStatus(account),
    }
  }

  private resolveRestrictionReason(enabled: boolean, workspaceEnabled: boolean) {
    if (!enabled) {
      return 'environment_disabled' as const
    }

    if (!workspaceEnabled) {
      return 'workspace_closed' as const
    }

    return null
  }

  private buildAccountStatus(
    account: {
      telegramChatId: bigint
      telegramUserId: bigint
      telegramUsername: string | null
      status: TelegramAccountStatus
      linkedAt: Date
      lastActiveAt: Date
    } | null,
  ) {
    if (!account) {
      return null
    }

    return {
      telegramChatId: account.telegramChatId.toString(),
      telegramUserId: account.telegramUserId.toString(),
      telegramUsername: account.telegramUsername,
      status: account.status,
      linkedAt: account.linkedAt.toISOString(),
      lastActiveAt: account.lastActiveAt.toISOString(),
    }
  }

  async unlinkForPortal(auth: AuthContext, context: RequestContext): Promise<TelegramUnlinkResponse> {
    const result = await this.prisma.telegramAccount.updateMany({
      where: {
        userId: auth.userId,
        workspaceOwnerUserId: auth.workspaceOwnerUserId,
        status: TelegramAccountStatus.ACTIVE,
      },
      data: {
        status: TelegramAccountStatus.REVOKED,
        revokedAt: new Date(),
      },
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'telegram.account.unlinked',
      resource: 'telegram_account',
      metadata: {
        revokedCount: result.count,
        initiator: 'portal',
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      success: true,
      revokedCount: result.count,
    }
  }

  async unlinkChat(chatId: bigint, userId: string, context: RequestContext): Promise<number> {
    const result = await this.prisma.telegramAccount.updateMany({
      where: {
        telegramChatId: chatId,
        userId,
        status: TelegramAccountStatus.ACTIVE,
      },
      data: {
        status: TelegramAccountStatus.REVOKED,
        revokedAt: new Date(),
      },
    })

    await this.auditLogService.record({
      actorUserId: userId,
      event: 'telegram.account.unlinked',
      resource: 'telegram_account',
      metadata: {
        revokedCount: result.count,
        initiator: 'bot',
        telegramChatId: chatId.toString(),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return result.count
  }

  async consumeStartToken(
    token: string,
    telegramChatId: bigint,
    telegramUserId: bigint,
    telegramUsername: string | null,
    context: RequestContext,
  ): Promise<ConsumeLinkTokenResult> {
    const tokenHash = hashToken(token)
    const lookup = await this.prisma.telegramLinkToken.findFirst({
      where: {
        OR: [{ token: tokenHash }, { token }],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            companyName: true,
          },
        },
      },
    })

    if (!lookup) {
      return { ok: false, reason: 'invalid' }
    }
    if (lookup.usedAt) {
      return { ok: false, reason: 'already_used' }
    }
    if (lookup.expiresAt.getTime() < Date.now()) {
      return { ok: false, reason: 'expired' }
    }
    if (!this.telegramAdapter.isWorkspaceEnabled(lookup.workspaceOwnerUserId)) {
      return { ok: false, reason: 'workspace_disabled' }
    }

    const linkedAt = new Date()
    const result = await this.prisma.$transaction(async (transaction) => {
      await transaction.telegramAccount.updateMany({
        where: {
          telegramChatId,
          status: TelegramAccountStatus.ACTIVE,
        },
        data: {
          status: TelegramAccountStatus.REVOKED,
          revokedAt: linkedAt,
        },
      })

      const createdAccount = await transaction.telegramAccount.create({
        data: {
          userId: lookup.userId,
          workspaceOwnerUserId: lookup.workspaceOwnerUserId,
          telegramChatId,
          telegramUserId,
          telegramUsername,
          linkedAt,
          lastActiveAt: linkedAt,
        },
      })

      await transaction.telegramLinkToken.update({
        where: { token: lookup.token },
        data: { usedAt: linkedAt },
      })

      return {
        account: createdAccount,
      }
    })

    await this.auditLogService.record({
      actorUserId: lookup.userId,
      event: 'telegram.link_token.consumed',
      resource: 'telegram_link_token',
      resourceId: tokenHash,
      metadata: {
        telegramChatId: telegramChatId.toString(),
        telegramUserId: telegramUserId.toString(),
        telegramUsername,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    await this.auditLogService.record({
      actorUserId: lookup.userId,
      event: 'telegram.account.linked',
      resource: 'telegram_account',
      resourceId: result.account.id,
      metadata: {
        workspaceOwnerUserId: lookup.workspaceOwnerUserId,
        telegramChatId: telegramChatId.toString(),
        telegramUserId: telegramUserId.toString(),
        telegramUsername,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    try {
      await this.mailerService.sendTelegramLinkedEmail({
        to: lookup.user.email,
        fullName: lookup.user.fullName,
        linkedAt,
        telegramUsername,
        telegramChatId: telegramChatId.toString(),
      })
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar alerta de vinculacao do Telegram para ${lookup.user.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }

    return {
      ok: true,
      workspaceOwnerUserId: lookup.workspaceOwnerUserId,
      userId: lookup.userId,
      companyName: lookup.user.companyName ?? null,
    }
  }

  async markAccountBlocked(accountId: string) {
    await this.prisma.telegramAccount.updateMany({
      where: {
        id: accountId,
        status: TelegramAccountStatus.ACTIVE,
      },
      data: {
        status: TelegramAccountStatus.BLOCKED,
        revokedAt: new Date(),
      },
    })
  }

  async getHealth(): Promise<TelegramHealthResponse> {
    if (!this.telegramAdapter.isBotEnabled()) {
      return {
        status: 'disabled',
        expectedWebhookUrl: this.telegramAdapter.getWebhookUrl(),
        actualWebhookUrl: null,
        pendingUpdateCount: null,
        lastErrorMessage: null,
        lastErrorAt: null,
        reason: this.telegramAdapter.getBotToken() ? 'TELEGRAM_BOT_ENABLED=false.' : 'TELEGRAM_BOT_TOKEN ausente.',
      }
    }

    const expectedWebhookUrl = this.telegramAdapter.getWebhookUrl()

    try {
      const info = await this.telegramAdapter.getWebhookInfo()
      const actualWebhookUrl = info.url ?? null
      const webhookMatches = !expectedWebhookUrl || expectedWebhookUrl === actualWebhookUrl

      return {
        status: webhookMatches ? 'ok' : 'degraded',
        expectedWebhookUrl,
        actualWebhookUrl,
        pendingUpdateCount: info.pending_update_count ?? 0,
        lastErrorMessage: info.last_error_message ?? null,
        lastErrorAt: info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : null,
        ...(webhookMatches ? {} : { reason: 'Webhook configurado em URL diferente da esperada.' }),
      }
    } catch (error) {
      return {
        status: 'degraded',
        expectedWebhookUrl,
        actualWebhookUrl: null,
        pendingUpdateCount: null,
        lastErrorMessage: error instanceof Error ? error.message : 'Falha ao consultar webhook do Telegram.',
        lastErrorAt: null,
        reason: 'Nao foi possivel consultar o estado do webhook do Telegram.',
      }
    }
  }

  private assertWorkspaceEnabled(workspaceOwnerUserId: string) {
    if (!this.telegramAdapter.isBotEnabled()) {
      throw new ServiceUnavailableException('Integração Telegram indisponível neste ambiente.')
    }

    if (!this.telegramAdapter.isWorkspaceEnabled(workspaceOwnerUserId)) {
      throw new ForbiddenException('Integração Telegram ainda não liberada para este workspace.')
    }
  }
}
