import { ApiError } from '@/lib/api'

const CASH_REQUIRED_PATTERNS = [
  'abra o caixa',
  'abrir o proprio caixa',
  'caixa do funcionario',
  'caixa aberto',
  'caixa operacional',
] as const

export function isCashSessionRequiredError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  const matchesMessage = CASH_REQUIRED_PATTERNS.some((pattern) => message.includes(pattern))

  if (!matchesMessage) {
    return false
  }

  return !(error instanceof ApiError) || error.status === 409 || error.status === 400
}
