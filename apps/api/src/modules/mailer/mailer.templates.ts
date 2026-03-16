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

export function buildPasswordResetEmailContent(params: CodeTemplateParams) {
  return buildCodeEmail({
    appName: params.appName,
    supportEmail: params.supportEmail,
    fullName: params.fullName,
    code: params.code,
    expiresInMinutes: params.expiresInMinutes,
    eyebrow: 'Recuperacao de acesso',
    title: 'Use este codigo para redefinir sua senha.',
    intro:
      'Recebemos uma solicitacao para redefinir a senha da sua conta. Se foi voce, use o codigo abaixo no portal.',
    actionLabel: 'Codigo de redefinicao',
    helper:
      'Se voce nao solicitou essa troca, ignore este email. Por seguranca, recomendamos revisar os acessos recentes da conta.',
    previewText: 'Codigo para redefinir a senha da sua conta DESK IMPERIAL.',
  })
}

export function buildEmailVerificationContent(params: CodeTemplateParams) {
  return buildCodeEmail({
    appName: params.appName,
    supportEmail: params.supportEmail,
    fullName: params.fullName,
    code: params.code,
    expiresInMinutes: params.expiresInMinutes,
    eyebrow: 'Confirmacao de email',
    title: 'Confirme seu email para liberar o primeiro acesso.',
    intro:
      'Sua conta foi criada com sucesso. Antes de entrar no portal, precisamos validar este email para liberar o acesso com seguranca.',
    actionLabel: 'Codigo de confirmacao',
    helper:
      'Se voce nao criou esta conta, ignore esta mensagem. Se nao encontrar este email na caixa principal, confira spam, promocoes ou atualizacoes.',
    previewText: 'Confirme seu email para concluir o cadastro no DESK IMPERIAL.',
  })
}

export function buildPasswordChangedEmailContent(params: PasswordChangedTemplateParams) {
  const occurredAt = formatDateTime(params.changedAt)
  const ipSummary = params.ipAddress ? `IP: ${params.ipAddress}` : 'IP nao identificado'

  const text = [
    `Ola, ${params.fullName}.`,
    '',
    'Sua senha foi alterada com sucesso no DESK IMPERIAL.',
    `Data e hora: ${occurredAt}`,
    ipSummary,
    '',
    'Se voce reconhece essa alteracao, nao precisa fazer mais nada.',
    `Se nao reconhece, redefina a senha imediatamente e fale com ${params.supportEmail}.`,
  ].join('\n')

  const html = buildEmailLayout({
    appName: params.appName,
    previewText: 'Sua senha foi alterada com sucesso.',
    eyebrow: 'Alerta de seguranca',
    title: 'Sua senha foi atualizada.',
    intro:
      'Este aviso confirma que a senha da sua conta foi alterada no DESK IMPERIAL. Se foi voce, nenhuma acao adicional e necessaria.',
    body: `
      <div style="margin:24px 0;border:1px solid #dde4ee;border-radius:20px;background:#f7f9fc;padding:20px">
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Data e hora:</strong> ${escapeHtml(occurredAt)}</p>
        <p style="margin:0;color:#445264;font-size:14px"><strong>${escapeHtml(ipSummary)}</strong></p>
      </div>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4d5a6b">
        Se voce nao reconhece esta alteracao, redefina a senha imediatamente e entre em contato conosco.
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
  const ipSummary = params.ipAddress ? `IP: ${params.ipAddress}` : 'IP nao identificado'
  const deviceSummary = params.userAgent ? truncate(params.userAgent, 140) : 'Navegador nao identificado'

  const text = [
    `Ola, ${params.fullName}.`,
    '',
    'Detectamos uma nova entrada na sua conta do DESK IMPERIAL.',
    `Data e hora: ${occurredAt}`,
    ipSummary,
    `Dispositivo: ${deviceSummary}`,
    '',
    'Se reconhece esse acesso, pode ignorar esta mensagem.',
    `Se nao reconhece, altere a senha e fale com ${params.supportEmail}.`,
  ].join('\n')

  const html = buildEmailLayout({
    appName: params.appName,
    previewText: 'Detectamos uma nova entrada na sua conta.',
    eyebrow: 'Alerta de acesso',
    title: 'Nova entrada detectada.',
    intro:
      'Este aviso ajuda a monitorar acessos a conta. Se foi voce, nenhuma acao adicional e necessaria.',
    body: `
      <div style="margin:24px 0;border:1px solid #dde4ee;border-radius:20px;background:#f7f9fc;padding:20px">
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>Data e hora:</strong> ${escapeHtml(occurredAt)}</p>
        <p style="margin:0 0 8px;color:#445264;font-size:14px"><strong>${escapeHtml(ipSummary)}</strong></p>
        <p style="margin:0;color:#445264;font-size:14px"><strong>Dispositivo:</strong> ${escapeHtml(deviceSummary)}</p>
      </div>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4d5a6b">
        Se esse acesso nao foi autorizado por voce, altere a senha agora e revise os acessos recentes da conta.
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
    `Ola, ${params.fullName}.`,
    '',
    params.title,
    params.intro,
    `Use o codigo abaixo em ate ${params.expiresInMinutes} minuto(s):`,
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
        Use o codigo abaixo em ate <strong>${params.expiresInMinutes} minuto(s)</strong>.
      </p>
      <div style="margin:0 0 20px;display:inline-block;border-radius:18px;background:#111827;padding:16px 22px;color:#f9fafb;font-size:28px;font-weight:800;letter-spacing:0.3em">
        ${escapeHtml(params.code)}
      </div>
      <div style="margin:0 0 24px;border:1px solid #dde4ee;border-radius:20px;background:#f7f9fc;padding:16px 18px">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7b8f">${escapeHtml(params.actionLabel)}</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#445264">
          Digite este codigo diretamente na tela do portal. Nunca compartilhe esse codigo por chat, telefone ou redes sociais.
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
      params.eyebrow === 'Confirmacao de email'
        ? `${params.appName} | Confirme seu email`
        : `${params.appName} | Codigo de seguranca`,
    text,
    html,
    tags:
      params.eyebrow === 'Confirmacao de email'
        ? ['auth', 'email-verification']
        : ['auth', 'password-reset'],
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
              <p style="margin:0">Voce recebeu este email porque houve uma acao de seguranca ou autenticacao vinculada a sua conta.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
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
