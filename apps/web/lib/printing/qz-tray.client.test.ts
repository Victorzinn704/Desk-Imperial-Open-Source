import { beforeEach, describe, expect, it, vi } from 'vitest'

const qzMock = vi.hoisted(() => {
  const websocket = {
    isActive: vi.fn(() => false),
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
  }

  const printers = {
    getDefault: vi.fn(async () => 'Caixa 01'),
    find: vi.fn(async () => ['Caixa 01', 'Cozinha']),
  }

  const configs = {
    create: vi.fn((printerName: string, options: Record<string, unknown>) => ({ printerName, options })),
  }

  const serial = {
    findPorts: vi.fn(async () => ['COM3', 'COM4']),
    openPort: vi.fn(async () => undefined),
    sendData: vi.fn(async () => undefined),
    closePort: vi.fn(async () => undefined),
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
    serial,
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
    qzMock.websocket.connect.mockReset()
    qzMock.websocket.connect.mockResolvedValue(undefined)
    qzMock.websocket.disconnect.mockReset()
    qzMock.websocket.disconnect.mockResolvedValue(undefined)
    qzMock.printers.getDefault.mockClear()
    qzMock.printers.find.mockClear()
    qzMock.configs.create.mockClear()
    qzMock.serial.findPorts.mockClear()
    qzMock.serial.openPort.mockClear()
    qzMock.serial.sendData.mockClear()
    qzMock.serial.closePort.mockClear()
    qzMock.print.mockClear()
    qzMock.security.setCertificatePromise.mockClear()
    qzMock.security.setSignaturePromise.mockClear()
    qzMock.security.setSignatureAlgorithm.mockClear()
    window.localStorage.clear()
    vi.resetModules()
  })

  it('connects only when websocket is inactive before listing QZ targets', async () => {
    const { listQzTrayPrinters } = await import('./qz-tray.client')

    const printers = await listQzTrayPrinters()

    expect(qzMock.websocket.connect).toHaveBeenCalledTimes(1)
    expect(qzMock.printers.find).toHaveBeenCalledTimes(1)
    expect(qzMock.serial.findPorts).toHaveBeenCalledTimes(1)
    expect(qzMock.websocket.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        retries: 5,
        delay: 0.5,
      }),
    )
    expect(printers).toEqual([
      expect.objectContaining({
        id: 'qz-serial:COM3',
        name: 'Porta serial COM3',
        transport: 'serial',
        target: 'COM3',
        isDefault: true,
      }),
      expect.objectContaining({
        id: 'qz-serial:COM4',
        name: 'Porta serial COM4',
        transport: 'serial',
        target: 'COM4',
      }),
      expect.objectContaining({
        id: 'qz-queue:Caixa 01',
        name: 'Caixa 01',
        transport: 'queue',
        isDefault: false,
      }),
      expect.objectContaining({
        id: 'qz-queue:Cozinha',
        name: 'Cozinha',
        transport: 'queue',
      }),
    ])
  })

  it('reuses active websocket connection before printing to a Windows queue', async () => {
    qzMock.websocket.isActive.mockReturnValue(true)
    const { printRawQzTrayJob } = await import('./qz-tray.client')

    await printRawQzTrayJob('qz-queue:Caixa 01', 'RAW-DOC')

    expect(qzMock.websocket.connect).not.toHaveBeenCalled()
    expect(qzMock.configs.create).toHaveBeenCalledWith('Caixa 01', {
      encoding: 'CP437',
      copies: 1,
    })
    expect(qzMock.print).toHaveBeenCalledTimes(1)
    expect(qzMock.print).toHaveBeenCalledWith(expect.any(Object), [
      expect.objectContaining({ type: 'raw', format: 'command', flavor: 'plain', data: 'RAW-DOC' }),
    ])
  })

  it('sends raw ticket directly to a serial port target', async () => {
    qzMock.websocket.isActive.mockReturnValue(true)
    const { printRawQzTrayJob } = await import('./qz-tray.client')

    await printRawQzTrayJob('qz-serial:COM3', 'RAW-DOC')

    expect(qzMock.configs.create).not.toHaveBeenCalled()
    expect(qzMock.print).not.toHaveBeenCalled()
    expect(qzMock.serial.openPort).toHaveBeenCalledWith(
      'COM3',
      expect.objectContaining({
        baudRate: 9600,
        parity: 'NONE',
      }),
    )
    expect(qzMock.serial.sendData).toHaveBeenCalledWith(
      'COM3',
      expect.objectContaining({
        type: 'HEX',
        data: '5241572d444f43',
      }),
    )
    expect(qzMock.serial.closePort).toHaveBeenCalledTimes(2)
    expect(qzMock.serial.closePort.mock.invocationCallOrder[0]).toBeLessThan(
      qzMock.serial.openPort.mock.invocationCallOrder[0],
    )
  })

  it('normalizes mobile QZ host input before connecting', async () => {
    const { listQzTrayPrinters, setQzHost } = await import('./qz-tray.client')

    setQzHost('https://192.168.1.10:8181/qz')
    await listQzTrayPrinters()

    expect(qzMock.websocket.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        host: '192.168.1.10',
      }),
    )
  })

  it('normalizes ws host variants and known QZ ports safely', async () => {
    const { listQzTrayPrinters, setQzHost } = await import('./qz-tray.client')

    setQzHost('ws://localhost.qz.io:8485/path/to/socket')
    await listQzTrayPrinters()

    expect(qzMock.websocket.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'localhost.qz.io',
      }),
    )
  })

  it('reconnects when the configured QZ host changes during the session', async () => {
    let active = true
    qzMock.websocket.isActive.mockImplementation(() => active)
    qzMock.websocket.disconnect.mockImplementation(async () => {
      active = false
    })
    qzMock.websocket.connect.mockImplementation(async () => {
      active = true
    })
    const { listQzTrayPrinters, setQzHost } = await import('./qz-tray.client')

    setQzHost('localhost')
    await listQzTrayPrinters()
    setQzHost('192.168.1.10')
    await listQzTrayPrinters()

    expect(qzMock.websocket.disconnect).toHaveBeenCalledTimes(1)
    expect(qzMock.websocket.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        host: '192.168.1.10',
      }),
    )
  })

  it('falls back to localhost when a remote host is stale on the desktop flow', async () => {
    qzMock.websocket.connect
      .mockRejectedValueOnce(new Error('remote host unreachable'))
      .mockResolvedValueOnce(undefined)

    const { listQzTrayPrinters, setQzHost } = await import('./qz-tray.client')

    setQzHost('192.168.1.10')
    await listQzTrayPrinters()

    expect(qzMock.websocket.connect).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        host: '192.168.1.10',
      }),
    )
    expect(qzMock.websocket.connect).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        host: 'localhost',
      }),
    )
  })
})
