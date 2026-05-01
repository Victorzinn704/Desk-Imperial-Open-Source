type BaseTemplateParams = {
  appName: string
  fullName: string
  supportEmail: string
}

type CodeTemplateParams = BaseTemplateParams & {
  code: string
  expiresInMinutes: number
}

type PasswordChangedTemplateParams = BaseTemplateParams & {
  changedAt: Date
  ipAddress?: string | null
}

type LoginAlertTemplateParams = BaseTemplateParams & {
  occurredAt: Date
  ipAddress?: string | null
  userAgent?: string | null
}

type FailedLoginAlertTemplateParams = BaseTemplateParams & {
  occurredAt: Date
  ipAddress?: string | null
  userAgent?: string | null
  attemptCount: number
  locationSummary?: string | null
}

type FeedbackReceiptTemplateParams = BaseTemplateParams & {
  subjectLine: string
  receivedAt: Date
  ticketId: string
}

type TelegramLinkedTemplateParams = BaseTemplateParams & {
  linkedAt: Date
  telegramUsername?: string | null
  telegramChatId: string
}

export function buildPasswordResetEmailContent(params: CodeTemplateParams) {
  return buildCodeEmail({
    appName: params.appName,
    supportEmail: params.supportEmail,
    fullName: params.fullName,
    code: params.code,
    expiresInMinutes: params.expiresInMinutes,
    eyebrow: 'Recuperação de acesso',
    title: 'Use este código para redefinir sua senha.',
    intro:
      'Recebemos uma solicitação para redefinir a senha da sua conta. Caso tenha sido você, utilize o código abaixo no portal.',
    actionLabel: 'Código de redefinição',
    helper:
      'Caso você não tenha solicitado esta alteração, pode desconsiderar esta mensagem. Por segurança, recomendamos revisar os acessos recentes da conta.',
    previewText: 'Código para redefinir a senha da sua conta DESK IMPERIAL.',
  })
}

export function buildEmailVerificationContent(params: CodeTemplateParams) {
  return buildCodeEmail({
    appName: params.appName,
    supportEmail: params.supportEmail,
    fullName: params.fullName,
    code: params.code,
    expiresInMinutes: params.expiresInMinutes,
    eyebrow: 'Confirmação de email',
    title: 'Confirme seu email para liberar o primeiro acesso.',
    intro:
      'Sua conta foi criada com sucesso. Antes de acessar o portal, precisamos validar este email para liberar o acesso com segurança.',
    actionLabel: 'Código de confirmação',
    helper:
      'Caso você não tenha criado esta conta, pode desconsiderar esta mensagem. Caso não encontre este email na caixa principal, verifique as pastas de spam, promoções ou atualizações.',
    previewText: 'Confirme seu email para concluir o cadastro no DESK IMPERIAL.',
  })
}

export function buildPasswordChangedEmailContent(params: PasswordChangedTemplateParams) {
  const occurredAt = formatDateTime(params.changedAt)
  const ipSummary = params.ipAddress ? `IP: ${params.ipAddress}` : 'IP não identificado'

  const text = [
    `Prezado(a) ${params.fullName},`,
    '',
    'Sua senha foi alterada com sucesso no DESK IMPERIAL.',
    `Data e hora: ${occurredAt}`,
    ipSummary,
    '',
    'Caso você reconheça esta alteração, nenhuma ação adicional é necessária.',
    `Caso não reconheça, redefina a senha imediatamente e entre em contato com ${params.supportEmail}.`,
  ].join('\n')

  const html = buildEmailLayout({
    appName: params.appName,
    previewText: 'Sua senha foi alterada com sucesso.',
    eyebrow: 'Alerta de segurança',
    title: 'Sua senha foi atualizada.',
    intro:
      'Este aviso confirma que a senha da sua conta foi alterada no DESK IMPERIAL. Caso tenha sido você, nenhuma ação adicional é necessária.',
    body: `
      <div style="margin:24px 0;border:1px solid #dde4ee;border-radius:20px;background:#f7f9fc;padding:20px">
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Data e hora:</strong> ${escapeHtml(occurredAt)}</p>
        <p style="margin:0;color:#445264;font-size:14px"><strong>${escapeHtml(ipSummary)}</strong></p>
      </div>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4d5a6b">
        Caso você não reconheça esta alteração, redefina a senha imediatamente e entre em contato conosco.
      </p>
    `,
    footerNote: `Suporte: ${params.supportEmail}`,
  })

  return {
    subject: `${params.appName} | Sua senha foi alterada`,
    text,
    html,
    tags: ['auth', 'password-changed'],
  }
}

export function buildLoginAlertEmailContent(params: LoginAlertTemplateParams) {
  const occurredAt = formatDateTime(params.occurredAt)
  const ipSummary = params.ipAddress ? `IP: ${params.ipAddress}` : 'IP não identificado'
  const deviceSummary = params.userAgent ? truncate(params.userAgent, 140) : 'Navegador não identificado'

  const text = [
    `Prezado(a) ${params.fullName},`,
    '',
    'Detectamos uma nova entrada na sua conta do DESK IMPERIAL.',
    `Data e hora: ${occurredAt}`,
    ipSummary,
    `Dispositivo: ${deviceSummary}`,
    '',
    'Caso você reconheça este acesso, pode desconsiderar esta mensagem.',
    `Caso não reconheça, altere a senha imediatamente e entre em contato com ${params.supportEmail}.`,
  ].join('\n')

  const html = buildEmailLayout({
    appName: params.appName,
    previewText: 'Detectamos uma nova entrada na sua conta.',
    eyebrow: 'Alerta de acesso',
    title: 'Nova entrada detectada.',
    intro: 'Este aviso ajuda a monitorar acessos à conta. Caso tenha sido você, nenhuma ação adicional é necessária.',
    body: `
      <div style="margin:24px 0;border:1px solid #dde4ee;border-radius:20px;background:#f7f9fc;padding:20px">
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Data e hora:</strong> ${escapeHtml(occurredAt)}</p>
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>${escapeHtml(ipSummary)}</strong></p>
        <p style="margin:0;color:#445264;font-size:14px"><strong>Dispositivo:</strong> ${escapeHtml(deviceSummary)}</p>
      </div>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4d5a6b">
        Caso este acesso não tenha sido autorizado por você, altere a senha imediatamente e revise os acessos recentes da conta.
      </p>
    `,
    footerNote: `Suporte: ${params.supportEmail}`,
  })

  return {
    subject: `${params.appName} | Novo acesso detectado`,
    text,
    html,
    tags: ['auth', 'login-alert'],
  }
}

export function buildFailedLoginAlertEmailContent(params: FailedLoginAlertTemplateParams) {
  const occurredAt = formatDateTime(params.occurredAt)
  const ipSummary = params.ipAddress ? `IP: ${params.ipAddress}` : 'IP não identificado'
  const deviceSummary = params.userAgent ? truncate(params.userAgent, 140) : 'Dispositivo não identificado'
  const locationSummary = params.locationSummary || 'Local aproximado indisponível'

  const text = [
    `Prezado(a) ${params.fullName},`,
    '',
    'Detectamos tentativas de acesso com senha inválida na sua conta do DESK IMPERIAL.',
    `Tentativas registradas: ${params.attemptCount}`,
    `Data e hora da última tentativa: ${occurredAt}`,
    ipSummary,
    `Local aproximado: ${locationSummary}`,
    `Dispositivo: ${deviceSummary}`,
    '',
    'Caso tenha sido você, pode desconsiderar este aviso.',
    `Caso não tenha sido, altere sua senha imediatamente e entre em contato com ${params.supportEmail}.`,
  ].join('\n')

  const html = buildEmailLayout({
    appName: params.appName,
    previewText: 'Detectamos tentativas de acesso suspeitas na sua conta.',
    eyebrow: 'Alerta de segurança',
    title: 'Tentativas de acesso detectadas.',
    intro:
      'Identificamos tentativas de entrada com senha inválida na sua conta. Este aviso existe para que você possa reagir rapidamente caso não reconheça esta atividade.',
    body: `
      <div style="margin:24px 0;border:1px solid #dde4ee;border-radius:20px;background:#f7f9fc;padding:20px">
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Tentativas registradas:</strong> ${params.attemptCount}</p>
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Data e hora:</strong> ${escapeHtml(occurredAt)}</p>
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>${escapeHtml(ipSummary)}</strong></p>
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Local aproximado:</strong> ${escapeHtml(locationSummary)}</p>
        <p style="margin:0;color:#445264;font-size:14px"><strong>Dispositivo:</strong> ${escapeHtml(deviceSummary)}</p>
      </div>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4d5a6b">
        Caso você não reconheça esta atividade, altere sua senha imediatamente, revise os acessos recentes e entre em contato com o suporte.
      </p>
    `,
    footerNote: `Suporte: ${params.supportEmail}`,
  })

  return {
    subject: `${params.appName} | Tentativas de acesso na sua conta`,
    text,
    html,
    tags: ['auth', 'failed-login'],
  }
}

export function buildFeedbackReceiptEmailContent(params: FeedbackReceiptTemplateParams) {
  const receivedAt = formatDateTime(params.receivedAt)

  const text = [
    `Prezado(a) ${params.fullName},`,
    '',
    'Recebemos seu feedback no DESK IMPERIAL.',
    `Assunto: ${params.subjectLine}`,
    `Protocolo: ${params.ticketId}`,
    `Recebido em: ${receivedAt}`,
    '',
    'Nossa equipe analisará a mensagem e retornará caso haja necessidade.',
    `Suporte: ${params.supportEmail}`,
  ].join('\n')

  const html = buildEmailLayout({
    appName: params.appName,
    previewText: 'Recebemos seu feedback e registramos seu protocolo.',
    eyebrow: 'Confirmação de recebimento',
    title: 'Recebemos seu feedback.',
    intro:
      'Sua mensagem foi registrada com sucesso. Caso precisemos de mais contexto, entraremos em contato pelos canais informados.',
    body: `
      <div style="margin:24px 0;border:1px solid #dde4ee;border-radius:20px;background:#f7f9fc;padding:20px">
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Assunto:</strong> ${escapeHtml(params.subjectLine)}</p>
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Protocolo:</strong> ${escapeHtml(params.ticketId)}</p>
        <p style="margin:0;color:#445264;font-size:14px"><strong>Recebido em:</strong> ${escapeHtml(receivedAt)}</p>
      </div>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4d5a6b">
        Agradecemos por contribuir com a evolução do produto. Seu retorno é importante para a próxima rodada de melhorias.
      </p>
    `,
    footerNote: `Suporte: ${params.supportEmail}`,
  })

  return {
    subject: `${params.appName} | Recebemos seu feedback`,
    text,
    html,
    tags: ['feedback', 'receipt'],
  }
}

export function buildTelegramLinkedEmailContent(params: TelegramLinkedTemplateParams) {
  const linkedAt = formatDateTime(params.linkedAt)
  const usernameLine = params.telegramUsername ? `@${params.telegramUsername}` : 'username não informado'

  const text = [
    `Prezado(a) ${params.fullName},`,
    '',
    'Uma conta do Telegram foi vinculada ao seu acesso no DESK IMPERIAL.',
    `Data e hora: ${linkedAt}`,
    `Telegram: ${usernameLine}`,
    `Chat ID: ${params.telegramChatId}`,
    '',
    'Se foi você, nenhuma ação adicional é necessária.',
    `Se você não reconhece este vínculo, desvincule pelo portal e entre em contato com ${params.supportEmail}.`,
  ].join('\n')

  const html = buildEmailLayout({
    appName: params.appName,
    previewText: 'Uma conta Telegram foi vinculada ao seu acesso no DESK IMPERIAL.',
    eyebrow: 'Alerta de integração',
    title: 'Telegram vinculado à sua conta.',
    intro:
      'Este aviso confirma que um chat do Telegram foi conectado ao seu acesso do DESK IMPERIAL para leitura de relatórios e alertas operacionais.',
    body: `
      <div style="margin:24px 0;border:1px solid #dde4ee;border-radius:20px;background:#f7f9fc;padding:20px">
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Data e hora:</strong> ${escapeHtml(linkedAt)}</p>
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Telegram:</strong> ${escapeHtml(usernameLine)}</p>
        <p style="margin:0;color:#445264;font-size:14px"><strong>Chat ID:</strong> ${escapeHtml(params.telegramChatId)}</p>
      </div>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4d5a6b">
        Caso você não reconheça este vínculo, revogue a integração imediatamente no portal e acione o suporte.
      </p>
    `,
    footerNote: `Suporte: ${params.supportEmail}`,
  })

  return {
    subject: `${params.appName} | Telegram vinculado à sua conta`,
    text,
    html,
    tags: ['security', 'telegram-linked'],
  }
}

function buildCodeEmail(params: {
  appName: string
  supportEmail: string
  fullName: string
  code: string
  expiresInMinutes: number
  eyebrow: string
  title: string
  intro: string
  actionLabel: string
  helper: string
  previewText: string
}) {
  const text = [
    `Prezado(a) ${params.fullName},`,
    '',
    params.title,
    params.intro,
    `Utilize o código abaixo em até ${params.expiresInMinutes} minuto(s):`,
    '',
    params.code,
    '',
    params.helper,
    `Suporte: ${params.supportEmail}`,
  ].join('\n')

  const html = buildEmailLayout({
    appName: params.appName,
    previewText: params.previewText,
    eyebrow: params.eyebrow,
    title: params.title,
    intro: params.intro,
    body: `
      <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4d5a6b">
        Utilize o código abaixo em até <strong>${params.expiresInMinutes} minuto(s)</strong>.
      </p>
      <div style="margin:0 0 20px;display:inline-block;border-radius:18px;background:#111827;padding:16px 22px;color:#f9fafb;font-size:28px;font-weight:800;letter-spacing:0.3em">
        ${escapeHtml(params.code)}
      </div>
      <div style="margin:0 0 24px;border:1px solid #dde4ee;border-radius:20px;background:#f7f9fc;padding:16px 18px">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7b8f">${escapeHtml(params.actionLabel)}</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#445264">
          Digite este código diretamente na tela do portal. Nunca compartilhe este código por chat, telefone ou redes sociais.
        </p>
      </div>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7b8f">
        ${escapeHtml(params.helper)}
      </p>
    `,
    footerNote: `Suporte: ${params.supportEmail}`,
  })

  return {
    subject:
      params.eyebrow === 'Confirmação de email'
        ? `${params.appName} | Confirme seu email`
        : `${params.appName} | Código de segurança`,
    text,
    html,
    tags: params.eyebrow === 'Confirmação de email' ? ['auth', 'email-verification'] : ['auth', 'password-reset'],
  }
}

function buildEmailLayout(params: {
  appName: string
  previewText: string
  eyebrow: string
  title: string
  intro: string
  body: string
  footerNote: string
}) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <body style="margin:0;padding:0;background:#eef2f7;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#111827">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          ${escapeHtml(params.previewText)}
        </div>
        <div style="padding:32px 16px">
          <div style="max-width:620px;margin:0 auto">
            <div style="margin:0 auto 16px;padding:0 6px;color:#445264;font-size:13px;letter-spacing:0.14em;text-transform:uppercase">
              ${escapeHtml(params.appName)}
            </div>
            <div style="background:#ffffff;border:1px solid #d8e0ea;border-radius:28px;box-shadow:0 18px 48px rgba(15,23,42,0.08);padding:32px">
              <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#0f766e">
                ${escapeHtml(params.eyebrow)}
              </p>
              <h1 style="margin:0 0 16px;font-size:30px;line-height:1.2;color:#111827">
                ${escapeHtml(params.title)}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4d5a6b">
                ${escapeHtml(params.intro)}
              </p>
              ${params.body}
            </div>
            <div style="padding:18px 6px 0;color:#6b7280;font-size:12px;line-height:1.8">
              <p style="margin:0 0 6px">${escapeHtml(params.footerNote)}</p>
              <p style="margin:0">Você recebeu este email porque houve uma ação de segurança ou autenticação vinculada à sua conta.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(value)
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}...`
}
import escapeHtml from 'escape-html'
