import { request } from 'node:http'
import { spawn } from 'node:child_process'

function checkLocalApi() {
  return new Promise((resolve) => {
    const req = request(
      'http://127.0.0.1:4000/api/health',
      {
        method: 'GET',
        timeout: 1200,
      },
      (res) => {
        res.resume()
        resolve(res.statusCode !== undefined && res.statusCode < 500)
      },
    )

    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })

    req.on('error', () => resolve(false))
    req.end()
  })
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

async function main() {
  const apiRunning = await checkLocalApi()

  if (apiRunning) {
    console.error(
      [
        '[local-backend] A API local parece estar ativa em http://localhost:4000.',
        '[local-backend] Pare a API antes de rodar `npm run local:backend:prepare`.',
        '[local-backend] No Windows, o Prisma Client pode travar o query engine durante o generate.',
        '[local-backend] Se você só precisa reidratar os dados demo, use `npm run local:backend:sync-demo`.',
      ].join('\n'),
    )
    process.exit(1)
  }

  try {
    await run('npm', ['--workspace', '@partner/api', 'run', 'prisma:generate'])
  } catch (error) {
    console.error(
      [
        '[local-backend] Falha ao gerar o Prisma Client.',
        '[local-backend] Se houver uma API local em execução, pare o processo e rode novamente.',
        '[local-backend] Se você só precisa atualizar o demo local, use `npm run local:backend:sync-demo`.',
        `[local-backend] Detalhe: ${error instanceof Error ? error.message : String(error)}`,
      ].join('\n'),
    )
    process.exit(1)
  }
}

main()
