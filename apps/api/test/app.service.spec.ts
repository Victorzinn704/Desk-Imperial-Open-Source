import { AppService } from '../src/app.service'

const mockPrisma = { isHealthy: jest.fn().mockResolvedValue(true) }
const mockCache = { ping: jest.fn().mockResolvedValue(true) }

describe('AppService', () => {
  let service: AppService

  beforeEach(() => {
    service = new AppService(mockPrisma as any, mockCache as any)
  })

  it('returns a healthy payload when db and redis are up', async () => {
    const health = await service.getHealth()

    expect(health.status).toBe('ok')
    expect(health.service).toBe('desk-imperial-api')
    expect(typeof health.timestamp).toBe('string')
    expect(health.dbHealthy).toBe(true)
    expect(health.redisHealthy).toBe(true)
  })

  it('returns error status when db is down', async () => {
    mockPrisma.isHealthy.mockResolvedValueOnce(false)

    const health = await service.getHealth()

    expect(health.status).toBe('error')
    expect(health.dbHealthy).toBe(false)
  })
})
