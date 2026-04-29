import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const repoRoot = process.cwd()
const outputDir = path.join(repoRoot, 'artifacts', 'quality', 'tooling-baseline')

fs.mkdirSync(outputDir, { recursive: true })

const commands = [
  {
    name: 'fallow-health',
    outputFile: 'fallow-health.json',
    commandLine: 'npx -y fallow health --format json',
    allowNonZeroWithOutput: true,
  },
  {
    name: 'knip',
    outputFile: 'knip.json',
    commandLine: 'npx -y knip --reporter json',
    allowNonZeroWithOutput: true,
  },
  {
    name: 'depcruise',
    outputFile: 'depcruise.json',
    commandLine:
      'npx -y -p dependency-cruiser depcruise --no-config apps/web apps/api/src packages --include-only "^(apps|packages)" --output-type json',
    allowNonZeroWithOutput: false,
    env: { NODE_OPTIONS: '--max-old-space-size=8192' },
  },
]

for (const entry of commands) {
  const runner =
    process.platform === 'win32'
      ? {
          command: process.env.ComSpec ?? 'cmd.exe',
          args: ['/d', '/s', '/c', entry.commandLine],
        }
      : {
          command: 'sh',
          args: ['-lc', entry.commandLine],
        }

  const result = spawnSync(runner.command, runner.args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, ...entry.env },
    maxBuffer: 1024 * 1024 * 128,
  })

  const stdout = result.stdout?.trim() ?? ''
  const stderr = result.stderr?.trim() ?? ''

  if (!stdout && result.status !== 0) {
    throw new Error(`[${entry.name}] failed without JSON output.\n${stderr}`)
  }

  if (result.status !== 0 && !entry.allowNonZeroWithOutput) {
    throw new Error(`[${entry.name}] failed.\n${stderr}`)
  }

  fs.writeFileSync(path.join(outputDir, entry.outputFile), stdout)

  if (stderr) {
    fs.writeFileSync(path.join(outputDir, `${entry.name}.stderr.log`), `${stderr}\n`)
  }
}

const fallow = JSON.parse(fs.readFileSync(path.join(outputDir, 'fallow-health.json'), 'utf8'))
const knip = JSON.parse(fs.readFileSync(path.join(outputDir, 'knip.json'), 'utf8'))
const depcruise = JSON.parse(fs.readFileSync(path.join(outputDir, 'depcruise.json'), 'utf8'))

const fallowFindings = Array.isArray(fallow.findings) ? fallow.findings : []
const fallowSeverityCounts = fallowFindings.reduce((accumulator, finding) => {
  const key = finding.severity ?? 'unknown'
  accumulator[key] = (accumulator[key] ?? 0) + 1
  return accumulator
}, {})

const fallowTopHotspots = [...fallowFindings]
  .sort((left, right) => (right.cyclomatic ?? 0) - (left.cyclomatic ?? 0))
  .slice(0, 10)
  .map((finding) => ({
    path: finding.path,
    name: finding.name,
    severity: finding.severity,
    cyclomatic: finding.cyclomatic,
    cognitive: finding.cognitive,
    lines: finding.line_count,
  }))

const knipIssues = Array.isArray(knip.issues) ? knip.issues : []
const knipCounts = {
  files: 0,
  dependencies: 0,
  devDependencies: 0,
  exports: 0,
  types: 0,
  unresolved: 0,
  duplicates: 0,
  unlisted: 0,
}

for (const issue of knipIssues) {
  for (const key of Object.keys(knipCounts)) {
    knipCounts[key] += Array.isArray(issue[key]) ? issue[key].length : 0
  }
}

const knipTopFiles = knipIssues
  .map((issue) => ({
    file: issue.file,
    score: ['files', 'dependencies', 'devDependencies', 'exports', 'types', 'unresolved', 'duplicates', 'unlisted']
      .reduce((sum, key) => sum + (Array.isArray(issue[key]) ? issue[key].length : 0), 0),
    files: issue.files?.length ?? 0,
    exports: issue.exports?.length ?? 0,
    types: issue.types?.length ?? 0,
    dependencies: issue.dependencies?.length ?? 0,
    unresolved: issue.unresolved?.length ?? 0,
  }))
  .filter((issue) => issue.score > 0)
  .sort((left, right) => right.score - left.score)
  .slice(0, 10)

const depcruiseModules = Array.isArray(depcruise.modules) ? depcruise.modules : []
const depcruiseSummary = {
  moduleCount: depcruiseModules.length,
  circularModuleCount: depcruiseModules.filter(
    (module) => Array.isArray(module.dependencies) && module.dependencies.some((dependency) => dependency.circular),
  ).length,
  orphanModuleCount: depcruiseModules.filter((module) => module.orphan).length,
  violations: Number(depcruise.summary?.violations ?? 0),
  warnings: Number(depcruise.summary?.warnings ?? 0),
  errors: Number(depcruise.summary?.error ?? 0),
}

const summary = {
  generatedAt: new Date().toISOString(),
  fallow: {
    totalFindings: fallowFindings.length,
    severityCounts: fallowSeverityCounts,
    topHotspots: fallowTopHotspots,
  },
  knip: {
    totalIssueFiles: knipIssues.length,
    counts: knipCounts,
    topFiles: knipTopFiles,
  },
  depcruise: depcruiseSummary,
}

const markdown = [
  '# Tooling Baseline',
  '',
  `Generated at: ${summary.generatedAt}`,
  '',
  '## Fallow',
  '',
  `- total findings: ${summary.fallow.totalFindings}`,
  `- severity counts: ${Object.entries(summary.fallow.severityCounts).map(([key, value]) => `${key}=${value}`).join(', ')}`,
  '',
  '### Top hotspots',
  '',
  '| Path | Symbol | Severity | Cyclomatic | Cognitive | Lines |',
  '| --- | --- | --- | ---: | ---: | ---: |',
  ...summary.fallow.topHotspots.map(
    (finding) =>
      `| \`${finding.path}\` | \`${finding.name}\` | ${finding.severity} | ${finding.cyclomatic ?? '-'} | ${finding.cognitive ?? '-'} | ${finding.lines ?? '-'} |`,
  ),
  '',
  '## Knip',
  '',
  `- issue files: ${summary.knip.totalIssueFiles}`,
  `- counts: ${Object.entries(summary.knip.counts).map(([key, value]) => `${key}=${value}`).join(', ')}`,
  '',
  '### Highest-noise files',
  '',
  '| File | Score | Files | Exports | Types | Dependencies | Unresolved |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...summary.knip.topFiles.map(
    (finding) =>
      `| \`${finding.file}\` | ${finding.score} | ${finding.files} | ${finding.exports} | ${finding.types} | ${finding.dependencies} | ${finding.unresolved} |`,
  ),
  '',
  '## Dependency Cruiser (baseline without custom boundaries)',
  '',
  `- modules: ${summary.depcruise.moduleCount}`,
  `- circular modules: ${summary.depcruise.circularModuleCount}`,
  `- orphan modules: ${summary.depcruise.orphanModuleCount}`,
  `- violations: ${summary.depcruise.violations}`,
  `- warnings: ${summary.depcruise.warnings}`,
  `- errors: ${summary.depcruise.errors}`,
  '',
  '> Note: this run uses `--no-config`. It is only a structural baseline, not an enforceable boundary gate yet.',
  '',
]

fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2))
fs.writeFileSync(path.join(outputDir, 'summary.md'), `${markdown.join('\n')}\n`)

console.log(`Tooling baseline written to ${outputDir}`)
