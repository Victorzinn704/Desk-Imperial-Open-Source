export function formatAccountStatus(status: string) {
  const normalized = status.trim().toUpperCase()

  if (normalized === 'ACTIVE') {
    return 'Ativo'
  }

  if (normalized === 'DISABLED') {
    return 'Desabilitado'
  }

  return normalized.toLowerCase().replaceAll('_', ' ')
}

export function formatBuyerType(type: 'PERSON' | 'COMPANY' | null | undefined) {
  if (type === 'PERSON') {
    return 'Pessoa'
  }

  if (type === 'COMPANY') {
    return 'Empresa'
  }

  return 'Nao informado'
}

export function maskBuyerDocument(document: string | null | undefined) {
  if (!document) {
    return 'Documento nao informado'
  }

  const digits = document.replace(/\D/g, '')

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  return digits
}
