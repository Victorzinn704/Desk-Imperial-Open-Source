import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { SessionGuard } from '../auth/guards/session.guard'
import type { FinanceService } from './finance.service'
import type { PillarsService } from './pillars.service'

@ApiTags('finance')
@UseGuards(SessionGuard)
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly pillarsService: PillarsService,
  ) {}

  @Get('summary')
  getSummary(@CurrentAuth() auth: AuthContext) {
    return this.financeService.getSummaryForUser(auth)
  }

  @Get('pillars')
  getPillars(@CurrentAuth() auth: AuthContext) {
    return this.pillarsService.getPillarsForUser(auth)
  }
}
