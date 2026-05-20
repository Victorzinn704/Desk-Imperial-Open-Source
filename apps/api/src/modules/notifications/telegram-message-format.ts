type TelegramCurrency = 'BRL' | 'USD' | 'EUR'

export function escapeTelegramHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function boldTelegram(value: unknown) {
  return `<b>${escapeTelegramHtml(value)}</b>`
}

export function codeTelegram(value: unknown) {
  return `<code>${escapeTelegramHtml(value)}</code>`
}

export function metricLine(icon: string, label: string, value: unknown) {
  return `${icon} ${boldTelegram(`${label}:`)} ${escapeTelegramHtml(value)}`
}

export function bulletLine(icon: string, value: unknown) {
  return `${icon} ${escapeTelegramHtml(value)}`
}

export function formatTelegramCurrency(value: number, currency: TelegramCurrency) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency,
  })
}

export function formatTelegramPercent(value: number) {
  return `${value.toFixed(1).replace('.', ',')}%`
}

export function joinTelegramLines(lines: Array<string | null | undefined | false>) {
  return lines.filter(Boolean).join('\n')
}
