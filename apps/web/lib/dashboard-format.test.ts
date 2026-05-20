import { describe, expect, it } from 'vitest'
import { formatAccountStatus, formatBuyerType, maskBuyerDocument } from './dashboard-format'

describe('dashboard-format', () => {
  describe('formatAccountStatus', () => {
    it('translates ACTIVE', () => {
      expect(formatAccountStatus('ACTIVE')).toBe('Ativo')
    })

    it('translates DISABLED', () => {
      expect(formatAccountStatus('DISABLED')).toBe('Desabilitado')
    })

    it('normalizes unknown statuses to lowercase', () => {
      const result = formatAccountStatus('CUSTOM')
      expect(result).toBe('custom')
    })
  })

  describe('formatBuyerType', () => {
    it('returns Pessoa for PERSON', () => {
      expect(formatBuyerType('PERSON')).toBe('Pessoa')
    })

    it('returns Empresa for COMPANY', () => {
      expect(formatBuyerType('COMPANY')).toBe('Empresa')
    })

    it('returns fallback for null', () => {
      expect(formatBuyerType(null)).toBe('Não informado')
    })
  })

  describe('maskBuyerDocument', () => {
    it('masks a CPF (11 digits)', () => {
      expect(maskBuyerDocument('12345678901')).toBe('123.***.***-01')
    })

    it('masks a CNPJ (14 digits)', () => {
      expect(maskBuyerDocument('12345678000195')).toBe('12.***.***/****-95')
    })

    it('returns fallback for null', () => {
      expect(maskBuyerDocument(null)).toBe('Documento não informado')
    })

    it('returns fallback for empty string', () => {
      expect(maskBuyerDocument('')).toBe('Documento não informado')
    })

    it('returns *** for unexpected digit lengths', () => {
      expect(maskBuyerDocument('12345')).toBe('***')
    })
  })
})
