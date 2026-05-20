import {
  buildEmailVerificationContent,
  buildFailedLoginAlertEmailContent,
  buildFeedbackReceiptEmailContent,
  buildLoginAlertEmailContent,
  buildPasswordChangedEmailContent,
  buildPasswordResetEmailContent,
} from '../src/modules/mailer/mailer.templates'

const baseParams = {
  appName: 'DESK IMPERIAL',
  fullName: 'João Silva',
  supportEmail: 'suporte@deskimperial.com',
}

describe('Mailer Templates', () => {
  describe('buildPasswordResetEmailContent', () => {
    const params = {
      ...baseParams,
      code: 'ABC123',
      expiresInMinutes: 15,
    }

    it('should include proper accentuation in Portuguese', () => {
      const result = buildPasswordResetEmailContent(params)
      expect(result.text).toContain('código')
      expect(result.text).toContain('até')
      expect(result.html).toContain('Recuperação')
      expect(result.text).toContain('solicitação')
      expect(result.html).toContain('segurança')
      expect(result.html).toContain('Você recebeu este email')
    })

    it('should use formal greeting in text version', () => {
      const result = buildPasswordResetEmailContent(params)
      expect(result.text).toContain('Prezado(a) João Silva')
      expect(result.text).not.toContain('Olá')
      expect(result.html).not.toContain('Olá')
    })

    it('should use professional phrases', () => {
      const result = buildPasswordResetEmailContent(params)
      expect(result.html).toContain('pode desconsiderar')
      expect(result.text).toContain('pode desconsiderar')
      expect(result.html).not.toContain('pode ignorar')
    })

    it('should substitute all variables correctly', () => {
      const result = buildPasswordResetEmailContent(params)
      expect(result.html).toContain('ABC123')
      expect(result.html).toContain('15 minuto(s)')
      expect(result.html).toContain('DESK IMPERIAL')
      expect(result.text).toContain('ABC123')
      expect(result.text).toContain('suporte@deskimperial.com')
    })

    it('should have correct subject line', () => {
      const result = buildPasswordResetEmailContent(params)
      expect(result.subject).toBe('DESK IMPERIAL | Código de segurança')
    })

    it('should include proper tags', () => {
      const result = buildPasswordResetEmailContent(params)
      expect(result.tags).toEqual(['auth', 'password-reset'])
    })

    it('should have well-formed HTML', () => {
      const result = buildPasswordResetEmailContent(params)
      expect(result.html).toContain('<!doctype html>')
      expect(result.html).toContain('<html lang="pt-BR">')
      expect(result.html).toContain('</html>')
      expect(result.html).toContain('</body>')
    })

    it('should escape HTML in variables', () => {
      const maliciousParams = {
        ...params,
        fullName: '<script>alert("xss")</script>',
        code: '<b>CODE</b>',
      }
      const result = buildPasswordResetEmailContent(maliciousParams)
      expect(result.html).not.toContain('<script>')
      expect(result.html).toContain('&lt;b&gt;CODE&lt;/b&gt;')
    })

    it('should have plain text version', () => {
      const result = buildPasswordResetEmailContent(params)
      expect(result.text).toBeTruthy()
      expect(result.text).toContain('Prezado(a) João Silva')
      expect(result.text).toContain('ABC123')
    })
  })

  describe('buildEmailVerificationContent', () => {
    const params = {
      ...baseParams,
      code: 'XYZ789',
      expiresInMinutes: 30,
    }

    it('should include proper accentuation in Portuguese', () => {
      const result = buildEmailVerificationContent(params)
      expect(result.text).toContain('código')
      expect(result.text).toContain('até')
      expect(result.html).toContain('Confirmação')
      expect(result.text).toContain('promoções')
      expect(result.text).toContain('atualizações')
      expect(result.html).toContain('Você recebeu este email')
    })

    it('should use formal greeting in text version', () => {
      const result = buildEmailVerificationContent(params)
      expect(result.text).toContain('Prezado(a) João Silva')
      expect(result.text).not.toContain('Olá')
      expect(result.html).not.toContain('Olá')
    })

    it('should use professional phrases', () => {
      const result = buildEmailVerificationContent(params)
      expect(result.html).toContain('pode desconsiderar')
      expect(result.text).toContain('pode desconsiderar')
      expect(result.html).not.toContain('pode ignorar')
    })

    it('should substitute all variables correctly', () => {
      const result = buildEmailVerificationContent(params)
      expect(result.html).toContain('XYZ789')
      expect(result.html).toContain('30 minuto(s)')
      expect(result.html).toContain('DESK IMPERIAL')
    })

    it('should have correct subject line', () => {
      const result = buildEmailVerificationContent(params)
      expect(result.subject).toBe('DESK IMPERIAL | Confirme seu email')
    })

    it('should include proper tags', () => {
      const result = buildEmailVerificationContent(params)
      expect(result.tags).toEqual(['auth', 'email-verification'])
    })

    it('should have well-formed HTML', () => {
      const result = buildEmailVerificationContent(params)
      expect(result.html).toContain('<!doctype html>')
      expect(result.html).toContain('<html lang="pt-BR">')
      expect(result.html).toContain('</html>')
    })
  })

  describe('buildPasswordChangedEmailContent', () => {
    const params = {
      ...baseParams,
      changedAt: new Date('2024-01-15T10:30:00Z'),
      ipAddress: '192.168.1.100',
    }

    it('should include proper accentuation in Portuguese', () => {
      const result = buildPasswordChangedEmailContent(params)
      expect(result.html).toContain('Alerta de segurança')
      expect(result.html).toContain('nenhuma ação adicional é necessária')
      expect(result.html).toContain('Você recebeu este email')
      expect(result.text).toContain('alteração')
    })

    it('should use formal greeting in text version', () => {
      const result = buildPasswordChangedEmailContent(params)
      expect(result.text).toContain('Prezado(a) João Silva')
      expect(result.text).not.toContain('Olá')
      expect(result.html).not.toContain('Olá')
    })

    it('should use professional contact phrase', () => {
      const result = buildPasswordChangedEmailContent(params)
      expect(result.html).toContain('entre em contato')
      expect(result.text).toContain('entre em contato')
      expect(result.html).not.toContain('fale com')
    })

    it('should substitute all variables correctly', () => {
      const result = buildPasswordChangedEmailContent(params)
      expect(result.html).toContain('192.168.1.100')
      expect(result.html).toContain('DESK IMPERIAL')
      expect(result.html).toContain('suporte@deskimperial.com')
    })

    it('should handle missing IP address gracefully', () => {
      const paramsNoIp = { ...params, ipAddress: null }
      const result = buildPasswordChangedEmailContent(paramsNoIp)
      expect(result.html).toContain('IP não identificado')
    })

    it('should have correct subject line', () => {
      const result = buildPasswordChangedEmailContent(params)
      expect(result.subject).toBe('DESK IMPERIAL | Sua senha foi alterada')
    })

    it('should include proper tags', () => {
      const result = buildPasswordChangedEmailContent(params)
      expect(result.tags).toEqual(['auth', 'password-changed'])
    })

    it('should format date in Brazilian Portuguese', () => {
      const result = buildPasswordChangedEmailContent(params)
      expect(result.html).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })
  })

  describe('buildLoginAlertEmailContent', () => {
    const params = {
      ...baseParams,
      occurredAt: new Date('2024-01-15T14:20:00Z'),
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    }

    it('should include proper accentuation in Portuguese', () => {
      const result = buildLoginAlertEmailContent(params)
      expect(result.html).toContain('nenhuma ação adicional é necessária')
      expect(result.html).toContain('Você recebeu este email')
      expect(result.text).toContain('você')
    })

    it('should use formal greeting in text version', () => {
      const result = buildLoginAlertEmailContent(params)
      expect(result.text).toContain('Prezado(a) João Silva')
      expect(result.text).not.toContain('Olá')
      expect(result.html).not.toContain('Olá')
    })

    it('should use professional phrases', () => {
      const result = buildLoginAlertEmailContent(params)
      expect(result.text).toContain('pode desconsiderar')
      expect(result.text).toContain('entre em contato')
      expect(result.text).not.toContain('pode ignorar')
      expect(result.text).not.toContain('fale com')
    })

    it('should substitute all variables correctly', () => {
      const result = buildLoginAlertEmailContent(params)
      expect(result.html).toContain('10.0.0.50')
      expect(result.html).toContain('Chrome/120.0')
      expect(result.html).toContain('DESK IMPERIAL')
    })

    it('should handle missing user agent gracefully', () => {
      const paramsNoAgent = { ...params, userAgent: null }
      const result = buildLoginAlertEmailContent(paramsNoAgent)
      expect(result.html).toContain('Navegador não identificado')
    })

    it('should have correct subject line', () => {
      const result = buildLoginAlertEmailContent(params)
      expect(result.subject).toBe('DESK IMPERIAL | Novo acesso detectado')
    })

    it('should include proper tags', () => {
      const result = buildLoginAlertEmailContent(params)
      expect(result.tags).toEqual(['auth', 'login-alert'])
    })
  })

  describe('buildFailedLoginAlertEmailContent', () => {
    const params = {
      ...baseParams,
      occurredAt: new Date('2024-01-15T16:45:00Z'),
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0 Firefox/120.0',
      attemptCount: 5,
      locationSummary: 'São Paulo, Brasil',
    }

    it('should include proper accentuation in Portuguese', () => {
      const result = buildFailedLoginAlertEmailContent(params)
      expect(result.html).toContain('Alerta de segurança')
      expect(result.html).toContain('Você recebeu este email')
      expect(result.text).toContain('última tentativa')
      expect(result.text).toContain('inválida')
    })

    it('should use formal greeting in text version', () => {
      const result = buildFailedLoginAlertEmailContent(params)
      expect(result.text).toContain('Prezado(a) João Silva')
      expect(result.text).not.toContain('Olá')
      expect(result.html).not.toContain('Olá')
    })

    it('should use professional contact phrase', () => {
      const result = buildFailedLoginAlertEmailContent(params)
      expect(result.html).toContain('entre em contato')
      expect(result.text).toContain('entre em contato')
      expect(result.html).not.toContain('fale com')
    })

    it('should substitute all variables correctly', () => {
      const result = buildFailedLoginAlertEmailContent(params)
      expect(result.html).toContain('203.0.113.42')
      expect(result.html).toContain('Firefox/120.0')
      expect(result.html).toContain('São Paulo, Brasil')
      expect(result.html).toContain('5')
    })

    it('should handle missing location gracefully', () => {
      const paramsNoLocation = { ...params, locationSummary: null }
      const result = buildFailedLoginAlertEmailContent(paramsNoLocation)
      expect(result.html).toContain('Local aproximado indisponível')
    })

    it('should have correct subject line', () => {
      const result = buildFailedLoginAlertEmailContent(params)
      expect(result.subject).toBe('DESK IMPERIAL | Tentativas de acesso na sua conta')
    })

    it('should include proper tags', () => {
      const result = buildFailedLoginAlertEmailContent(params)
      expect(result.tags).toEqual(['auth', 'failed-login'])
    })
  })

  describe('buildFeedbackReceiptEmailContent', () => {
    const params = {
      ...baseParams,
      subjectLine: 'Sugestão de melhoria',
      receivedAt: new Date('2024-01-15T18:00:00Z'),
      ticketId: 'TKT-2024-001',
    }

    it('should include proper accentuation in Portuguese', () => {
      const result = buildFeedbackReceiptEmailContent(params)
      expect(result.html).toContain('Confirmação de recebimento')
      expect(result.html).toContain('próxima')
      expect(result.html).toContain('evolução')
      expect(result.html).toContain('Você recebeu este email')
    })

    it('should use formal greeting in text version', () => {
      const result = buildFeedbackReceiptEmailContent(params)
      expect(result.text).toContain('Prezado(a) João Silva')
      expect(result.text).not.toContain('Olá')
      expect(result.html).not.toContain('Olá')
    })

    it('should substitute all variables correctly', () => {
      const result = buildFeedbackReceiptEmailContent(params)
      expect(result.html).toContain('Sugestão de melhoria')
      expect(result.html).toContain('TKT-2024-001')
      expect(result.html).toContain('DESK IMPERIAL')
    })

    it('should have correct subject line', () => {
      const result = buildFeedbackReceiptEmailContent(params)
      expect(result.subject).toBe('DESK IMPERIAL | Recebemos seu feedback')
    })

    it('should include proper tags', () => {
      const result = buildFeedbackReceiptEmailContent(params)
      expect(result.tags).toEqual(['feedback', 'receipt'])
    })

    it('should have well-formed HTML', () => {
      const result = buildFeedbackReceiptEmailContent(params)
      expect(result.html).toContain('<!doctype html>')
      expect(result.html).toContain('<html lang="pt-BR">')
      expect(result.html).toContain('</html>')
    })

    it('should escape subject line HTML', () => {
      const maliciousParams = {
        ...params,
        subjectLine: '<img src=x onerror=alert(1)>',
      }
      const result = buildFeedbackReceiptEmailContent(maliciousParams)
      expect(result.html).not.toContain('<img')
      expect(result.html).toContain('&lt;img')
    })
  })

  describe('Cross-template consistency', () => {
    it('all templates should use formal greeting "Prezado(a)"', () => {
      const codeParams = { ...baseParams, code: 'ABC123', expiresInMinutes: 15 }
      const dateParams = { ...baseParams, changedAt: new Date(), ipAddress: '1.2.3.4' }
      const feedbackParams = {
        ...baseParams,
        subjectLine: 'Test',
        receivedAt: new Date(),
        ticketId: 'TKT-001',
      }
      const loginParams = { ...dateParams, occurredAt: new Date(), userAgent: 'Chrome' }
      const failedParams = { ...loginParams, attemptCount: 3, locationSummary: 'Brasil' }

      const templates = [
        buildPasswordResetEmailContent(codeParams),
        buildEmailVerificationContent(codeParams),
        buildPasswordChangedEmailContent(dateParams),
        buildLoginAlertEmailContent(loginParams),
        buildFailedLoginAlertEmailContent(failedParams),
        buildFeedbackReceiptEmailContent(feedbackParams),
      ]

      templates.forEach((template) => {
        expect(template.text).toContain('Prezado(a)')
        expect(template.text).not.toContain('Olá')
      })
    })

    it('all templates should have Portuguese language attribute', () => {
      const codeParams = { ...baseParams, code: 'ABC123', expiresInMinutes: 15 }
      const dateParams = { ...baseParams, changedAt: new Date(), ipAddress: '1.2.3.4' }
      const feedbackParams = {
        ...baseParams,
        subjectLine: 'Test',
        receivedAt: new Date(),
        ticketId: 'TKT-001',
      }
      const loginParams = { ...dateParams, occurredAt: new Date(), userAgent: 'Chrome' }
      const failedParams = { ...loginParams, attemptCount: 3, locationSummary: 'Brasil' }

      const templates = [
        buildPasswordResetEmailContent(codeParams),
        buildEmailVerificationContent(codeParams),
        buildPasswordChangedEmailContent(dateParams),
        buildLoginAlertEmailContent(loginParams),
        buildFailedLoginAlertEmailContent(failedParams),
        buildFeedbackReceiptEmailContent(feedbackParams),
      ]

      templates.forEach((template) => {
        expect(template.html).toContain('lang="pt-BR"')
      })
    })

    it('all templates should use professional contact phrase', () => {
      const dateParams = { ...baseParams, changedAt: new Date(), ipAddress: '1.2.3.4' }
      const loginParams = { ...dateParams, occurredAt: new Date(), userAgent: 'Chrome' }
      const failedParams = { ...loginParams, attemptCount: 3, locationSummary: 'Brasil' }

      const templatesWithContact = [
        buildPasswordChangedEmailContent(dateParams),
        buildLoginAlertEmailContent(loginParams),
        buildFailedLoginAlertEmailContent(failedParams),
      ]

      templatesWithContact.forEach((template) => {
        expect(template.text).toContain('entre em contato')
        expect(template.text).not.toContain('fale com')
      })
    })
  })
})
