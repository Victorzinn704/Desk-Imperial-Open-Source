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
import { sendWithBrevoApi } from './brevo-mailer.client'
import type {
  DeliveryPreference,
  DeliveryResult,
  MailTemplateContext,
  TransactionalEmailDispatch,
  TransactionalEmailPayload,
} from './mailer.types'

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(params: { to: string; fullName: string; code: string; expiresInMinutes: number }) {
    const content = buildPasswordResetEmailContent({
      ...this.buildTemplateContext(),
      fullName: params.fullName,
      code: params.code,
      expiresInMinutes: params.expiresInMinutes,
    })

    return this.sendTemplateEmail({
      to: params.to,
      content,
      fallbackLogMessage: `Email nao configurado. Codigo de redefinicao emitido para ${params.to}.`,
    })
  }

  async sendEmailVerificationEmail(params: { to: string; fullName: string; code: string; expiresInMinutes: number }) {
    const content = buildEmailVerificationContent({
      ...this.buildTemplateContext(),
      fullName: params.fullName,
      code: params.code,
      expiresInMinutes: params.expiresInMinutes,
    })

    return this.sendTemplateEmail({
      to: params.to,
      content,
      fallbackLogMessage: `Email nao configurado. Codigo de verificacao emitido para ${params.to}.`,
    })
  }

  async sendPasswordChangedEmail(params: { to: string; fullName: string; changedAt: Date; ipAddress?: string | null }) {
    const content = buildPasswordChangedEmailContent({
      ...this.buildTemplateContext(),
      fullName: params.fullName,
      changedAt: params.changedAt,
      ...(params.ipAddress !== undefined ? { ipAddress: params.ipAddress } : {}),
    })

    return this.sendTemplateEmail({
      to: params.to,
      content,
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
      ...this.buildTemplateContext(),
      fullName: params.fullName,
      occurredAt: params.occurredAt,
      ...(params.ipAddress !== undefined ? { ipAddress: params.ipAddress } : {}),
      ...(params.userAgent !== undefined ? { userAgent: params.userAgent } : {}),
    })

    return this.sendTemplateEmail({
      to: params.to,
      content,
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
      ...this.buildTemplateContext(),
      fullName: params.fullName,
      occurredAt: params.occurredAt,
      attemptCount: params.attemptCount,
      ...(params.ipAddress !== undefined ? { ipAddress: params.ipAddress } : {}),
      ...(params.userAgent !== undefined ? { userAgent: params.userAgent } : {}),
      ...(params.locationSummary !== undefined ? { locationSummary: params.locationSummary } : {}),
    })

    return this.sendTemplateEmail({
      to: params.to,
      content,
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
      ...this.buildTemplateContext(),
      fullName: params.fullName,
      subjectLine: params.subjectLine,
      ticketId: params.ticketId,
      receivedAt: params.receivedAt,
    })

    return this.sendTemplateEmail({
      to: params.to,
      content,
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
      ...this.buildTemplateContext(),
      fullName: params.fullName,
      linkedAt: params.linkedAt,
      telegramChatId: params.telegramChatId,
      ...(params.telegramUsername !== undefined ? { telegramUsername: params.telegramUsername } : {}),
    })

    return this.sendTemplateEmail({
      to: params.to,
      content,
      fallbackLogMessage: `Email nao configurado. Telegram vinculado para ${params.to}.`,
    })
  }

  private buildTemplateContext(): MailTemplateContext {
    return {
      appName: this.getAppName(),
      supportEmail: this.getSupportEmail(),
    }
  }

  private sendTemplateEmail(params: TransactionalEmailDispatch) {
    return this.sendTransactionalEmail({
      to: params.to,
      subject: params.content.subject,
      text: params.content.text,
      html: params.content.html,
      tags: params.content.tags,
      fallbackLogMessage: params.fallbackLogMessage,
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

    return sendWithBrevoApi({
      apiKey: brevoApiKey,
      configService: this.configService,
      logger: this.logger,
      payload: params,
      sender: this.buildBrevoSenderIdentity(),
    })
  }

  private buildBrevoSenderIdentity() {
    const email = this.getSenderEmail()
    const name = this.getSenderName()

    return {
      email,
      name,
      replyToEmail: this.getReplyToEmail(email),
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
