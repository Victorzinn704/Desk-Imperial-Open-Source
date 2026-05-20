import { Inject, Injectable } from '@nestjs/common'
import { AuditLogService } from '../monitoring/audit-log.service'
import {
  publishBatchComandaItemsResult,
  publishSingleComandaItemResult,
  recordComandaBatchAudit,
  recordComandaItemAudit,
  recordComandaReplaceAudit,
} from './comanda-items-dispatch.utils'
import { ComandaRealtimePublisher } from './comanda-realtime-publisher.service'

@Injectable()
export class ComandaItemsDispatchService {
  constructor(
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ComandaRealtimePublisher) private readonly realtime: ComandaRealtimePublisher,
  ) {}

  recordItem(params: Omit<Parameters<typeof recordComandaItemAudit>[0], 'auditLogService'>) {
    return recordComandaItemAudit({ ...params, auditLogService: this.auditLogService })
  }

  recordBatch(params: Omit<Parameters<typeof recordComandaBatchAudit>[0], 'auditLogService'>) {
    return recordComandaBatchAudit({ ...params, auditLogService: this.auditLogService })
  }

  recordReplace(params: Omit<Parameters<typeof recordComandaReplaceAudit>[0], 'auditLogService'>) {
    return recordComandaReplaceAudit({ ...params, auditLogService: this.auditLogService })
  }

  publishSingle(params: Omit<Parameters<typeof publishSingleComandaItemResult>[0], 'realtime'>) {
    publishSingleComandaItemResult({ ...params, realtime: this.realtime })
  }

  publishBatch(params: Omit<Parameters<typeof publishBatchComandaItemsResult>[0], 'realtime'>) {
    publishBatchComandaItemsResult({ ...params, realtime: this.realtime })
  }
}
