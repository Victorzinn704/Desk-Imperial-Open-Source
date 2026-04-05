import { beforeEach, describe, expect, it, vi } from 'vitest'

const qzMock = vi.hoisted(() => {
  const websocket = {
    isActive: vi.fn(() => false),
    connect: vi.fn(async () => undefined),
  }

  const printers = {
    getDefault: vi.fn(async () => 'Caixa 01'),
    find: vi.fn(async () => ['Caixa 01', 'Cozinha']),
  }

  const configs = {
    create: vi.fn((printerName: string, options: Record<string, unknown>) => ({ printerName, options })),
  }

  const print = vi.fn(async () => undefined)
  const security = {
    setCertificatePromise: vi.fn(),
    setSignaturePromise: vi.fn(),
    setSignatureAlgorithm: vi.fn(),
  }

  return {
    websocket,
    printers,
    configs,
    print,
    security,
  }
})

vi.mock('qz-tray', () => ({
  default: qzMock,
}))

describe('qz-tray client', () => {
  beforeEach(() => {
    qzMock.websocket.isActive.mockReset()
    qzMock.websocket.isActive.mockReturnValue(false)
    qzMock.websocket.connect.mockClear()
    qzMock.printers.getDefault.mockClear()
    qzMock.printers.find.mockClear()
    qzMock.configs.create.mockClear()
    qzMock.print.mockClear()
    qzMock.security.setCertificatePromise.mockClear()
    qzMock.security.setSignaturePromise.mockClear()
    qzMock.security.setSignatureAlgorithm.mockClear()
    vi.resetModules()
  })

  it('connects only when websocket is inactive before listing printers', async () => {
    const { listQzTrayPrinters } = await import('./qz-tray.client')

    await listQzTrayPrinters()

    expect(qzMock.websocket.connect).toHaveBeenCalledTimes(1)
    expect(qzMock.printers.find).toHaveBeenCalledTimes(1)
  })

  it('reuses active websocket connection before printing', async () => {
    qzMock.websocket.isActive.mockReturnValue(true)
    const { printRawQzTrayJob } = await import('./qz-tray.client')

    await printRawQzTrayJob('Caixa 01', 'RAW-DOC')

    expect(qzMock.websocket.connect).not.toHaveBeenCalled()
    expect(qzMock.configs.create).toHaveBeenCalledWith('Caixa 01', {
      encoding: 'CP437',
      copies: 1,
    })
    expect(qzMock.print).toHaveBeenCalledTimes(1)
  })
})
