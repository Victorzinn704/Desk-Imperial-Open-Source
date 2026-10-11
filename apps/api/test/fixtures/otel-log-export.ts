import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { LoggerProvider } from '@opentelemetry/sdk-logs'
import {
  buildApiOpenTelemetrySdkConfiguration,
  resolveApiOpenTelemetrySettings,
  resolveApiOpenTelemetrySignals,
} from '../../src/common/utils/otel-sdk-config.util'

type OtlpPayload = {
  resourceLogs: Array<{
    scopeLogs: Array<{ logRecords: Array<{ body: { stringValue: string }; severityText: string }> }>
  }>
}

async function verifyLogExport() {
  const requests: Array<{ url: string | undefined; header: string | string[] | undefined; body: string }> = []
  const server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      requests.push({
        url: request.url,
        header: request.headers['x-test-collector'],
        body: Buffer.concat(chunks).toString('utf8'),
      })
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end('{}')
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

  let provider: LoggerProvider | undefined
  try {
    const options = {
      logsEndpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      headers: 'x-test-collector=local-only',
      serviceName: 'desk-otel-regression',
    }
    const configuration = buildApiOpenTelemetrySdkConfiguration(
      options,
      resolveApiOpenTelemetrySignals(options),
      resolveApiOpenTelemetrySettings(options),
    )
    assert.ok(configuration.resource, 'Configuracao OTLP sem resource')
    assert.ok(configuration.logRecordProcessors?.length, 'Configuracao OTLP sem processors de logs')
    provider = new LoggerProvider({
      resource: configuration.resource,
      processors: configuration.logRecordProcessors,
    })
    provider.getLogger('regression').emit({ body: 'registro de verificacao', severityText: 'INFO' })
    await provider.forceFlush()

    assert.equal(requests.length, 1)
    const received = requests[0]
    assert.ok(received, 'Coletor local nao recebeu o registro OTLP')
    assert.equal(received.url, '/v1/logs')
    assert.equal(received.header, 'local-only')
    const payload = JSON.parse(received.body) as OtlpPayload
    const records = payload.resourceLogs.flatMap((resource) => resource.scopeLogs.flatMap((scope) => scope.logRecords))
    assert.equal(records.length, 1)
    assert.deepEqual(records[0]?.body, { stringValue: 'registro de verificacao' })
    assert.equal(records[0]?.severityText, 'INFO')
    process.stdout.write('OTLP log export OK\n')
  } finally {
    try {
      await provider?.shutdown()
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  }
}

verifyLogExport().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`)
  process.exitCode = 1
})
