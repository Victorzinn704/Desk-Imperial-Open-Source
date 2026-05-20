export const TELEGRAM_METRIC_NAMES = [
  'received',
  'sent',
  'errors',
  'rate_429',
  'drops_inbound',
  'drops_outbound',
  'retries_outbound',
] as const

export type TelegramMetricName = (typeof TELEGRAM_METRIC_NAMES)[number]
export type TelegramMetricsSnapshot = Record<TelegramMetricName, number>

export function buildEmptyTelegramMetrics(): TelegramMetricsSnapshot {
  return Object.fromEntries(TELEGRAM_METRIC_NAMES.map((name) => [name, 0])) as TelegramMetricsSnapshot
}

export function buildTelegramMetricKey(name: TelegramMetricName, bucket: number) {
  return `telegram:metrics:${name}:${bucket}`
}

export function buildTelegramMetricsSnapshot(values: Array<string | null>): TelegramMetricsSnapshot {
  return Object.fromEntries(
    TELEGRAM_METRIC_NAMES.map((name, index) => [name, Number(values[index] ?? 0)]),
  ) as TelegramMetricsSnapshot
}
