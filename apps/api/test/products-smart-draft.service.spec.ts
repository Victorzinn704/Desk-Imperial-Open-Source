import type { ConfigService } from '@nestjs/config'
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common'
import type { CacheService } from '../src/common/services/cache.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import { ProductsSmartDraftService } from '../src/modules/products/products-smart-draft.service'
import { makeOwnerAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

describe('ProductsSmartDraftService', () => {
  const cache = {
    get: jest.fn(async () => null),
    set: jest.fn(async () => {}),
    increment: jest.fn(async () => 1),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | undefined> = {
        GEMINI_API_KEY: 'gemini-key',
        GEMINI_MODEL: 'gemini-2.5-flash',
      }
      return values[key]
    }),
  }

  const originalFetch = global.fetch
  let service: ProductsSmartDraftService

  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
    cache.increment.mockResolvedValue(1)
    cache.set.mockResolvedValue(undefined)
    auditLogService.record.mockResolvedValue(undefined)
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: 'Padronizei embalagem, medida e fluxo operacional.',
                    suggestion: {
                      name: 'Heineken Long Neck 330ml',
                      brand: 'Heineken',
                      category: 'Cervejas',
                      packagingClass: 'Long neck 330ml',
                      measurementUnit: 'ML',
                      measurementValue: 330,
                      unitsPerPackage: 1,
                      description: 'Cerveja lager long neck pronta para venda.',
                      quantityLabel: '330ml',
                      servingSize: '330ml',
                      requiresKitchen: false,
                    },
                  }),
                },
              ],
            },
          },
        ],
      }),
    })) as unknown as typeof fetch

    service = new ProductsSmartDraftService(
      configService as unknown as ConfigService,
      cache as unknown as CacheService,
      auditLogService as unknown as AuditLogService,
    )
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('gera rascunho inteligente padronizado via Gemini', async () => {
    const result = await service.generateDraft(
      makeOwnerAuthContext(),
      {
        barcode: '7891234567890',
        name: 'heineken',
        category: 'bebida',
      },
      makeRequestContext(),
    )

    expect(result.cached).toBe(false)
    expect(result.summary).toContain('Padronizei')
    expect(result.suggestion).toEqual(
      expect.objectContaining({
        name: 'Heineken Long Neck 330ml',
        category: 'Cervejas',
        measurementUnit: 'ML',
        measurementValue: 330,
        requiresKitchen: false,
      }),
    )
    expect(cache.set).toHaveBeenCalled()
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'products.smart_draft.generated',
      }),
    )
  })

  it('rejeita payload vazio', async () => {
    await expect(service.generateDraft(makeOwnerAuthContext(), {}, makeRequestContext())).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('falha quando o Gemini não está configurado', async () => {
    configService.get = jest.fn((key: string) => {
      const values: Record<string, string | undefined> = {
        GEMINI_MODEL: 'gemini-2.5-flash',
      }
      return values[key]
    })

    service = new ProductsSmartDraftService(
      configService as unknown as ConfigService,
      cache as unknown as CacheService,
      auditLogService as unknown as AuditLogService,
    )

    await expect(
      service.generateDraft(makeOwnerAuthContext(), { name: 'Brahma' }, makeRequestContext()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
