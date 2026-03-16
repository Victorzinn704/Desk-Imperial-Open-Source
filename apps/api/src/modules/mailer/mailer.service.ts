import { randomUUID } from 'node:crypto'
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer, { type Transporter } from 'nodemailer'
import {
  buildEmailVerificationContent,
  buildFailedLoginAlertEmailContent,
  buildFeedbackReceiptEmailContent,
  buildLoginAlertEmailContent,
  buildPasswordChangedEmailContent,
  buildPasswordResetEmailContent,
} from './mailer.templates'

type DeliveryMode = 'resend-api' | 'brevo-api' | 'smtp' | 'log'
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
  private transporter: Transporter | null = null

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(params: {
    to: string
    fullName: string
    code: string
    expiresInMinutes: number
  }) {
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
      fallbackLogMessage: `Email nao configurado. Codigo de redefinicao para ${params.to}: ${params.code}`,
    })
  }

  async sendEmailVerificationEmail(params: {
    to: string
    fullName: string
    code: string
    expiresInMinutes: number
  }) {
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
      fallbackLogMessage: `Email nao configurado. Codigo de verificacao para ${params.to}: ${params.code}`,
    })
  }

  async sendPasswordChangedEmail(params: {
    to: string
    fullName: string
    changedAt: Date
    ipAddress?: string | null
  }) {
    const content = buildPasswordChangedEmailContent({
      appName: this.getAppName(),
      supportEmail: this.getSupportEmail(),
      fullName: params.fullName,
      changedAt: params.changedAt,
      ipAddress: params.ipAddress,
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
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
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
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      locationSummary: params.locationSummary,
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

  private async sendTransactionalEmail(params: TransactionalEmailPayload): Promise<DeliveryResult> {
    const preferredMode = this.getDeliveryPreference()
    const resendApiKey = this.getResendApiKey()
    const brevoApiKey = this.getBrevoApiKey()
    const hasSmtpConfig = this.hasSmtpConfig()

    if (preferredMode === 'resend-api') {
      if (!resendApiKey) {
        throw new ServiceUnavailableException(
          'EMAIL_PROVIDER esta definido como Resend, mas RESEND_API_KEY nao foi configurada.',
        )
      }

      return this.sendWithResendApi(params, resendApiKey)
    }

    if (preferredMode === 'brevo-api') {
      if (!brevoApiKey) {
        throw new ServiceUnavailableException(
          'EMAIL_PROVIDER esta definido como Brevo, mas BREVO_API_KEY nao foi configurada.',
        )
      }

      return this.sendWithBrevoApi(params, brevoApiKey)
    }

    if (preferredMode === 'smtp') {
      if (!hasSmtpConfig) {
        throw new ServiceUnavailableException(
          'EMAIL_PROVIDER esta definido como SMTP, mas a configuracao SMTP ainda esta incompleta.',
        )
      }

      return this.sendWithSmtp(params)
    }

    if (preferredMode === 'log') {
      this.logger.warn(params.fallbackLogMessage)
      return { mode: 'log' }
    }

    if (this.getSmtpService() === 'gmail' && hasSmtpConfig) {
      return this.sendWithSmtp(params)
    }

    if (resendApiKey) {
      return this.sendWithResendApi(params, resendApiKey)
    }

    if (brevoApiKey) {
      return this.sendWithBrevoApi(params, brevoApiKey)
    }

    if (hasSmtpConfig) {
      return this.sendWithSmtp(params)
    }

    if (this.isProduction()) {
      throw new ServiceUnavailableException('O envio de email ainda nao esta configurado.')
    }

    this.logger.warn(params.fallbackLogMessage)
    return { mode: 'log' }
  }

  private async sendWithResendApi(
    params: TransactionalEmailPayload,
    apiKey: string,
  ): Promise<DeliveryResult> {
    const fromName = this.configService.get<string>('SMTP_FROM_NAME')?.trim() || this.getAppName()
    const fromEmail = this.getResendFromEmail()
    const replyTo = this.getReplyToEmail(fromEmail)
    const apiUrl =
      this.configService.get<string>('RESEND_API_URL')?.trim() ?? 'https://api.resend.com/emails'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
          'User-Agent': 'desk-imperial/1.0',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text,
          reply_to: replyTo,
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        const payload = await response.text()
        const normalizedPayload = payload.toLowerCase()
        this.logger.error(
          `Falha na API da Resend ao enviar email para ${params.to}: ${response.status} ${payload}`,
        )

        if (response.status === 401) {
          throw new ServiceUnavailableException(
            'A chave da Resend foi rejeitada. Revise a configuracao do provedor de email.',
          )
        }

        if (
          response.status === 403 &&
          (normalizedPayload.includes('verify a domain') ||
            normalizedPayload.includes('only send testing emails') ||
            normalizedPayload.includes('resend.dev domain'))
        ) {
          throw new ServiceUnavailableException(
            'O provedor de email ainda esta em modo de teste. Verifique um dominio na Resend para liberar envios publicos.',
          )
        }

        throw new ServiceUnavailableException(
          'Nao foi possivel enviar o email agora. Tente novamente em instantes.',
        )
      }

      const payload = (await response.json().catch(() => null)) as { id?: string } | null
      return {
        mode: 'resend-api',
        messageId: payload?.id ?? null,
      }
    } catch (error) {
      this.logger.error(
        `Falha ao enviar email transacional via Resend para ${params.to}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
      if (error instanceof ServiceUnavailableException) {
        throw error
      }

      throw new ServiceUnavailableException(
        'O servico de email nao respondeu a tempo. Tente novamente em instantes.',
      )
    }
  }

  private async sendWithBrevoApi(
    params: TransactionalEmailPayload,
    apiKey: string,
  ): Promise<DeliveryResult> {
    const fromEmail = this.getSmtpFromEmail()
    const fromName = this.configService.get<string>('SMTP_FROM_NAME')?.trim() || this.getAppName()
    const replyTo = this.getReplyToEmail(fromEmail)
    const apiUrl =
      this.configService.get<string>('BREVO_API_URL')?.trim() ?? 'https://api.brevo.com/v3/smtp/email'

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
          to: [
            {
              email: params.to,
            },
          ],
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
        this.logger.error(
          `Falha na API da Brevo ao enviar email para ${params.to}: ${response.status} ${payload}`,
        )
        throw new ServiceUnavailableException(
          'Nao foi possivel enviar o email agora. Tente novamente em instantes.',
        )
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

      throw new ServiceUnavailableException(
        'O servico de email nao respondeu a tempo. Tente novamente em instantes.',
      )
    }
  }

  private async sendWithSmtp(params: TransactionalEmailPayload): Promise<DeliveryResult> {
    const transporter = this.getTransporter()
    const fromEmail = this.getSmtpFromEmail()
    const fromName = this.configService.get<string>('SMTP_FROM_NAME')?.trim() || this.getAppName()
    const replyTo = this.getReplyToEmail(fromEmail)

    try {
      const result = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        replyTo,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      })

      return {
        mode: 'smtp',
        messageId: result.messageId,
      }
    } catch (error) {
      const smtpHost = this.configService.get<string>('SMTP_HOST')?.trim().toLowerCase() ?? ''
      this.logger.error(
        `Falha ao enviar email transacional via SMTP para ${params.to}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
      if (smtpHost.includes('brevo.com')) {
        this.logger.warn(
          'SMTP da Brevo falhou. Para producao, prefira configurar BREVO_API_KEY e usar a API transacional em vez do relay SMTP.',
        )
      }
      throw new ServiceUnavailableException(
        'O servico de email nao respondeu a tempo. Tente novamente em instantes.',
      )
    }
  }

  private getAppName() {
    return this.configService.get<string>('APP_NAME') ?? 'DESK IMPERIAL'
  }

  private getSupportEmail() {
    return (
      this.configService.get<string>('EMAIL_SUPPORT_ADDRESS')?.trim() ||
      this.configService.get<string>('SMTP_FROM_EMAIL')?.trim() ||
      this.configService.get<string>('RESEND_FROM_EMAIL')?.trim() ||
      'suporte@deskimperial.local'
    )
  }

  private getReplyToEmail(fallbackFromEmail?: string) {
    return (
      this.configService.get<string>('EMAIL_REPLY_TO')?.trim() ||
      this.configService.get<string>('SMTP_FROM_EMAIL')?.trim() ||
      fallbackFromEmail ||
      this.getSupportEmail()
    )
  }

  private getResendApiKey() {
    return this.configService.get<string>('RESEND_API_KEY')?.trim() || null
  }

  private getBrevoApiKey() {
    return this.configService.get<string>('BREVO_API_KEY')?.trim() || null
  }

  private getResendFromEmail() {
    return (
      this.configService.get<string>('RESEND_FROM_EMAIL')?.trim() ||
      this.configService.get<string>('SMTP_FROM_EMAIL')?.trim() ||
      'onboarding@resend.dev'
    )
  }

  private getSmtpFromEmail() {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL')?.trim()
    if (fromEmail) {
      return fromEmail
    }

    if (this.isProduction()) {
      throw new ServiceUnavailableException('O remetente de email ainda nao esta configurado.')
    }

    throw new ServiceUnavailableException(
      'Defina SMTP_FROM_EMAIL para usar o envio transacional fora do modo de log.',
    )
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter
    }

    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587)
    const smtpService = this.getSmtpService()
    const smtpFamily = Number(this.configService.get<string>('SMTP_IP_FAMILY') ?? 4)
    const auth = this.configService.get<string>('SMTP_USER')
      ? {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        }
      : undefined

    this.transporter = nodemailer.createTransport(
      smtpService
        ? {
            service: smtpService,
            port,
            secure: parseBoolean(this.configService.get<string>('SMTP_SECURE')) ?? port === 465,
            auth,
            family: Number.isFinite(smtpFamily) ? smtpFamily : 4,
            requireTLS: parseBoolean(this.configService.get<string>('SMTP_REQUIRE_TLS')) ?? false,
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000,
          }
        : {
            host: this.configService.get<string>('SMTP_HOST'),
            port,
            secure: parseBoolean(this.configService.get<string>('SMTP_SECURE')) ?? port === 465,
            auth,
            family: Number.isFinite(smtpFamily) ? smtpFamily : 4,
            requireTLS: parseBoolean(this.configService.get<string>('SMTP_REQUIRE_TLS')) ?? false,
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000,
          },
    )

    return this.transporter
  }

  private hasSmtpConfig() {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL')
    const smtpService = this.getSmtpService()
    const smtpHost = this.configService.get<string>('SMTP_HOST')
    const smtpPort = this.configService.get<string>('SMTP_PORT')
    const smtpUser = this.configService.get<string>('SMTP_USER')
    const smtpPass = this.configService.get<string>('SMTP_PASS')

    if (!fromEmail) {
      return false
    }

    if (smtpService) {
      return Boolean(smtpUser && smtpPass)
    }

    return Boolean(smtpHost && smtpPort)
  }

  private getDeliveryPreference(): DeliveryPreference {
    const rawPreference =
      this.configService.get<string>('EMAIL_PROVIDER')?.trim().toLowerCase() ?? 'auto'

    if (rawPreference === 'resend' || rawPreference === 'resend-api') {
      return 'resend-api'
    }

    if (rawPreference === 'brevo' || rawPreference === 'brevo-api') {
      return 'brevo-api'
    }

    if (rawPreference === 'smtp' || rawPreference === 'gmail' || rawPreference === 'gmail-smtp') {
      return 'smtp'
    }

    if (rawPreference === 'log') {
      return 'log'
    }

    return 'auto'
  }

  private getSmtpService() {
    return this.configService.get<string>('SMTP_SERVICE')?.trim().toLowerCase() || null
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production'
  }
}

function parseBoolean(value: string | undefined) {
  if (value == null) {
    return null
  }

  return value === 'true'
}
