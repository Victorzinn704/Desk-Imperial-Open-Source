import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

describe('exportacao OTLP de logs', () => {
  it('envia um registro pelo processor e exporter reais para um coletor local', async () => {
    // O exporter usa import dinamico; um processo Node real evita as restricoes da VM do Jest.
    const result = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', join(__dirname, 'fixtures/otel-log-export.ts')],
      {
        cwd: join(__dirname, '..'),
        timeout: 60_000,
      },
    )

    expect(result.stdout).toContain('OTLP log export OK')
  }, 65_000)
})
