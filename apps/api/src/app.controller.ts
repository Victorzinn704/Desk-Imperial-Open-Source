import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import type { Response } from 'express'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @SkipThrottle()
  @Get('health')
  async getHealth(@Res({ passthrough: true }) response: Response) {
    const health = await this.appService.getHealth()
    response.status(health.status === 'error' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK)
    return health
  }
}
