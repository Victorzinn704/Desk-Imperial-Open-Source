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

  return 'Não informado'
}

export function maskBuyerDocument(document: string | null | undefined) {
  if (!document) {
    return 'Documento não informado'
  }

  const digits = document.replace(/\D/g, '')

  // CPF: mostra apenas 3 primeiros e 2 últimos dígitos — padrão LGPD
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`
  }

  // CNPJ: mostra apenas 2 primeiros e 2 últimos dígitos — padrão LGPD
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.***.***/****-${digits.slice(12)}`
  }

  return '***'
}
