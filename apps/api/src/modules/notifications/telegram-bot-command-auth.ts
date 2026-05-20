import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuditLogService } from '../monitoring/audit-log.service'
import type { TelegramAuthService } from './telegram-auth.service'

type TelegramBotCommandAuthDependencies = {
  auditLogService: AuditLogService
  getCurrentRequestContext: () => RequestContext
  sendText: (chatId: number, text: string, accountId?: string) => Promise<void>
  telegramAuthService: TelegramAuthService
}

export class TelegramBotCommandAuth {
  constructor(private readonly deps: TelegramBotCommandAuthDependencies) {}

  async resolve(chatId: number, command: string, allowedRoles: Array<'OWNER' | 'STAFF'>) {
    const resolution = await this.deps.telegramAuthService.resolveChatAuth(BigInt(chatId))
    if (resolution.status === 'unlinked') {
      await this.deps.sendText(
        chatId,
        '⚠️ Sua conta não está vinculada. Acesse o portal do Desk Imperial e conecte seu Telegram em Configurações → Conta.',
      )
      await this.recordDenied(command, null, chatId, 'unlinked')
      return null
    }

    if (resolution.status === 'workspace_disabled') {
      await this.deps.sendText(
        chatId,
        '🔒 O bot do Telegram ainda não foi liberado para este workspace.',
        resolution.accountId,
      )
      await this.recordDenied(command, null, chatId, 'workspace_disabled')
      return null
    }

    if (resolution.status === 'user_disabled' || resolution.status === 'employee_disabled') {
      await this.deps.sendText(
        chatId,
        '🔒 Seu acesso no Desk Imperial está desativado. Procure o dono da empresa para revisar sua permissão.',
        resolution.accountId,
      )
      await this.recordDenied(command, null, chatId, resolution.status)
      return null
    }

    if (!allowedRoles.includes(resolution.auth.role)) {
      await this.deps.sendText(chatId, '🔒 Você não tem permissão para este comando.', resolution.accountId)
      await this.recordDenied(command, resolution.auth, chatId, 'insufficient_role')
      return null
    }

    void this.deps.telegramAuthService.touchAccount(resolution.accountId)
    return resolution
  }

  async recordExecuted(command: string, auth: { userId: string }, chatId: number) {
    const requestContext = this.deps.getCurrentRequestContext()
    await this.deps.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'telegram.command.executed',
      resource: 'telegram_command',
      resourceId: command,
      metadata: {
        command,
        telegramChatId: String(chatId),
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    })
  }

  async recordRejectedLinkToken(chatId: number, telegramUserId: number, reason: string) {
    const requestContext = this.deps.getCurrentRequestContext()
    await this.deps.auditLogService.record({
      event: 'telegram.link_token.rejected',
      resource: 'telegram_link_token',
      metadata: {
        reason,
        telegramChatId: String(chatId),
        telegramUserId: String(telegramUserId),
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    })
  }

  private async recordDenied(command: string, auth: { userId: string } | null, chatId: number, reason: string) {
    const requestContext = this.deps.getCurrentRequestContext()
    await this.deps.auditLogService.record({
      ...(auth ? { actorUserId: resolveAuthActorUserId(auth) } : {}),
      event: 'telegram.command.denied',
      resource: 'telegram_command',
      resourceId: command,
      metadata: {
        command,
        reason,
        telegramChatId: String(chatId),
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    })
  }
}
