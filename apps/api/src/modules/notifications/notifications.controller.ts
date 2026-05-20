import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import { TelegramBotService } from './telegram-bot.service'
import { TelegramAdapter } from './infra/telegram/telegram.adapter'
import { TelegramRuntimeService } from './infra/telegram/telegram-runtime.service'
import {
  updateWorkspaceNotificationPreferencesBodySchema,
  type UpdateWorkspaceNotificationPreferencesDto,
} from './notification-preferences.schemas'
import { NotificationPreferencesService } from './notification-preferences.service'
import { TelegramLinkService } from './telegram-link.service'
import { type TelegramWebhookDto, telegramWebhookSchema } from './telegram.schemas'

const telegramWebhookPipe = new ZodValidationPipe(telegramWebhookSchema)
const notificationPreferencesBodyPipe = new ZodValidationPipe(updateWorkspaceNotificationPreferencesBodySchema)

function digestWebhookSecret(value: string) {
  return createHash('sha256').update(value).digest()
}

function isTelegramWebhookSecretValid(receivedSecret: string | undefined, expectedSecret: string | null) {
  const received = receivedSecret?.trim()
  const expected = expectedSecret?.trim()

  if (!(received && expected)) {
    return false
  }

  return timingSafeEqual(digestWebhookSecret(received), digestWebhookSecret(expected))
}

@ApiTags('notifications')
@Controller('notifications/telegram')
export class NotificationsController {
  constructor(
    private readonly telegramLinkService: TelegramLinkService,
    private readonly telegramBotService: TelegramBotService,
    private readonly telegramAdapter: TelegramAdapter,
    private readonly telegramRuntime: TelegramRuntimeService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('link-token')
  createLinkToken(@CurrentAuth() auth: AuthContext, @Req() request: Request) {
    return this.telegramLinkService.createLinkToken(auth, extractRequestContext(request))
  }

  @UseGuards(SessionGuard)
  @Get('status')
  getStatus(@CurrentAuth() auth: AuthContext) {
    return this.telegramLinkService.getStatus(auth)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Delete('link')
  unlink(@CurrentAuth() auth: AuthContext, @Req() request: Request) {
    return this.telegramLinkService.unlinkForPortal(auth, extractRequestContext(request))
  }

  @UseGuards(SessionGuard)
  @Get('preferences')
  getPreferences(@CurrentAuth() auth: AuthContext) {
    return this.notificationPreferencesService.listForWorkspace(auth)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('preferences')
  updatePreferences(
    @CurrentAuth() auth: AuthContext,
    @Body(notificationPreferencesBodyPipe) body: UpdateWorkspaceNotificationPreferencesDto,
    @Req() request: Request,
  ) {
    return this.notificationPreferencesService.updateForWorkspace(auth, body, extractRequestContext(request))
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() body: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const expectedSecret = this.telegramAdapter.getWebhookSecret()
    if (!isTelegramWebhookSecretValid(secret, expectedSecret)) {
      throw new UnauthorizedException('Webhook Telegram nao autorizado.')
    }

    const payload = telegramWebhookPipe.transform(body) as TelegramWebhookDto
    const ctx = extractRequestContext(request)
    // Enfileira inbound. Worker dedicado processa async — Telegram nunca retentara update pesado.
    // Fallback: se runtime indisponivel (Redis down), processa inline para nao perder.
    if (this.telegramRuntime.isReady()) {
      const accepted = await this.telegramRuntime.enqueueInbound({
        update: payload,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        receivedAt: new Date().toISOString(),
      })
      if (!accepted) {
        // Rate-limit global excedido: ack 200 mesmo assim — Telegram nao deve retentar flood.
        response.status(200).json({ ok: true, accepted: false, reason: 'rate_limited' })
        return
      }
      response.status(200).json({ ok: true, accepted: true })
      return
    }

    // Fail-safe path quando Redis offline.
    void this.telegramBotService.handleWebhookUpdate(payload, ctx).catch(() => undefined)
    response.status(200).json({ ok: true, accepted: true, mode: 'inline-fallback' })
  }

  @Get('health')
  getHealth() {
    return this.telegramLinkService.getHealth()
  }
}
