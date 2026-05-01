const mockDiagSetLogger = jest.fn()
const mockGetNodeAutoInstrumentations = jest.fn(() => ['auto-instrumentations'])
const mockResourceFromAttributes = jest.fn((attributes) => ({ attributes }))
const mockSentryGetClient = jest.fn(() => null)
const mockSentryValidateOpenTelemetrySetup = jest.fn()
const mockSentryContextManager = jest.fn(() => ({ type: 'sentry-context-manager' }))
const mockSentryPropagator = jest.fn(() => ({ type: 'sentry-propagator' }))
const mockSentrySampler = jest.fn((client) => ({ client, type: 'sentry-sampler' }))
const mockSentrySpanProcessor = jest.fn(() => ({ type: 'sentry-span-processor' }))

const mockTraceExporter = jest.fn((options) => ({ kind: 'trace-exporter', options }))
const mockMetricExporter = jest.fn((options) => ({ kind: 'metric-exporter', options }))
const mockLogExporter = jest.fn((options) => ({ kind: 'log-exporter', options }))

const mockBatchLogRecordProcessor = jest.fn((exporter) => ({ exporter, type: 'batch-log-processor' }))
const mockPeriodicExportingMetricReader = jest.fn((options) => ({ ...options, type: 'metric-reader' }))
const mockBatchSpanProcessor = jest.fn((exporter) => ({ exporter, type: 'batch-span-processor' }))

const mockTraceIdRatioBasedSampler = jest.fn((rate) => ({ rate, type: 'ratio-sampler' }))
const mockParentBasedSampler = jest.fn((options) => ({ ...options, type: 'parent-sampler' }))

const mockNodeSdkStart = jest.fn().mockResolvedValue(undefined)
const mockNodeSdkShutdown = jest.fn().mockResolvedValue(undefined)
const mockNodeSDK = jest.fn().mockImplementation((configuration) => ({
  configuration,
  start: mockNodeSdkStart,
  shutdown: mockNodeSdkShutdown,
}))

jest.mock('@opentelemetry/api', () => ({
  DiagConsoleLogger: jest.fn(),
  DiagLogLevel: { INFO: 'INFO' },
  diag: {
    setLogger: mockDiagSetLogger,
  },
}))

jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: mockGetNodeAutoInstrumentations,
}))

jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: mockTraceExporter,
}))

jest.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: mockMetricExporter,
}))

jest.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: mockLogExporter,
}))

jest.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: mockResourceFromAttributes,
}))

jest.mock('@opentelemetry/sdk-logs', () => ({
  BatchLogRecordProcessor: mockBatchLogRecordProcessor,
}))

jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: mockNodeSDK,
}))

jest.mock('@opentelemetry/sdk-metrics', () => ({
  PeriodicExportingMetricReader: mockPeriodicExportingMetricReader,
}))

jest.mock('@opentelemetry/sdk-trace-base', () => ({
  BatchSpanProcessor: mockBatchSpanProcessor,
  ParentBasedSampler: mockParentBasedSampler,
  TraceIdRatioBasedSampler: mockTraceIdRatioBasedSampler,
}))

jest.mock('@opentelemetry/semantic-conventions', () => ({
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT: 'deployment.environment.name',
  SEMRESATTRS_SERVICE_NAME: 'service.name',
  SEMRESATTRS_SERVICE_VERSION: 'service.version',
}))

jest.mock('@sentry/nestjs', () => ({
  getClient: mockSentryGetClient,
  validateOpenTelemetrySetup: mockSentryValidateOpenTelemetrySetup,
  SentryContextManager: mockSentryContextManager,
}))

jest.mock('@sentry/opentelemetry', () => ({
  SentryPropagator: mockSentryPropagator,
  SentrySampler: mockSentrySampler,
  SentrySpanProcessor: mockSentrySpanProcessor,
}))

function loadOtelModule() {
  jest.resetModules()
  return jest.requireActual('../src/common/utils/otel.util') as typeof import('../src/common/utils/otel.util')
}

describe('otel util', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.NODE_ENV
    mockSentryGetClient.mockReturnValue(null)
  })

  it('retorna false quando nenhum endpoint OTLP for informado', async () => {
    const { initializeApiOpenTelemetry } = loadOtelModule()

    await expect(initializeApiOpenTelemetry({})).resolves.toEqual({
      enabled: false,
      otlpLogsEnabled: false,
      otlpMetricsEnabled: false,
      otlpTracesEnabled: false,
      sentryBridgeEnabled: false,
    })

    expect(mockNodeSDK).not.toHaveBeenCalled()
    expect(mockNodeSdkStart).not.toHaveBeenCalled()
  })

  it('inicializa traces, metrics e logs com endpoint base e defaults seguros', async () => {
    const { initializeApiOpenTelemetry } = loadOtelModule()

    await expect(
      initializeApiOpenTelemetry({
        endpoint: 'https://otel.example.com/',
        headers: 'authorization=Bearer token,invalid,key-without-value=',
        diagnosticsEnabled: true,
        tracesSampleRate: '2',
        metricsExportIntervalMs: '0',
        serviceName: '   ',
        serviceVersion: '',
        environment: ' ',
      }),
    ).resolves.toEqual({
      enabled: true,
      otlpLogsEnabled: true,
      otlpMetricsEnabled: true,
      otlpTracesEnabled: true,
      sentryBridgeEnabled: false,
    })

    expect(mockDiagSetLogger).toHaveBeenCalledTimes(1)
    expect(mockResourceFromAttributes).toHaveBeenCalledWith({
      'service.name': 'desk-imperial-api',
      'service.version': '0.1.0',
      'deployment.environment.name': 'development',
    })
    expect(mockGetNodeAutoInstrumentations).toHaveBeenCalledWith({
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-fs': { enabled: false },
    })

    expect(mockTraceExporter).toHaveBeenCalledWith({
      url: 'https://otel.example.com/v1/traces',
      headers: { authorization: 'Bearer token' },
      timeoutMillis: 3_000,
    })
    expect(mockMetricExporter).toHaveBeenCalledWith({
      url: 'https://otel.example.com/v1/metrics',
      headers: { authorization: 'Bearer token' },
      timeoutMillis: 3_000,
    })
    expect(mockLogExporter).toHaveBeenCalledWith({
      url: 'https://otel.example.com/v1/logs',
      headers: { authorization: 'Bearer token' },
      timeoutMillis: 3_000,
    })
    expect(mockTraceIdRatioBasedSampler).toHaveBeenCalledWith(0.03)
    expect(mockPeriodicExportingMetricReader).toHaveBeenCalledWith(
      expect.objectContaining({
        exportIntervalMillis: 15_000,
        exportTimeoutMillis: 3_000,
      }),
    )
    expect(mockNodeSdkStart).toHaveBeenCalledTimes(1)
  })

  it('nao duplica inicializacao e respeita endpoints/sampler customizados', async () => {
    const { initializeApiOpenTelemetry } = loadOtelModule()

    await expect(
      initializeApiOpenTelemetry({
        tracesEndpoint: 'https://otel.example.com/v1/traces',
        metricsEndpoint: 'https://otel.example.com/v1/metrics',
        logsEndpoint: 'https://otel.example.com/v1/logs',
        tracesSampleRate: 0.75,
        metricsExportIntervalMs: 1234.8,
        serviceName: 'desk-imperial-api-prod',
        serviceVersion: '2.0.0',
        environment: 'production',
      }),
    ).resolves.toEqual({
      enabled: true,
      otlpLogsEnabled: true,
      otlpMetricsEnabled: true,
      otlpTracesEnabled: true,
      sentryBridgeEnabled: false,
    })

    await expect(
      initializeApiOpenTelemetry({
        tracesEndpoint: 'https://ignored.example.com/v1/traces',
      }),
    ).resolves.toEqual({
      enabled: true,
      otlpLogsEnabled: true,
      otlpMetricsEnabled: true,
      otlpTracesEnabled: true,
      sentryBridgeEnabled: false,
    })

    expect(mockTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://otel.example.com/v1/traces',
      }),
    )
    expect(mockMetricExporter).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://otel.example.com/v1/metrics',
      }),
    )
    expect(mockLogExporter).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://otel.example.com/v1/logs',
      }),
    )
    expect(mockTraceIdRatioBasedSampler).toHaveBeenCalledWith(0.75)
    expect(mockPeriodicExportingMetricReader).toHaveBeenCalledWith(
      expect.objectContaining({
        exportIntervalMillis: 1234,
      }),
    )
    expect(mockResourceFromAttributes).toHaveBeenCalledWith({
      'service.name': 'desk-imperial-api-prod',
      'service.version': '2.0.0',
      'deployment.environment.name': 'production',
    })
    expect(mockNodeSdkStart).toHaveBeenCalledTimes(1)
  })

  it('shutdown ignora estado nao inicializado e permite nova inicializacao apos parar', async () => {
    const { initializeApiOpenTelemetry, shutdownApiOpenTelemetry } = loadOtelModule()

    await expect(shutdownApiOpenTelemetry()).resolves.toBeUndefined()
    expect(mockNodeSdkShutdown).not.toHaveBeenCalled()

    await initializeApiOpenTelemetry({ tracesEndpoint: 'https://otel.example.com' })
    await shutdownApiOpenTelemetry()
    await initializeApiOpenTelemetry({ tracesEndpoint: 'https://otel.example.com' })

    expect(mockNodeSdkShutdown).toHaveBeenCalledTimes(1)
    expect(mockNodeSDK).toHaveBeenCalledTimes(2)
    expect(mockNodeSdkStart).toHaveBeenCalledTimes(2)
  })
})
