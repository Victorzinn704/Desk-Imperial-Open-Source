import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import type { UpdateCookiePreferencesDto } from './dto/update-cookie-preferences.dto'
import type { ConsentService } from './consent.service'

@ApiTags('consent')
@Controller('consent')
export class ConsentController {
  constructor(
    private readonly consentService: ConsentService,
    private readonly configService: ConfigService,
  ) {}

  @Get('documents')
  getDocuments() {
    return this.consentService.listActiveDocuments(this.getConsentVersion())
  }

  @UseGuards(SessionGuard)
  @Get('me')
  getMyConsentOverview(@CurrentAuth() auth: AuthContext) {
    return this.consentService.getUserConsentOverview({
      userId: auth.userId,
      version: this.getConsentVersion(),
    })
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('preferences')
  updateCookiePreferences(
    @CurrentAuth() auth: AuthContext,
    @Body() body: UpdateCookiePreferencesDto,
    @Req() request: Request,
  ) {
    return this.consentService.updateCookiePreferences({
      userId: auth.userId,
      version: this.getConsentVersion(),
      preferences: body,
      context: extractRequestContext(request),
    })
  }

  private getConsentVersion() {
    return this.configService.get<string>('CONSENT_VERSION') ?? '2026.03'
  }
}
