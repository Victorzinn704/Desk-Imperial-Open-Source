import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const stagingRoot = path.join(repoRoot, '.gitleaks-target-tmp')
const scanRoots = ['apps', 'packages', 'scripts', 'infra', '.github', '.husky']
const scanFiles = [
  '.env.example',
  '.gitleaks.toml',
  '.semgrepignore',
  '.dependency-cruiser.cjs',
  '.jscpd.json',
  '.coderabbit.yaml',
  'biome.json',
  'eslint.config.mjs',
  'knip.json',
  'lighthouserc.json',
  'package.json',
  'package-lock.json',
  'qodana.yaml',
  'sonar-project.properties',
  'tsconfig.depcruise.api.json',
  'tsconfig.depcruise.web.json',
]
const allowedExtensions = new Set([
  '.cjs',
  '.conf',
  '.css',
  '.env',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.ps1',
  '.scss',
  '.sh',
  '.sql',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
])
const allowedBasenames = new Set([
  '.env.example',
  '.gitleaks.toml',
  '.semgrepignore',
  '.dockerignore',
  '.gitignore',
  'Dockerfile',
  'package-lock.json',
  'package.json',
])

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  })
}

function runCaptured(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function isScannableFile(relativePath) {
  const normalizedPath = relativePath.replaceAll('\\', '/')
  const extension = path.extname(normalizedPath).toLowerCase()
  const basename = path.basename(normalizedPath)

  if (allowedBasenames.has(basename)) {
    return true
  }

  return allowedExtensions.has(extension)
}

function copyTrackedFiles(relativeFiles) {
  for (const relativePath of relativeFiles) {
    if (!isScannableFile(relativePath)) {
      continue
    }

    const sourcePath = path.join(repoRoot, relativePath)
    if (!existsSync(sourcePath)) {
      continue
    }

    const targetPath = path.join(stagingRoot, relativePath)
    mkdirSync(path.dirname(targetPath), { recursive: true })
    cpSync(sourcePath, targetPath)
  }
}

const trackedFilesResult = runCaptured('git', ['ls-files', '-z', '--', ...scanRoots, ...scanFiles])
if (trackedFilesResult.status !== 0) {
  process.stderr.write(trackedFilesResult.stderr || 'Falha ao listar arquivos rastreados para scan de secrets.\n')
  process.exit(trackedFilesResult.status ?? 1)
}

const trackedFiles = trackedFilesResult.stdout.split('\0').filter(Boolean)

if (trackedFiles.length === 0) {
  console.error('Nenhum arquivo rastreado encontrado para o scan local de secrets.')
  process.exit(1)
}

rmSync(stagingRoot, { force: true, recursive: true })

let exitCode = 1

try {
  mkdirSync(stagingRoot, { recursive: true })
  copyTrackedFiles(trackedFiles)

  const extraArgs = process.argv.slice(2)
  const result = run('node', [
    './scripts/run-gitleaks.mjs',
    'dir',
    stagingRoot,
    '--config',
    '.gitleaks.toml',
    ...extraArgs,
  ])
  exitCode = result.status ?? 1
} finally {
  rmSync(stagingRoot, { force: true, recursive: true })
}

process.exit(exitCode)
