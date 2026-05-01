import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { SessionGuard } from '../auth/guards/session.guard'
import type { IntelligencePlatformService } from './intelligence-platform.service'

@ApiTags('intelligence-platform')
@UseGuards(SessionGuard)
@Controller('intelligence-platform')
export class IntelligencePlatformController {
  constructor(private readonly intelligencePlatformService: IntelligencePlatformService) {}

  @Get('capabilities')
  getCapabilities(@CurrentAuth() auth: AuthContext, @Req() request: Request) {
    return this.intelligencePlatformService.describeCapabilities(auth, extractRequestContext(request))
  }
}
