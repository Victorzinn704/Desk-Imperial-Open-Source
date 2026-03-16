import { randomUUID } from 'node:crypto'
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer, { type Transporter } from 'nodemailer'
import {
  buildEmailVerificationContent,
  buildLoginAlertEmailContent,
  buildPasswordChangedEmailContent,
  buildPasswordResetEmailContent,
} from './mailer.templates'

type DeliveryMode = 'resend-api' | 'brevo-api' | 'smtp' | 'log'

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

  private async sendTransactionalEmail(params: TransactionalEmailPayload): Promise<DeliveryResult> {
    const resendApiKey = this.getResendApiKey()
    if (resendApiKey) {
      return this.sendWithResendApi(params, resendApiKey)
    }

    const brevoApiKey = this.getBrevoApiKey()
    if (brevoApiKey) {
      return this.sendWithBrevoApi(params, brevoApiKey)
    }

    if (this.hasSmtpConfig()) {
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
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port,
      secure: parseBoolean(this.configService.get<string>('SMTP_SECURE')) ?? port === 465,
      auth: this.configService.get<string>('SMTP_USER')
        ? {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'),
          }
        : undefined,
      requireTLS: parseBoolean(this.configService.get<string>('SMTP_REQUIRE_TLS')) ?? false,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    })

    return this.transporter
  }

  private hasSmtpConfig() {
    return Boolean(
      this.configService.get<string>('SMTP_HOST') &&
        this.configService.get<string>('SMTP_PORT') &&
        this.configService.get<string>('SMTP_FROM_EMAIL'),
    )
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
