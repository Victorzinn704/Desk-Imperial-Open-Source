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
import type { Request, Response } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import type { TelegramBotService } from './telegram-bot.service'
import type { TelegramAdapter } from './infra/telegram/telegram.adapter'
import {
  updateWorkspaceNotificationPreferencesBodySchema,
  type UpdateWorkspaceNotificationPreferencesDto,
} from './notification-preferences.schemas'
import type { NotificationPreferencesService } from './notification-preferences.service'
import type { TelegramLinkService } from './telegram-link.service'
import { telegramWebhookSchema, type TelegramWebhookDto } from './telegram.schemas'

const telegramWebhookPipe = new ZodValidationPipe(telegramWebhookSchema)
const notificationPreferencesBodyPipe = new ZodValidationPipe(updateWorkspaceNotificationPreferencesBodySchema)

@ApiTags('notifications')
@Controller('notifications/telegram')
export class NotificationsController {
  constructor(
    private readonly telegramLinkService: TelegramLinkService,
    private readonly telegramBotService: TelegramBotService,
    private readonly telegramAdapter: TelegramAdapter,
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
    @Body(telegramWebhookPipe) payload: TelegramWebhookDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const expectedSecret = this.telegramAdapter.getWebhookSecret()
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('Webhook Telegram nao autorizado.')
    }

    await this.telegramBotService.handleWebhookUpdate(payload, extractRequestContext(request))
    response.status(200).json({ ok: true })
  }

  @Get('health')
  getHealth() {
    return this.telegramLinkService.getHealth()
  }
}
