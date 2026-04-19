import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { generateApiOpenApiDocument } from '../src/common/openapi/document'

async function main() {
  const outputPath = resolve(process.cwd(), '../../packages/api-contract/openapi.json')
  const document = generateApiOpenApiDocument()

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')

  process.stdout.write(`OpenAPI spec written to ${outputPath}\n`)
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  process.exitCode = 1
})

