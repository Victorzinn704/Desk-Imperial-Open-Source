import { spawnSync } from 'node:child_process'

function runGit(args) {
  const command = `git ${args.map((arg) => `"${arg.replaceAll('"', '\\"')}"`).join(' ')}`
  const result =
    process.platform === 'win32'
      ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', command], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      : spawnSync('git', args, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    const reason = result.stderr?.trim() || result.stdout?.trim() || `git ${args.join(' ')} failed`
    throw new Error(reason)
  }

  return result.stdout.trim()
}

function tryGit(args) {
  try {
    return runGit(args)
  } catch {
    return null
  }
}

const branch = runGit(['branch', '--show-current']) || '(detached-head)'
const upstream = tryGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']) ?? '(no-upstream)'
const workingTreeEntriesRaw = runGit(['status', '--short'])
const workingTreeEntries = workingTreeEntriesRaw ? workingTreeEntriesRaw.split(/\r?\n/).filter(Boolean) : []

let comparedBase = 'origin/main'
try {
  runGit(['rev-parse', '--verify', 'origin/main'])
} catch {
  comparedBase = upstream !== '(no-upstream)' ? upstream : 'HEAD'
}

let diffNamesRaw = ''
try {
  diffNamesRaw = runGit(['diff', '--name-only', `${comparedBase}...HEAD`])
} catch {
  diffNamesRaw = runGit(['diff', '--name-only', comparedBase, 'HEAD'])
}
const diffNames = diffNamesRaw ? diffNamesRaw.split(/\r?\n/).filter(Boolean) : []

const report = {
  branch,
  upstream,
  comparedBase,
  workingTreeCount: workingTreeEntries.length,
  branchVsBaseCount: diffNames.length,
  workingTreeEntries,
  branchVsBaseEntries: diffNames,
}

console.log(JSON.stringify(report, null, 2))
