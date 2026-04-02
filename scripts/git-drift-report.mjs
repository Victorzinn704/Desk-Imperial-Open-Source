import { execFileSync } from 'node:child_process'

function runGit(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function safeRunGit(args, fallback = '') {
  try {
    return runGit(args)
  } catch {
    return fallback
  }
}

function countLines(text) {
  return text ? text.split(/\r?\n/).filter(Boolean).length : 0
}

const targetRef = process.argv[2] || 'origin/main'
const currentBranch = safeRunGit(['rev-parse', '--abbrev-ref', 'HEAD'], 'HEAD')
const shortStatus = safeRunGit(['status', '--short'])
const upstream = safeRunGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], '')
const aheadBehind = upstream ? safeRunGit(['rev-list', '--left-right', '--count', `${upstream}...HEAD`], '0\t0') : '0\t0'
const [behindRaw, aheadRaw] = aheadBehind.split(/\s+/)
const diffNames = safeRunGit(['diff', '--name-only', `${targetRef}...HEAD`])

const modifiedTracked = shortStatus
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((line) => !line.startsWith('??'))
const untracked = shortStatus
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((line) => line.startsWith('??'))

const report = {
  branch: currentBranch,
  targetRef,
  upstream: upstream || null,
  workingTree: {
    totalChangedEntries: countLines(shortStatus),
    modifiedTracked: modifiedTracked.length,
    untracked: untracked.length,
  },
  upstreamDrift: {
    ahead: Number(aheadRaw || 0),
    behind: Number(behindRaw || 0),
  },
  branchVsTarget: {
    changedFiles: countLines(diffNames),
  },
}

console.log(JSON.stringify(report, null, 2))

if (shortStatus) {
  console.log('\nWorking tree:')
  console.log(shortStatus)
}

if (diffNames) {
  console.log(`\nFiles changed in ${currentBranch} vs ${targetRef}:`)
  console.log(diffNames)
}
