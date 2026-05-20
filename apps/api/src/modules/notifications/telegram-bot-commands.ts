import type { Context } from 'grammy'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { AuthContext } from '../auth/auth.types'
import type { EmployeesService } from '../employees/employees.service'
import type { FinanceService } from '../finance/finance.service'
import type { OperationsService } from '../operations/operations.service'
import type { NotificationsService } from './notifications.service'
import type { TelegramAdapter } from './infra/telegram/telegram.adapter'
import type {
  SupportedCommand,
  TelegramCommandHandler,
  TelegramCommandHandlers,
  TelegramCommandName,
} from './telegram-bot-command.types'
import type { TelegramBotCommandAuth } from './telegram-bot-command-auth'
import type { TelegramBotFsm } from './telegram-bot-fsm'
import type { TelegramBotStartCommand } from './telegram-bot-start-command'
import {
  buildTelegramAlertasMessage,
  buildTelegramCaixaMessage,
  buildTelegramEquipeMessage,
  buildTelegramHelpMessage,
  buildTelegramPortalMessage,
  buildTelegramRelatorioMessage,
  buildTelegramStatusMessage,
  buildTelegramVendasMessage,
} from './telegram-bot.messages'
import type { TelegramInteractiveMessageTarget } from './telegram-bot-outbox'
import type { TelegramLinkService } from './telegram-link.service'

type TelegramBotCommandDependencies = {
  auth: TelegramBotCommandAuth
  employeesService: EmployeesService
  financeService: FinanceService
  fsm: TelegramBotFsm
  getCurrentRequestContext: () => RequestContext
  notificationsService: NotificationsService
  operationsService: OperationsService
  sendInteractive: (target: TelegramInteractiveMessageTarget, text: string) => Promise<void>
  sendText: (chatId: number, text: string, accountId?: string) => Promise<void>
  startCommand: TelegramBotStartCommand
  telegramAdapter: TelegramAdapter
  telegramLinkService: TelegramLinkService
}

type TelegramAllowedRole = AuthContext['role']
type TelegramResolvedCommand = {
  chatId: number
  resolution: NonNullable<Awaited<ReturnType<TelegramBotCommandAuth['resolve']>>>
}
type TelegramCommandMessageBuilder = (resolved: TelegramResolvedCommand) => Promise<string> | string

export class TelegramBotCommands {
  private readonly commandHandlers: TelegramCommandHandlers
  private readonly interactiveHandlers: Record<string, TelegramCommandHandler>

  constructor(private readonly deps: TelegramBotCommandDependencies) {
    this.commandHandlers = this.buildCommandHandlers()
    this.interactiveHandlers = this.buildInteractiveHandlers()
  }

  async handle(ctx: Context, command: TelegramCommandName | null) {
    const handler = command ? this.commandHandlers[command] : undefined
    if (!handler) {
      return false
    }

    await handler(ctx)
    return true
  }

  async handleInteractive(ctx: Context, action: string) {
    const handler = this.interactiveHandlers[action]
    if (handler) {
      await handler(ctx)
      return
    }

    if (ctx.chat?.id) {
      await this.deps.sendInteractive(
        { chatId: ctx.chat.id },
        'Esse atalho não está mais disponível. Use o menu atualizado abaixo.',
      )
    }
  }

  private buildCommandHandlers(): TelegramCommandHandlers {
    return {
      start: (ctx) => this.deps.startCommand.handle(ctx),
      ajuda: (ctx) => this.handleAjuda(ctx),
      menu: (ctx) => this.handleAjuda(ctx),
      status: (ctx) => this.handleStatus(ctx),
      portal: (ctx) => this.handlePortal(ctx),
      vendas: (ctx) => this.handleVendas(ctx),
      caixa: (ctx) => this.handleCaixa(ctx),
      relatorio: (ctx) => this.handleRelatorio(ctx),
      equipe: (ctx) => this.handleEquipe(ctx),
      alertas: (ctx) => this.handleAlertas(ctx),
      desvincular: (ctx) => this.handleDesvincular(ctx),
      cancelar: (ctx) => this.deps.fsm.cancel(ctx),
      fechamento: (ctx) => this.handleFechamentoStart(ctx),
    }
  }

  private buildInteractiveHandlers(): Record<string, TelegramCommandHandler> {
    return {
      'menu:home': (ctx) => this.handleAjuda(ctx),
      'menu:status': (ctx) => this.handleStatus(ctx),
      'menu:portal': (ctx) => this.handlePortal(ctx),
      'menu:vendas': (ctx) => this.handleVendas(ctx),
      'menu:caixa': (ctx) => this.handleCaixa(ctx),
      'menu:relatorio': (ctx) => this.handleRelatorio(ctx),
      'menu:equipe': (ctx) => this.handleEquipe(ctx),
      'menu:alertas': (ctx) => this.handleAlertas(ctx),
      'menu:desvincular': (ctx) => this.handleDesvincular(ctx),
    }
  }

  private async handleAjuda(ctx: Context) {
    await this.sendResolvedCommand(ctx, 'ajuda', ['OWNER', 'STAFF'], 'home', ({ resolution }) =>
      buildTelegramHelpMessage(resolution.auth.role),
    )
  }

  private async handleStatus(ctx: Context) {
    const command = 'status'
    const resolved = await this.resolveCommand(ctx, command, ['OWNER', 'STAFF'])
    if (!resolved) {
      return
    }

    const enabledChannels = this.deps.notificationsService
      .getChannelCapabilities()
      .filter((channel) => channel.enabled)
      .map((channel) => channel.channel)

    await this.deps.sendInteractive(
      { chatId: resolved.chatId, accountId: resolved.resolution.accountId, view: 'status' },
      buildTelegramStatusMessage({
        botUsername: this.deps.telegramAdapter.getBotUsername(),
        companyName: resolved.resolution.auth.companyName,
        enabledChannels,
        fullName: resolved.resolution.auth.fullName,
        role: resolved.resolution.auth.role,
      }),
    )
    await this.deps.auth.recordExecuted(command, resolved.resolution.auth, resolved.chatId)
  }

  private async handlePortal(ctx: Context) {
    await this.sendResolvedCommand(ctx, 'portal', ['OWNER', 'STAFF'], 'portal', () =>
      buildTelegramPortalMessage(this.deps.telegramAdapter.buildPortalUrl('/app')),
    )
  }

  private async handleVendas(ctx: Context) {
    await this.sendResolvedCommand(ctx, 'vendas', ['OWNER', 'STAFF'], 'sales', async ({ resolution }) => {
      const summary = await this.deps.operationsService.getSummaryView(resolution.auth, {})
      return buildTelegramVendasMessage({ currency: resolution.auth.preferredCurrency, summary })
    })
  }

  private async handleCaixa(ctx: Context) {
    const command = 'caixa'
    const resolved = await this.resolveCommand(ctx, command, ['OWNER'])
    if (!resolved) {
      return
    }

    const live = await this.deps.operationsService.getLiveSnapshot(resolved.resolution.auth, {
      compactMode: true,
      includeCashMovements: false,
    })

    const openSessions = live.employees.filter((employee) => employee.cashSession?.status === 'OPEN').length
    const ownerSessionOpen = live.unassigned.cashSession?.status === 'OPEN' ? 1 : 0
    await this.deps.sendInteractive(
      { chatId: resolved.chatId, accountId: resolved.resolution.accountId, view: 'cash' },
      buildTelegramCaixaMessage({
        closure: live.closure,
        currency: resolved.resolution.auth.preferredCurrency,
        openSessionsCount: openSessions + ownerSessionOpen,
      }),
    )
    await this.deps.auth.recordExecuted(command, resolved.resolution.auth, resolved.chatId)
  }

  private async handleRelatorio(ctx: Context) {
    await this.sendResolvedCommand(ctx, 'relatorio', ['OWNER'], 'report', async ({ resolution }) => {
      const finance = await this.deps.financeService.getSummaryForUser(resolution.auth)
      return buildTelegramRelatorioMessage({ finance })
    })
  }

  private async handleEquipe(ctx: Context) {
    await this.sendResolvedCommand(ctx, 'equipe', ['OWNER'], 'team', async ({ resolution }) => {
      const employees = await this.deps.employeesService.listForUser(resolution.auth)
      return buildTelegramEquipeMessage({ employees })
    })
  }

  private async handleAlertas(ctx: Context) {
    const command = 'alertas'
    const resolved = await this.resolveCommand(ctx, command, ['OWNER', 'STAFF'])
    if (!resolved) {
      return
    }

    const deliveryChannels = this.deps.notificationsService
      .getChannelCapabilities()
      .filter((channel) => channel.enabled)
      .map((channel) => `- ${channel.channel}`)

    await this.deps.sendInteractive(
      { chatId: resolved.chatId, accountId: resolved.resolution.accountId, view: 'alerts' },
      buildTelegramAlertasMessage(deliveryChannels),
    )
    await this.deps.auth.recordExecuted(command, resolved.resolution.auth, resolved.chatId)
  }

  private async handleFechamentoStart(ctx: Context) {
    const resolved = await this.resolveCommand(ctx, 'caixa', ['OWNER'])
    if (!resolved) {
      return
    }

    await this.deps.fsm.startFechamento(resolved.chatId, resolved.resolution.accountId)
  }

  private async handleDesvincular(ctx: Context) {
    const command = 'desvincular'
    const resolved = await this.resolveCommand(ctx, command, ['OWNER', 'STAFF'])
    if (!resolved) {
      return
    }

    await this.deps.telegramLinkService.unlinkChat(
      BigInt(resolved.chatId),
      resolved.resolution.auth.userId,
      this.deps.getCurrentRequestContext(),
    )
    await this.deps.sendText(
      resolved.chatId,
      '👋 Este chat foi desvinculado da sua conta do Desk Imperial.',
      resolved.resolution.accountId,
    )
    await this.deps.auth.recordExecuted(command, resolved.resolution.auth, resolved.chatId)
  }

  private async sendResolvedCommand(
    ctx: Context,
    command: SupportedCommand,
    allowedRoles: TelegramAllowedRole[],
    view: TelegramInteractiveMessageTarget['view'],
    buildMessage: TelegramCommandMessageBuilder,
  ) {
    const resolved = await this.resolveCommand(ctx, command, allowedRoles)
    if (!resolved) {
      return
    }

    await this.deps.sendInteractive(
      { chatId: resolved.chatId, accountId: resolved.resolution.accountId, view },
      await buildMessage(resolved),
    )
    await this.deps.auth.recordExecuted(command, resolved.resolution.auth, resolved.chatId)
  }

  private async resolveCommand(ctx: Context, command: SupportedCommand, allowedRoles: TelegramAllowedRole[]) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return null
    }

    const resolution = await this.deps.auth.resolve(chatId, command, allowedRoles)
    return resolution ? { chatId, resolution } : null
  }
}
