import { roundCurrency, roundPercent } from '../src/common/utils/number-rounding.util'
import { sanitizePlainText } from '../src/common/utils/input-hardening.util'
import { isValidCnpj, isValidCpf, sanitizeDocument } from '../src/common/utils/document-validation.util'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../src/common/utils/workspace-access.util'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'

describe('roundCurrency', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundCurrency(10.555)).toBe(10.56)
    expect(roundCurrency(10.554)).toBe(10.55)
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3)
  })

  it('handles integers', () => {
    expect(roundCurrency(100)).toBe(100)
    expect(roundCurrency(0)).toBe(0)
  })

  it('handles negative values', () => {
    expect(roundCurrency(-5.678)).toBe(-5.68)
  })
})

describe('roundPercent', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundPercent(33.333333)).toBe(33.33)
    expect(roundPercent(66.666666)).toBe(66.67)
  })
})

describe('sanitizePlainText', () => {
  it('returns null for empty input when allowEmpty is true', () => {
    expect(sanitizePlainText('', 'Field')).toBeNull()
    expect(sanitizePlainText(null, 'Field')).toBeNull()
    expect(sanitizePlainText(undefined, 'Field')).toBeNull()
  })

  it('throws for empty input when allowEmpty is false', () => {
    expect(() => sanitizePlainText('', 'Label', { allowEmpty: false })).toThrow('obrigatorio')
    expect(() => sanitizePlainText('  ', 'Label', { allowEmpty: false })).toThrow('obrigatorio')
  })

  it('trims and normalizes whitespace', () => {
    expect(sanitizePlainText('  hello   world  ', 'Field')).toBe('hello world')
    expect(sanitizePlainText('a\t\tb', 'Field')).toBe('a b')
  })

  it('rejects HTML-like content', () => {
    expect(() => sanitizePlainText('<script>alert("xss")</script>', 'Field')).toThrow('HTML')
    expect(() => sanitizePlainText('hello <b>world</b>', 'Field')).toThrow('HTML')
  })

  it('rejects spreadsheet formulas when rejectFormula is true', () => {
    expect(() => sanitizePlainText('=SUM(A1:A10)', 'Field', { rejectFormula: true })).toThrow('reservados')
    expect(() => sanitizePlainText('+cmd|/C calc', 'Field', { rejectFormula: true })).toThrow('reservados')
    expect(() => sanitizePlainText('@SUM(A1)', 'Field', { rejectFormula: true })).toThrow('reservados')
    expect(() => sanitizePlainText('-cmd', 'Field', { rejectFormula: true })).toThrow('reservados')
  })

  it('allows formulas when rejectFormula is false (default)', () => {
    expect(sanitizePlainText('= something', 'Field')).toBe('= something')
  })

  it('strips control characters', () => {
    expect(sanitizePlainText('hello\x00world', 'Field')).toBe('hello world')
    expect(sanitizePlainText('test\x7fvalue', 'Field')).toBe('test value')
  })
})

describe('sanitizeDocument', () => {
  it('removes non-digit characters', () => {
    expect(sanitizeDocument('123.456.789-00')).toBe('12345678900')
    expect(sanitizeDocument('12.345.678/0001-90')).toBe('12345678000190')
  })

  it('handles already clean input', () => {
    expect(sanitizeDocument('12345678901')).toBe('12345678901')
  })
})

describe('isValidCpf', () => {
  it('validates correct CPFs', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('52998224725')).toBe(true)
    expect(isValidCpf('111.444.777-35')).toBe(true)
  })

  it('rejects invalid CPFs', () => {
    expect(isValidCpf('123.456.789-00')).toBe(false)
    expect(isValidCpf('000.000.000-00')).toBe(false)
    expect(isValidCpf('111.111.111-11')).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(isValidCpf('123456789')).toBe(false)
    expect(isValidCpf('123456789012')).toBe(false)
  })
})

describe('isValidCnpj', () => {
  it('validates correct CNPJs', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
    expect(isValidCnpj('11222333000181')).toBe(true)
  })

  it('rejects invalid CNPJs', () => {
    expect(isValidCnpj('11.222.333/0001-00')).toBe(false)
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false)
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(isValidCnpj('1234567890123')).toBe(false)
    expect(isValidCnpj('123456789012345')).toBe(false)
  })
})

describe('resolveWorkspaceOwnerUserId', () => {
  it('returns userId for OWNER', () => {
    const auth = makeOwnerAuthContext({
      userId: 'owner-123',
      workspaceOwnerUserId: 'owner-123',
    })
    expect(resolveWorkspaceOwnerUserId(auth)).toBe('owner-123')
  })

  it('returns companyOwnerUserId for STAFF', () => {
    const auth = makeStaffAuthContext({
      userId: 'staff-456',
      workspaceOwnerUserId: 'owner-123',
      companyOwnerUserId: 'owner-123',
    })
    expect(resolveWorkspaceOwnerUserId(auth)).toBe('owner-123')
  })

  it('falls back to userId when companyOwnerUserId is null for STAFF', () => {
    const auth = makeStaffAuthContext({
      userId: 'staff-456',
      companyOwnerUserId: null,
    })
    expect(resolveWorkspaceOwnerUserId(auth)).toBe('owner-1')
  })
})

describe('assertOwnerRole', () => {
  it('does not throw for OWNER', () => {
    expect(() => assertOwnerRole({ role: 'OWNER' as const })).not.toThrow()
  })

  it('throws ForbiddenException for STAFF', () => {
    expect(() => assertOwnerRole({ role: 'STAFF' as const })).toThrow()
  })

  it('uses custom message', () => {
    expect(() => assertOwnerRole({ role: 'STAFF' as const }, 'Custom msg')).toThrow('Custom msg')
  })
})
