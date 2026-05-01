/**
 * Padrões de validação compartilhados entre API e Web
 * Mantém sincronização de regras de negócio em um único lugar
 */

/**
 * Regex para validação de senha forte
 * Requer: letra maiúscula, letra minúscula, número e caractere especial
 *
 * Exemplos válidos:
 * - Strong@Pass123
 * - MyP@ssw0rd
 * - Abc123!@#
 */
const STRONG_SECRET_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

/**
 * Mensagem padrão para validação de senha
 */
const STRONG_SECRET_POLICY_MESSAGE = 'A senha precisa ter letra maiúscula, minúscula, número e caractere especial.'

/**
 * Regex para validação de código de email (6 dígitos)
 */
export const EMAIL_CODE_REGEX = /^\d{6}$/

/**
 * Mensagem padrão para código de email
 */
export const EMAIL_CODE_MESSAGE = 'Digite o código de 6 dígitos enviado por e-mail.'

/**
 * Comprimento mínimo de senha
 */
const SECRET_POLICY_MIN_LENGTH = 12

/**
 * Comprimento máximo de senha
 */
const SECRET_POLICY_MAX_LENGTH = 128

export const STRONG_PASSWORD_REGEX = STRONG_SECRET_POLICY_REGEX
export const STRONG_PASSWORD_MESSAGE = STRONG_SECRET_POLICY_MESSAGE
export const PASSWORD_MIN_LENGTH = SECRET_POLICY_MIN_LENGTH
export const PASSWORD_MAX_LENGTH = SECRET_POLICY_MAX_LENGTH

export type DocumentType = 'cpf' | 'cnpj' | 'unknown'

export function sanitizeDocument(value: string) {
  return value.replace(/\D/g, '')
}

export function detectDocumentType(raw: string): DocumentType {
  const digits = sanitizeDocument(raw)
  if (digits.length === 11) {
    return 'cpf'
  }
  if (digits.length === 14) {
    return 'cnpj'
  }
  return 'unknown'
}

export function maskDocument(raw: string): string {
  const digits = sanitizeDocument(raw).slice(0, 14)
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
  const cpf = sanitizeDocument(raw)
  if (cpf.length !== 11) {
    return false
  }
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  let sum = 0
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index)
  }

  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) {
    remainder = 0
  }

  if (remainder !== Number(cpf[9])) {
    return false
  }

  sum = 0
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) {
    remainder = 0
  }

  return remainder === Number(cpf[10])
}

export function validateCnpj(raw: string): boolean {
  const cnpj = sanitizeDocument(raw)
  if (cnpj.length !== 14) {
    return false
  }
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false
  }

  const weightsFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weightsSecond = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let sum = 0
  for (let index = 0; index < 12; index += 1) {
    const digit = cnpj[index]
    const weight = weightsFirst[index]
    if (digit === undefined || weight === undefined) {
      return false
    }

    sum += Number(digit) * weight
  }

  let remainder = sum % 11
  const firstDigit = remainder < 2 ? 0 : 11 - remainder
  if (firstDigit !== Number(cnpj[12])) {
    return false
  }

  sum = 0
  for (let index = 0; index < 13; index += 1) {
    const digit = cnpj[index]
    const weight = weightsSecond[index]
    if (digit === undefined || weight === undefined) {
      return false
    }

    sum += Number(digit) * weight
  }

  remainder = sum % 11
  const secondDigit = remainder < 2 ? 0 : 11 - remainder

  return secondDigit === Number(cnpj[13])
}

export function validateDocument(raw: string): { valid: boolean; type: DocumentType; message?: string } {
  const digits = sanitizeDocument(raw)
  if (digits.length === 0) {
    return { valid: true, type: 'unknown' }
  }
  if (digits.length < 11) {
    return { valid: false, type: 'unknown', message: 'CPF incompleto (11 dígitos)' }
  }
  if (digits.length === 11) {
    return validateCpf(digits) ? { valid: true, type: 'cpf' } : { valid: false, type: 'cpf', message: 'CPF inválido' }
  }
  if (digits.length < 14) {
    return { valid: false, type: 'unknown', message: 'CNPJ incompleto (14 dígitos)' }
  }
  return validateCnpj(digits) ? { valid: true, type: 'cnpj' } : { valid: false, type: 'cnpj', message: 'CNPJ inválido' }
}
