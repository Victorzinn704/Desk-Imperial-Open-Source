import { ForbiddenException } from '@nestjs/common'
import { TelegramLinkService } from '../src/modules/notifications/telegram-link.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { MailerService } from '../src/modules/mailer/mailer.service'
import type { TelegramAdapter } from '../src/modules/notifications/infra/telegram/telegram.adapter'
import { makeOwnerAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

describe('TelegramLinkService', () => {
  const prisma = {
    telegramLinkToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    telegramAccount: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const mailerService = {
    sendTelegramLinkedEmail: jest.fn(async () => ({ mode: 'log' })),
  }

  const telegramAdapter = {
    isBotEnabled: jest.fn(() => true),
    isWorkspaceEnabled: jest.fn(() => true),
    getBotUsername: jest.fn(() => 'Desk_Imperial_bot'),
    buildDeeplink: jest.fn((token: string) => `https://t.me/Desk_Imperial_bot?start=${token}`),
    getWebhookUrl: jest.fn(() => 'https://api.deskimperial.online/api/v1/notifications/telegram/webhook'),
    getBotToken: jest.fn(() => 'telegram-token'),
    getWebhookInfo: jest.fn(),
  }

  let service: TelegramLinkService

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma as never))
    prisma.telegramAccount.findFirst.mockResolvedValue(null)
    prisma.telegramAccount.updateMany.mockResolvedValue({ count: 1 })
    prisma.telegramAccount.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'tg-account-1',
      ...data,
    }))
    prisma.telegramLinkToken.create.mockResolvedValue(undefined)
    prisma.telegramLinkToken.update.mockResolvedValue(undefined)
    auditLogService.record.mockResolvedValue(undefined)
    mailerService.sendTelegramLinkedEmail.mockResolvedValue({ mode: 'log' })
    telegramAdapter.isBotEnabled.mockReturnValue(true)
    telegramAdapter.isWorkspaceEnabled.mockReturnValue(true)
    telegramAdapter.getBotUsername.mockReturnValue('Desk_Imperial_bot')
    telegramAdapter.buildDeeplink.mockImplementation((token: string) => `https://t.me/Desk_Imperial_bot?start=${token}`)

    service = new TelegramLinkService(
      prisma as unknown as PrismaService,
      auditLogService as unknown as AuditLogService,
      mailerService as unknown as MailerService,
      telegramAdapter as unknown as TelegramAdapter,
    )
  })

  it('gera link token e deeplink para usuário autenticado', async () => {
    const result = await service.createLinkToken(makeOwnerAuthContext(), makeRequestContext())
    const createCall = prisma.telegramLinkToken.create.mock.calls[0]?.[0]

    expect(result.deeplink).toContain('https://t.me/Desk_Imperial_bot?start=')
    expect(result.botUsername).toBe('Desk_Imperial_bot')
    expect(prisma.telegramLinkToken.create).toHaveBeenCalled()
    expect(createCall.data.token).not.toBe(result.token)
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'telegram.link_token.generated' }))
  })

  it('bloqueia geração de token quando o workspace não está liberado', async () => {
    telegramAdapter.isWorkspaceEnabled.mockReturnValue(false)

    await expect(service.createLinkToken(makeOwnerAuthContext(), makeRequestContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('rejeita token inexistente', async () => {
    prisma.telegramLinkToken.findFirst.mockResolvedValue(null)

    const result = await service.consumeStartToken(
      'missing-token',
      555n,
      555n,
      'pedro',
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('rejeita token expirado', async () => {
    prisma.telegramLinkToken.findFirst.mockResolvedValue({
      token: 'expired',
      userId: 'owner-1',
      workspaceOwnerUserId: 'owner-1',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      user: {
        id: 'owner-1',
        fullName: 'Owner',
        email: 'owner@empresa.com',
        companyName: 'Empresa Ltda',
      },
    })

    const result = await service.consumeStartToken('expired', 555n, 555n, 'pedro', makeRequestContext())

    expect(result).toEqual({ ok: false, reason: 'expired' })
  })

  it('rejeita token já consumido', async () => {
    prisma.telegramLinkToken.findFirst.mockResolvedValue({
      token: 'used',
      userId: 'owner-1',
      workspaceOwnerUserId: 'owner-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
      user: {
        id: 'owner-1',
        fullName: 'Owner',
        email: 'owner@empresa.com',
        companyName: 'Empresa Ltda',
      },
    })

    const result = await service.consumeStartToken('used', 555n, 555n, 'pedro', makeRequestContext())

    expect(result).toEqual({ ok: false, reason: 'already_used' })
  })

  it('expõe status desabilitado quando o bot nao esta ativo no ambiente', async () => {
    telegramAdapter.isBotEnabled.mockReturnValue(false)
    telegramAdapter.getBotToken.mockReturnValue('')

    await expect(service.getHealth()).resolves.toEqual(
      expect.objectContaining({
        status: 'disabled',
        reason: 'TELEGRAM_BOT_TOKEN ausente.',
      }),
    )
  })

  it('retorna status do portal como environment_disabled quando o bot esta desligado', async () => {
    telegramAdapter.isBotEnabled.mockReturnValue(false)
    prisma.telegramAccount.findFirst.mockResolvedValue(null)

    await expect(service.getStatus(makeOwnerAuthContext())).resolves.toEqual(
      expect.objectContaining({
        enabled: false,
        workspaceEnabled: false,
        restrictionReason: 'environment_disabled',
        linked: false,
        account: null,
      }),
    )
  })

  it('retorna status do portal com restricao de workspace e conta vinculada formatada', async () => {
    telegramAdapter.isWorkspaceEnabled.mockReturnValue(false)
    prisma.telegramAccount.findFirst.mockResolvedValue({
      telegramChatId: 555n,
      telegramUserId: 777n,
      telegramUsername: 'pedro',
      status: 'ACTIVE',
      linkedAt: new Date('2026-04-30T12:00:00.000Z'),
      lastActiveAt: new Date('2026-04-30T13:00:00.000Z'),
    })

    await expect(service.getStatus(makeOwnerAuthContext())).resolves.toEqual(
      expect.objectContaining({
        enabled: true,
        workspaceEnabled: false,
        restrictionReason: 'workspace_closed',
        linked: true,
        account: expect.objectContaining({
          telegramChatId: '555',
          telegramUserId: '777',
          telegramUsername: 'pedro',
        }),
      }),
    )
  })

  it('rejeita consumo de token quando o workspace do vínculo ainda está fechado', async () => {
    telegramAdapter.isWorkspaceEnabled.mockReturnValue(false)
    prisma.telegramLinkToken.findFirst.mockResolvedValue({
      token: 'valid',
      userId: 'owner-1',
      workspaceOwnerUserId: 'owner-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      user: {
        id: 'owner-1',
        fullName: 'Owner',
        email: 'owner@empresa.com',
        companyName: 'Empresa Ltda',
      },
    })

    const result = await service.consumeStartToken('valid', 555n, 555n, 'pedro', makeRequestContext())

    expect(result).toEqual({ ok: false, reason: 'workspace_disabled' })
  })

  it('consome token válido, cria vínculo e dispara alerta de segurança por e-mail', async () => {
    prisma.telegramLinkToken.findFirst.mockResolvedValue({
      token: 'valid',
      userId: 'owner-1',
      workspaceOwnerUserId: 'owner-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      user: {
        id: 'owner-1',
        fullName: 'Owner',
        email: 'owner@empresa.com',
        companyName: 'Empresa Ltda',
      },
    })

    const result = await service.consumeStartToken('valid', 555n, 555n, 'pedro', makeRequestContext())

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        workspaceOwnerUserId: 'owner-1',
        userId: 'owner-1',
      }),
    )
    expect(prisma.telegramAccount.create).toHaveBeenCalled()
    expect(prisma.telegramLinkToken.update).toHaveBeenCalled()
    expect(mailerService.sendTelegramLinkedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@empresa.com', telegramChatId: '555' }),
    )
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'telegram.account.linked' }))
  })
})
