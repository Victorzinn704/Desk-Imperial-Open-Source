import type { Context } from 'grammy'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { AuditLogService } from '../monitoring/audit-log.service'
import type { TelegramRuntimeService } from './infra/telegram/telegram-runtime.service'
import { buildFechamentoIntroMessage, buildFechamentoRecordedMessage } from './telegram-bot.messages'
import { parseCurrencyInput } from './telegram-bot.parsers'

type TelegramFsmState = {
  flow: 'fechamento'
  step: 'await_sangria' | 'await_observacao'
  accountId?: string
  data: Record<string, unknown>
}

type TelegramBotFsmDependencies = {
  auditLogService: AuditLogService
  getCurrentRequestContext: () => RequestContext
  runtime: TelegramRuntimeService
  sendText: (chatId: number, text: string, accountId?: string) => Promise<void>
}

export class TelegramBotFsm {
  constructor(private readonly deps: TelegramBotFsmDependencies) {}

  async tryHandle(ctx: Context, text: string): Promise<boolean> {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return false
    }

    const state = await this.deps.runtime.getFsmState<TelegramFsmState>(chatId)
    if (!state) {
      return false
    }

    if (isCancelCommand(text)) {
      await this.cancelActiveFlow(chatId)
      return true
    }

    await this.advance(ctx, state, text)
    return true
  }

  async cancel(ctx: Context) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const state = await this.deps.runtime.getFsmState<TelegramFsmState>(chatId)
    if (!state) {
      await this.deps.sendText(chatId, 'Sem fluxo ativo neste chat.')
      return
    }

    await this.cancelActiveFlow(chatId)
  }

  async startFechamento(chatId: number, accountId?: string) {
    await this.deps.runtime.setFsmState(chatId, buildInitialFechamentoState(accountId))
    await this.deps.sendText(chatId, buildFechamentoIntroMessage(), accountId)
  }

  private async advance(ctx: Context, state: TelegramFsmState, text: string) {
    if (state.step === 'await_sangria') {
      await this.recordSangria(ctx, state, text)
      return
    }

    await this.recordObservation(ctx, state, text)
  }

  private async recordSangria(ctx: Context, state: TelegramFsmState, text: string) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const value = parseCurrencyInput(text)
    if (value === null) {
      await this.deps.sendText(
        chatId,
        'Valor invalido. Envie um numero positivo (ex: 250 ou 250,50). /cancelar para sair.',
        state.accountId,
      )
      return
    }

    await this.deps.runtime.setFsmState(chatId, {
      ...state,
      step: 'await_observacao',
      data: { ...state.data, sangria: value },
    })
    await this.deps.sendText(
      chatId,
      'Passo 2/2: Quer registrar alguma observação? Envie texto livre ou "-" para pular.',
      state.accountId,
    )
  }

  private async recordObservation(ctx: Context, state: TelegramFsmState, text: string) {
    const chatId = ctx.chat?.id
    if (!chatId) {
      return
    }

    const observation = normalizeObservation(text)
    const sangria = Number(state.data.sangria ?? 0)
    await this.deps.runtime.clearFsmState(chatId)
    await this.auditFechamentoDraft(chatId, sangria, observation)
    await this.deps.sendText(chatId, buildFechamentoRecordedMessage({ observation, sangria }), state.accountId)
  }

  private async auditFechamentoDraft(chatId: number, sangria: number, observation: string | null) {
    const requestContext = this.deps.getCurrentRequestContext()
    await this.deps.auditLogService.record({
      event: 'telegram.fechamento.draft',
      resource: 'telegram_command',
      resourceId: 'fechamento',
      metadata: {
        telegramChatId: String(chatId),
        sangria,
        observation,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    })
  }

  private async cancelActiveFlow(chatId: number) {
    await this.deps.runtime.clearFsmState(chatId)
    await this.deps.sendText(chatId, 'Fluxo cancelado.')
  }
}

function buildInitialFechamentoState(accountId?: string): TelegramFsmState {
  const state: TelegramFsmState = {
    flow: 'fechamento',
    step: 'await_sangria',
    data: {},
  }

  return accountId ? { ...state, accountId } : state
}

function isCancelCommand(text: string) {
  return text.trim().toLowerCase() === '/cancelar'
}

function normalizeObservation(text: string) {
  const trimmed = text.trim()
  return trimmed === '-' ? null : trimmed.slice(0, 500)
}
