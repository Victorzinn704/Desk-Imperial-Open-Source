import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { SessionGuard } from '../auth/guards/session.guard'
import { GetMarketInsightQueryDto } from './dto/get-market-insight.query.dto'
import { MarketIntelligenceService } from './market-intelligence.service'

@ApiTags('market-intelligence')
@Controller('market-intelligence')
export class MarketIntelligenceController {
  constructor(private readonly marketIntelligenceService: MarketIntelligenceService) {}

  @UseGuards(SessionGuard)
  @Get('insights')
  getInsights(
    @CurrentAuth() auth: AuthContext,
    @Query() query: GetMarketInsightQueryDto,
    @Req() request: Request,
  ) {
    return this.marketIntelligenceService.getInsightForUser(
      auth,
      query.focus,
      extractRequestContext(request),
    )
  }
}
