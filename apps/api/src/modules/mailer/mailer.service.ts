import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  buildEmailVerificationContent,
  buildFailedLoginAlertEmailContent,
  buildFeedbackReceiptEmailContent,
  buildLoginAlertEmailContent,
  buildPasswordChangedEmailContent,
  buildPasswordResetEmailContent,
  buildTelegramLinkedEmailContent,
} from './mailer.templates'

type DeliveryMode = 'brevo-api' | 'log'
type DeliveryPreference = DeliveryMode | 'auto'

type DeliveryResult = {
  mode: DeliveryMode
  messageId?: string | null
}

type TransactionalEmailPayload = {
  to: string
  subject: string
  text: string
  html: string
  fallbackLogMessage: string
  tags: string[]
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(params: { to: string; fullName: string; code: string; expiresInMinutes: number }) {
    const content = buildPasswordResetEmailContent({
      appName: this.getAppName(),
      supportEmail: this.getSupportEmail(),
      fullName: params.fullName,
      code: params.code,
      expiresInMinutes: params.expiresInMinutes,
    })

    return this.sendTransactionalEmail({
      to: params.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: content.tags,
      fallbackLogMessage: `Email nao configurado. Codigo de redefinicao emitido para ${params.to}.`,
    })
  }

  async sendEmailVerificationEmail(params: { to: string; fullName: string; code: string; expiresInMinutes: number }) {
    const content = buildEmailVerificationContent({
      appName: this.getAppName(),
      supportEmail: this.getSupportEmail(),
      fullName: params.fullName,
      code: params.code,
      expiresInMinutes: params.expiresInMinutes,
    })

    return this.sendTransactionalEmail({
      to: params.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: content.tags,
      fallbackLogMessage: `Email nao configurado. Codigo de verificacao emitido para ${params.to}.`,
    })
  }

  async sendPasswordChangedEmail(params: { to: string; fullName: string; changedAt: Date; ipAddress?: string | null }) {
    const content = buildPasswordChangedEmailContent({
      appName: this.getAppName(),
      supportEmail: this.getSupportEmail(),
      fullName: params.fullName,
      changedAt: params.changedAt,
      ...(params.ipAddress !== undefined ? { ipAddress: params.ipAddress } : {}),
    })

    return this.sendTransactionalEmail({
      to: params.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: content.tags,
      fallbackLogMessage: `Email nao configurado. Senha alterada para ${params.to} em ${params.changedAt.toISOString()}`,
    })
  }

  async sendLoginAlertEmail(params: {
    to: string
    fullName: string
    occurredAt: Date
    ipAddress?: string | null
    userAgent?: string | null
  }) {
    const content = buildLoginAlertEmailContent({
      appName: this.getAppName(),
      supportEmail: this.getSupportEmail(),
      fullName: params.fullName,
      occurredAt: params.occurredAt,
      ...(params.ipAddress !== undefined ? { ipAddress: params.ipAddress } : {}),
      ...(params.userAgent !== undefined ? { userAgent: params.userAgent } : {}),
    })

    return this.sendTransactionalEmail({
      to: params.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: content.tags,
      fallbackLogMessage: `Email nao configurado. Novo acesso detectado para ${params.to}.`,
    })
  }

  async sendFailedLoginAlertEmail(params: {
    to: string
    fullName: string
    occurredAt: Date
    attemptCount: number
    ipAddress?: string | null
    userAgent?: string | null
    locationSummary?: string | null
  }) {
    const content = buildFailedLoginAlertEmailContent({
      appName: this.getAppName(),
      supportEmail: this.getSupportEmail(),
      fullName: params.fullName,
      occurredAt: params.occurredAt,
      attemptCount: params.attemptCount,
      ...(params.ipAddress !== undefined ? { ipAddress: params.ipAddress } : {}),
      ...(params.userAgent !== undefined ? { userAgent: params.userAgent } : {}),
      ...(params.locationSummary !== undefined ? { locationSummary: params.locationSummary } : {}),
    })

    return this.sendTransactionalEmail({
      to: params.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: content.tags,
      fallbackLogMessage: `Email nao configurado. Tentativas de acesso suspeitas para ${params.to}.`,
    })
  }

  async sendFeedbackReceiptEmail(params: {
    to: string
    fullName: string
    subjectLine: string
    ticketId: string
    receivedAt: Date
  }) {
    const content = buildFeedbackReceiptEmailContent({
      appName: this.getAppName(),
      supportEmail: this.getSupportEmail(),
      fullName: params.fullName,
      subjectLine: params.subjectLine,
      ticketId: params.ticketId,
      receivedAt: params.receivedAt,
    })

    return this.sendTransactionalEmail({
      to: params.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: content.tags,
      fallbackLogMessage: `Email nao configurado. Feedback recebido para ${params.to}, protocolo ${params.ticketId}.`,
    })
  }

  async sendTelegramLinkedEmail(params: {
    to: string
    fullName: string
    linkedAt: Date
    telegramUsername?: string | null
    telegramChatId: string
  }) {
    const content = buildTelegramLinkedEmailContent({
      appName: this.getAppName(),
      supportEmail: this.getSupportEmail(),
      fullName: params.fullName,
      linkedAt: params.linkedAt,
      telegramChatId: params.telegramChatId,
      ...(params.telegramUsername !== undefined ? { telegramUsername: params.telegramUsername } : {}),
    })

    return this.sendTransactionalEmail({
      to: params.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: content.tags,
      fallbackLogMessage: `Email nao configurado. Telegram vinculado para ${params.to}.`,
    })
  }

  private async sendTransactionalEmail(params: TransactionalEmailPayload): Promise<DeliveryResult> {
    const preferredMode = this.getDeliveryPreference()

    if (preferredMode === 'log') {
      this.logger.warn(params.fallbackLogMessage)
      return { mode: 'log' }
    }

    const brevoApiKey = this.getBrevoApiKey()

    if (!brevoApiKey) {
      if (preferredMode === 'brevo-api' || this.isProduction()) {
        throw new ServiceUnavailableException(
          'O envio de email da Brevo ainda nao esta configurado. Gere uma API key em Brevo API > API Keys e salve em BREVO_API_KEY.',
        )
      }

      this.logger.warn(params.fallbackLogMessage)
      return { mode: 'log' }
    }

    return this.sendWithBrevoApi(params, brevoApiKey)
  }

  private async sendWithBrevoApi(params: TransactionalEmailPayload, apiKey: string): Promise<DeliveryResult> {
    const fromEmail = this.getSenderEmail()
    const fromName = this.getSenderName()
    const replyTo = this.getReplyToEmail(fromEmail)
    const apiUrl = this.configService.get<string>('BREVO_API_URL')?.trim() ?? 'https://api.brevo.com/v3/smtp/email'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail,
          },
          to: [{ email: params.to }],
          replyTo: {
            email: replyTo,
            name: fromName,
          },
          subject: params.subject,
          htmlContent: params.html,
          textContent: params.text,
          tags: params.tags,
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        const payload = await response.text()
        const normalizedPayload = payload.toLowerCase()

        this.logger.error(`Falha na API da Brevo ao enviar email para ${params.to}: ${response.status} ${payload}`)

        if (
          response.status === 401 &&
          (normalizedPayload.includes('key not found') || normalizedPayload.includes('unauthorized'))
        ) {
          throw new ServiceUnavailableException(
            'A chave da API da Brevo foi rejeitada. Gere uma API key real em Brevo API > API Keys e atualize BREVO_API_KEY no deploy.',
          )
        }

        if (
          (response.status === 400 || response.status === 403) &&
          (normalizedPayload.includes('sender') ||
            normalizedPayload.includes('domain') ||
            normalizedPayload.includes('not verified') ||
            normalizedPayload.includes('invalid_parameter') ||
            normalizedPayload.includes('not allowed'))
        ) {
          throw new ServiceUnavailableException(
            'O remetente da Brevo ainda nao foi validado. Confirme o sender e os registros DNS do dominio antes de liberar o envio publico.',
          )
        }

        throw new ServiceUnavailableException('Nao foi possivel enviar o email agora. Tente novamente em instantes.')
      }

      const payload = (await response.json().catch(() => null)) as { messageId?: string } | null
      return {
        mode: 'brevo-api',
        messageId: payload?.messageId ?? null,
      }
    } catch (error) {
      this.logger.error(
        `Falha ao enviar email transacional via Brevo para ${params.to}: ${error instanceof Error ? error.message : 'unknown'}`,
      )

      if (error instanceof ServiceUnavailableException) {
        throw error
      }

      throw new ServiceUnavailableException('O servico de email nao respondeu a tempo. Tente novamente em instantes.')
    }
  }

  private getAppName() {
    return this.configService.get<string>('APP_NAME') ?? 'DESK IMPERIAL'
  }

  private getSupportEmail() {
    return (
      this.configService.get<string>('EMAIL_SUPPORT_ADDRESS')?.trim() ||
      this.getConfiguredSenderEmail() ||
      'suporte@deskimperial.local'
    )
  }

  private getReplyToEmail(fallbackFromEmail?: string) {
    return (
      this.configService.get<string>('EMAIL_REPLY_TO')?.trim() ||
      this.getConfiguredSenderEmail() ||
      fallbackFromEmail ||
      this.getSupportEmail()
    )
  }

  private getBrevoApiKey() {
    return this.configService.get<string>('BREVO_API_KEY')?.trim() || null
  }

  private getConfiguredSenderEmail() {
    return (
      this.configService.get<string>('EMAIL_FROM_EMAIL')?.trim() ||
      this.configService.get<string>('BREVO_FROM_EMAIL')?.trim() ||
      this.configService.get<string>('BREVO_FROM_EMAIL')?.trim() ||
      null
    )
  }

  private getSenderEmail() {
    const fromEmail = this.getConfiguredSenderEmail()

    if (fromEmail) {
      return fromEmail
    }

    throw new ServiceUnavailableException(
      'Defina EMAIL_FROM_EMAIL com um remetente validado na Brevo para liberar o envio transacional.',
    )
  }

  private getSenderName() {
    return (
      this.configService.get<string>('EMAIL_FROM_NAME')?.trim() ||
      this.configService.get<string>('BREVO_FROM_NAME')?.trim() ||
      this.getAppName()
    )
  }

  private getDeliveryPreference(): DeliveryPreference {
    const rawPreference = this.configService.get<string>('EMAIL_PROVIDER')?.trim().toLowerCase() ?? 'auto'

    if (rawPreference === 'brevo' || rawPreference === 'brevo-api') {
      return 'brevo-api'
    }

    if (rawPreference === 'log') {
      return 'log'
    }

    return 'auto'
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production'
  }
}
