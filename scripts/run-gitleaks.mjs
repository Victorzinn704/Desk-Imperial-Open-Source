import { spawnSync } from 'node:child_process'
import path from 'node:path'

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  })
}

function hasCommand(command, probeArgs = ['version']) {
  const result = spawnSync(command, probeArgs, {
    stdio: 'ignore',
    shell: false,
  })
  return !result.error
}

const args = process.argv.slice(2)
const repoLocalGitleaks = path.join(process.cwd(), '.local-tools', 'gitleaks', 'gitleaks.exe')

if (!hasCommand('gitleaks')) {
  if (hasCommand(repoLocalGitleaks, ['version'])) {
    const result = run(repoLocalGitleaks, args)
    if (result.error) {
      console.error(result.error.message)
      process.exit(1)
    }
    process.exit(result.status ?? 1)
  }

  console.error(
    [
      'erro: gitleaks nao encontrado no PATH nem em .local-tools/gitleaks.',
      'Instale com `npm run quality:bootstrap` ou baixe o binario portatil antes de rodar a verificacao de segredos.',
    ].join(' '),
  )
  process.exit(1)
}

const result = run('gitleaks', args)
if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
