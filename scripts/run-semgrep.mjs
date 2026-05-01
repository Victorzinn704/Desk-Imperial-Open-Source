import { spawnSync } from 'node:child_process'
import path from 'node:path'

function hasCommand(command, probeArgs = ['--version']) {
  const result = spawnSync(command, probeArgs, {
    stdio: 'ignore',
    shell: false,
  })
  return !result.error && (result.status ?? 1) === 0
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8',
      ...options.env,
    },
    ...options,
  })
}

function getPythonUserScriptsBinary(binaryName) {
  const result = spawnSync(
    'python',
    ['-c', "import sysconfig; print(sysconfig.get_path('scripts', scheme='nt_user'))"],
    {
      encoding: 'utf8',
      shell: false,
      stdio: ['ignore', 'pipe', 'ignore'],
    },
  )
  if (result.error || (result.status ?? 1) !== 0) {
    return null
  }
  const scriptsDir = result.stdout.trim()
  if (!scriptsDir) {
    return null
  }
  return path.join(scriptsDir, binaryName)
}

const args = process.argv.slice(2)

if (hasCommand('semgrep')) {
  const result = run('semgrep', args)
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  process.exit(result.status ?? 1)
}

const pythonUserSemgrep = getPythonUserScriptsBinary('pysemgrep.exe')
if (pythonUserSemgrep && hasCommand(pythonUserSemgrep, ['--version'])) {
  const result = run(pythonUserSemgrep, args)
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  process.exit(result.status ?? 1)
}

if (hasCommand('docker', ['info'])) {
  const result = run('docker', [
    'run',
    '--rm',
    '-v',
    `${process.cwd()}:/src`,
    '-w',
    '/src',
    'semgrep/semgrep',
    ...args,
  ])
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  process.exit(result.status ?? 1)
}

console.error(
  [
    'erro: semgrep nao encontrado no PATH e nenhum runtime alternativo esta pronto.',
    'Instale com `npm run quality:bootstrap`, `python -m pip install --user semgrep`, ou inicie o Docker Desktop antes de rodar o scan.',
  ].join(' '),
)
process.exit(1)
