import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'
import { IntelligencePlatformService } from '../src/modules/intelligence-platform/intelligence-platform.service'
import type { NotificationsService } from '../src/modules/notifications/notifications.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'

describe('IntelligencePlatformService', () => {
  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const notificationsService = {
    getChannelCapabilities: jest.fn(() => [
      { channel: 'TELEGRAM', enabled: false, mode: 'disabled', reason: 'not-configured' },
      { channel: 'EMAIL', enabled: true, mode: 'outbound' },
    ]),
  }

  let service: IntelligencePlatformService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new IntelligencePlatformService(
      auditLogService as unknown as AuditLogService,
      notificationsService as unknown as NotificationsService,
    )
  })

  it('retorna capabilities mais amplas para owner', async () => {
    const result = await service.describeCapabilities(makeOwnerAuthContext(), makeRequestContext())

    expect(result.actorRole).toBe('OWNER')
    expect(result.tools.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['finance.summary.period', 'cash.close.request', 'sales.summary.today']),
    )
    expect(result.deliveryChannels).toHaveLength(2)
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'intelligence-platform.capabilities.read' }),
    )
  })

  it('remove tools sensiveis para staff', async () => {
    const result = await service.describeCapabilities(makeStaffAuthContext(), makeRequestContext())

    expect(result.actorRole).toBe('STAFF')
    expect(result.tools.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['sales.summary.today', 'operations.comandas.open']),
    )
    expect(result.tools.map((tool) => tool.id)).not.toEqual(
      expect.arrayContaining(['finance.summary.period', 'cash.close.request']),
    )
    expect(result.freeTextChatEnabled).toBe(false)
  })
})
