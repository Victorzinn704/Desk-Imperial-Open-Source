/**
 * CPF/CNPJ validation and masking — pure JS, no external libs.
 */

export type DocumentType = 'cpf' | 'cnpj' | 'unknown'

export function detectDocumentType(raw: string): DocumentType {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 11) return digits.length === 11 ? 'cpf' : 'unknown'
  if (digits.length === 14) return 'cnpj'
  return 'unknown'
}

export function maskDocument(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
}

export function validateCpf(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i)
  let rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== Number(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  return rest === Number(cpf[10])
}

export function validateCnpj(raw: string): boolean {
  const cnpj = raw.replace(/\D/g, '')
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const calc = (s: string, w: number[]) => {
    let sum = 0
    for (let i = 0; i < w.length; i++) sum += Number(s[i]) * w[i]
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const d1 = calc(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  if (d1 !== Number(cnpj[12])) return false
  const d2 = calc(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return d2 === Number(cnpj[13])
}

export function validateDocument(raw: string): { valid: boolean; type: DocumentType; message?: string } {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return { valid: true, type: 'unknown' }
  if (digits.length < 11) return { valid: false, type: 'unknown', message: 'CPF incompleto (11 dígitos)' }
  if (digits.length === 11) {
    return validateCpf(digits) ? { valid: true, type: 'cpf' } : { valid: false, type: 'cpf', message: 'CPF inválido' }
  }
  if (digits.length < 14) return { valid: false, type: 'unknown', message: 'CNPJ incompleto (14 dígitos)' }
  return validateCnpj(digits) ? { valid: true, type: 'cnpj' } : { valid: false, type: 'cnpj', message: 'CNPJ inválido' }
}
