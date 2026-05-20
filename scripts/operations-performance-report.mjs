import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function writePerformanceReportIfRequested({ failing, format, reportPath, results, run }) {
  if (!reportPath) {
    return
  }

  const content =
    format === 'json' ? buildJsonReport({ failing, results, run }) : buildMarkdownReport({ failing, results, run })
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, content, 'utf8')
  console.log(`[perf] report_written=${reportPath}`)
}

export function classifyPerformanceSample(sample) {
  if (sample.p95ThresholdMs != null && sample.p95Ms > sample.p95ThresholdMs) {
    return 'SLOW'
  }

  if (sample.targetP95Ms != null && sample.p95Ms > sample.targetP95Ms) {
    return 'ATTENTION'
  }

  return 'OK'
}

export function formatBytes(value) {
  if (value < 1024) {
    return `${value}B`
  }

  return `${Math.round(value / 1024)}KB`
}

function buildJsonReport(args) {
  return `${JSON.stringify(buildReportModel(args), null, 2)}\n`
}

function buildMarkdownReport(args) {
  const model = buildReportModel(args)
  return [
    '# Baseline de Performance - Operacoes',
    '',
    `Data: ${model.generatedAt}`,
    `Base URL: \`${model.baseUrl}\``,
    `Iteracoes: ${model.iterations} (warmup: ${model.warmupIterations})`,
    `Modo estrito: ${model.strictMode ? 'sim' : 'nao'}`,
    '',
    '## Resultado',
    '',
    '| Status | Endpoint | p50 | p95 | p99 | alvo p95 | threshold estrito | payload p95 | shape |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...model.results.map(formatMarkdownRow),
    '',
    '## Leitura rapida',
    '',
    ...buildMarkdownFindings(model),
    '',
    '## Proximo ataque recomendado',
    '',
    ...buildMarkdownNextSteps(model),
    '',
  ].join('\n')
}

function buildReportModel({ failing, results, run }) {
  return {
    ...run,
    failing: failing.map((sample) => sample.name),
    generatedAt: new Date().toISOString(),
    results: results.map(toReportSample),
  }
}

function toReportSample(sample) {
  return {
    ...sample,
    payloadP95Label: formatBytes(sample.payloadP95Bytes),
    statusLabel: classifyPerformanceSample(sample),
  }
}

function formatMarkdownRow(sample) {
  return [
    sample.statusLabel,
    `\`${sample.name}\``,
    `${sample.p50Ms}ms`,
    `${sample.p95Ms}ms`,
    `${sample.p99Ms}ms`,
    sample.targetP95Ms == null ? '-' : `${sample.targetP95Ms}ms`,
    sample.p95ThresholdMs == null ? '-' : `${sample.p95ThresholdMs}ms`,
    sample.payloadP95Label,
    sample.shape,
  ].join(' | ')
}

function buildMarkdownFindings(model) {
  if (model.failing.length > 0) {
    return model.failing.map((name) => `- **Critico:** \`${name}\` estourou o threshold estrito.`)
  }

  const attention = model.results.filter((sample) => sample.statusLabel === 'ATTENTION')
  if (attention.length > 0) {
    return attention.map((sample) => `- **Atencao:** \`${sample.name}\` passou no gate, mas ficou acima do alvo p95.`)
  }

  return ['- Todos os endpoints medidos ficaram dentro do alvo desta rodada.']
}

function buildMarkdownNextSteps(model) {
  const slowNames = new Set(model.results.filter((sample) => sample.statusLabel !== 'OK').map((sample) => sample.name))
  const nextSteps = [
    slowNames.has('operations-live-compact')
      ? '- Priorizar snapshot compacto: cache hit, queries de mesas/comandas e tamanho do payload do salao/PWA.'
      : '',
    slowNames.has('operations-live-full')
      ? '- Separar caixa/movimentos do live padrao; payload completo nao deve bloquear a tela principal.'
      : '',
    slowNames.has('operations-kitchen')
      ? '- Priorizar cozinha: query de itens, cache de 20s e evento obrigatorio de item de comida ao nascer.'
      : '',
    slowNames.has('operations-summary')
      ? '- Revisar resumo executivo para nao competir com o caminho quente de comanda.'
      : '',
    slowNames.has('health')
      ? '- Investigar infra antes da aplicacao: rede, banco, Redis e saturacao do processo API.'
      : '',
  ].filter(Boolean)

  return nextSteps.length > 0
    ? nextSteps
    : ['- Proxima rodada: medir mutacao -> primeiro envelope realtime -> paint no PWA.']
}
