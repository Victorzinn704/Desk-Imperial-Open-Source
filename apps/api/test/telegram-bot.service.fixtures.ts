import type { CacheService } from '../src/common/services/cache.service'
import type { FinanceService } from '../src/modules/finance/finance.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { EmployeesService } from '../src/modules/employees/employees.service'
import type { NotificationsService } from '../src/modules/notifications/notifications.service'
import type { TelegramAdapter } from '../src/modules/notifications/infra/telegram/telegram.adapter'
import type { TelegramAuthService } from '../src/modules/notifications/telegram-auth.service'
import {
  TelegramBotCoreDependencies,
  TelegramBotDomainDependencies,
  TelegramBotRuntimeDependencies,
} from '../src/modules/notifications/telegram-bot.dependencies'
import { TelegramBotService } from '../src/modules/notifications/telegram-bot.service'
import type { TelegramLinkService } from '../src/modules/notifications/telegram-link.service'
import type { OperationsService } from '../src/modules/operations/operations.service'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'

export const cache = {
  setIfAbsent: jest.fn(async () => true),
  increment: jest.fn(async () => 1),
}

export const auditLogService = {
  record: jest.fn(async () => {}),
}

export const operationsService = {
  getSummaryView: jest.fn(),
  getLiveSnapshot: jest.fn(),
}

export const financeService = {
  getSummaryForUser: jest.fn(),
}

export const employeesService = {
  listForUser: jest.fn(),
}

export const notificationsService = {
  getChannelCapabilities: jest.fn(() => [{ channel: 'TELEGRAM', enabled: true, mode: 'outbound' }]),
}

export const telegramAdapter = {
  getBotToken: jest.fn(() => 'telegram-token'),
  getBotUsername: jest.fn(() => 'Desk_Imperial_bot'),
  isBotEnabled: jest.fn(() => true),
  buildPortalUrl: jest.fn(() => 'https://app.deskimperial.online/app/owner?section=settings'),
  buildBrandPhotoUrl: jest.fn(() => 'https://app.deskimperial.online/icons/icon-512.png'),
  sendTextMessage: jest.fn(async () => ({})),
  sendPhotoMessage: jest.fn(async () => ({})),
  answerCallbackQuery: jest.fn(async () => ({})),
  isBlockedByUserError: jest.fn(() => false),
}

export const telegramLinkService = {
  consumeStartToken: jest.fn(),
  unlinkChat: jest.fn(async () => 1),
  markAccountBlocked: jest.fn(async () => {}),
}

export const telegramAuthService = {
  resolveChatAuth: jest.fn(),
  touchAccount: jest.fn(async () => {}),
}

export function createTelegramBotService() {
  const telegramOutbound = {
    sendText: jest.fn(async () => true),
    sendInteractive: jest.fn(async () => true),
    sendPhoto: jest.fn(async () => true),
    editText: jest.fn(async () => true),
    answerCallbackQuery: jest.fn(async () => true),
  }
  const telegramRuntime = {
    isReady: jest.fn(() => false),
    getFsmState: jest.fn(async () => null),
    setFsmState: jest.fn(async () => undefined),
    clearFsmState: jest.fn(async () => undefined),
    incrementMetric: jest.fn(async () => undefined),
  }

  const core = new TelegramBotCoreDependencies(
    cache as unknown as CacheService,
    auditLogService as unknown as AuditLogService,
    telegramAdapter as unknown as TelegramAdapter,
    telegramLinkService as unknown as TelegramLinkService,
    telegramAuthService as unknown as TelegramAuthService,
  )
  const domain = new TelegramBotDomainDependencies(
    operationsService as unknown as OperationsService,
    financeService as unknown as FinanceService,
    employeesService as unknown as EmployeesService,
    notificationsService as unknown as NotificationsService,
  )
  const runtime = new TelegramBotRuntimeDependencies(telegramOutbound as never, telegramRuntime as never)

  return new TelegramBotService(core, domain, runtime)
}

export function resetTelegramBotTestDoubles() {
  jest.clearAllMocks()
  cache.setIfAbsent.mockResolvedValue(true)
  cache.increment.mockResolvedValue(1)
  auditLogService.record.mockResolvedValue(undefined)
  telegramAdapter.getBotToken.mockReturnValue('telegram-token')
  telegramAdapter.getBotUsername.mockReturnValue('Desk_Imperial_bot')
  telegramAdapter.isBotEnabled.mockReturnValue(true)
  telegramAdapter.buildPortalUrl.mockReturnValue('https://app.deskimperial.online/app/owner?section=settings')
  telegramAdapter.buildBrandPhotoUrl.mockReturnValue('https://app.deskimperial.online/icons/icon-512.png')
  telegramAdapter.sendTextMessage.mockResolvedValue({})
  telegramAdapter.sendPhotoMessage.mockResolvedValue({})
  telegramAdapter.answerCallbackQuery.mockResolvedValue({})
  telegramAdapter.isBlockedByUserError.mockReturnValue(false)
  telegramLinkService.unlinkChat.mockResolvedValue(1)
  telegramLinkService.markAccountBlocked.mockResolvedValue(undefined)
  telegramAuthService.touchAccount.mockResolvedValue(undefined)
}

export function buildTelegramTextUpdate(input: { updateId: number; text: string; chatId?: number; chatType?: string }) {
  const chatId = input.chatId ?? 555
  return {
    update_id: input.updateId,
    message: {
      message_id: input.updateId,
      date: 1,
      text: input.text,
      chat: { id: chatId, type: input.chatType ?? 'private' },
      from: { id: 555, is_bot: false, first_name: 'Pedro' },
    },
  } as never
}

export function buildTelegramGroupTextUpdate(input: { updateId: number; text: string }) {
  return {
    update_id: input.updateId,
    message: {
      message_id: input.updateId,
      date: 1,
      text: input.text,
      chat: { id: -100, type: 'group', title: 'Mesa geral' },
      from: { id: 555, is_bot: false, first_name: 'Pedro' },
    },
  } as never
}

export function buildTelegramCallbackUpdate(input: { updateId: number; callbackId: string; data: string }) {
  return {
    update_id: input.updateId,
    callback_query: {
      id: input.callbackId,
      from: { id: 555, is_bot: false, first_name: 'Pedro' },
      chat_instance: 'chat-1',
      data: input.data,
      message: {
        message_id: 10,
        date: 1,
        chat: { id: 555, type: 'private' },
        text: 'Painel rápido',
      },
    },
  } as never
}

export function buildOwnerTelegramResolution() {
  return {
    status: 'ok',
    accountId: 'tg-account-1',
    workspaceOwnerUserId: 'owner-1',
    telegramChatId: 555n,
    auth: makeOwnerAuthContext(),
  }
}

export function buildStaffTelegramResolution() {
  return {
    ...buildOwnerTelegramResolution(),
    auth: makeStaffAuthContext(),
  }
}

export function buildOperationsSummaryView() {
  return {
    businessDate: '2026-04-29',
    companyOwnerId: 'owner-1',
    kpis: {
      receitaRealizada: 1200,
      faturamentoAberto: 300,
      projecaoTotal: 1500,
      lucroRealizado: 400,
      lucroEsperado: 500,
      caixaEsperado: 700,
      openComandasCount: 4,
      openSessionsCount: 1,
    },
    performers: [],
    topProducts: [{ nome: 'Combo Petisco', qtd: 2, valor: 300 }],
  }
}
