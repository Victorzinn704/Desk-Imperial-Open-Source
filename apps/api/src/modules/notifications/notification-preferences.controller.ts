import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import {
  updateUserNotificationPreferencesBodySchema,
  updateWorkspaceNotificationPreferencesBodySchema,
  type UpdateUserNotificationPreferencesDto,
  type UpdateWorkspaceNotificationPreferencesDto,
} from './notification-preferences.schemas'
import { NotificationPreferencesService } from './notification-preferences.service'

const workspaceNotificationPreferencesBodyPipe = new ZodValidationPipe(updateWorkspaceNotificationPreferencesBodySchema)
const userNotificationPreferencesBodyPipe = new ZodValidationPipe(updateUserNotificationPreferencesBodySchema)

@ApiTags('notifications')
@Controller('notifications/preferences')
export class NotificationPreferencesController {
  constructor(private readonly notificationPreferencesService: NotificationPreferencesService) {}

  @UseGuards(SessionGuard)
  @Get('workspace')
  getWorkspacePreferences(@CurrentAuth() auth: AuthContext) {
    return this.notificationPreferencesService.listForWorkspace(auth)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('workspace')
  updateWorkspacePreferences(
    @CurrentAuth() auth: AuthContext,
    @Body(workspaceNotificationPreferencesBodyPipe) body: UpdateWorkspaceNotificationPreferencesDto,
    @Req() request: Request,
  ) {
    return this.notificationPreferencesService.updateForWorkspace(auth, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard)
  @Get('me')
  getUserPreferences(@CurrentAuth() auth: AuthContext) {
    return this.notificationPreferencesService.listForUser(auth)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('me')
  updateUserPreferences(
    @CurrentAuth() auth: AuthContext,
    @Body(userNotificationPreferencesBodyPipe) body: UpdateUserNotificationPreferencesDto,
    @Req() request: Request,
  ) {
    return this.notificationPreferencesService.updateForUser(auth, body, extractRequestContext(request))
  }
}
