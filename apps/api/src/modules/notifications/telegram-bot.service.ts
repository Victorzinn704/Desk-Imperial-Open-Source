import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { Bot, type Context } from 'grammy'
import type { Update } from 'grammy/types'
import { AsyncLocalStorage } from 'node:async_hooks'
import { CacheService } from '../../common/services/cache.service'
import type { RequestContext } from '../../common/utils/request-context.util'
import { TelegramBotCommandAuth } from './telegram-bot-command-auth'
import type { TelegramCommandName } from './telegram-bot-command.types'
import { TelegramBotCommands } from './telegram-bot-commands'
import {
  TelegramBotCoreDependencies,
  TelegramBotDomainDependencies,
  TelegramBotRuntimeDependencies,
} from './telegram-bot.dependencies'
import { TelegramBotFsm } from './telegram-bot-fsm'
import { buildTelegramBotInfo } from './telegram-bot-info'
import { TelegramBotOutbox, type TelegramInteractiveMessageTarget } from './telegram-bot-outbox'
import { TelegramBotStartCommand } from './telegram-bot-start-command'
import { TelegramGeminiIntentRouter } from './telegram-gemini-intent-router'

const TELEGRAM_RATE_LIMIT_TTL_SECONDS = 60
const TELEGRAM_RATE_LIMIT_PER_MINUTE = 20
const TELEGRAM_RATE_LIMIT_FIRST_BLOCKED_HIT = TELEGRAM_RATE_LIMIT_PER_MINUTE + 1

type TelegramMiddlewareNext = () => Promise<void>
type TelegramTextMessage = {
  accountId: string | undefined
  chatId: number
  text: string
}
type TelegramInteractiveMessage = {
  target: TelegramInteractiveMessageTarget
  text: string
}
type TelegramCallbackAnswer = {
  callbackQueryId: string
  text: string | undefined
}
type TelegramCommandText = {
  text: string | undefined
}

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name)
  private readonly commands: TelegramBotCommands
  private readonly requestContextStorage = new AsyncLocalStorage<RequestContext>()
  private readonly fsm: TelegramBotFsm
  private readonly outbox: TelegramBotOutbox
  private bot: Bot | null = null

  constructor(
    @Inject(TelegramBotCoreDependencies)
    private readonly core: TelegramBotCoreDependencies,
    @Inject(TelegramBotDomainDependencies)
    private readonly domain: TelegramBotDomainDependencies,
    @Inject(TelegramBotRuntimeDependencies)
    private readonly runtimeDeps: TelegramBotRuntimeDependencies,
    @Optional() private readonly intentRouter?: TelegramGeminiIntentRouter,
  ) {
    this.outbox = this.createOutbox()
    this.fsm = this.createFsm()
    const commandAuth = this.createCommandAuth()
    const startCommand = this.createStartCommand(commandAuth)
    this.commands = this.createCommands(commandAuth, startCommand)
  }

  private createOutbox() {
    return new TelegramBotOutbox({
      adapter: this.core.telegramAdapter,
      linkService: this.core.telegramLinkService,
      logger: this.logger,
      outbound: this.runtimeDeps.telegramOutbound,
      runtime: this.runtimeDeps.telegramRuntime,
    })
  }

  private createFsm() {
    return new TelegramBotFsm({
      auditLogService: this.core.auditLogService,
      getCurrentRequestContext: () => this.getCurrentRequestContext(),
      runtime: this.runtimeDeps.telegramRuntime,
      sendText: (chatId, text, accountId) => this.safeSend({ accountId, chatId, text }),
    })
  }

  private createCommandAuth() {
    return new TelegramBotCommandAuth({
      auditLogService: this.core.auditLogService,
      getCurrentRequestContext: () => this.getCurrentRequestContext(),
      sendText: (chatId, text, accountId) => this.safeSend({ accountId, chatId, text }),
      telegramAuthService: this.core.telegramAuthService,
    })
  }

  private createStartCommand(commandAuth: TelegramBotCommandAuth) {
    return new TelegramBotStartCommand({
      auth: commandAuth,
      getCurrentRequestContext: () => this.getCurrentRequestContext(),
      sendOnboarding: (target, text) => this.safeSendOnboarding({ target, text }),
      sendText: (chatId, text, accountId) => this.safeSend({ accountId, chatId, text }),
      telegramLinkService: this.core.telegramLinkService,
    })
  }

  private createCommands(commandAuth: TelegramBotCommandAuth, startCommand: TelegramBotStartCommand) {
    return new TelegramBotCommands({
      auth: commandAuth,
      employeesService: this.domain.employeesService,
      financeService: this.domain.financeService,
      fsm: this.fsm,
      getCurrentRequestContext: () => this.getCurrentRequestContext(),
      notificationsService: this.domain.notificationsService,
      operationsService: this.domain.operationsService,
      sendInteractive: (target, text) => this.safeSendInteractive({ target, text }),
      sendText: (chatId, text, accountId) => this.safeSend({ accountId, chatId, text }),
      startCommand,
      telegramAdapter: this.core.telegramAdapter,
      telegramLinkService: this.core.telegramLinkService,
    })
  }

  async handleWebhookUpdate(update: Update, requestContext: RequestContext) {
    if (!this.core.telegramAdapter.isBotEnabled()) {
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

    const token = this.core.telegramAdapter.getBotToken()
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN ausente.')
    }

    const bot = new Bot(token, { botInfo: buildTelegramBotInfo(this.core.telegramAdapter.getBotUsername()) })
    this.registerBotMiddleware(bot)
    this.registerTextHandler(bot)
    this.registerCallbackHandler(bot)
    this.registerBotErrorHandler(bot)

    this.bot = bot
    return bot
  }

  private registerBotMiddleware(bot: Bot) {
    bot.use((ctx, next) => this.guardDuplicateTelegramUpdate(ctx, next))
    bot.use((ctx, next) => this.guardTelegramRateLimit(ctx, next))
    bot.use((ctx, next) => this.guardPrivateTelegramChat(ctx, next))
  }

  private registerTextHandler(bot: Bot) {
    bot.on('message:text', async (ctx) => {
      await this.handleTextMessage(ctx)
    })
  }

  private registerCallbackHandler(bot: Bot) {
    bot.on('callback_query:data', async (ctx) => {
      const callbackId = ctx.callbackQuery.id
      const action = ctx.callbackQuery.data?.trim() ?? ''
      if (!action) {
        void this.safeAnswerCallback({ callbackQueryId: callbackId, text: undefined })
        return
      }

      void this.safeAnswerCallback({ callbackQueryId: callbackId, text: undefined })
      await this.commands.handleInteractive(ctx, action)
    })
  }

  private registerBotErrorHandler(bot: Bot) {
    bot.catch((error) => {
      this.logger.error(
        `Falha não tratada no runtime do Telegram: ${error.error instanceof Error ? error.error.stack : String(error.error)}`,
      )
    })
  }

  private async handleTextMessage(ctx: Context) {
    const text = ctx.message?.text ?? ''
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const fsmHandled = await this.fsm.tryHandle(ctx, text)
    if (fsmHandled) {
      return
    }

    const command = this.extractCommandName({ text })
    if (await this.commands.handle(ctx, command)) {
      return
    }

    const routedCommand = await this.intentRouter?.resolve(text)
    if (await this.commands.handle(ctx, routedCommand ?? null)) {
      return
    }

    await this.safeSendInteractive({
      target: { chatId },
      text: 'Comando não reconhecido. Use os atalhos abaixo para continuar no Desk Imperial.',
    })
  }

  private async rememberUpdate(updateId: number) {
    return this.core.cache.setIfAbsent(
      CacheService.telegramUpdateKey(updateId),
      { receivedAt: new Date().toISOString() },
      60 * 60,
    )
  }

  private async guardDuplicateTelegramUpdate(ctx: Context, next: TelegramMiddlewareNext) {
    const allowed = await this.rememberUpdate(ctx.update.update_id)
    if (!allowed) {
      return
    }

    await next()
  }

  private async guardTelegramRateLimit(ctx: Context, next: TelegramMiddlewareNext) {
    const chatId = this.resolveTelegramChatId(ctx)
    if (!chatId) {
      return
    }

    const count = await this.incrementTelegramRateLimit({ chatId })
    if (count <= TELEGRAM_RATE_LIMIT_PER_MINUTE) {
      await next()
      return
    }

    await this.recordTelegramRateLimitDenied({ chatId, ctx })
    await this.sendTelegramRateLimitNotice({ chatId, count })
  }

  private async guardPrivateTelegramChat(ctx: Context, next: TelegramMiddlewareNext) {
    const chat = ctx.chat
    if (!chat) {
      return
    }

    if (chat.type === 'private') {
      await next()
      return
    }

    await this.safeSend({
      accountId: undefined,
      chatId: chat.id,
      text: 'Use o bot no chat privado com o Desk Imperial.',
    })
  }

  private resolveTelegramChatId(ctx: Context) {
    return ctx.chat?.id ?? null
  }

  private incrementTelegramRateLimit({ chatId }: { chatId: number }) {
    return this.core.cache.increment(CacheService.telegramRateLimitKey(String(chatId)), TELEGRAM_RATE_LIMIT_TTL_SECONDS)
  }

  private async recordTelegramRateLimitDenied({ chatId, ctx }: { chatId: number; ctx: Context }) {
    await this.core.auditLogService.record({
      event: 'telegram.command.denied',
      resource: 'telegram_command',
      metadata: {
        command: this.extractCommandName({ text: ctx.message?.text }),
        reason: 'rate_limit',
        telegramChatId: String(chatId),
      },
      ipAddress: this.getCurrentRequestContext().ipAddress,
      userAgent: this.getCurrentRequestContext().userAgent,
    })
  }

  private async sendTelegramRateLimitNotice({ chatId, count }: { chatId: number; count: number }) {
    if (count !== TELEGRAM_RATE_LIMIT_FIRST_BLOCKED_HIT) {
      return
    }

    await this.safeSend({
      accountId: undefined,
      chatId,
      text: '⏱ Muitas requisições. Aguarde um minuto e tente novamente.',
    })
  }

  private extractCommandName({ text }: TelegramCommandText) {
    if (!text?.trim().startsWith('/')) {
      return null
    }

    const rawCommand = text.trim().slice(1).split(/\s+/)[0] ?? null
    return (rawCommand?.split('@')[0] ?? null) as TelegramCommandName | null
  }

  private async safeSend({ accountId, chatId, text }: TelegramTextMessage) {
    await this.outbox.sendText(chatId, text, accountId)
  }

  private async safeSendInteractive({ target, text }: TelegramInteractiveMessage) {
    await this.outbox.sendInteractive(target, text)
  }

  private async safeSendOnboarding({ target, text }: TelegramInteractiveMessage) {
    await this.outbox.sendOnboarding(target, text)
  }

  private async safeAnswerCallback({ callbackQueryId, text }: TelegramCallbackAnswer) {
    await this.outbox.answerCallback(callbackQueryId, text)
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
}
