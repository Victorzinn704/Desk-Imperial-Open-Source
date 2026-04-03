# Brevo Email Integration

This document covers the complete Brevo (formerly Sendinblue) email integration for DESK IMPERIAL, including API setup, domain configuration, template customization, and troubleshooting.

## Table of Contents

- [Overview](#overview)
- [API Setup](#api-setup)
- [Domain Configuration](#domain-configuration)
- [Email Templates](#email-templates)
- [Template Customization](#template-customization)
- [Troubleshooting](#troubleshooting)
- [Production Checklist](#production-checklist)

## Overview

**Email Provider:** Brevo (formerly Sendinblue)  
**API Endpoint:** `https://api.brevo.com/v3/smtp/email`  
**Language:** Portuguese (Brazil) - 100% formal tone  
**Delivery Modes:** Brevo API (production) or Console Logging (development)

## API Setup

### 1. Create Brevo Account

1. Sign up at [brevo.com](https://www.brevo.com)
2. Navigate to **API & Integration → API Keys**
3. Click **Generate a new API key**
4. Name it (e.g., "DESK IMPERIAL Production")
5. Copy the key immediately (shown only once)

### 2. Environment Configuration

**Location:** `.env` (local) or Railway environment variables (production)

```env
# Email Provider
EMAIL_PROVIDER=brevo

# Brevo API
BREVO_API_URL=https://api.brevo.com/v3/smtp/email
BREVO_API_KEY=<your-brevo-api-key>

# Sender Information
EMAIL_FROM_NAME=DESK IMPERIAL
EMAIL_FROM_EMAIL=no-reply@send.deskimperial.com
EMAIL_REPLY_TO=suporte@deskimperial.com
EMAIL_SUPPORT_ADDRESS=suporte@deskimperial.com

# Application
APP_NAME=DESK IMPERIAL

# Optional: Alert Toggles
LOGIN_ALERT_EMAILS_ENABLED=false
FAILED_LOGIN_ALERTS_ENABLED=true
FAILED_LOGIN_ALERT_THRESHOLD=3
```

### 3. Service Implementation

**Location:** `apps/api/src/modules/mailer/mailer.service.ts`

```typescript
private async sendWithBrevoApi(
  params: TransactionalEmailPayload,
  apiKey: string,
): Promise<DeliveryResult> {
  const fromEmail = this.getSenderEmail()
  const fromName = this.getSenderName()
  const replyTo = this.getReplyToEmail(fromEmail)
  const apiUrl = this.configService.get<string>('BREVO_API_URL')?.trim()
    ?? 'https://api.brevo.com/v3/smtp/email'

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
      signal: AbortSignal.timeout(15000), // 15s timeout
    })

    if (!response.ok) {
      // Handle errors (see troubleshooting section)
      throw new ServiceUnavailableException('Email delivery failed')
    }

    const payload = await response.json()
    return {
      mode: 'brevo-api',
      messageId: payload?.messageId ?? null,
    }
  } catch (error) {
    // Fallback to console logging in development
    this.logger.error('Brevo API error', error)
    throw error
  }
}
```

**Key Features:**

- **15-second timeout** on API requests
- **Message ID tracking** for delivery confirmation
- **Automatic error detection** and meaningful error messages
- **Development fallback** to console logging

## Domain Configuration

### Recommended Domain Structure

```
app.deskimperial.com      → Frontend (Next.js)
api.deskimperial.com      → Backend (NestJS)
send.deskimperial.com     → Email Sender (Brevo)
```

**Why separate email domain?**

- Protects main domain reputation
- Easier to manage SPF/DKIM records
- Better email deliverability
- Clear separation of concerns

### DNS Configuration (SPF, DKIM, DMARC)

**Reference:** See existing guide at `docs/security/brevo-domain-setup.md`

#### Step 1: Add Domain in Brevo

1. Navigate to **Brevo Dashboard → Senders, Domains & Dedicated IPs**
2. Click **Add a domain**
3. Enter your sending domain (e.g., `send.deskimperial.com`)
4. Brevo generates DNS records - **DO NOT close this page**

#### Step 2: Add DNS Records

Brevo will provide records similar to:

```dns
# SPF Record (TXT)
Type: TXT
Host: send.deskimperial.com
Value: v=spf1 include:spf.brevo.com ~all

# DKIM Record (TXT)
Type: TXT
Host: mail._domainkey.send.deskimperial.com
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...

# DMARC Record (TXT) - Recommended
Type: TXT
Host: _dmarc.send.deskimperial.com
Value: v=DMARC1; p=quarantine; rua=mailto:admin@deskimperial.com

# MX Feedback Record (optional)
Type: MX
Host: send.deskimperial.com
Priority: 10
Value: feedback.brevo.com
```

**Important:** Copy the **exact values** from Brevo dashboard - do not manually create these records.

#### Step 3: Wait for DNS Propagation

```bash
# Check SPF record
nslookup -type=TXT send.deskimperial.com

# Check DKIM record
nslookup -type=TXT mail._domainkey.send.deskimperial.com

# Check DMARC record
nslookup -type=TXT _dmarc.send.deskimperial.com
```

**Propagation Time:** Usually 1-6 hours, can take up to 48 hours.

#### Step 4: Validate Domain in Brevo

1. Return to Brevo dashboard
2. Click **Verify domain**
3. Wait for green checkmark ✓

#### Step 5: Add Sender Email

1. Navigate to **Senders & IP → Senders**
2. Click **Add a new sender**
3. Fill in:
   - **Name:** DESK IMPERIAL
   - **Email:** no-reply@send.deskimperial.com
4. Brevo sends confirmation email to sender address
5. Confirm ownership via link

### DMARC Policy Levels

| Policy         | Action                      | Use Case                                    |
| -------------- | --------------------------- | ------------------------------------------- |
| `p=none`       | Monitor only (reports sent) | Initial testing                             |
| `p=quarantine` | Mark as spam                | Recommended for production                  |
| `p=reject`     | Reject email                | Strict security (may cause false positives) |

**Recommendation for DESK IMPERIAL:** Start with `p=quarantine`, monitor reports, then optionally move to `p=reject`.

## Email Templates

All templates are **100% Portuguese (Brazil)** with formal professional tone.

### 1. Email Verification

**Purpose:** Account signup - confirm email ownership  
**Location:** `apps/api/src/modules/mailer/mailer.templates.ts`

```typescript
export function buildEmailVerificationContent(params: CodeTemplateParams) {
  return buildCodeEmail({
    eyebrow: 'Confirmacao de email',
    title: 'Confirme seu email para liberar o primeiro acesso.',
    intro:
      'Sua conta foi criada com sucesso. Antes de entrar no portal, ' +
      'precisamos validar este email para liberar o acesso com seguranca.',
    actionLabel: 'Codigo de confirmacao',
    helper: 'Se voce nao criou esta conta, ignore esta mensagem.',
    previewText: 'Confirme seu email para concluir o cadastro no DESK IMPERIAL.',
  })
}
```

**Usage:**

```typescript
await mailerService.sendEmailVerificationEmail({
  to: user.email,
  fullName: user.fullName,
  code: '12345678',
  expiresInMinutes: 15,
})
```

**Tags:** `['auth', 'email-verification']`

### 2. Password Reset

**Purpose:** Recover access to account  
**Location:** `apps/api/src/modules/mailer/mailer.templates.ts`

```typescript
export function buildPasswordResetEmailContent(params: CodeTemplateParams) {
  return buildCodeEmail({
    eyebrow: 'Recuperacao de acesso',
    title: 'Use este codigo para redefinir sua senha.',
    intro:
      'Recebemos uma solicitacao para redefinir a senha da sua conta. ' + 'Se foi voce, use o codigo abaixo no portal.',
    actionLabel: 'Codigo de redefinicao',
    helper: 'Se voce nao solicitou essa troca, ignore este email.',
    previewText: 'Codigo para redefinir a senha da sua conta DESK IMPERIAL.',
  })
}
```

**Usage:**

```typescript
await mailerService.sendPasswordResetEmail({
  to: user.email,
  fullName: user.fullName,
  code: '87654321',
  expiresInMinutes: 30,
})
```

**Tags:** `['auth', 'password-reset']`

### 3. Password Changed Alert

**Purpose:** Security notification after password change  
**Location:** `apps/api/src/modules/mailer/mailer.templates.ts`

```typescript
export function buildPasswordChangedEmailContent(params: PasswordChangedTemplateParams) {
  const occurredAt = formatDateTime(params.changedAt)
  const ipSummary = params.ipAddress ? `IP: ${params.ipAddress}` : 'IP nao identificado'

  // Email includes metadata box with timestamp and IP
  return {
    subject: `${params.appName} | Sua senha foi alterada`,
    tags: ['auth', 'password-changed'],
    // ... HTML content
  }
}
```

**Usage:**

```typescript
await mailerService.sendPasswordChangedEmail({
  to: user.email,
  fullName: user.fullName,
  changedAt: new Date(),
  ipAddress: request.ip,
})
```

**Tags:** `['auth', 'password-changed']`

### 4. Login Alert

**Purpose:** Notify user of new login from unfamiliar device  
**Configuration:** `LOGIN_ALERT_EMAILS_ENABLED=true` (default: false)

```typescript
export function buildLoginAlertEmailContent(params: LoginAlertTemplateParams) {
  const occurredAt = formatDateTime(params.occurredAt)
  const deviceSummary = params.userAgent ? truncate(params.userAgent, 140) : 'Navegador nao identificado'

  return {
    subject: `${params.appName} | Novo acesso detectado`,
    tags: ['auth', 'login-alert'],
    // ... HTML with device info
  }
}
```

**Usage:**

```typescript
await mailerService.sendLoginAlertEmail({
  to: user.email,
  fullName: user.fullName,
  occurredAt: new Date(),
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
})
```

**Tags:** `['auth', 'login-alert']`

### 5. Failed Login Alert

**Purpose:** Alert user of suspicious login attempts  
**Configuration:**

```env
FAILED_LOGIN_ALERTS_ENABLED=true
FAILED_LOGIN_ALERT_THRESHOLD=3
```

```typescript
export function buildFailedLoginAlertEmailContent(params: FailedLoginAlertTemplateParams) {
  return {
    subject: `${params.appName} | Tentativas de acesso na sua conta`,
    tags: ['auth', 'failed-login'],
    // ... HTML with attempt count, IP, device
  }
}
```

**Usage:**

```typescript
await mailerService.sendFailedLoginAlertEmail({
  to: user.email,
  fullName: user.fullName,
  occurredAt: new Date(),
  attemptCount: 5,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  locationSummary: 'Brasil',
})
```

**Tags:** `['auth', 'failed-login']`

### 6. Feedback Receipt

**Purpose:** Confirm receipt of user feedback/support ticket

```typescript
export function buildFeedbackReceiptEmailContent(params: FeedbackReceiptTemplateParams) {
  const receivedAt = formatDateTime(params.receivedAt)

  return {
    subject: `${params.appName} | Recebemos seu feedback`,
    tags: ['feedback', 'receipt'],
    // ... HTML with ticket ID
  }
}
```

**Usage:**

```typescript
await mailerService.sendFeedbackReceiptEmail({
  to: user.email,
  fullName: user.fullName,
  subjectLine: 'Bug no dashboard',
  ticketId: 'TKT-20240321-001',
  receivedAt: new Date(),
})
```

**Tags:** `['feedback', 'receipt']`

## Template Customization

### HTML Layout Structure

All templates use consistent formal layout:

```typescript
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
      <body style="background:#eef2f7;font-family:Segoe UI,Roboto,Arial,sans-serif">
        <!-- Preview text (hidden, shown in inbox) -->
        <div style="display:none">${escapeHtml(params.previewText)}</div>
        
        <!-- Main container -->
        <div style="padding:32px 16px">
          <div style="max-width:620px;margin:0 auto">
            
            <!-- App name header -->
            <div style="color:#445264;font-size:13px;text-transform:uppercase">
              ${escapeHtml(params.appName)}
            </div>
            
            <!-- Main card -->
            <div style="background:#fff;border-radius:28px;padding:32px">
              <!-- Eyebrow label -->
              <p style="color:#0f766e;text-transform:uppercase">
                ${escapeHtml(params.eyebrow)}
              </p>
              
              <!-- Title -->
              <h1 style="font-size:30px;color:#111827">
                ${escapeHtml(params.title)}
              </h1>
              
              <!-- Intro paragraph -->
              <p style="color:#4d5a6b">${escapeHtml(params.intro)}</p>
              
              <!-- Dynamic body -->
              ${params.body}
            </div>
            
            <!-- Footer -->
            <div style="color:#6b7280;font-size:12px">
              <p>${escapeHtml(params.footerNote)}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}
```

### Color Palette

```css
Background:     #eef2f7  /* Light blue-gray */
Card:           #ffffff  /* White */
Text Primary:   #111827  /* Dark gray */
Text Body:      #4d5a6b  /* Medium gray */
Text Footer:    #6b7280  /* Light gray */
Accent:         #0f766e  /* Teal (eyebrow) */
Code Box:       #1f2937  /* Dark */
Code Text:      #ffffff  /* White */
```

### Code Display Box

For OTP and verification codes:

```typescript
function buildCodeEmail(params) {
  const codeBox = `
    <div style="background:#1f2937;border-radius:16px;padding:24px;text-align:center">
      <div style="color:#9ca3af;font-size:11px;text-transform:uppercase">
        ${params.actionLabel}
      </div>
      <div style="color:#fff;font-size:28px;font-weight:800;letter-spacing:0.18em">
        ${params.code}
      </div>
      <div style="color:#6b7280;font-size:13px">
        Valido por ${params.expiresInMinutes} minutos
      </div>
    </div>
  `
  // ... rest of template
}
```

### Customization Points

#### 1. Change Language/Locale

All text is in `mailer.templates.ts`. To change language:

```typescript
// Portuguese → English example
export function buildPasswordResetEmailContent(params: CodeTemplateParams) {
  return buildCodeEmail({
    eyebrow: 'Password Recovery', // was: 'Recuperacao de acesso'
    title: 'Use this code to reset your password.',
    intro: 'We received a request to reset your account password.',
    actionLabel: 'Reset Code',
    helper: 'If you did not request this, please ignore this email.',
    previewText: 'Code to reset your DESK IMPERIAL password.',
  })
}
```

#### 2. Change Branding/Colors

Modify `buildEmailLayout()` function:

```typescript
// Change accent color from teal to brand color
<p style="color:#9b8460">  <!-- Your brand color -->
  ${escapeHtml(params.eyebrow)}
</p>
```

#### 3. Add New Template Type

```typescript
// 1. Define params type
type WelcomeEmailParams = BaseTemplateParams & {
  dashboardUrl: string
}

// 2. Create builder function
export function buildWelcomeEmailContent(params: WelcomeEmailParams) {
  const html = buildEmailLayout({
    appName: params.appName,
    previewText: 'Bem-vindo ao DESK IMPERIAL',
    eyebrow: 'Boas-vindas',
    title: 'Seja bem-vindo!',
    intro: 'Estamos felizes em ter voce conosco.',
    body: `
      <a href="${params.dashboardUrl}"
         style="display:inline-block;background:#9b8460;color:#fff;
                padding:12px 24px;border-radius:8px;text-decoration:none">
        Acessar Dashboard
      </a>
    `,
    footerNote: `Suporte: ${params.supportEmail}`
  })

  return {
    subject: `${params.appName} | Bem-vindo`,
    text: 'Bem-vindo ao DESK IMPERIAL!',
    html,
    tags: ['onboarding', 'welcome']
  }
}

// 3. Add method to MailerService
async sendWelcomeEmail(params: {
  to: string
  fullName: string
  dashboardUrl: string
}) {
  const content = buildWelcomeEmailContent({
    appName: this.getAppName(),
    fullName: params.fullName,
    supportEmail: this.getSupportEmail(),
    dashboardUrl: params.dashboardUrl
  })

  return this.sendTransactionalEmail({
    to: params.to,
    ...content
  })
}
```

## Troubleshooting

### Common Issues

#### 1. "Key not found" or 401 Unauthorized

**Cause:** Invalid or missing API key

**Fix:**

1. Generate real API key from Brevo → **API & Integration → API Keys**
2. Update `BREVO_API_KEY` in environment variables
3. Restart API server

```bash
# Check if API key is set
echo $BREVO_API_KEY

# Should show: <your-brevo-api-key>
```

#### 2. "Sender not verified" or 400/403 Error

**Cause:** Email sender not added/validated in Brevo

**Fix:**

1. Go to Brevo → **Senders & IP → Senders**
2. Add sender: `no-reply@send.deskimperial.com`
3. Confirm ownership via email link
4. Ensure `EMAIL_FROM_EMAIL` matches exactly

#### 3. "Domain not verified"

**Cause:** DNS records not propagated or incorrect

**Fix:**

1. Check DNS records in Brevo dashboard
2. Verify records are added to DNS provider
3. Wait for propagation (up to 48 hours)
4. Use `nslookup` to verify:
   ```bash
   nslookup -type=TXT send.deskimperial.com
   nslookup -type=TXT mail._domainkey.send.deskimperial.com
   ```

#### 4. Emails Not Sending (Development)

**Cause:** `EMAIL_PROVIDER` set to `log` or Brevo not configured

**Fix:**

```env
# Development (console logging)
EMAIL_PROVIDER=log

# Production (Brevo API)
EMAIL_PROVIDER=brevo
BREVO_API_KEY=<real-brevo-api-key>
```

#### 5. Timeout Errors

**Cause:** Brevo API taking longer than 15 seconds

**Fix:**

- Check Brevo status page
- Increase timeout in `mailer.service.ts`:
  ```typescript
  signal: AbortSignal.timeout(30000) // 30s instead of 15s
  ```

#### 6. Emails Going to Spam

**Possible Causes:**

- DMARC policy too strict (`p=reject`)
- Missing SPF/DKIM records
- Low sender reputation (new domain)
- Generic content triggering spam filters

**Fixes:**

1. Verify all DNS records (SPF, DKIM, DMARC)
2. Start with `p=quarantine` instead of `p=reject`
3. Warm up sending domain gradually
4. Personalize emails (use user's name)
5. Avoid spam trigger words in subject lines
6. Request users to whitelist sender address

### Debug Logging

Enable detailed logging in development:

```typescript
// apps/api/src/modules/mailer/mailer.service.ts
this.logger.debug('Sending email via Brevo', {
  to: params.to,
  subject: params.subject,
  tags: params.tags,
})

this.logger.debug('Brevo API response', {
  messageId: payload?.messageId,
  status: response.status,
})
```

View logs:

```bash
# Development
npm run dev

# Production (Railway)
railway logs --service api
```

## Production Checklist

Before going live:

- [ ] **API Key:** Real Brevo API key set in production environment
- [ ] **Domain Validation:** Sending domain verified in Brevo
- [ ] **DNS Records:** SPF, DKIM, DMARC all validated
- [ ] **Sender Email:** Added and confirmed in Brevo
- [ ] **Environment Variables:** All email-related vars set correctly
- [ ] **HTTPS:** Frontend and API running on HTTPS
- [ ] **CORS:** Configured to allow frontend domain
- [ ] **Rate Limiting:** Enabled to prevent abuse
- [ ] **Error Monitoring:** OSS observability stack configured (OTel + Alloy + Tempo + Loki + Prometheus)
- [ ] **Email Alerts:** Tested (verification, reset, security alerts)
- [ ] **Spam Testing:** Send test emails to Gmail, Outlook, etc.
- [ ] **Deliverability:** Monitor bounce rates and complaints

### Environment Variables Checklist

```env
✓ EMAIL_PROVIDER=brevo
✓ BREVO_API_URL=https://api.brevo.com/v3/smtp/email
✓ BREVO_API_KEY=<real-brevo-api-key>
✓ EMAIL_FROM_NAME=DESK IMPERIAL
✓ EMAIL_FROM_EMAIL=no-reply@send.deskimperial.com
✓ EMAIL_REPLY_TO=suporte@deskimperial.com
✓ EMAIL_SUPPORT_ADDRESS=suporte@deskimperial.com
✓ APP_NAME=DESK IMPERIAL
✓ FRONTEND_URL=https://app.deskimperial.com
```

## Additional Resources

- [Brevo API Documentation](https://developers.brevo.com/)
- [SPF Record Checker](https://mxtoolbox.com/spf.aspx)
- [DKIM Record Validator](https://mxtoolbox.com/dkim.aspx)
- [DMARC Analyzer](https://dmarc.org/overview/)
- [Email Deliverability Guide](https://www.brevo.com/blog/email-deliverability/)

---

**Last Updated:** 2024  
**Maintained By:** DESK IMPERIAL Development Team
