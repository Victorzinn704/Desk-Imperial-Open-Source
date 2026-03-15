import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { SessionGuard } from '../auth/guards/session.guard'
import { FinanceService } from './finance.service'

@ApiTags('finance')
@UseGuards(SessionGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  getSummary(@CurrentAuth() auth: AuthContext) {
    return this.financeService.getSummaryForUser(auth)
  }
}
