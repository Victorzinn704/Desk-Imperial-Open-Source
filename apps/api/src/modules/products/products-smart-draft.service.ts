import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'
import { CacheService } from '../../common/services/cache.service'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import type { AuditLogService } from '../monitoring/audit-log.service'
import type { SmartProductDraftDto } from './dto/smart-product-draft.dto'

type SmartProductDraftSuggestion = {
  name: string
  brand: string
  category: string
  packagingClass: string
  measurementUnit: string
  measurementValue: number
  unitsPerPackage: number
  description: string
  quantityLabel: string | null
  servingSize: string | null
  requiresKitchen: boolean
}

type SmartProductDraftResponse = {
  generatedAt: string
  model: string
  cached: boolean
  summary: string
  suggestion: SmartProductDraftSuggestion
}

type GeminiDraftPayload = {
  summary?: unknown
  suggestion?: unknown
}

@Injectable()
export class ProductsSmartDraftService {
  private readonly logger = new Logger(ProductsSmartDraftService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async generateDraft(
    auth: AuthContext,
    dto: SmartProductDraftDto,
    context: RequestContext,
  ): Promise<SmartProductDraftResponse> {
    const normalized = normalizeDraftInput(dto)
    if (!hasMeaningfulDraftInput(normalized)) {
      throw new BadRequestException('Envie ao menos nome, categoria, marca, embalagem ou código de barras para a IA.')
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'O cadastro inteligente ainda não foi configurado. Adicione GEMINI_API_KEY para ativar o Gemini.',
      )
    }

    const model = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash'
    const cacheKey = buildDraftCacheKey(auth.workspaceOwnerUserId, normalized)
    const cached = await this.cache.get<SmartProductDraftResponse>(cacheKey)

    if (cached) {
      await this.auditLogService.record({
        actorUserId: resolveAuthActorUserId(auth),
        event: 'products.smart_draft.cached',
        resource: 'product_smart_draft',
        metadata: {
          barcode: normalized.barcode ?? null,
          model: cached.model,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      return { ...cached, cached: true }
    }

    await this.assertRequestAllowed(auth, context)

    let response: Response
    try {
      response = await fetch(this.buildModelUrl(model, apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.getRequestTimeoutMs()),
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildSmartDraftPrompt(auth, normalized) }],
            },
          ],
          generationConfig: {
            temperature: 0.25,
            topP: 0.85,
            maxOutputTokens: 768,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
            responseSchema: {
              type: 'OBJECT',
              properties: {
                summary: { type: 'STRING' },
                suggestion: {
                  type: 'OBJECT',
                  properties: {
                    name: { type: 'STRING' },
                    brand: { type: 'STRING' },
                    category: { type: 'STRING' },
                    packagingClass: { type: 'STRING' },
                    measurementUnit: { type: 'STRING' },
                    measurementValue: { type: 'NUMBER' },
                    unitsPerPackage: { type: 'INTEGER' },
                    description: { type: 'STRING' },
                    quantityLabel: { type: 'STRING', nullable: true },
                    servingSize: { type: 'STRING', nullable: true },
                    requiresKitchen: { type: 'BOOLEAN' },
                  },
                  required: [
                    'name',
                    'brand',
                    'category',
                    'packagingClass',
                    'measurementUnit',
                    'measurementValue',
                    'unitsPerPackage',
                    'description',
                    'quantityLabel',
                    'servingSize',
                    'requiresKitchen',
                  ],
                },
              },
              required: ['summary', 'suggestion'],
            },
          },
        }),
      })
    } catch (error) {
      this.logger.warn(`Gemini smart draft indisponível: ${String(error)}`)
      throw new ServiceUnavailableException(
        'Não foi possível consultar a IA de cadastro agora. Tente novamente em alguns instantes.',
      )
    }

    if (!response.ok) {
      const errorText = await response.text()
      this.logger.warn(`Gemini smart draft respondeu ${response.status}: ${errorText}`)
      throw new BadGatewayException('A IA não conseguiu montar um rascunho válido neste momento.')
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse
    const rawText = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim()

    if (!rawText) {
      throw new BadGatewayException('A IA não retornou um rascunho utilizável.')
    }

    const normalizedResponse = normalizeDraftResponse(rawText, normalized)
    const result: SmartProductDraftResponse = {
      generatedAt: new Date().toISOString(),
      model,
      cached: false,
      summary: normalizedResponse.summary,
      suggestion: normalizedResponse.suggestion,
    }

    await this.cache.set(cacheKey, result, this.getCacheTtlSeconds())
    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'products.smart_draft.generated',
      resource: 'product_smart_draft',
      metadata: {
        barcode: normalized.barcode ?? null,
        category: normalized.category ?? null,
        model,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return result
  }

  private async assertRequestAllowed(auth: AuthContext, context: RequestContext) {
    const rateLimitKey = CacheService.ratelimitKey(
      'gemini-product-draft',
      `${auth.userId}:${context.ipAddress ?? 'unknown'}`,
    )
    const count = await this.cache.increment(rateLimitKey, 60)
    if (count > 12) {
      throw new HttpException(
        'Muitas solicitações de cadastro inteligente. Aguarde um minuto.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
  }

  private buildModelUrl(model: string, apiKey: string) {
    const baseUrl =
      this.configService.get<string>('GEMINI_API_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/models'
    return `${baseUrl}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  }

  private getRequestTimeoutMs() {
    return Math.max(Number(this.configService.get<string>('GEMINI_TIMEOUT_MS') ?? 12000), 5000)
  }

  private getCacheTtlSeconds() {
    return Math.max(Number(this.configService.get<string>('GEMINI_CACHE_SECONDS') ?? 900), 60)
  }
}

type NormalizedDraftInput = {
  barcode: string | null
  name: string | null
  brand: string | null
  category: string | null
  packagingClass: string | null
  measurementUnit: string | null
  measurementValue: number | null
  unitsPerPackage: number | null
  quantityLabel: string | null
  servingSize: string | null
  description: string | null
  requiresKitchen: boolean | null
}

function normalizeDraftInput(dto: SmartProductDraftDto): NormalizedDraftInput {
  return {
    barcode: dto.barcode?.trim() || null,
    name: sanitizeOptionalText(dto.name, 'Nome do produto'),
    brand: sanitizeOptionalText(dto.brand, 'Marca do produto'),
    category: sanitizeOptionalText(dto.category, 'Categoria do produto'),
    packagingClass: sanitizeOptionalText(dto.packagingClass, 'Classe de embalagem'),
    measurementUnit: sanitizeOptionalText(dto.measurementUnit, 'Unidade de medida'),
    measurementValue: normalizePositiveNumber(dto.measurementValue),
    unitsPerPackage: normalizePositiveInteger(dto.unitsPerPackage),
    quantityLabel: sanitizeOptionalText(dto.quantityLabel, 'Leitura de quantidade'),
    servingSize: sanitizeOptionalText(dto.servingSize, 'Porção'),
    description: sanitizeOptionalText(dto.description, 'Descrição'),
    requiresKitchen: typeof dto.requiresKitchen === 'boolean' ? dto.requiresKitchen : null,
  }
}

function hasMeaningfulDraftInput(input: NormalizedDraftInput) {
  return Boolean(
    input.barcode ||
    input.name ||
    input.brand ||
    input.category ||
    input.packagingClass ||
    input.description ||
    input.quantityLabel,
  )
}

function sanitizeOptionalText(value: string | undefined, field: string) {
  return (
    sanitizePlainText(value, field, {
      allowEmpty: true,
      rejectFormula: true,
    }) ?? null
  )
}

function normalizePositiveNumber(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function normalizePositiveInteger(value: number | undefined) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function buildDraftCacheKey(workspaceOwnerUserId: string, input: NormalizedDraftInput) {
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex')
  return `gemini:product-draft:${workspaceOwnerUserId}:${fingerprint}`
}

function buildSmartDraftPrompt(auth: AuthContext, input: NormalizedDraftInput) {
  return [
    'Você é um especialista em cadastro de produtos para PDV brasileiro de varejo, conveniência, bar, mercearia e mercado.',
    'Monte um rascunho operacional curto, limpo e consistente para o Desk Imperial.',
    'Regras obrigatórias:',
    '- Não invente preço, custo, estoque ou fornecedor.',
    '- Preserve o contexto de produto embalado quando houver indício de lata, garrafa, long neck, PET, caixa ou ml.',
    '- Só marque requiresKitchen=true se o item depender de preparo, montagem, cozinha, chapa, balcão ou produção interna.',
    '- Para bebidas prontas e produtos de prateleira, use requiresKitchen=false.',
    '- Nome, marca e categoria devem sair padronizados para operação de PDV.',
    '- summary deve ser uma frase curta explicando o que foi ajustado.',
    '',
    `Empresa: ${auth.companyName?.trim() || 'Desk Imperial Workspace'}`,
    `Perfil do operador: ${auth.role}`,
    '',
    'Entrada atual do operador:',
    JSON.stringify(input, null, 2),
  ].join('\n')
}

function normalizeDraftResponse(
  rawText: string,
  input: NormalizedDraftInput,
): Omit<SmartProductDraftResponse, 'generatedAt' | 'model' | 'cached'> {
  let parsed: GeminiDraftPayload
  try {
    parsed = JSON.parse(rawText) as GeminiDraftPayload
  } catch {
    throw new BadGatewayException('A IA retornou um payload inválido para o rascunho do produto.')
  }

  const suggestionPayload = parsed.suggestion
  if (!suggestionPayload || typeof suggestionPayload !== 'object') {
    throw new BadGatewayException('A IA não entregou a sugestão do produto.')
  }

  const suggestionSource = suggestionPayload as Record<string, unknown>
  const suggestion: SmartProductDraftSuggestion = {
    name: ensureString(suggestionSource.name, input.name ?? 'Produto sem nome', 120),
    brand: ensureString(suggestionSource.brand, input.brand ?? '', 80),
    category: ensureString(suggestionSource.category, input.category ?? 'Mercearia', 80),
    packagingClass: ensureString(suggestionSource.packagingClass, input.packagingClass ?? 'Cadastro rápido móvel', 120),
    measurementUnit: ensureString(suggestionSource.measurementUnit, input.measurementUnit ?? 'UN', 24).toUpperCase(),
    measurementValue: ensurePositiveNumber(suggestionSource.measurementValue, input.measurementValue ?? 1),
    unitsPerPackage: ensurePositiveInteger(suggestionSource.unitsPerPackage, input.unitsPerPackage ?? 1),
    description: ensureString(suggestionSource.description, input.description ?? '', 280),
    quantityLabel: ensureNullableString(suggestionSource.quantityLabel, input.quantityLabel),
    servingSize: ensureNullableString(suggestionSource.servingSize, input.servingSize),
    requiresKitchen:
      typeof suggestionSource.requiresKitchen === 'boolean'
        ? suggestionSource.requiresKitchen
        : (input.requiresKitchen ?? false),
  }

  return {
    summary: ensureString(parsed.summary, 'Rascunho operacional padronizado para o cadastro rápido.', 180),
    suggestion,
  }
}

function ensureString(value: unknown, fallback: string, maxLength: number) {
  const candidate = typeof value === 'string' ? value.trim() : fallback.trim()
  return candidate.slice(0, maxLength) || fallback.trim().slice(0, maxLength)
}

function ensureNullableString(value: unknown, fallback: string | null) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed.slice(0, 64) : null
  }

  return fallback ? fallback.slice(0, 64) : null
}

function ensurePositiveNumber(value: unknown, fallback: number) {
  const numeric = typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
  return Math.round(numeric * 100) / 100
}

function ensurePositiveInteger(value: unknown, fallback: number) {
  const numeric = typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback
  return Math.max(numeric, 1)
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}
