export { sanitizeDocument } from '../../../../../packages/types/src/validation-patterns'

import { validateCnpj, validateCpf } from '../../../../../packages/types/src/validation-patterns'

export function isValidCpf(value: string) {
  return validateCpf(value)
}

export function isValidCnpj(value: string) {
  return validateCnpj(value)
}
