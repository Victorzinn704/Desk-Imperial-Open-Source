# Email Template Manual Testing Checklist

**Testing Date:** **\*\***\_\_\_**\*\***  
**Tester:** **\*\***\_\_\_**\*\***  
**Version:** **\*\***\_\_\_**\*\***

## Pre-Testing Setup

- [ ] Access to test email accounts (Gmail, Outlook, Apple Mail)
- [ ] Test environment configured
- [ ] Screenshot tool ready
- [ ] Browser dev tools available

---

## Template 1: Password Reset Email

**Template Function:** `buildPasswordResetEmailContent`

### Visual Inspection

- [ ] Subject line: "DESK IMPERIAL | Código de segurança"
- [ ] Eyebrow text: "Recuperação de acesso"
- [ ] Greeting: "Prezado(a) [Name]"
- [ ] Code is prominently displayed with dark background
- [ ] Expiration time is clearly stated
- [ ] Footer includes support email

### Content Quality

- [ ] All Portuguese text has proper accentuation (código, até, última, solicitação)
- [ ] Formal tone throughout (no "Olá", no "fale com")
- [ ] Uses "pode desconsiderar" instead of "pode ignorar"
- [ ] Security warning is clear and professional

### Email Client Compatibility

- [ ] **Gmail Desktop**: Renders correctly
- [ ] **Gmail Mobile**: Readable and properly formatted
- [ ] **Outlook Desktop**: No formatting issues
- [ ] **Outlook Web**: Displays correctly
- [ ] **Apple Mail**: Proper rendering
- [ ] **Mobile Email Apps**: Responsive design works

### Variable Substitution

- [ ] `${appName}` displays correctly
- [ ] `${fullName}` displays correctly
- [ ] `${code}` displays prominently
- [ ] `${expiresInMinutes}` shows correct time
- [ ] `${supportEmail}` is clickable link

### Screenshot Checklist

- [ ] Full email in Gmail
- [ ] Mobile view
- [ ] Code display area

---

## Template 2: Email Verification

**Template Function:** `buildEmailVerificationContent`

### Visual Inspection

- [ ] Subject line: "DESK IMPERIAL | Confirme seu email"
- [ ] Eyebrow text: "Confirmação de email"
- [ ] Greeting: "Prezado(a) [Name]"
- [ ] Code is prominently displayed
- [ ] Instructions about spam folder included
- [ ] Footer includes support email

### Content Quality

- [ ] All Portuguese text has proper accentuation (confirmação, você, até, promoções)
- [ ] Formal tone throughout
- [ ] Uses "pode desconsiderar" instead of "pode ignorar"
- [ ] Clear instructions for new users

### Email Client Compatibility

- [ ] **Gmail Desktop**: Renders correctly
- [ ] **Gmail Mobile**: Readable and properly formatted
- [ ] **Outlook Desktop**: No formatting issues
- [ ] **Outlook Web**: Displays correctly
- [ ] **Apple Mail**: Proper rendering
- [ ] **Mobile Email Apps**: Responsive design works

### Variable Substitution

- [ ] `${appName}` displays correctly
- [ ] `${fullName}` displays correctly
- [ ] `${code}` displays prominently
- [ ] `${expiresInMinutes}` shows correct time
- [ ] `${supportEmail}` is clickable link

### Screenshot Checklist

- [ ] Full email in Outlook
- [ ] Mobile view
- [ ] Code display area

---

## Template 3: Password Changed Alert

**Template Function:** `buildPasswordChangedEmailContent`

### Visual Inspection

- [ ] Subject line: "DESK IMPERIAL | Sua senha foi alterada"
- [ ] Eyebrow text: "Alerta de segurança"
- [ ] Greeting: "Prezado(a) [Name]"
- [ ] Date/time displayed in Brazilian format
- [ ] IP address shown
- [ ] Security box with gray background

### Content Quality

- [ ] All Portuguese text has proper accentuation (última, alteração)
- [ ] Formal tone throughout
- [ ] Uses "entre em contato" instead of "fale com"
- [ ] Security message is clear

### Email Client Compatibility

- [ ] **Gmail Desktop**: Renders correctly
- [ ] **Gmail Mobile**: Readable and properly formatted
- [ ] **Outlook Desktop**: No formatting issues
- [ ] **Outlook Web**: Displays correctly
- [ ] **Apple Mail**: Proper rendering
- [ ] **Mobile Email Apps**: Responsive design works

### Variable Substitution

- [ ] `${appName}` displays correctly
- [ ] `${fullName}` displays correctly
- [ ] `${changedAt}` formatted in pt-BR
- [ ] `${ipAddress}` displays correctly (or "IP não identificado")
- [ ] `${supportEmail}` is clickable link

### Screenshot Checklist

- [ ] Full email in Apple Mail
- [ ] Mobile view
- [ ] Security info box

---

## Template 4: Login Alert

**Template Function:** `buildLoginAlertEmailContent`

### Visual Inspection

- [ ] Subject line: "DESK IMPERIAL | Novo acesso detectado"
- [ ] Eyebrow text: "Alerta de acesso"
- [ ] Greeting: "Prezado(a) [Name]"
- [ ] Date/time, IP, and device shown
- [ ] Security box with details
- [ ] Action instructions clear

### Content Quality

- [ ] All Portuguese text has proper accentuation
- [ ] Formal tone throughout
- [ ] Uses "pode desconsiderar" instead of "pode ignorar"
- [ ] Uses "entre em contato" instead of "fale com"

### Email Client Compatibility

- [ ] **Gmail Desktop**: Renders correctly
- [ ] **Gmail Mobile**: Readable and properly formatted
- [ ] **Outlook Desktop**: No formatting issues
- [ ] **Outlook Web**: Displays correctly
- [ ] **Apple Mail**: Proper rendering
- [ ] **Mobile Email Apps**: Responsive design works

### Variable Substitution

- [ ] `${appName}` displays correctly
- [ ] `${fullName}` displays correctly
- [ ] `${occurredAt}` formatted in pt-BR
- [ ] `${ipAddress}` displays correctly
- [ ] `${userAgent}` displays correctly (or "Navegador não identificado")
- [ ] `${supportEmail}` is clickable link

### Screenshot Checklist

- [ ] Full email
- [ ] Device info display
- [ ] Mobile view

---

## Template 5: Failed Login Alert

**Template Function:** `buildFailedLoginAlertEmailContent`

### Visual Inspection

- [ ] Subject line: "DESK IMPERIAL | Tentativas de acesso na sua conta"
- [ ] Eyebrow text: "Alerta de segurança"
- [ ] Greeting: "Prezado(a) [Name]"
- [ ] Attempt count displayed
- [ ] Location summary shown
- [ ] All security details visible

### Content Quality

- [ ] All Portuguese text has proper accentuation (última, inválida, próxima)
- [ ] Formal tone throughout
- [ ] Uses "pode desconsiderar" instead of "pode ignorar"
- [ ] Uses "entre em contato" instead of "fale com"
- [ ] Urgency conveyed professionally

### Email Client Compatibility

- [ ] **Gmail Desktop**: Renders correctly
- [ ] **Gmail Mobile**: Readable and properly formatted
- [ ] **Outlook Desktop**: No formatting issues
- [ ] **Outlook Web**: Displays correctly
- [ ] **Apple Mail**: Proper rendering
- [ ] **Mobile Email Apps**: Responsive design works

### Variable Substitution

- [ ] `${appName}` displays correctly
- [ ] `${fullName}` displays correctly
- [ ] `${occurredAt}` formatted in pt-BR
- [ ] `${ipAddress}` displays correctly
- [ ] `${userAgent}` displays correctly
- [ ] `${attemptCount}` displays correctly
- [ ] `${locationSummary}` displays correctly (or "Local aproximado indisponível")
- [ ] `${supportEmail}` is clickable link

### Screenshot Checklist

- [ ] Full email with all security details
- [ ] Mobile view
- [ ] Attempt count display

---

## Template 6: Feedback Receipt

**Template Function:** `buildFeedbackReceiptEmailContent`

### Visual Inspection

- [ ] Subject line: "DESK IMPERIAL | Recebemos seu feedback"
- [ ] Eyebrow text: "Confirmação de recebimento"
- [ ] Greeting: "Prezado(a) [Name]"
- [ ] Subject line, protocol, and date shown
- [ ] Thank you message is professional
- [ ] Footer includes support email

### Content Quality

- [ ] All Portuguese text has proper accentuation (próxima, evolução, confirmação)
- [ ] Formal tone throughout
- [ ] Professional and appreciative tone
- [ ] Clear confirmation of receipt

### Email Client Compatibility

- [ ] **Gmail Desktop**: Renders correctly
- [ ] **Gmail Mobile**: Readable and properly formatted
- [ ] **Outlook Desktop**: No formatting issues
- [ ] **Outlook Web**: Displays correctly
- [ ] **Apple Mail**: Proper rendering
- [ ] **Mobile Email Apps**: Responsive design works

### Variable Substitution

- [ ] `${appName}` displays correctly
- [ ] `${fullName}` displays correctly
- [ ] `${subjectLine}` displays correctly
- [ ] `${ticketId}` displays correctly
- [ ] `${receivedAt}` formatted in pt-BR
- [ ] `${supportEmail}` is clickable link

### Screenshot Checklist

- [ ] Full email
- [ ] Ticket information display
- [ ] Mobile view

---

## Cross-Template Consistency Checks

### Branding

- [ ] All templates use same color scheme
- [ ] DESK IMPERIAL branding consistent
- [ ] Footer format identical across all templates
- [ ] Border radius and spacing consistent

### Typography

- [ ] Font families consistent
- [ ] Font sizes proportional
- [ ] Line heights readable
- [ ] Letter spacing appropriate

### Responsive Design

- [ ] All templates stack properly on mobile
- [ ] Text remains readable at small sizes
- [ ] Buttons/codes remain prominent
- [ ] No horizontal scrolling required

### Accessibility

- [ ] Text has sufficient contrast
- [ ] Links are clearly identifiable
- [ ] Preview text is meaningful
- [ ] Language attribute set to pt-BR

---

## Security Testing

### XSS Prevention

- [ ] Test with `<script>` in fullName - should be escaped
- [ ] Test with HTML tags in code - should be escaped
- [ ] Test with special characters - should render safely
- [ ] No unescaped user input in any template

### Data Sanitization

- [ ] Email addresses properly formatted
- [ ] Dates display without errors
- [ ] IP addresses handled correctly
- [ ] Null values handled gracefully

---

## Final Sign-Off

### Critical Issues Found

_List any blocking issues:_

1. ***
2. ***
3. ***

### Minor Issues Found

_List any non-blocking issues:_

1. ***
2. ***
3. ***

### Recommendations

_Suggestions for improvement:_

1. ***
2. ***
3. ***

### Approval

- [ ] All critical issues resolved
- [ ] All templates tested across major email clients
- [ ] Portuguese accentuation verified
- [ ] Formal tone confirmed throughout
- [ ] Variable substitution working correctly
- [ ] HTML renders properly in all clients
- [ ] Ready for production deployment

**QA Engineer Signature:** **\*\***\_\_\_**\*\***  
**Date:** **\*\***\_\_\_**\*\***  
**Approved for Deployment:** [ ] YES [ ] NO
