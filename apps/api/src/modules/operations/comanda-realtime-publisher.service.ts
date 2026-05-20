import { Inject, Injectable, Optional } from '@nestjs/common'
import { CacheService } from '../../common/services/cache.service'
import type { WorkspaceScopedAuthContext } from '../auth/auth.types'
import { FinanceService } from '../finance/finance.service'
import { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import type { OperationsRealtimePublishInstrumentation } from '../operations-realtime/operations-realtime.types'
import { buildCashClosurePayload, buildCashUpdatedPayload, formatBusinessDateKey } from './operations-domain.utils'
import { invalidateLiveSnapshotCache } from './comanda-response.utils'
import {
  publishComandaClosed,
  publishComandaOpened,
  publishComandaUpdated,
  publishKitchenItemQueued,
  publishKitchenItemUpdated,
} from './comanda-realtime-publish.utils'

type ComandaPayload = Parameters<typeof publishComandaOpened>[0]['comanda']
type ClosedComandaPayload = Parameters<typeof publishComandaClosed>[0]['comanda']
type ClosedCashSessionPayload = Parameters<typeof publishComandaClosed>[0]['refreshedSession']
type CashSessionPayload = NonNullable<ClosedCashSessionPayload>
type CashClosurePayload = Parameters<typeof publishComandaClosed>[0]['closure']
type KitchenItemPayload = Parameters<typeof publishKitchenItemQueued>[0]['item']

export type ComandaUpdatedOptions = NonNullable<Parameters<typeof publishComandaUpdated>[0]['options']>
export type KitchenItemUpdatedOptions = NonNullable<Parameters<typeof publishKitchenItemUpdated>[0]['options']>

@Injectable()
export class ComandaRealtimePublisher {
  constructor(
    @Inject(CacheService) private readonly cache: CacheService,
    @Inject(OperationsRealtimeService) private readonly realtime: OperationsRealtimeService,
    @Optional() private readonly financeService?: FinanceService,
  ) {}

  invalidate(workspaceOwnerUserId: string, businessDate: Date) {
    invalidateLiveSnapshotCache(this.cache, workspaceOwnerUserId, businessDate)
  }

  publishOpened(params: {
    auth: WorkspaceScopedAuthContext
    businessDate: Date
    comanda: ComandaPayload
    instrumentation?: OperationsRealtimePublishInstrumentation | undefined
  }) {
    publishComandaOpened({ ...params, realtimeService: this.realtime })
  }

  publishUpdated(params: {
    auth: WorkspaceScopedAuthContext
    businessDate: Date
    comanda: ComandaPayload
    options?: ComandaUpdatedOptions | undefined
    instrumentation?: OperationsRealtimePublishInstrumentation | undefined
  }) {
    publishComandaUpdated({ ...params, realtimeService: this.realtime })
  }

  publishClosed(params: {
    auth: WorkspaceScopedAuthContext
    businessDate: Date
    comanda: ClosedComandaPayload
    refreshedSession: ClosedCashSessionPayload
    closure: CashClosurePayload
    instrumentation?: OperationsRealtimePublishInstrumentation | undefined
  }) {
    publishComandaClosed({ ...params, realtimeService: this.realtime })
  }

  publishKitchenQueued(params: {
    auth: WorkspaceScopedAuthContext
    businessDate: Date
    comanda: ComandaPayload
    item: KitchenItemPayload
    instrumentation?: OperationsRealtimePublishInstrumentation | undefined
  }) {
    publishKitchenItemQueued({ ...params, realtimeService: this.realtime })
  }

  publishKitchenUpdated(params: {
    auth: WorkspaceScopedAuthContext
    businessDate: Date
    comanda: ComandaPayload
    item: KitchenItemPayload
    options?: KitchenItemUpdatedOptions | undefined
    instrumentation?: OperationsRealtimePublishInstrumentation | undefined
  }) {
    publishKitchenItemUpdated({ ...params, realtimeService: this.realtime })
  }

  publishCashUpdated(params: { auth: WorkspaceScopedAuthContext; session: CashSessionPayload; businessDate: Date }) {
    this.realtime.publishCashUpdated(params.auth, {
      ...buildCashUpdatedPayload(params.session),
      businessDate: formatBusinessDateKey(params.businessDate),
    })
  }

  publishCashClosureUpdated(params: { auth: WorkspaceScopedAuthContext; closure: CashClosurePayload }) {
    this.realtime.publishCashClosureUpdated(params.auth, buildCashClosurePayload(params.closure))
  }

  refreshFinanceSummary(workspaceOwnerUserId: string) {
    if (this.financeService) {
      void this.financeService.invalidateAndWarmSummary(workspaceOwnerUserId)
      return
    }

    void this.cache.del(CacheService.financeKey(workspaceOwnerUserId))
  }

  deleteOrdersCache(workspaceOwnerUserId: string) {
    void this.cache.del(CacheService.ordersKey(workspaceOwnerUserId))
  }
}
