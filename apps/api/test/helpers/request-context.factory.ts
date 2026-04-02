import type { RequestContext } from '../../src/common/utils/request-context.util'

export function makeRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Jest test runner)',
    host: 'localhost:3000',
    origin: 'http://localhost:3000',
    referer: 'http://localhost:3000/test',
    ...overrides,
  }
}
