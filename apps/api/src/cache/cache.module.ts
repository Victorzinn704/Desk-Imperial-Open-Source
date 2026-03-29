import { Global, Module } from '@nestjs/common'
import { CacheService } from '../common/services/cache.service'

@Global()
@Module({
  providers: [
    {
      provide: CacheService,
      useFactory: () => new CacheService(),
    },
  ],
  exports: [CacheService],
})
export class CacheModule {}
