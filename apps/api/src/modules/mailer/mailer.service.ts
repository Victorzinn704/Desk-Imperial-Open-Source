import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer, { type Transporter } from 'nodemailer'

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
    return this.sendTransactionalEmail({
      to: params.to,
      subject: `${this.getAppName()} | Codigo para redefinir a senha`,
      text: buildPasswordResetCodeText(params),
      html: buildPasswordResetCodeHtml(params),
      fallbackLogMessage: `SMTP nao configurado. Codigo de redefinicao para ${params.to}: ${params.code}`,
    })
  }

  async sendEmailVerificationEmail(params: {
    to: string
    fullName: string
    code: string
    expiresInMinutes: number
  }) {
    return this.sendTransactionalEmail({
      to: params.to,
      subject: `${this.getAppName()} | Confirmacao de email`,
      text: buildEmailVerificationText(params),
      html: buildEmailVerificationHtml(params),
      fallbackLogMessage: `SMTP nao configurado. Codigo de verificacao para ${params.to}: ${params.code}`,
    })
  }

  private async sendTransactionalEmail(params: {
    to: string
    subject: string
    text: string
    html: string
    fallbackLogMessage: string
  }) {
    if (!this.hasSmtpConfig()) {
      if (this.isProduction()) {
        throw new ServiceUnavailableException('O envio de email ainda nao esta configurado.')
      }

      this.logger.warn(params.fallbackLogMessage)
      return {
        mode: 'log' as const,
      }
    }

    const transporter = this.getTransporter()
    const fromName = this.configService.get<string>('SMTP_FROM_NAME') ?? this.getAppName()
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL')

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    }).catch((error: unknown) => {
      this.logger.error(
        `Falha ao enviar email transacional para ${params.to}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
      throw new ServiceUnavailableException(
        'O servico de email nao respondeu a tempo. Tente novamente em instantes.',
      )
    })

    return {
      mode: 'smtp' as const,
    }
  }

  private getAppName() {
    return this.configService.get<string>('APP_NAME') ?? 'Imperial Desk'
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

function buildPasswordResetCodeText(params: {
  fullName: string
  code: string
  expiresInMinutes: number
}) {
  return [
    `Ola, ${params.fullName}.`,
    '',
    'Recebemos uma solicitacao para redefinir a senha da sua conta.',
    `Use o codigo abaixo dentro de ${params.expiresInMinutes} minuto(s):`,
    '',
    params.code,
    '',
    'Se voce nao fez esta solicitacao, ignore este email.',
  ].join('\n')
}

function buildPasswordResetCodeHtml(params: {
  fullName: string
  code: string
  expiresInMinutes: number
}) {
  return `
    <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;background:#0b0d10;padding:32px;color:#f3f4f6">
      <div style="max-width:560px;margin:0 auto;background:#171c22;border:1px solid #262d36;border-radius:24px;padding:32px">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8fb7ff">Redefinicao de senha</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#ffffff">Ola, ${escapeHtml(params.fullName)}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#c9d2dc">
          Recebemos uma solicitacao para redefinir a senha da sua conta no portal.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#c9d2dc">
          Use o codigo abaixo dentro de <strong>${params.expiresInMinutes} minuto(s)</strong>.
        </p>
        <div style="display:inline-block;padding:14px 22px;border-radius:16px;background:#d4b16a;color:#0b0d10;font-weight:800;font-size:28px;letter-spacing:0.25em">
          ${params.code}
        </div>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#9aa4b2">
          Se voce nao fez esta solicitacao, ignore este email.
        </p>
      </div>
    </div>
  `
}

function buildEmailVerificationText(params: {
  fullName: string
  code: string
  expiresInMinutes: number
}) {
  return [
    `Ola, ${params.fullName}.`,
    '',
    'Confirme seu email para liberar o primeiro acesso a conta.',
    `Use o codigo abaixo dentro de ${params.expiresInMinutes} minuto(s):`,
    '',
    params.code,
    '',
    'Se voce nao criou esta conta, ignore este email.',
  ].join('\n')
}

function buildEmailVerificationHtml(params: {
  fullName: string
  code: string
  expiresInMinutes: number
}) {
  return `
    <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;background:#0b0d10;padding:32px;color:#f3f4f6">
      <div style="max-width:560px;margin:0 auto;background:#171c22;border:1px solid #262d36;border-radius:24px;padding:32px">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8fb7ff">Confirmacao de email</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#ffffff">Ola, ${escapeHtml(params.fullName)}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#c9d2dc">
          Para liberar o primeiro acesso ao portal, confirme o seu email com o codigo abaixo.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#c9d2dc">
          Este codigo expira em <strong>${params.expiresInMinutes} minuto(s)</strong>.
        </p>
        <div style="display:inline-block;padding:14px 22px;border-radius:16px;background:#d4b16a;color:#0b0d10;font-weight:800;font-size:28px;letter-spacing:0.25em">
          ${params.code}
        </div>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#9aa4b2">
          Se voce nao criou esta conta, ignore este email.
        </p>
      </div>
    </div>
  `
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
