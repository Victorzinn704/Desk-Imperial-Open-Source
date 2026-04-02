import type { PrismaService } from '../src/database/prisma.service'
import { ConsentService } from '../src/modules/consent/consent.service'
import { COOKIE_DOCUMENT_KEYS, DEFAULT_CONSENT_DOCUMENTS } from '../src/modules/consent/consent.constants'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import { makeRequestContext } from './helpers/request-context.factory'

describe('ConsentService', () => {
  const prisma = {
    consentDocument: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    userConsent: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    cookiePreference: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  let service: ConsentService

  beforeEach(() => {
    jest.clearAllMocks()

    prisma.$transaction.mockImplementation(async (operations: unknown) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations)
      }

      return operations
    })

    prisma.consentDocument.upsert.mockImplementation(async (params: any) => ({
      id: `doc-${params.where.key_version.key}`,
      key: params.create.key,
      version: params.create.version,
      title: params.create.title,
      description: params.create.description,
      kind: params.create.kind,
      required: params.create.required,
      active: params.create.active,
    }))

    service = new ConsentService(prisma as unknown as PrismaService, auditLogService as unknown as AuditLogService)
  })

  it('garante documentos padrao via upsert em transacao', async () => {
    const result = await service.ensureDefaultDocuments('2026.03')

    expect(prisma.consentDocument.upsert).toHaveBeenCalledTimes(DEFAULT_CONSENT_DOCUMENTS.length)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(DEFAULT_CONSENT_DOCUMENTS.length)
    expect(prisma.consentDocument.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          key_version: {
            key: DEFAULT_CONSENT_DOCUMENTS[0].key,
            version: '2026.03',
          },
        },
      }),
    )
  })

  it('lista documentos ativos apos garantir defaults', async () => {
    const documents = [
      {
        id: 'doc-1',
        key: DEFAULT_CONSENT_DOCUMENTS[0].key,
        title: DEFAULT_CONSENT_DOCUMENTS[0].title,
        kind: DEFAULT_CONSENT_DOCUMENTS[0].kind,
        required: true,
        active: true,
      },
    ]
    prisma.consentDocument.findMany.mockResolvedValue(documents)

    const result = await service.listActiveDocuments('2026.03')

    expect(prisma.consentDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          version: '2026.03',
          active: true,
        },
      }),
    )
    expect(result).toEqual(documents)
  })

  it('registra aceite legal apenas para documentos obrigatorios', async () => {
    jest.spyOn(service, 'ensureDefaultDocuments').mockResolvedValue([
      {
        id: 'doc-terms',
        key: 'terms-of-use',
        required: true,
      },
      {
        id: 'doc-privacy',
        key: 'privacy-policy',
        required: true,
      },
      {
        id: 'doc-analytics',
        key: COOKIE_DOCUMENT_KEYS.analytics,
        required: false,
      },
    ] as any)
    prisma.$transaction.mockResolvedValue([])

    await service.recordLegalAcceptances({
      userId: 'user-1',
      version: '2026.03',
      context: makeRequestContext(),
    })

    expect(prisma.userConsent.upsert).toHaveBeenCalledTimes(2)
    expect(prisma.userConsent.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          userId_documentId: {
            userId: 'user-1',
            documentId: 'doc-terms',
          },
        },
      }),
    )
  })

  it('atualiza preferencias e sincroniza consentimento opcional', async () => {
    jest.spyOn(service, 'ensureDefaultDocuments').mockResolvedValue([
      {
        id: 'doc-analytics',
        key: COOKIE_DOCUMENT_KEYS.analytics,
      },
      {
        id: 'doc-marketing',
        key: COOKIE_DOCUMENT_KEYS.marketing,
      },
    ] as any)

    prisma.cookiePreference.upsert.mockResolvedValue({ id: 'pref-1', analytics: false, marketing: false })
    prisma.userConsent.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'existing-marketing' })

    const result = await service.updateCookiePreferences({
      userId: 'user-1',
      version: '2026.03',
      preferences: {
        analytics: false,
        marketing: false,
      },
      context: makeRequestContext(),
    })

    expect(result).toEqual({ id: 'pref-1', analytics: false, marketing: false })
    expect(prisma.userConsent.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.userConsent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_documentId: {
            userId: 'user-1',
            documentId: 'doc-marketing',
          },
        },
        update: {
          revokedAt: expect.any(Date),
        },
      }),
    )
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'consent.cookies.updated',
        actorUserId: 'user-1',
      }),
    )
  })

  it('ativa consentimento opcional quando preferencia habilitada', async () => {
    jest.spyOn(service, 'ensureDefaultDocuments').mockResolvedValue([
      {
        id: 'doc-analytics',
        key: COOKIE_DOCUMENT_KEYS.analytics,
      },
    ] as any)

    prisma.cookiePreference.upsert.mockResolvedValue({ id: 'pref-2', analytics: true, marketing: false })
    prisma.userConsent.findUnique.mockResolvedValueOnce(null)

    await service.updateCookiePreferences({
      userId: 'user-1',
      version: '2026.03',
      preferences: {
        analytics: true,
        marketing: false,
      },
      context: makeRequestContext({ ipAddress: '10.0.0.1' }),
    })

    expect(prisma.userConsent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          acceptedAt: expect.any(Date),
          revokedAt: null,
          ipAddress: '10.0.0.1',
        }),
      }),
    )
  })

  it('monta overview de consentimento com fallback de preferencias', async () => {
    jest.spyOn(service, 'listActiveDocuments').mockResolvedValue([
      {
        id: 'doc-terms',
        key: 'terms-of-use',
        title: 'Termos',
        kind: 'LEGAL',
        required: true,
        active: true,
      },
      {
        id: 'doc-analytics',
        key: COOKIE_DOCUMENT_KEYS.analytics,
        title: 'Analytics',
        kind: 'COOKIE',
        required: false,
        active: true,
      },
    ] as any)

    prisma.cookiePreference.findUnique.mockResolvedValue(null)
    prisma.userConsent.findMany.mockResolvedValue([
      {
        acceptedAt: new Date('2026-04-01T09:00:00.000Z'),
        revokedAt: null,
        document: {
          key: 'terms-of-use',
          required: true,
        },
      },
      {
        acceptedAt: new Date('2026-04-01T10:00:00.000Z'),
        revokedAt: new Date('2026-04-02T10:00:00.000Z'),
        document: {
          key: 'terms-of-use',
          required: true,
        },
      },
    ])

    const result = await service.getUserConsentOverview({ userId: 'user-1', version: '2026.03' })

    expect(result.legalAcceptances).toEqual([
      {
        key: 'terms-of-use',
        acceptedAt: new Date('2026-04-01T09:00:00.000Z'),
      },
    ])
    expect(result.cookiePreferences).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
    })
    expect(result.documents).toHaveLength(2)
  })
})
