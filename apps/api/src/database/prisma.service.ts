import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'

const SLOW_QUERY_THRESHOLD_MS = 500

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    })
  }

  async onModuleInit() {
    const maskUrl = (url: string) => url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')

    const databaseUrl = process.env.DATABASE_URL ?? 'undefined'
    const directUrl = process.env.DIRECT_URL ?? 'undefined'

    this.logger.log(`Attempting Prisma connection to DATABASE_URL=${maskUrl(databaseUrl)}`)
    this.logger.log(`Attempting Prisma direct connection to DIRECT_URL=${maskUrl(directUrl)}`)

    const maxRetries = 5
    const baseDelayMs = 1000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect()
        this.logger.log('Database connection established')
        break
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        this.logger.error(`Prisma connection attempt ${attempt}/${maxRetries} failed: ${msg}`, 'PrismaService')

        if (attempt === maxRetries) {
          this.logger.warn('Could not connect at startup — Prisma will connect lazily on first query.', 'PrismaService')
          break
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1)
        this.logger.warn(`Retrying Prisma connection in ${delay}ms...`, 'PrismaService')
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    this.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`, 'SlowQuery')
      }
    })

    this.$on('error' as never, (e: Prisma.LogEvent) => {
      this.logger.error(`Database error: ${e.message}`, 'DatabaseError')
    })

    this.$on('warn' as never, (e: Prisma.LogEvent) => {
      this.logger.warn(`Database warning: ${e.message}`, 'DatabaseWarning')
    })
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      this.logger.error(`Prisma healthcheck failed: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }
}
