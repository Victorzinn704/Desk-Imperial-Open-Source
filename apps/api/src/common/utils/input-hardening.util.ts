import { BadRequestException } from '@nestjs/common'

const htmlLikePattern = /[<>]/
const spreadsheetFormulaPattern = /^[=+@-]/
const whitespacePattern = /\s+/g

export function sanitizePlainText(
  value: string | null | undefined,
  fieldLabel: string,
  options?: {
    allowEmpty?: boolean
    rejectFormula?: boolean
  },
) {
  const normalized = normalizePlainText(value ?? '')

  if (!normalized) {
    if (options?.allowEmpty ?? true) {
      return null
    }

    throw new BadRequestException(`${fieldLabel} e obrigatorio.`)
  }

  if (htmlLikePattern.test(normalized)) {
    throw new BadRequestException(`${fieldLabel} nao pode conter marcacao HTML.`)
  }

  if ((options?.rejectFormula ?? false) && spreadsheetFormulaPattern.test(normalized)) {
    throw new BadRequestException(`${fieldLabel} nao pode comecar com simbolos reservados.`)
  }

  return normalized
}

function normalizePlainText(value: string) {
  let sanitized = ''

  for (const character of value) {
    const charCode = character.charCodeAt(0)
    const isControlCharacter = (charCode >= 0 && charCode <= 31) || charCode === 127
    sanitized += isControlCharacter ? ' ' : character
  }

  return sanitized.replace(whitespacePattern, ' ').trim()
}
