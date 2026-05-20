import type { ConfigService } from '@nestjs/config'
import { ConsentBootstrap } from '../src/modules/consent/consent.bootstrap'
import type { ConsentService } from '../src/modules/consent/consent.service'

describe('ConsentBootstrap', () => {
  const consentService = {
    ensureDefaultDocuments: jest.fn(async () => []),
  }

  const configValues: Record<string, string | undefined> = {}
  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  }

  let bootstrap: ConsentBootstrap

  beforeEach(() => {
    jest.clearAllMocks()
    bootstrap = new ConsentBootstrap(
      consentService as unknown as ConsentService,
      configService as unknown as ConfigService,
    )
  })

  it('usa versao configurada no bootstrap', async () => {
    configValues.CONSENT_VERSION = '2026.04'

    await bootstrap.onModuleInit()

    expect(consentService.ensureDefaultDocuments).toHaveBeenCalledWith('2026.04')
  })

  it('usa versao padrao quando configuracao nao existe', async () => {
    configValues.CONSENT_VERSION = undefined

    await bootstrap.onModuleInit()

    expect(consentService.ensureDefaultDocuments).toHaveBeenCalledWith('2026.03')
  })
})
