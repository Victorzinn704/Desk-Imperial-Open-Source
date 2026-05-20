declare module 'qz-tray' {
  type QzPrintData =
    | string
    | {
        data: string
        type?: 'raw' | 'pixel'
        format?: string
        flavor?: string
        options?: Record<string, unknown>
      }

  type QzConfig = {
    getPrinter(): unknown
    getOptions(): unknown
  }

  type QzTray = {
    websocket: {
      connect(options?: Record<string, unknown>): Promise<void>
      disconnect(): Promise<void>
      isActive(): boolean
    }
    printers: {
      find(query?: string): Promise<string[] | string>
      getDefault(): Promise<string>
      details?(): Promise<Array<Record<string, unknown>> | Record<string, unknown>>
    }
    configs: {
      create(printer: string | { name: string }, options?: Record<string, unknown>): QzConfig
    }
    security: {
      setCertificatePromise(
        handler:
          | Promise<string | null>
          | ((resolve: (value: string | null) => void, reject: (reason?: unknown) => void) => void),
        options?: { rejectOnFailure?: boolean },
      ): void
      setSignaturePromise(
        handler: (
          toSign: string,
        ) => ((resolve: (value?: string) => void, reject: (reason?: unknown) => void) => void) | Promise<string | void>,
      ): void
      setSignatureAlgorithm(algorithm: 'SHA1' | 'SHA256' | 'SHA512'): void
    }
    serial?: {
      findPorts(): Promise<string[] | string>
      openPort(port: string, options?: Record<string, unknown>): Promise<void>
      sendData(
        port: string,
        data:
          | string
          | {
              type?: 'PLAIN' | 'FILE' | 'HEX' | 'BASE64'
              data: string | string[]
            },
        options?: Record<string, unknown>,
      ): Promise<void>
      closePort(port: string): Promise<void>
    }
    print(config: QzConfig, data: QzPrintData[]): Promise<void>
  }

  const qz: QzTray
  export = qz
}
