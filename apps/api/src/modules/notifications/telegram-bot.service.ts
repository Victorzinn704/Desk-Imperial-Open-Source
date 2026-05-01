import { Injectable, Logger } from '@nestjs/common'
import { Bot, type Context } from 'grammy'
import type { Update } from 'grammy/types'
import { AsyncLocalStorage } from 'node:async_hooks'
import { CacheService } from '../../common/services/cache.service'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import { EmployeesService } from '../employees/employees.service'
import { FinanceService } from '../finance/finance.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsService } from '../operations/operations.service'
import { NotificationsService } from './notifications.service'
import { TelegramAuthService } from './telegram-auth.service'
import {
  TelegramAdapter,
  type TelegramInlineKeyboardMarkup,
  type TelegramMessageOptions,
} from './infra/telegram/telegram.adapter'
import { TelegramLinkService } from './telegram-link.service'

type SupportedCommand =
  | 'start'
  | 'ajuda'
  | 'menu'
  | 'status'
  | 'portal'
  | 'vendas'
  | 'caixa'
  | 'relatorio'
  | 'equipe'
  | 'alertas'
  | 'desvincular'

type InteractiveMessageTarget = {
  chatId: number
  accountId?: string
  messageId?: number
}

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name)
  private readonly requestContextStorage = new AsyncLocalStorage<RequestContext>()
  private bot: Bot | null = null

  constructor(
    private readonly cache: CacheService,
    private readonly auditLogService: AuditLogService,
    private readonly operationsService: OperationsService,
    private readonly financeService: FinanceService,
    private readonly employeesService: EmployeesService,
    private readonly notificationsService: NotificationsService,
    private readonly telegramAdapter: TelegramAdapter,
    private readonly telegramLinkService: TelegramLinkService,
    private readonly telegramAuthService: TelegramAuthService,
  ) {}

  async handleWebhookUpdate(update: Update, requestContext: RequestContext) {
    if (!this.telegramAdapter.isBotEnabled()) {
      return
    }

    const bot = this.getBot()
    await this.requestContextStorage.run(this.normalizeRequestContext(requestContext), async () => {
      await bot.handleUpdate(update)
    })
  }

  private getBot() {
    if (this.bot) {
      return this.bot
    }

    const token = this.telegramAdapter.getBotToken()
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN ausente.')
    }

    const bot = new Bot(token, {
      botInfo: {
        id: 0,
        is_bot: true,
        first_name: 'Desk Imperial',
        username: this.telegramAdapter.getBotUsername() ?? 'Desk_Imperial_bot',
        can_join_groups: false,
        can_read_all_group_messages: false,
        supports_inline_queries: false,
        can_manage_bots: false,
        can_connect_to_business: false,
        has_main_web_app: false,
        has_topics_enabled: false,
        allows_users_to_create_topics: false,
      },
    })

    bot.use(async (ctx, next) => {
      const allowed = await this.rememberUpdate(ctx.update.update_id)
      if (!allowed) {
        return
      }
      await next()
    })

    bot.use(async (ctx, next) => {
      const chatId = ctx.chat?.id
      if (!chatId) {
        return
      }

      const count = await this.cache.increment(CacheService.telegramRateLimitKey(String(chatId)), 60)
      if (count > 20) {
        await this.auditLogService.record({
          event: 'telegram.command.denied',
          resource: 'telegram_command',
          metadata: {
            command: this.extractCommandName(ctx.message?.text),
            reason: 'rate_limit',
            telegramChatId: String(chatId),
          },
          ipAddress: this.getCurrentRequestContext().ipAddress,
          userAgent: this.getCurrentRequestContext().userAgent,
        })

        if (count === 21) {
          await this.safeSend(chatId, '⏱ Muitas requisições. Aguarde um minuto e tente novamente.')
        }
        return
      }

      await next()
    })

    bot.use(async (ctx, next) => {
      if (!ctx.chat) {
        return
      }

      if (ctx.chat.type !== 'private') {
        await this.safeSend(ctx.chat.id, 'Use o bot no chat privado com o Desk Imperial.')
        return
      }

      await next()
    })

    bot.on('message:text', async (ctx) => {
      const command = this.extractCommandName(ctx.message?.text)

      switch (command) {
        case 'start':
          await this.handleStart(ctx)
          return
        case 'ajuda':
        case 'menu':
          await this.handleAjuda(ctx)
          return
        case 'status':
          await this.handleStatus(ctx)
          return
        case 'portal':
          await this.handlePortal(ctx)
          return
        case 'vendas':
          await this.handleVendas(ctx)
          return
        case 'caixa':
          await this.handleCaixa(ctx)
          return
        case 'relatorio':
          await this.handleRelatorio(ctx)
          return
        case 'equipe':
          await this.handleEquipe(ctx)
          return
        case 'alertas':
          await this.handleAlertas(ctx)
          return
        case 'desvincular':
          await this.handleDesvincular(ctx)
          return
        default:
          await this.safeSendInteractive(
            {
              chatId: ctx.chat.id,
            },
            'Comando não reconhecido. Use os atalhos abaixo para continuar no Desk Imperial.',
          )
      }
    })

    bot.on('callback_query:data', async (ctx) => {
      const callbackId = ctx.callbackQuery.id
      const action = ctx.callbackQuery.data?.trim() ?? ''
      if (!action) {
        await this.safeAnswerCallback(callbackId)
        return
      }

      await this.safeAnswerCallback(callbackId)
      await this.handleInteractiveAction(ctx, action)
    })

    bot.catch((error) => {
      this.logger.error(
        `Falha não tratada no runtime do Telegram: ${error.error instanceof Error ? error.error.stack : String(error.error)}`,
      )
    })

    this.bot = bot
    return bot
  }

  private async handleStart(ctx: Context) {
    const chatId = ctx.chat?.id
    const from = ctx.from
    if (!(chatId && from)) {
      return
    }

    const token = this.extractCommandPayload(ctx.message?.text)
    if (!token) {
      await this.safeSendOnboarding(
        { chatId },
        [
          'Desk Imperial no Telegram',
          '',
          '1. Abra o portal do Desk Imperial.',
          '2. Entre em Configurações → Conta.',
          "3. Gere o vínculo em 'Conectar Telegram'.",
          '',
          'Depois disso, este chat acompanha operação, caixa, vendas e equipe com atalhos interativos.',
        ].join('\n'),
      )
      return
    }

    const result = await this.telegramLinkService.consumeStartToken(
      token,
      BigInt(chatId),
      BigInt(from.id),
      from.username ?? null,
      this.getCurrentRequestContext(),
    )

    if (!result.ok) {
      const messages: Record<typeof result.reason, string> = {
        invalid: '❌ Token inválido. Gere um novo no portal.',
        expired: '⏱ Token expirado. Gere um novo no portal.',
        already_used: '⚠️ Este token já foi usado. Gere um novo no portal.',
        workspace_disabled: '🔒 O bot do Telegram ainda não foi liberado para este workspace.',
      }
      await this.safeSend(chatId, messages[result.reason])

      await this.auditLogService.record({
        event: 'telegram.link_token.rejected',
        resource: 'telegram_link_token',
        metadata: {
          reason: result.reason,
          telegramChatId: String(chatId),
          telegramUserId: String(from.id),
        },
        ipAddress: this.getCurrentRequestContext().ipAddress,
        userAgent: this.getCurrentRequestContext().userAgent,
      })
      return
    }

    const label = result.companyName?.trim() || 'seu workspace'
    await this.safeSendOnboarding(
      { chatId },
      [`✅ Telegram conectado à conta ${label}.`, '', 'Use os atalhos abaixo para navegar sem decorar comandos.'].join(
        '\n',
      ),
    )
  }

  private async handleAjuda(ctx: Context) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const resolution = await this.resolveProtectedCommand(ctx, 'ajuda', ['OWNER', 'STAFF'])
    if (!resolution) {
      return
    }

    const common = ['/ajuda', '/menu', '/vendas', '/status', '/portal', '/desvincular']
    const ownerExtras =
      resolution.auth.role === 'OWNER' ? ['/caixa', '/relatorio', '/equipe', '/alertas'] : ['/alertas']
    await this.safeSendInteractive(
      { chatId, accountId: resolution.accountId },
      [
        'Painel rápido do bot',
        '',
        'Use os cards abaixo para navegar. Se preferir comandos, estes são os principais:',
        ...common,
        ...ownerExtras,
      ].join('\n'),
    )
    await this.recordCommandExecuted('ajuda', resolution.auth, chatId)
  }

  private async handleStatus(ctx: Context) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const resolution = await this.resolveProtectedCommand(ctx, 'status', ['OWNER', 'STAFF'])
    if (!resolution) {
      return
    }

    const enabledChannels = this.notificationsService
      .getChannelCapabilities()
      .filter((channel) => channel.enabled)
      .map((channel) => channel.channel)

    await this.safeSendInteractive(
      { chatId, accountId: resolution.accountId },
      [
        '🧭 Status do seu acesso',
        `Empresa: ${resolution.auth.companyName?.trim() || 'Workspace principal'}`,
        `Perfil: ${resolution.auth.role === 'OWNER' ? 'Dono' : 'Operação / staff'}`,
        `Usuário: ${resolution.auth.fullName}`,
        `Canal do bot: @${this.telegramAdapter.getBotUsername() ?? 'Desk_Imperial_bot'}`,
        enabledChannels.length ? `Canais ativos: ${enabledChannels.join(', ')}` : 'Canais ativos: nenhum',
      ].join('\n'),
    )

    await this.recordCommandExecuted('status', resolution.auth, chatId)
  }

  private async handlePortal(ctx: Context) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const resolution = await this.resolveProtectedCommand(ctx, 'portal', ['OWNER', 'STAFF'])
    if (!resolution) {
      return
    }

    const portalUrl = this.telegramAdapter.buildPortalUrl('/app')
    await this.safeSendInteractive(
      { chatId, accountId: resolution.accountId },
      [
        '🌐 Portal do Desk Imperial',
        portalUrl ? portalUrl : 'O link público do portal ainda não foi configurado neste ambiente.',
        '',
        'Use o portal para ajustar preferências, vínculo do Telegram e governança operacional.',
      ].join('\n'),
    )

    await this.recordCommandExecuted('portal', resolution.auth, chatId)
  }

  private async handleVendas(ctx: Context) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const resolution = await this.resolveProtectedCommand(ctx, 'vendas', ['OWNER', 'STAFF'])
    if (!resolution) {
      return
    }

    const summary = await this.operationsService.getSummaryView(resolution.auth, {})
    const leadingProduct = summary.topProducts[0]

    await this.safeSendInteractive(
      { chatId, accountId: resolution.accountId },
      [
        '📊 Vendas de hoje',
        `Receita realizada: ${this.formatCurrency(summary.kpis.receitaRealizada, resolution.auth.preferredCurrency)}`,
        `Faturamento aberto: ${this.formatCurrency(summary.kpis.faturamentoAberto, resolution.auth.preferredCurrency)}`,
        `Projeção total: ${this.formatCurrency(summary.kpis.projecaoTotal, resolution.auth.preferredCurrency)}`,
        `Comandas abertas: ${summary.kpis.openComandasCount}`,
        leadingProduct ? `Produto líder: ${leadingProduct.nome}` : 'Produto líder: sem dados',
      ].join('\n'),
    )

    await this.recordCommandExecuted('vendas', resolution.auth, chatId)
  }

  private async handleCaixa(ctx: Context) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const resolution = await this.resolveProtectedCommand(ctx, 'caixa', ['OWNER'])
    if (!resolution) {
      return
    }

    const live = await this.operationsService.getLiveSnapshot(resolution.auth, {
      compactMode: true,
      includeCashMovements: false,
    })

    const openSessions = live.employees.filter((employee) => employee.cashSession?.status === 'OPEN').length
    const ownerSessionOpen = live.unassigned.cashSession?.status === 'OPEN' ? 1 : 0
    const closure = live.closure

    await this.safeSendInteractive(
      { chatId, accountId: resolution.accountId },
      [
        '💰 Caixa do dia',
        `Sessões abertas: ${openSessions + ownerSessionOpen}`,
        `Comandas abertas: ${closure?.openComandasCount ?? 0}`,
        `Caixa esperado: ${this.formatCurrency(closure?.expectedCashAmount ?? 0, resolution.auth.preferredCurrency)}`,
        `Receita bruta: ${this.formatCurrency(closure?.grossRevenueAmount ?? 0, resolution.auth.preferredCurrency)}`,
        `Lucro realizado: ${this.formatCurrency(closure?.realizedProfitAmount ?? 0, resolution.auth.preferredCurrency)}`,
      ].join('\n'),
    )

    await this.recordCommandExecuted('caixa', resolution.auth, chatId)
  }

  private async handleRelatorio(ctx: Context) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const resolution = await this.resolveProtectedCommand(ctx, 'relatorio', ['OWNER'])
    if (!resolution) {
      return
    }

    const finance = await this.financeService.getSummaryForUser(resolution.auth)
    const topCategory = finance.salesCategoryBreakdown?.[0] ?? finance.categoryBreakdown[0]
    const topProduct = finance.topProducts[0]

    await this.safeSendInteractive(
      { chatId, accountId: resolution.accountId },
      [
        '📈 Relatório financeiro',
        `Receita do mês: ${this.formatCurrency(finance.totals.currentMonthRevenue, finance.displayCurrency)}`,
        `Lucro do mês: ${this.formatCurrency(finance.totals.currentMonthProfit, finance.displayCurrency)}`,
        `Margem média: ${finance.totals.averageMarginPercent.toFixed(1)}%`,
        `Pedidos concluídos: ${finance.totals.completedOrders}`,
        topCategory ? `Categoria líder: ${topCategory.category}` : 'Categoria líder: sem dados',
        topProduct ? `Produto líder: ${topProduct.name}` : 'Produto líder: sem dados',
      ].join('\n'),
    )

    await this.recordCommandExecuted('relatorio', resolution.auth, chatId)
  }

  private async handleEquipe(ctx: Context) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const resolution = await this.resolveProtectedCommand(ctx, 'equipe', ['OWNER'])
    if (!resolution) {
      return
    }

    const employees = await this.employeesService.listForUser(resolution.auth)
    const activePreview = employees.items
      .filter((employee) => employee.active)
      .slice(0, 8)
      .map((employee) => `- ${employee.displayName} (${employee.employeeCode})`)

    await this.safeSendInteractive(
      { chatId, accountId: resolution.accountId },
      [
        '👥 Equipe ativa',
        `Total de funcionários: ${employees.totals.totalEmployees}`,
        `Ativos: ${employees.totals.activeEmployees}`,
        ...(activePreview.length ? activePreview : ['Nenhum funcionário ativo no momento.']),
      ].join('\n'),
    )

    await this.recordCommandExecuted('equipe', resolution.auth, chatId)
  }

  private async handleAlertas(ctx: Context) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const resolution = await this.resolveProtectedCommand(ctx, 'alertas', ['OWNER', 'STAFF'])
    if (!resolution) {
      return
    }

    const deliveryChannels = this.notificationsService
      .getChannelCapabilities()
      .filter((channel) => channel.enabled)
      .map((channel) => `- ${channel.channel}`)

    await this.safeSendInteractive(
      { chatId, accountId: resolution.accountId },
      [
        '🔔 Alertas disponíveis',
        deliveryChannels.length ? 'Canais ativos:' : 'Nenhum canal outbound ativo.',
        ...(deliveryChannels.length ? deliveryChannels : []),
        'Eventos padrão do rollout atual:',
        '- sales.daily_summary',
        '- sales.weekly_summary',
        '- inventory.low_stock',
        '- cash.closed',
        '- operations.alert',
        '',
        'Ajuste fino de preferências fica no portal do Desk Imperial.',
      ].join('\n'),
    )

    await this.recordCommandExecuted('alertas', resolution.auth, chatId)
  }

  private async handleDesvincular(ctx: Context) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const resolution = await this.resolveProtectedCommand(ctx, 'desvincular', ['OWNER', 'STAFF'])
    if (!resolution) {
      return
    }

    await this.telegramLinkService.unlinkChat(BigInt(chatId), resolution.auth.userId, this.getCurrentRequestContext())
    await this.safeSend(chatId, '👋 Este chat foi desvinculado da sua conta do Desk Imperial.', resolution.accountId)
    await this.recordCommandExecuted('desvincular', resolution.auth, chatId)
  }

  private async resolveProtectedCommand(
    ctx: Context,
    command: SupportedCommand,
    allowedRoles: Array<'OWNER' | 'STAFF'>,
  ) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return null
    }

    const resolution = await this.telegramAuthService.resolveChatAuth(BigInt(chatId))
    if (resolution.status === 'unlinked') {
      await this.safeSend(
        chatId,
        '⚠️ Sua conta não está vinculada. Acesse o portal do Desk Imperial e conecte seu Telegram em Configurações → Conta.',
      )
      await this.recordCommandDenied(command, null, chatId, 'unlinked')
      return null
    }

    if (resolution.status === 'workspace_disabled') {
      await this.safeSend(
        chatId,
        '🔒 O bot do Telegram ainda não foi liberado para este workspace.',
        resolution.accountId,
      )
      await this.recordCommandDenied(command, null, chatId, 'workspace_disabled')
      return null
    }

    if (resolution.status === 'user_disabled' || resolution.status === 'employee_disabled') {
      await this.safeSend(
        chatId,
        '🔒 Seu acesso no Desk Imperial está desativado. Procure o dono da empresa para revisar sua permissão.',
        resolution.accountId,
      )
      await this.recordCommandDenied(command, null, chatId, resolution.status)
      return null
    }

    if (!allowedRoles.includes(resolution.auth.role)) {
      await this.safeSend(chatId, '🔒 Você não tem permissão para este comando.', resolution.accountId)
      await this.recordCommandDenied(command, resolution.auth, chatId, 'insufficient_role')
      return null
    }

    void this.telegramAuthService.touchAccount(resolution.accountId)
    return resolution
  }

  private async recordCommandExecuted(command: SupportedCommand, auth: { userId: string }, chatId: number) {
    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'telegram.command.executed',
      resource: 'telegram_command',
      resourceId: command,
      metadata: {
        command,
        telegramChatId: String(chatId),
      },
      ipAddress: this.getCurrentRequestContext().ipAddress,
      userAgent: this.getCurrentRequestContext().userAgent,
    })
  }

  private async recordCommandDenied(
    command: SupportedCommand,
    auth: { userId: string } | null,
    chatId: number,
    reason: string,
  ) {
    await this.auditLogService.record({
      ...(auth ? { actorUserId: resolveAuthActorUserId(auth) } : {}),
      event: 'telegram.command.denied',
      resource: 'telegram_command',
      resourceId: command,
      metadata: {
        command,
        reason,
        telegramChatId: String(chatId),
      },
      ipAddress: this.getCurrentRequestContext().ipAddress,
      userAgent: this.getCurrentRequestContext().userAgent,
    })
  }

  private async rememberUpdate(updateId: number) {
    return this.cache.setIfAbsent(
      CacheService.telegramUpdateKey(updateId),
      { receivedAt: new Date().toISOString() },
      60 * 60,
    )
  }

  private extractCommandPayload(text: string | undefined) {
    if (!text) {
      return ''
    }
    const normalized = text.trim()
    if (!normalized.startsWith('/')) {
      return ''
    }

    const [, ...rest] = normalized.split(/\s+/)
    return rest.join(' ').trim()
  }

  private extractCommandName(text: string | undefined) {
    if (!text?.trim().startsWith('/')) {
      return null
    }

    const rawCommand = text.trim().slice(1).split(/\s+/)[0] ?? null
    return rawCommand?.split('@')[0] ?? null
  }

  private async handleInteractiveAction(ctx: Context, action: string) {
    switch (action) {
      case 'menu:home':
        await this.handleAjuda(ctx)
        return
      case 'menu:status':
        await this.handleStatus(ctx)
        return
      case 'menu:portal':
        await this.handlePortal(ctx)
        return
      case 'menu:vendas':
        await this.handleVendas(ctx)
        return
      case 'menu:caixa':
        await this.handleCaixa(ctx)
        return
      case 'menu:relatorio':
        await this.handleRelatorio(ctx)
        return
      case 'menu:equipe':
        await this.handleEquipe(ctx)
        return
      case 'menu:alertas':
        await this.handleAlertas(ctx)
        return
      case 'menu:desvincular':
        await this.handleDesvincular(ctx)
        return
      default:
        if (ctx.chat?.id) {
          await this.safeSendInteractive(
            { chatId: ctx.chat.id },
            'Esse atalho não está mais disponível. Use o menu atualizado abaixo.',
          )
        }
    }
  }

  private async safeSend(chatId: number, text: string, accountId?: string) {
    try {
      await this.telegramAdapter.sendTextMessage(chatId, text)
    } catch (error) {
      if (accountId && this.telegramAdapter.isBlockedByUserError(error)) {
        await this.telegramLinkService.markAccountBlocked(accountId)
        return
      }

      this.logger.warn(
        `Falha ao enviar mensagem Telegram para ${chatId}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  private async safeSendInteractive(target: InteractiveMessageTarget, text: string) {
    try {
      await this.telegramAdapter.sendTextMessage(target.chatId, text, this.buildInteractiveMessageOptions())
    } catch (error) {
      if (target.accountId && this.telegramAdapter.isBlockedByUserError(error)) {
        await this.telegramLinkService.markAccountBlocked(target.accountId)
        return
      }

      this.logger.warn(
        `Falha ao enviar mensagem interativa Telegram para ${target.chatId}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  private async safeSendOnboarding(target: InteractiveMessageTarget, text: string) {
    const brandPhotoUrl = this.telegramAdapter.buildBrandPhotoUrl()
    if (!brandPhotoUrl) {
      await this.safeSendInteractive(target, text)
      return
    }

    try {
      await this.telegramAdapter.sendPhotoMessage(
        target.chatId,
        brandPhotoUrl,
        text,
        this.buildInteractiveMessageOptions(),
      )
    } catch (error) {
      if (target.accountId && this.telegramAdapter.isBlockedByUserError(error)) {
        await this.telegramLinkService.markAccountBlocked(target.accountId)
        return
      }

      this.logger.warn(
        `Falha ao enviar onboarding Telegram com imagem para ${target.chatId}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
      await this.safeSendInteractive(target, text)
    }
  }

  private async safeAnswerCallback(callbackQueryId: string, text?: string) {
    try {
      await this.telegramAdapter.answerCallbackQuery(callbackQueryId, text)
    } catch (error) {
      this.logger.warn(`Falha ao responder callback do Telegram: ${error instanceof Error ? error.message : 'unknown'}`)
    }
  }

  private buildInteractiveMessageOptions(): TelegramMessageOptions {
    return {
      disable_web_page_preview: true,
      reply_markup: this.buildMainMenuKeyboard(),
    }
  }

  private buildMainMenuKeyboard(): TelegramInlineKeyboardMarkup {
    const portalUrl = this.telegramAdapter.buildPortalUrl('/app')

    return {
      inline_keyboard: [
        [
          { text: 'Vendas', callback_data: 'menu:vendas' },
          { text: 'Caixa', callback_data: 'menu:caixa' },
        ],
        [
          { text: 'Relatório', callback_data: 'menu:relatorio' },
          { text: 'Equipe', callback_data: 'menu:equipe' },
        ],
        [
          { text: 'Alertas', callback_data: 'menu:alertas' },
          { text: 'Status', callback_data: 'menu:status' },
        ],
        portalUrl
          ? [
              { text: 'Abrir portal', url: portalUrl },
              { text: 'Desvincular', callback_data: 'menu:desvincular' },
            ]
          : [{ text: 'Desvincular', callback_data: 'menu:desvincular' }],
        [{ text: 'Menu inicial', callback_data: 'menu:home' }],
      ],
    }
  }

  private getCurrentRequestContext(): RequestContext {
    return (
      this.requestContextStorage.getStore() ?? {
        ipAddress: null,
        userAgent: 'telegram-webhook',
        host: null,
        origin: null,
        referer: null,
      }
    )
  }

  private normalizeRequestContext(requestContext: RequestContext): RequestContext {
    return {
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent ?? 'telegram-webhook',
      host: requestContext.host,
      origin: requestContext.origin,
      referer: requestContext.referer,
    }
  }

  private formatCurrency(value: number, currency: 'BRL' | 'USD' | 'EUR') {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency,
    })
  }
}
