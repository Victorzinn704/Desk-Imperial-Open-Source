import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'

const DEFAULT_REALTIME_DELIVERY_P95_THRESHOLD_MS = 500
const DEFAULT_REALTIME_PAINT_P95_THRESHOLD_MS = 150
const DEFAULT_REALTIME_PROCESS_P95_THRESHOLD_MS = 80

export function createMobilePerformanceReporter({ argv, env }) {
  const cliOptions = parseCliOptions(argv)
  const strictMode = cliOptions.strict || env.DESK_SMOKE_STRICT === 'true'
  const reportPath = resolveReportPath(cliOptions.reportPath, env)
  const reportFormat = resolveReportFormat(cliOptions.reportFormat, reportPath, env)
  const thresholds = {
    realtimeDeliveryP95Ms: parsePositiveInteger(
      env.DESK_SMOKE_REALTIME_DELIVERY_P95_MS,
      DEFAULT_REALTIME_DELIVERY_P95_THRESHOLD_MS,
    ),
    realtimePaintP95Ms: parsePositiveInteger(
      env.DESK_SMOKE_REALTIME_PAINT_P95_MS,
      DEFAULT_REALTIME_PAINT_P95_THRESHOLD_MS,
    ),
    realtimeProcessP95Ms: parsePositiveInteger(
      env.DESK_SMOKE_REALTIME_PROCESS_P95_MS,
      DEFAULT_REALTIME_PROCESS_P95_THRESHOLD_MS,
    ),
  }

  return {
    assertBudget: (result) => assertMobileSmokeBudget({ result, strictMode }),
    buildResult: (summary) => buildMobileSmokeResult({ strictMode, summary, thresholds }),
    print: printMobileSmokeSummary,
    writeIfRequested: (result) => writeMobileSmokeReportIfRequested({ reportFormat, reportPath, result }),
  }
}

export function summarizeRealtimeEvents({ dropped, outOfOrder, realtimeEvents, reconnects }) {
  const deliveryDelays = realtimeEvents
    .map((event) => event.deliveryDelayMs)
    .filter((value) => Number.isFinite(value))
    .sort(sortNumber)
  const paintDelays = realtimeEvents
    .map((event) => event.paintDelayMs)
    .filter(Number.isFinite)
    .sort(sortNumber)
  const processDurations = realtimeEvents
    .map((event) => event.durationMs)
    .filter(Number.isFinite)
    .sort(sortNumber)

  return {
    deliveryP95Ms: percentile(deliveryDelays, 0.95),
    dropped,
    eventCount: realtimeEvents.length,
    needsRefreshCount: realtimeEvents.filter(hasRealtimeRefreshDebt).length,
    outOfOrder,
    paintP95Ms: percentile(paintDelays, 0.95),
    patchedCount: realtimeEvents.filter(hasRealtimePatch).length,
    processP95Ms: percentile(processDurations, 0.95),
    reconnectErrors: reconnects.filter((event) => event.status === 'error').length,
  }
}

function buildMobileSmokeResult({ strictMode, summary, thresholds }) {
  const surfaces = collectMeasuredSurfaces(summary).map((surface) => classifyMeasuredSurface({ surface, thresholds }))
  const failing = surfaces.filter((surface) => surface.status === 'SLOW')
  const attention = surfaces.filter((surface) => surface.status === 'ATTENTION')

  return {
    ...summary,
    failing: failing.map((surface) => `${surface.flow}/${surface.name}`),
    generatedAt: new Date().toISOString(),
    status: failing.length > 0 ? 'SLOW' : attention.length > 0 ? 'ATTENTION' : 'OK',
    strictMode,
    surfaces,
    thresholds,
  }
}

function collectMeasuredSurfaces(summary) {
  return [
    { flow: 'owner', metrics: summary.ownerFlow?.pageMetrics, name: 'owner-page' },
    { flow: 'staff-kitchen', metrics: summary.staffFlow?.ownerObserverMetrics, name: 'owner-observer-page' },
    { flow: 'staff-kitchen', metrics: summary.staffFlow?.staffPageMetrics, name: 'staff-page' },
  ].filter((surface) => surface.metrics)
}

function classifyMeasuredSurface({ surface, thresholds }) {
  const realtime = surface.metrics.realtime
  const status = classifyRealtimeHealth({ realtime, thresholds })

  return {
    ...surface,
    reasons: buildRealtimeHealthReasons({ realtime, status, thresholds }),
    status,
  }
}

function classifyRealtimeHealth({ realtime, thresholds }) {
  if (realtime.eventCount === 0) {
    return 'SLOW'
  }

  if (hasCriticalRealtimeDebt({ realtime, thresholds })) {
    return 'SLOW'
  }

  return realtime.needsRefreshCount > 0 ? 'ATTENTION' : 'OK'
}

function hasCriticalRealtimeDebt({ realtime, thresholds }) {
  return (
    realtime.deliveryP95Ms > thresholds.realtimeDeliveryP95Ms ||
    realtime.paintP95Ms > thresholds.realtimePaintP95Ms ||
    realtime.processP95Ms > thresholds.realtimeProcessP95Ms ||
    realtime.dropped > 0 ||
    realtime.outOfOrder > 0 ||
    realtime.reconnectErrors > 0
  )
}

function buildRealtimeHealthReasons({ realtime, status, thresholds }) {
  const reasons = [
    realtime.eventCount === 0 ? 'nenhum envelope realtime processado' : '',
    formatThresholdReason('delivery p95', realtime.deliveryP95Ms, thresholds.realtimeDeliveryP95Ms),
    formatThresholdReason('paint p95', realtime.paintP95Ms, thresholds.realtimePaintP95Ms),
    formatThresholdReason('process p95', realtime.processP95Ms, thresholds.realtimeProcessP95Ms),
    realtime.dropped > 0 ? `${realtime.dropped} envelopes descartados` : '',
    realtime.outOfOrder > 0 ? `${realtime.outOfOrder} envelopes fora de ordem` : '',
    realtime.reconnectErrors > 0 ? `${realtime.reconnectErrors} reconnects com erro` : '',
    realtime.needsRefreshCount > 0 ? `${realtime.needsRefreshCount} envelopes dependeram de refresh REST` : '',
  ].filter(Boolean)

  return reasons.length > 0 ? reasons : [`realtime ${status.toLowerCase()}`]
}

function formatThresholdReason(label, value, threshold) {
  return value > threshold ? `${label} ${value}ms > ${threshold}ms` : ''
}

async function writeMobileSmokeReportIfRequested({ reportFormat, reportPath, result }) {
  if (!reportPath) {
    return
  }

  const content = reportFormat === 'json' ? `${JSON.stringify(result, null, 2)}\n` : buildMarkdownReport(result)
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, content, 'utf8')
  console.log(`[mobile-perf] report_written=${reportPath}`)
}

function buildMarkdownReport(result) {
  return [
    '# Baseline Mobile/PWA - Operacoes',
    '',
    `Data: ${result.generatedAt}`,
    `App: \`${result.appBaseUrl}\``,
    `API: \`${result.apiBaseUrl}\``,
    `Modo estrito: ${result.strictMode ? 'sim' : 'nao'}`,
    '',
    '## Resultado',
    '',
    '| Status | Fluxo | Superficie | eventos | delivery p95 | paint p95 | process p95 | refresh REST | drops |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...result.surfaces.map(formatSurfaceMarkdownRow),
    '',
    '## Leitura rapida',
    '',
    ...buildMarkdownFindings(result),
    '',
  ].join('\n')
}

function formatSurfaceMarkdownRow(surface) {
  const realtime = surface.metrics.realtime
  return [
    surface.status,
    surface.flow,
    surface.name,
    realtime.eventCount,
    `${realtime.deliveryP95Ms}ms`,
    `${realtime.paintP95Ms}ms`,
    `${realtime.processP95Ms}ms`,
    realtime.needsRefreshCount,
    realtime.dropped,
  ].join(' | ')
}

function buildMarkdownFindings(result) {
  if (result.failing.length === 0) {
    return ['- Nenhuma superficie medida estourou o orcamento realtime desta rodada.']
  }

  return result.surfaces
    .filter((surface) => surface.status === 'SLOW')
    .flatMap((surface) => surface.reasons.map((reason) => `- **${surface.flow}/${surface.name}:** ${reason}.`))
}

function printMobileSmokeSummary(result) {
  console.log(
    `[mobile-perf] status=${result.status} app=${result.appBaseUrl} api=${result.apiBaseUrl} strict=${result.strictMode}`,
  )
  for (const surface of result.surfaces) {
    printSurfaceSummary(surface)
  }
  console.log(JSON.stringify(result, null, 2))
}

function printSurfaceSummary(surface) {
  const realtime = surface.metrics.realtime
  console.log(
    `[mobile-perf] ${surface.status} ${surface.flow}/${surface.name} events=${realtime.eventCount} delivery_p95=${realtime.deliveryP95Ms}ms paint_p95=${realtime.paintP95Ms}ms process_p95=${realtime.processP95Ms}ms refresh=${realtime.needsRefreshCount} drops=${realtime.dropped}`,
  )
}

function assertMobileSmokeBudget({ result, strictMode }) {
  if (!strictMode || result.failing.length === 0) {
    return
  }

  throw new Error(`Mobile operations smoke failed: ${result.failing.join(', ')}`)
}

function hasRealtimeRefreshDebt(event) {
  return event.liveNeedsRefresh || event.kitchenNeedsRefresh || event.summaryNeedsRefresh
}

function hasRealtimePatch(event) {
  return event.livePatched || event.kitchenPatched || event.summaryPatched
}

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0
  }

  const index = Math.min(values.length - 1, Math.ceil(values.length * percentileValue) - 1)
  return values[Math.max(0, index)]
}

function sortNumber(left, right) {
  return left - right
}

function parseCliOptions(argv) {
  const options = { reportFormat: '', reportPath: '', strict: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--strict') {
      options.strict = true
      continue
    }
    if (arg === '--report') {
      options.reportPath = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--report=')) {
      options.reportPath = arg.slice('--report='.length)
      continue
    }
    if (arg.startsWith('--report-format=')) {
      options.reportFormat = arg.slice('--report-format='.length)
    }
  }

  return options
}

function resolveReportPath(cliReportPath, env) {
  const rawPath = cliReportPath || env.DESK_SMOKE_REPORT_PATH?.trim() || ''
  return rawPath ? resolve(rawPath) : ''
}

function resolveReportFormat(cliReportFormat, reportPath, env) {
  const requested = cliReportFormat || env.DESK_SMOKE_REPORT_FORMAT?.trim() || ''
  if (requested === 'json' || requested === 'markdown') {
    return requested
  }

  return extname(reportPath).toLowerCase() === '.json' ? 'json' : 'markdown'
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
