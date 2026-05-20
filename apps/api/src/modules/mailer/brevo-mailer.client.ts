import { ServiceUnavailableException, type Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { DeliveryResult, TransactionalEmailPayload } from './mailer.types'

type BrevoFailure = {
  normalizedPayload: string
  status: number
}

type BrevoSenderIdentity = {
  email: string
  name: string
  replyToEmail: string
}

type BrevoSendInput = {
  apiKey: string
  configService: ConfigService
  logger: Logger
  payload: TransactionalEmailPayload
  sender: BrevoSenderIdentity
}

const BREVO_REQUEST_TIMEOUT_MS = 15_000
const BREVO_API_KEY_ERROR_HINTS = ['key not found', 'unauthorized']
const BREVO_SENDER_ERROR_HINTS = ['sender', 'domain', 'not verified', 'invalid_parameter', 'not allowed']
const BREVO_SENDER_ERROR_STATUSES = new Set([400, 403])
const BREVO_API_KEY_REJECTED_MESSAGE =
  'A chave da API da Brevo foi rejeitada. Gere uma API key real em Brevo API > API Keys e atualize BREVO_API_KEY no deploy.'
const BREVO_SENDER_NOT_VALIDATED_MESSAGE =
  'O remetente da Brevo ainda nao foi validado. Confirme o sender e os registros DNS do dominio antes de liberar o envio publico.'
const BREVO_GENERIC_FAILURE_MESSAGE = 'Nao foi possivel enviar o email agora. Tente novamente em instantes.'
const BREVO_TIMEOUT_MESSAGE = 'O servico de email nao respondeu a tempo. Tente novamente em instantes.'

export async function sendWithBrevoApi(input: BrevoSendInput): Promise<DeliveryResult> {
  const apiUrl = input.configService.get<string>('BREVO_API_URL')?.trim() ?? 'https://api.brevo.com/v3/smtp/email'

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: buildBrevoHeaders(input.apiKey),
      body: JSON.stringify(buildBrevoPayload(input.payload, input.sender)),
      signal: AbortSignal.timeout(BREVO_REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      await throwBrevoApiFailure(response, input.payload.to, input.logger)
    }

    return readBrevoDeliveryResult(response)
  } catch (error) {
    throwBrevoTransportFailure(error, input.payload.to, input.logger)
  }
}

function buildBrevoHeaders(apiKey: string) {
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-key': apiKey,
  }
}

function buildBrevoPayload(payload: TransactionalEmailPayload, sender: BrevoSenderIdentity) {
  return {
    sender: {
      name: sender.name,
      email: sender.email,
    },
    to: [{ email: payload.to }],
    replyTo: {
      email: sender.replyToEmail,
      name: sender.name,
    },
    subject: payload.subject,
    htmlContent: payload.html,
    textContent: payload.text,
    tags: payload.tags,
  }
}

async function throwBrevoApiFailure(
  response: Awaited<ReturnType<typeof fetch>>,
  recipientEmail: string,
  logger: Logger,
): Promise<never> {
  const payload = await response.text()
  const failure = {
    status: response.status,
    normalizedPayload: payload.toLowerCase(),
  }

  logger.error(`Falha na API da Brevo ao enviar email para ${recipientEmail}: ${response.status} ${payload}`)

  throw new ServiceUnavailableException(resolveBrevoFailureMessage(failure))
}

function resolveBrevoFailureMessage(failure: BrevoFailure) {
  if (isRejectedBrevoApiKey(failure)) {
    return BREVO_API_KEY_REJECTED_MESSAGE
  }

  if (isUnverifiedBrevoSender(failure)) {
    return BREVO_SENDER_NOT_VALIDATED_MESSAGE
  }

  return BREVO_GENERIC_FAILURE_MESSAGE
}

function isRejectedBrevoApiKey(failure: BrevoFailure) {
  if (failure.status !== 401) {
    return false
  }

  return hasBrevoFailureHint(failure, BREVO_API_KEY_ERROR_HINTS)
}

function isUnverifiedBrevoSender(failure: BrevoFailure) {
  if (!BREVO_SENDER_ERROR_STATUSES.has(failure.status)) {
    return false
  }

  return hasBrevoFailureHint(failure, BREVO_SENDER_ERROR_HINTS)
}

function hasBrevoFailureHint(failure: BrevoFailure, hints: string[]) {
  return hints.some((hint) => failure.normalizedPayload.includes(hint))
}

async function readBrevoDeliveryResult(response: Awaited<ReturnType<typeof fetch>>): Promise<DeliveryResult> {
  const payload = (await response.json().catch(() => null)) as { messageId?: string } | null

  return {
    mode: 'brevo-api',
    messageId: payload?.messageId ?? null,
  }
}

function throwBrevoTransportFailure(error: unknown, recipientEmail: string, logger: Logger): never {
  logger.error(
    `Falha ao enviar email transacional via Brevo para ${recipientEmail}: ${error instanceof Error ? error.message : 'unknown'}`,
  )

  if (error instanceof ServiceUnavailableException) {
    throw error
  }

  throw new ServiceUnavailableException(BREVO_TIMEOUT_MESSAGE)
}
