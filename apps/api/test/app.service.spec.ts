import { AppService } from '../src/app.service'

describe('AppService', () => {
  it('returns a health payload', () => {
    const service = new AppService()
    const health = service.getHealth()

    expect(health.status).toBe('ok')
    expect(health.service).toBe('partner-api')
    expect(typeof health.timestamp).toBe('string')
  })
})
