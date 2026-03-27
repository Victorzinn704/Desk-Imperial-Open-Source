import { BadRequestException } from '@nestjs/common'

// Covers ASCII <>, fullwidth ＜＞ (U+FF1C, U+FF1E), and HTML angle-bracket lookalikes
const htmlLikePattern = /[<>\uFF1C\uFF1E]/
const spreadsheetFormulaPattern = /^[=+@-]/
const whitespacePattern = /\s+/g
// Bidi override / isolate chars that could spoof displayed text direction
const bidiOverridePattern = /[\u200F\u200E\u202A-\u202E\u2066-\u2069]/g

export function sanitizePlainText(
  value: string | null | undefined,
  fieldLabel: string,
  options?: {
    allowEmpty?: boolean
    rejectFormula?: boolean
  },
) {
  const normalized = normalizePlainText((value ?? '').replace(bidiOverridePattern, ''))

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
