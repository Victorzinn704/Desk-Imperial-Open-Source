import { Injectable } from '@nestjs/common'
import { CacheService } from '../../common/services/cache.service'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { COOKIE_DOCUMENT_KEYS, DEFAULT_CONSENT_DOCUMENTS } from './consent.constants'
import type { UpdateCookiePreferencesDto } from './dto/update-cookie-preferences.dto'

const CONSENT_DOCUMENTS_TTL_SECONDS = 60 * 60
const CONSENT_OVERVIEW_TTL_SECONDS = 10 * 60

type ActiveConsentDocument = {
  id: string
  key: string
  title: string
  description: string | null
  kind: string
  required: boolean
  active: boolean
}

type ConsentOverviewResponse = {
  documents: Array<{
    id: string
    key: string
    title: string
    kind: string
    required: boolean
    active: boolean
  }>
  legalAcceptances: Array<{
    key: string
    acceptedAt: Date
  }>
  cookiePreferences: {
    necessary: boolean
    analytics: boolean
    marketing: boolean
  }
}

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly cache: CacheService,
  ) {}

  async ensureDefaultDocuments(version: string) {
    const operations = DEFAULT_CONSENT_DOCUMENTS.map((document) =>
      this.prisma.consentDocument.upsert({
        where: {
          key_version: {
            key: document.key,
            version,
          },
        },
        update: {
          title: document.title,
          description: document.description,
          kind: document.kind,
          required: document.required,
          active: true,
        },
        create: {
          key: document.key,
          version,
          title: document.title,
          description: document.description,
          kind: document.kind,
          required: document.required,
          active: true,
        },
      }),
    )

    return this.prisma.$transaction(operations)
  }

  async listActiveDocuments(version: string): Promise<ActiveConsentDocument[]> {
    const cacheKey = CacheService.consentDocumentsKey(version)
    const cached = await this.cache.get<ActiveConsentDocument[]>(cacheKey)
    if (cached) {
      return cached
    }

    await this.ensureDefaultDocuments(version)

    const documents = await this.prisma.consentDocument.findMany({
      where: {
        version,
        active: true,
      },
      orderBy: [{ kind: 'asc' }, { required: 'desc' }, { title: 'asc' }],
    })

    await this.cache.set(cacheKey, documents, CONSENT_DOCUMENTS_TTL_SECONDS)

    return documents
  }

  async recordLegalAcceptances(params: { userId: string; version: string; context: RequestContext }) {
    const documents = await this.ensureDefaultDocuments(params.version)
    const legalDocuments = documents.filter((document) => document.required)

    await this.prisma.$transaction(
      legalDocuments.map((document) =>
        this.prisma.userConsent.upsert({
          where: {
            userId_documentId: {
              userId: params.userId,
              documentId: document.id,
            },
          },
          update: {
            acceptedAt: new Date(),
            revokedAt: null,
            ipAddress: params.context.ipAddress,
            userAgent: params.context.userAgent,
          },
          create: {
            userId: params.userId,
            documentId: document.id,
            ipAddress: params.context.ipAddress,
            userAgent: params.context.userAgent,
          },
        }),
      ),
    )

    await this.cache.del(CacheService.consentOverviewKey(params.userId, params.version))
  }

  async updateCookiePreferences(params: {
    userId: string
    version: string
    preferences: UpdateCookiePreferencesDto
    context: RequestContext
  }) {
    const documents = await this.ensureDefaultDocuments(params.version)
    const analyticsDocument = documents.find((document) => document.key === COOKIE_DOCUMENT_KEYS.analytics)
    const marketingDocument = documents.find((document) => document.key === COOKIE_DOCUMENT_KEYS.marketing)

    const preference = await this.prisma.cookiePreference.upsert({
      where: {
        userId: params.userId,
      },
      update: {
        analytics: params.preferences.analytics,
        marketing: params.preferences.marketing,
      },
      create: {
        userId: params.userId,
        analytics: params.preferences.analytics,
        marketing: params.preferences.marketing,
      },
    })

    if (analyticsDocument) {
      await this.syncOptionalConsent({
        enabled: params.preferences.analytics,
        userId: params.userId,
        documentId: analyticsDocument.id,
        context: params.context,
      })
    }

    if (marketingDocument) {
      await this.syncOptionalConsent({
        enabled: params.preferences.marketing,
        userId: params.userId,
        documentId: marketingDocument.id,
        context: params.context,
      })
    }

    await this.auditLogService.record({
      actorUserId: params.userId,
      event: 'consent.cookies.updated',
      resource: 'cookie_preference',
      resourceId: preference.id,
      metadata: {
        analytics: params.preferences.analytics,
        marketing: params.preferences.marketing,
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })

    await this.cache.del(CacheService.consentOverviewKey(params.userId, params.version))

    return preference
  }

  async getUserConsentOverview(params: { userId: string; version: string }): Promise<ConsentOverviewResponse> {
    const cacheKey = CacheService.consentOverviewKey(params.userId, params.version)
    const cached = await this.cache.get<ConsentOverviewResponse>(cacheKey)
    if (cached) {
      return cached
    }

    const [documents, preference, consents] = await Promise.all([
      this.listActiveDocuments(params.version),
      this.prisma.cookiePreference.findUnique({
        where: { userId: params.userId },
      }),
      this.prisma.userConsent.findMany({
        where: {
          userId: params.userId,
          document: {
            version: params.version,
          },
        },
        select: {
          acceptedAt: true,
          revokedAt: true,
          document: {
            select: {
              key: true,
              required: true,
            },
          },
        },
      }),
    ])

    const overview = {
      documents: documents.map((document: ActiveConsentDocument) => ({
        id: document.id,
        key: document.key,
        title: document.title,
        kind: document.kind,
        required: document.required,
        active: document.active,
      })),
      legalAcceptances: consents
        .filter((consent) => consent.document.required && !consent.revokedAt)
        .map((consent) => ({
          key: consent.document.key,
          acceptedAt: consent.acceptedAt,
        })),
      cookiePreferences: {
        necessary: true,
        analytics: preference?.analytics ?? false,
        marketing: preference?.marketing ?? false,
      },
    }

    await this.cache.set(cacheKey, overview, CONSENT_OVERVIEW_TTL_SECONDS)

    return overview
  }

  private async syncOptionalConsent(params: {
    enabled: boolean
    userId: string
    documentId: string
    context: RequestContext
  }) {
    const existingConsent = await this.prisma.userConsent.findUnique({
      where: {
        userId_documentId: {
          userId: params.userId,
          documentId: params.documentId,
        },
      },
    })

    if (!(existingConsent || params.enabled)) {
      return
    }

    await this.prisma.userConsent.upsert({
      where: {
        userId_documentId: {
          userId: params.userId,
          documentId: params.documentId,
        },
      },
      update: params.enabled
        ? {
            acceptedAt: new Date(),
            revokedAt: null,
            ipAddress: params.context.ipAddress,
            userAgent: params.context.userAgent,
          }
        : {
            revokedAt: new Date(),
          },
      create: {
        userId: params.userId,
        documentId: params.documentId,
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
        revokedAt: params.enabled ? null : new Date(),
      },
    })
  }
}
