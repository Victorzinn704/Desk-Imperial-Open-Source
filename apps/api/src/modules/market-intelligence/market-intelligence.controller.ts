import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import { GetMarketInsightBodyDto } from './dto/get-market-insight.body.dto'
import { MarketIntelligenceService } from './market-intelligence.service'

@ApiTags('market-intelligence')
@Controller('market-intelligence')
export class MarketIntelligenceController {
  constructor(private readonly marketIntelligenceService: MarketIntelligenceService) {}

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('insights')
  getInsights(@CurrentAuth() auth: AuthContext, @Body() body: GetMarketInsightBodyDto, @Req() request: Request) {
    return this.marketIntelligenceService.getInsightForUser(auth, body.focus, extractRequestContext(request))
  }
}
