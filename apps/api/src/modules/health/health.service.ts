import { Injectable } from '@nestjs/common'
import { CacheService } from '../../common/services/cache.service'
import { PrismaService } from '../../database/prisma.service'

type HealthCheckStatus = 'up' | 'down'

type HealthChecks = Record<string, { status: HealthCheckStatus; message?: string }>

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async check() {
    const checks: HealthChecks = {}

    try {
      await this.prisma.$queryRaw`SELECT 1`
      checks.database = { status: 'up' }
    } catch (error) {
      checks.database = { status: 'down', message: (error as Error).message }
    }

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

  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'ready' }
    } catch {
      return { status: 'not_ready' }
    }
  }

  liveness() {
    return { status: 'alive' }
  }
}
