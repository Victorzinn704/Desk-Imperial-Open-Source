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
    await this.$connect()
    this.logger.log('Database connection established')

    this.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `Slow query (${e.duration}ms): ${e.query}`,
          'SlowQuery',
        )
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
}
