import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import {
  DEFAULT_MANIFEST,
  TRUST,
  inspectBracesInstallation,
  applyBracesPatch,
  verifyBracesPatch,
} from './integrity.mjs'
import { validateAuditReport } from './audit-guard.mjs'

const CHILD = fileURLToPath(new URL('./regression-child.cjs', import.meta.url))
const ADVISORY = 'GHSA-vfj7-8cjw-p6xm'
const LEVELS = ['info', 'low', 'moderate', 'high', 'critical']
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) && !/^0+$/.test(value)
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const requireThat = (condition, message) => {
  if (!condition) throw new Error(message)
}
export const canonical = (value) =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : object(value)
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
          .join(',')}}`
      : JSON.stringify(value)
const exactKeys = (value, keys) => object(value) && isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort())
const parse = (bytes, label) => {
  try {
    return JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error(`Invalid JSON: ${label}`)
  }
}
const time = () => new Date().toISOString()

export function projectAdvisory(record) {
  requireThat(
    object(record) &&
      record.ghsa_id === ADVISORY &&
      /^CVE-\d{4}-\d+$/.test(record.cve_id) &&
      LEVELS.includes(record.severity),
    'Advisory identity/schema changed',
  )
  requireThat(
    typeof record.updated_at === 'string' &&
      Number.isFinite(Date.parse(record.updated_at)) &&
      (record.withdrawn_at === null ||
        (typeof record.withdrawn_at === 'string' && Number.isFinite(Date.parse(record.withdrawn_at)))),
    'Advisory dates are invalid',
  )
  const cvss = (value) => {
    requireThat(
      exactKeys(value, ['score', 'vector_string']) &&
        (value.score === null || (typeof value.score === 'number' && value.score >= 0 && value.score <= 10)) &&
        (value.vector_string === null ||
          (typeof value.vector_string === 'string' && value.vector_string.startsWith('CVSS:'))),
      'Advisory CVSS schema changed',
    )
    return { score: value.score, vector_string: value.vector_string }
  }
  requireThat(exactKeys(record.cvss_severities, ['cvss_v3', 'cvss_v4']), 'Advisory CVSS versions changed')
  requireThat(
    Array.isArray(record.vulnerabilities) &&
      record.vulnerabilities.length > 0 &&
      Array.isArray(record.cwes) &&
      record.cwes.length > 0,
    'Advisory affected packages/CWEs missing',
  )
  const vulnerabilities = record.vulnerabilities
    .map((value) => {
      requireThat(
        object(value) &&
          exactKeys(value.package, ['ecosystem', 'name']) &&
          typeof value.package.ecosystem === 'string' &&
          typeof value.package.name === 'string' &&
          typeof value.vulnerable_version_range === 'string' &&
          (value.first_patched_version === null || typeof value.first_patched_version === 'string'),
        'Advisory vulnerability schema changed',
      )
      return {
        package: value.package,
        vulnerable_version_range: value.vulnerable_version_range,
        first_patched_version: value.first_patched_version,
      }
    })
    .sort((a, b) => canonical(a).localeCompare(canonical(b)))
  const cwes = record.cwes
    .map((value) => {
      requireThat(
        exactKeys(value, ['cwe_id', 'name']) && /^CWE-\d+$/.test(value.cwe_id) && typeof value.name === 'string',
        'Advisory CWE schema changed',
      )
      return value
    })
    .sort((a, b) => a.cwe_id.localeCompare(b.cwe_id))
  return {
    ghsa_id: record.ghsa_id,
    cve_id: record.cve_id,
    severity: record.severity,
    updated_at: record.updated_at,
    withdrawn_at: record.withdrawn_at,
    vulnerabilities,
    cvss: cvss(record.cvss),
    cvss_severities: { cvss_v3: cvss(record.cvss_severities.cvss_v3), cvss_v4: cvss(record.cvss_severities.cvss_v4) },
    cwes,
  }
}

export async function fetchAdvisory() {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'braces-reviewed-backport-verifier',
  }
  // Token is read only for this primary-source GET and never persisted/logged.
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const response = await fetch(`https://api.github.com/advisories/${ADVISORY}`, {
    headers,
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  })
  requireThat(response.ok, `Primary advisory request failed (HTTP ${response.status})`)
  const bytes = Buffer.from(await response.arrayBuffer())
  requireThat(bytes.length <= 1024 * 1024, 'Primary advisory response too large')
  return { bytes, retrievedAt: time() }
}

export async function fetchLatestRelease() {
  const response = await fetch('https://registry.npmjs.org/braces/latest', {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  })
  requireThat(response.ok, `Registry release request failed (HTTP ${response.status})`)
  const bytes = Buffer.from(await response.arrayBuffer())
  requireThat(bytes.length <= 1024 * 1024, 'Registry release response too large')
  return { bytes, retrievedAt: time() }
}

export function assertReviewedLatest(record) {
  requireThat(
    object(record) &&
      record.name === TRUST.name &&
      record.version === TRUST.version &&
      object(record.dist) &&
      record.dist.integrity === TRUST.integrity &&
      record.dist.tarball === TRUST.resolved,
    'Registry latest release changed; review and retire or replace the backport',
  )
}

export function runProcess(executable, args, { cwd, timeout = 60000, env = process.env } = {}) {
  return new Promise((resolve) => {
    const cleanEnv = { ...env }
    for (const key of Object.keys(cleanEnv))
      if (
        /^(?:NODE_OPTIONS|NODE_PATH|NODE_V8_COVERAGE)$/i.test(key) ||
        /^npm_config_(?:omit|include|production|workspace|workspaces|include_workspace_root|prefix)$/i.test(key)
      )
        delete cleanEnv[key]
    cleanEnv.PATH = path.dirname(process.execPath) + path.delimiter + (cleanEnv.PATH || cleanEnv.Path || '')
    const child = spawn(executable, args, {
      cwd,
      env: cleanEnv,
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout = [],
      stderr = []
    let size = 0,
      timedOut = false,
      overflow = false,
      spawnError = null
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeout)
    const collect = (sink) => (chunk) => {
      size += chunk.length
      if (size > 16 * 1024 * 1024) {
        overflow = true
        child.kill('SIGKILL')
      } else sink.push(chunk)
    }
    child.stdout.on('data', collect(stdout))
    child.stderr.on('data', collect(stderr))
    child.on('error', (error) => {
      spawnError = { code: error.code, message: error.message }
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        code,
        signal,
        timedOut,
        overflow,
        spawnError,
      })
    })
  })
}

async function npmCommand(root, args) {
  const cli = process.env.npm_execpath
  requireThat(
    typeof cli === 'string' && path.isAbsolute(cli) && /npm-cli\.js$/i.test(cli),
    'Run this CLI through npm run so npm_execpath identifies npm-cli.js',
  )
  return runProcess(process.execPath, [cli, ...args, `--prefix=${root}`], { cwd: root, timeout: 90000 })
}

async function saveCommand(directory, label, result) {
  requireThat(
    Buffer.isBuffer(result.stdout) && Buffer.isBuffer(result.stderr),
    'Process transport must preserve stdout/stderr bytes',
  )
  await fs.writeFile(path.join(directory, `${label}.stdout`), result.stdout)
  await fs.writeFile(path.join(directory, `${label}.stderr`), result.stderr)
  await fs.writeFile(
    path.join(directory, `${label}.process.json`),
    JSON.stringify(
      {
        code: result.code,
        signal: result.signal,
        timedOut: result.timedOut,
        overflow: result.overflow,
        spawnError: result.spawnError,
      },
      null,
      2,
    ) + '\n',
  )
  requireThat(
    !result.timedOut && !result.overflow && !result.spawnError && !result.signal && Number.isInteger(result.code),
    `${label}: process failed or timed out`,
  )
}

export function validateAuditExecution(result, label) {
  requireThat(
    !result.timedOut && !result.overflow && !result.spawnError && !result.signal && [0, 1].includes(result.code),
    `${label}: operational exit`,
  )
  const report = parse(result.stdout, label)
  // Reuse complete v2 schema/count/graph validation. Only absent physical proof
  // is expected at this stage; all other diagnostics are real rejections.
  const preflight = validateAuditReport(report, undefined)
  requireThat(
    preflight.diagnostics.every((item) => item.code === 'PATCH_EVIDENCE_MISSING'),
    `${label}: ${preflight.diagnostics.map((item) => item.code).join(', ')}`,
  )
  const high = report.metadata.vulnerabilities.high + report.metadata.vulnerabilities.critical
  requireThat(result.code === (high > 0 ? 1 : 0), `${label}: exit does not match --audit-level=high findings`)
  return report
}

export function assertProductionGraph(graph) {
  requireThat(
    object(graph) && typeof graph.name === 'string' && !Object.hasOwn(graph, 'error'),
    'Invalid npm ls production graph',
  )
  const pending = [graph]
  let nodes = 0
  while (pending.length) {
    const node = pending.pop()
    nodes++
    requireThat(
      nodes < 200000 &&
        object(node) &&
        !node.error &&
        (!node.problems || (Array.isArray(node.problems) && node.problems.length === 0)),
      'Incomplete or invalid production dependency graph',
    )
    requireThat(node.name !== 'braces', 'braces is reachable in the production graph')
    if (node.dependencies !== undefined) {
      requireThat(object(node.dependencies), 'Invalid production dependencies map')
      for (const [name, child] of Object.entries(node.dependencies)) {
        requireThat(
          name !== 'braces' &&
            object(child) &&
            typeof child.name === 'string' &&
            child.name &&
            child.name !== 'braces' &&
            child.resolved !== TRUST.resolved,
          'braces or invalid entry in production graph',
        )
        pending.push(child)
      }
    }
  }
  return nodes
}

export function assertNoProductionMatches(result, expectedRootName) {
  requireThat(
    !result.timedOut &&
      !result.overflow &&
      !result.spawnError &&
      !result.signal &&
      result.code === 1 &&
      result.stderr.length === 0,
    'Targeted production lookup did not return the exact clean no-match result',
  )
  const graph = parse(result.stdout, 'targeted production lookup')
  assertProductionGraph(graph)
  requireThat(
    graph.name === expectedRootName &&
      !graph.error &&
      !graph.problems &&
      (graph.dependencies === undefined ||
        (object(graph.dependencies) && Object.keys(graph.dependencies).length === 0)),
    'Targeted production lookup found dependencies or invalid metadata',
  )
  return true
}

export function workspaceScope(rootPackage, lock) {
  requireThat(
    isDeepStrictEqual(rootPackage.workspaces, lock.packages[''].workspaces),
    'Root workspace selection differs from reviewed lock',
  )
  if (!rootPackage.workspaces) return ['--workspaces=false']
  const paths = Object.entries(lock.packages)
    .filter(([relative, entry]) => relative && !relative.split('/').includes('node_modules') && !entry.link)
    .map(([relative]) => relative)
    .sort()
  requireThat(
    paths.length > 0 &&
      paths.every(
        (relative) =>
          !path.isAbsolute(relative) &&
          !/[\\\u0000]/.test(relative) &&
          !relative.split('/').some((part) => !part || part === '.' || part === '..'),
      ),
    'Reviewed workspace paths are absent or invalid',
  )
  // Explicit CLI array values replace workspace filters inherited from user,
  // global or local .npmrc; --workspaces alone does not clear those filters.
  return ['--workspaces', '--include-workspace-root', ...paths.map((relative) => `--workspace=${relative}`)]
}

async function loadConfig(configFile, root) {
  const config = parse(await fs.readFile(configFile), 'reviewed configuration')
  requireThat(config.schemaVersion === 1, 'Unsupported reviewed configuration')
  for (const key of [
    'reviewedLockSha256',
    'manifestSha256',
    'patchSha256',
    'baseTreeSha256',
    'patchedTreeSha256',
    'behaviorSuiteSha256',
    'advisoryRecordSha256',
  ])
    requireThat(hash(config[key]), `Missing reviewed hash: ${key}`)
  requireThat(
    config.manifestSha256 === TRUST.manifestSha256,
    'Configured manifest differs from implementation trust anchor',
  )
  requireThat(
    sha256(await fs.readFile(CHILD)) === config.behaviorSuiteSha256,
    'Regression suite differs from reviewed bytes',
  )
  requireThat(
    sha256(await fs.readFile(path.join(root, 'package-lock.json'))) === config.reviewedLockSha256,
    'Lock differs from independently reviewed hash',
  )
  const now = Date.now(),
    decision = config.decision
  requireThat(
    object(decision) &&
      typeof decision.id === 'string' &&
      decision.id &&
      typeof decision.owner === 'string' &&
      decision.owner &&
      Number.isFinite(Date.parse(decision.acceptedAt)) &&
      Date.parse(decision.acceptedAt) <= now &&
      Number.isFinite(Date.parse(decision.expiresAt)) &&
      Date.parse(decision.expiresAt) > now,
    'Decision is absent, future or expired',
  )
  return config
}

async function comparePhysical(report, config, root) {
  requireThat(
    report.manifestSha256 === config.manifestSha256 &&
      report.lockfileSha256 === config.reviewedLockSha256 &&
      report.expectedTrees.baseSha256 === config.baseTreeSha256 &&
      report.expectedTrees.patchedSha256 === config.patchedTreeSha256,
    'Observed installation differs from reviewed hashes',
  )
  const manifest = parse(await fs.readFile(DEFAULT_MANIFEST), 'trusted manifest')
  requireThat(
    manifest.patch.sha256 === config.patchSha256 &&
      sha256(await fs.readFile(DEFAULT_MANIFEST)) === config.manifestSha256,
    'Provenance patch/manifest drift',
  )
  const lock = parse(await fs.readFile(path.join(root, 'package-lock.json')), 'reviewed lock')
  requireThat(
    report.copies.every((copy) => lock.packages[copy.path]?.dev === true),
    'braces is not strictly development-only in the reviewed lock',
  )
  return { manifest, lock }
}

export function installationMode(mode = 'auto', env = process.env) {
  requireThat(['auto', 'full', 'omit-dev'].includes(mode), 'Invalid installation mode')
  if (mode !== 'auto') return mode
  const lowered = Object.fromEntries(Object.entries(env).map(([key, value]) => [key.toLowerCase(), value]))
  const words = (value) =>
    String(value || '')
      .split(/[\s,]+/)
      .filter(Boolean)
  if (words(lowered.npm_config_include).includes('dev')) return 'full'
  return words(lowered.npm_config_omit).includes('dev') ||
    lowered.npm_config_production === 'true' ||
    lowered.node_env === 'production'
    ? 'omit-dev'
    : 'full'
}

export async function applyOrVerify({ root, configFile, command, mode = 'auto' }) {
  requireThat(Number(process.versions.node.split('.')[0]) === 22, 'Node 22 is required')
  root = path.resolve(root)
  mode = installationMode(mode)
  const config = await loadConfig(configFile, root)
  requireThat(['apply', 'verify'].includes(command) && ['full', 'omit-dev'].includes(mode), 'Invalid apply/verify mode')
  const before = await inspectBracesInstallation({ root, mode })
  await comparePhysical(before, config, root)
  if (command === 'apply') return applyBracesPatch({ root, mode })
  if (mode === 'omit-dev') {
    requireThat(
      before.copies.length === 0,
      'Production-only verification expects all development braces copies to be absent',
    )
    return { ...before, status: 'verified-no-installed-development-copies' }
  }
  return verifyBracesPatch({ root })
}

// Transport substitution exists solely for offline unit tests. The CLI always
// supplies the real npm and GitHub transports; physical verification and real
// regression execution cannot be substituted or supplied as JSON evidence.
export async function runAuditGate({ root, configFile, artifactDir }, transport = {}) {
  requireThat(Number(process.versions.node.split('.')[0]) === 22, 'Node 22 is required')
  root = path.resolve(root)
  artifactDir = path.resolve(artifactDir)
  await fs.mkdir(artifactDir, { recursive: true })
  const runId = randomUUID()
  const directory = path.join(artifactDir, runId)
  await fs.mkdir(directory)
  let evidence
  try {
    const config = await loadConfig(configFile, root)
    const reviewedLock = parse(await fs.readFile(path.join(root, 'package-lock.json')), 'reviewed lock')
    const rootPackage = parse(await fs.readFile(path.join(root, 'package.json')), 'root package')
    const scope = workspaceScope(rootPackage, reviewedLock)
    const invoke = transport.npmCommand || npmCommand
    const fullRun = await invoke(root, [
      'audit',
      '--json',
      '--audit-level=high',
      '--include=dev',
      '--include=optional',
      '--include=peer',
      '--registry=https://registry.npmjs.org',
      ...scope,
    ])
    await saveCommand(directory, 'full-audit', fullRun)
    const full = validateAuditExecution(fullRun, 'full audit')
    const runtimeRun = await invoke(root, [
      'audit',
      '--json',
      '--audit-level=high',
      '--omit=dev',
      '--include=optional',
      '--include=peer',
      '--registry=https://registry.npmjs.org',
      ...scope,
    ])
    await saveCommand(directory, 'runtime-audit', runtimeRun)
    const runtime = validateAuditExecution(runtimeRun, 'runtime audit')
    requireThat(
      runtime.metadata.vulnerabilities.high === 0 && runtime.metadata.vulnerabilities.critical === 0,
      'Runtime audit is not clear of high/critical findings',
    )
    const before = await verifyBracesPatch({ root, auditReport: full })
    const { manifest, lock } = await comparePhysical(before, config, root)
    const targetNames = [
      ...new Set([
        'braces',
        ...before.copies.map((copy) => {
          const parts = copy.path.split('/')
          return parts.at(-2)?.startsWith('@') ? `${parts.at(-2)}/${parts.at(-1)}` : parts.at(-1)
        }),
      ]),
    ]
    requireThat(
      targetNames.every((name) => /^(?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+$/.test(name)),
      'Invalid package lookup identity',
    )
    const graphRun = await invoke(root, [
      'ls',
      ...targetNames,
      '--package-lock-only',
      '--all',
      '--json',
      '--long',
      '--omit=dev',
      '--include=optional',
      '--include=peer',
      ...scope,
    ])
    await saveCommand(directory, 'runtime-braces-lookup', graphRun)
    // npm ls intentionally returns 1 for a positional query with no matches.
    // This is not general acceptance of ELSPROBLEMS or validation of all peers.
    assertNoProductionMatches(graphRun, rootPackage.name)
    const highPaths = [
      ...new Set(
        Object.values(full.vulnerabilities)
          .filter((value) => ['high', 'critical'].includes(value.severity))
          .flatMap((value) => value.nodes),
      ),
    ].sort()
    requireThat(
      highPaths.every((relative) => lock.packages[relative]?.dev === true),
      'A high finding is not strictly development-only',
    )
    const primary = await (transport.fetchAdvisory || fetchAdvisory)()
    await fs.writeFile(path.join(directory, 'advisory.raw.json'), primary.bytes)
    const projection = projectAdvisory(parse(primary.bytes, 'primary advisory'))
    const currentRecordSha256 = sha256(canonical(projection))
    await fs.writeFile(path.join(directory, 'advisory.security.json'), canonical(projection) + '\n')
    requireThat(currentRecordSha256 === config.advisoryRecordSha256, 'Primary advisory changed since security review')
    const latest = await (transport.fetchLatestRelease || fetchLatestRelease)()
    await fs.writeFile(path.join(directory, 'registry-latest.raw.json'), latest.bytes)
    assertReviewedLatest(parse(latest.bytes, 'registry latest release'))
    const regressionResults = []
    for (let index = 0; index < before.copies.length; index++) {
      requireThat(
        sha256(await fs.readFile(CHILD)) === config.behaviorSuiteSha256,
        'Regression script changed before execution',
      )
      const copy = before.copies[index]
      const module = path.join(root, copy.path)
      const run = await runProcess(process.execPath, ['--stack-size=512', '--max-old-space-size=128', CHILD, module], {
        cwd: root,
        timeout: 5000,
      })
      await saveCommand(directory, `regression-${index}`, run)
      requireThat(run.code === 0, `Regression failed for ${copy.path}`)
      const result = parse(run.stdout, 'regression proof')
      requireThat(
        result.passed === true && result.nodeMajor === 22 && result.module === module && result.assertions >= 104,
        'Incomplete regression execution proof',
      )
      regressionResults.push({ path: copy.path, ...result })
    }
    const completedAt = time()
    requireThat(
      sha256(await fs.readFile(CHILD)) === config.behaviorSuiteSha256,
      'Regression script changed during execution',
    )
    const after = await verifyBracesPatch({ root, auditReport: full })
    await comparePhysical(after, config, root)
    requireThat(isDeepStrictEqual(before, after), 'Installation/inventory changed during regression verification')
    const verifiedAt = time()
    evidence = {
      schemaVersion: 1,
      evaluatedAt: time(),
      verifiedAt,
      decision: config.decision,
      package: manifest.package,
      upstreamCommit: manifest.upstream.sha,
      patchSha256: config.patchSha256,
      baseTreeSha256: config.baseTreeSha256,
      patchedTreeSha256: config.patchedTreeSha256,
      manifestSha256: config.manifestSha256,
      lockfile: {
        reviewedSha256: config.reviewedLockSha256,
        observedSha256: after.lockfileSha256,
        graphUnchanged: true,
      },
      inventory: {
        complete: true,
        expectedPaths: after.copies.map((copy) => copy.path),
        discoveredPaths: after.copies.map((copy) => copy.path),
        developmentOnlyPaths: highPaths,
        instances: after.copies.map((copy) => ({
          path: copy.path,
          name: copy.name,
          version: copy.version,
          dev: true,
          isSymbolicLink: false,
          verified: true,
          baseTreeSha256: config.baseTreeSha256,
          patchedTreeSha256: copy.treeSha256,
          manifestSha256: after.manifestSha256,
        })),
      },
      runtime: { validReport: true, high: 0, critical: 0, bracesInProductionGraph: false },
      behavior: {
        nodeMajor: 22,
        passed: true,
        suiteSha256: config.behaviorSuiteSha256,
        runId,
        completedAt,
        patchedTreeSha256: config.patchedTreeSha256,
      },
      advisory: {
        id: ADVISORY,
        reviewedRecordSha256: config.advisoryRecordSha256,
        currentRecordSha256,
        retrievedAt: primary.retrievedAt,
      },
    }
    const evaluation = validateAuditReport(full, evidence)
    const result = {
      ...evaluation,
      runId,
      artifactDirectory: directory,
      runtimeCounts: runtime.metadata.vulnerabilities,
      regressionResults,
      registryLatest: {
        name: TRUST.name,
        version: TRUST.version,
        integrity: TRUST.integrity,
        retrievedAt: latest.retrievedAt,
      },
    }
    await fs.writeFile(path.join(directory, 'verified-evidence.json'), JSON.stringify(evidence, null, 2) + '\n')
    await fs.writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n')
    return result
  } catch (error) {
    const result = {
      ok: false,
      decision: 'FAIL',
      runId,
      artifactDirectory: directory,
      diagnostics: [{ code: 'RUNNER_FAILURE', message: error.message }],
    }
    await fs.writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n')
    return result
  }
}

async function cli() {
  const [command, ...args] = process.argv.slice(2)
  requireThat(
    ['apply', 'verify', 'audit'].includes(command),
    'Usage: npm run SCRIPT -- apply|verify|audit --root PATH --config FILE [--artifacts PATH] [--mode full|omit-dev]',
  )
  const options = {}
  for (let index = 0; index < args.length; index += 2) {
    requireThat(
      ['--root', '--config', '--artifacts', '--mode'].includes(args[index]) &&
        args[index + 1] &&
        !Object.hasOwn(options, args[index]),
      'Unknown, missing or repeated CLI option',
    )
    options[args[index]] = args[index + 1]
  }
  requireThat(options['--root'] && options['--config'], 'Explicit root and reviewed configuration are required')
  if (command === 'audit') {
    requireThat(
      options['--artifacts'] && !options['--mode'],
      'Audit requires artifacts path and always verifies full installation',
    )
    const result = await runAuditGate({
      root: options['--root'],
      configFile: options['--config'],
      artifactDir: options['--artifacts'],
    })
    process.stdout.write(
      JSON.stringify(
        {
          ok: result.ok,
          decision: result.decision,
          rawCounts: result.rawCounts,
          mitigatedCount: result.mitigatedCount,
          runtimeCounts: result.runtimeCounts,
          artifactDirectory: result.artifactDirectory,
          diagnostics: result.diagnostics,
        },
        null,
        2,
      ) + '\n',
    )
    process.exitCode = result.ok ? 0 : 1
  } else {
    const result = await applyOrVerify({
      root: options['--root'],
      configFile: options['--config'],
      command,
      mode: options['--mode'] || 'auto',
    })
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
  cli().catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
