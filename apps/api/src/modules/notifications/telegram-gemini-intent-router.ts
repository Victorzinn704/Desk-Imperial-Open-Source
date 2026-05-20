import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CacheService } from '../../common/services/cache.service'
import {
  extractGeminiResponseText,
  type GeminiGenerateContentResponse,
} from '../market-intelligence/market-intelligence-gemini.util'
import type { TelegramCommandName } from './telegram-bot-command.types'

const INTENT_CACHE_TTL_SECONDS = 15 * 60
const DEFAULT_TIMEOUT_MS = 1800
const COMMANDS: TelegramCommandName[] = [
  'ajuda',
  'status',
  'portal',
  'vendas',
  'caixa',
  'relatorio',
  'equipe',
  'alertas',
  'fechamento',
]

const deterministicIntents: Array<{ command: TelegramCommandName; matchers: string[] }> = [
  { command: 'vendas', matchers: ['venda', 'faturamento de hoje', 'quanto vendi', 'movimento'] },
  { command: 'caixa', matchers: ['caixa', 'sessao', 'sessão', 'sangria', 'suprimento'] },
  { command: 'relatorio', matchers: ['relatorio', 'relatório', 'financeiro', 'dre', 'lucro', 'margem'] },
  { command: 'equipe', matchers: ['equipe', 'funcionario', 'funcionário', 'garcom', 'garçom'] },
  { command: 'alertas', matchers: ['alerta', 'notificacao', 'notificação', 'aviso'] },
  { command: 'portal', matchers: ['portal', 'link', 'painel', 'abrir sistema'] },
  { command: 'status', matchers: ['status', 'conectado', 'vinculo', 'vínculo'] },
  { command: 'fechamento', matchers: ['fechar caixa', 'fechamento', 'encerrar caixa'] },
]

@Injectable()
export class TelegramGeminiIntentRouter {
  private readonly logger = new Logger(TelegramGeminiIntentRouter.name)

  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  async resolve(text: string): Promise<TelegramCommandName | null> {
    const normalized = normalizeIntentText(text)
    if (!normalized || normalized.startsWith('/')) {
      return null
    }

    const deterministic = resolveDeterministicIntent(normalized)
    if (deterministic) {
      return deterministic
    }

    return this.resolveWithGemini(normalized)
  }

  private async resolveWithGemini(text: string) {
    if (!this.isGeminiEnabled()) {
      return null
    }

    const cacheKey = buildIntentCacheKey(text)
    const cached = await this.cache.get<{ command: TelegramCommandName | null }>(cacheKey)
    if (cached) {
      return cached.command
    }

    const command = await this.requestGeminiIntent(text).catch((error: unknown) => {
      this.logger.warn(`Gemini intent Telegram indisponivel: ${error instanceof Error ? error.message : String(error)}`)
      return null
    })
    await this.cache.set(cacheKey, { command }, INTENT_CACHE_TTL_SECONDS)
    return command
  }

  private async requestGeminiIntent(text: string): Promise<TelegramCommandName | null> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      return null
    }

    const response = await fetch(`${this.resolveGeminiUrl()}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      body: JSON.stringify(buildGeminiIntentBody(text)),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(this.resolveTimeoutMs()),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse
    return normalizeGeminiCommand(extractGeminiResponseText(payload))
  }

  private isGeminiEnabled() {
    return this.config.get<string>('TELEGRAM_GEMINI_INTENT_ENABLED') === 'true'
  }

  private resolveGeminiUrl() {
    const baseUrl =
      this.config.get<string>('GEMINI_API_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/models'
    const model = this.config.get<string>('TELEGRAM_GEMINI_INTENT_MODEL') ?? this.config.get<string>('GEMINI_MODEL')
    return `${baseUrl.replace(/\/$/, '')}/${model ?? 'gemini-2.5-flash'}`
  }

  private resolveTimeoutMs() {
    return Math.max(Number(this.config.get<string>('TELEGRAM_GEMINI_INTENT_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS), 800)
  }
}

function buildGeminiIntentBody(text: string) {
  return {
    contents: [
      {
        parts: [
          {
            text: [
              'Classifique a mensagem do usuario em um comando do bot Desk Imperial.',
              `Comandos validos: ${COMMANDS.join(', ')}.`,
              'Responda somente com um comando valido ou null.',
              `Mensagem: ${text}`,
            ].join('\n'),
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 8, temperature: 0 },
  }
}

function normalizeGeminiCommand(rawText: string | null | undefined) {
  const normalized = normalizeIntentText(rawText ?? '').replace(/^\/+/, '')
  return COMMANDS.includes(normalized as TelegramCommandName) ? (normalized as TelegramCommandName) : null
}

function resolveDeterministicIntent(text: string) {
  return (
    deterministicIntents.find((intent) => intent.matchers.some((matcher) => text.includes(matcher)))?.command ?? null
  )
}

function buildIntentCacheKey(text: string) {
  return `telegram:gemini-intent:${Buffer.from(text).toString('base64url').slice(0, 96)}`
}

function normalizeIntentText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}
