import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { CacheService } from '../../common/services/cache.service'

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, { status: 'up' | 'down'; message?: string }> = {}

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`
      checks.database = { status: 'up' }
    } catch (error) {
      checks.database = { status: 'down', message: (error as Error).message }
    }

    // Redis check
    try {
      await this.cache.ping()
      checks.redis = { status: 'up' }
    } catch (error) {
      checks.redis = { status: 'down', message: (error as Error).message }
    }

    const isHealthy = Object.values(checks).every((check) => check.status === 'up')

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    }
  }

  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'ready' }
    } catch {
      return { status: 'not_ready' }
    }
  }

  @Get('live')
  async liveness() {
    return { status: 'alive' }
  }
}
