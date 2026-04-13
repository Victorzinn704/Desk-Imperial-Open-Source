#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const full = process.argv.includes('--full')
const npm = 'npm'
const node = process.execPath
const windowsShell = process.env.ComSpec || 'cmd.exe'

const steps = [
  step('worktree scope', node, ['scripts/check-worktree-scope.mjs']),
  step('public contracts', node, ['scripts/check-public-contracts.mjs']),
  step('diff whitespace', 'git', ['diff', '--check']),
  npmStep('lint', ['run', 'lint']),
  npmStep('typecheck', ['run', 'typecheck']),
  npmStep('critical tests', ['run', 'test:critical']),
  npmStep('web build', ['--workspace', '@partner/web', 'run', 'build']),
  npmStep('api build', ['--workspace', '@partner/api', 'run', 'build']),
]

if (full) {
  steps.push(
    npmStep('web full tests', ['--workspace', '@partner/web', 'run', 'test']),
    npmStep('api tests without Redis smoke', [
      '--workspace',
      '@partner/api',
      'run',
      'test',
      '--',
      '--testPathIgnorePatterns=be-01-operational-smoke.spec.ts',
    ]),
    npmStep('web critical e2e', ['--workspace', '@partner/web', 'run', 'test:e2e:critical']),
  )
}

for (const { label, command, args, shell } of steps) {
  console.log(`\n==> ${label}`)
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(`\n[FAIL] ${label} could not start: ${result.error.message}`)
    process.exit(1)
  }

  if (result.status !== 0) {
    console.error(`\n[FAIL] ${label} failed with exit code ${result.status ?? 'unknown'}`)
    process.exit(result.status ?? 1)
  }
}

console.log(full ? '\n[PASS] Full quality preflight passed.' : '\n[PASS] Quality preflight passed.')

function step(label, command, args) {
  return { label, command, args, shell: false }
}

function npmStep(label, args) {
  if (process.platform !== 'win32') {
    return { label, command: npm, args, shell: false }
  }

  return {
    label,
    command: windowsShell,
    args: ['/d', '/s', '/c', ['npm', ...args].map(quoteWindowsArg).join(' ')],
    shell: false,
  }
}

function quoteWindowsArg(value) {
  const text = String(value)
  if (/^[A-Za-z0-9_:@./=\\-]+$/u.test(text)) {
    return text
  }

  return `"${text.replaceAll('"', '\\"')}"`
}
