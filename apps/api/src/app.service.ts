import { Injectable, Logger } from '@nestjs/common'
import { CacheService } from './common/services/cache.service'
import { PrismaService } from './database/prisma.service'

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getHealth() {
    const start = Date.now()
    const dbHealthy = await this.prismaService.isHealthy()
    const redisHealthy = await this.cacheService.ping()
    const elapsedMs = Date.now() - start

    if (!(dbHealthy && redisHealthy)) {
      const message = `healthcheck failed: db=${dbHealthy} redis=${redisHealthy}`
      this.logger.warn(message)
      return {
        status: 'error',
        service: 'desk-imperial-api',
        timestamp: new Date().toISOString(),
        elapsedMs,
        dbHealthy,
        redisHealthy,
      }
    }

    return {
      status: 'ok',
      service: 'desk-imperial-api',
      timestamp: new Date().toISOString(),
      elapsedMs,
      dbHealthy,
      redisHealthy,
    }
  }
}
