import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import {
  applyOrVerify,
  runAuditGate,
  validateAuditExecution,
  assertProductionGraph,
  assertNoProductionMatches,
  projectAdvisory,
  canonical,
  runProcess,
  installationMode,
  workspaceScope,
  assertReviewedLatest,
} from './runner.mjs'
import { KNOWN_ADVISORY } from './audit-guard.mjs'
import { DEFAULT_MANIFEST, TRUST } from './integrity.mjs'

const BASE = fileURLToPath(new URL('.', import.meta.url))
const TEMP = path.join(BASE, '.test-tmp')
await fs.mkdir(TEMP, { recursive: true })
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const clone = (value) => structuredClone(value)
const advisoryBytes = await fs.readFile(new URL('./fixtures/advisory.json', import.meta.url))
const advisoryRecord = JSON.parse(advisoryBytes)
const manifest = JSON.parse(await fs.readFile(DEFAULT_MANIFEST))
const packageJson = {
  name: 'braces-integration-test-fixture',
  version: '0.0.0',
  private: true,
  devDependencies: { braces: '3.0.3' },
}
const fixtureLock = {
  name: packageJson.name,
  lockfileVersion: 3,
  packages: {
    '': packageJson,
    'node_modules/braces': {
      name: 'braces',
      version: TRUST.version,
      resolved: TRUST.resolved,
      integrity: TRUST.integrity,
      dev: true,
      dependencies: { 'fill-range': '^7.1.1' },
    },
    'node_modules/fill-range': {
      name: 'fill-range',
      version: '7.1.1',
      dev: true,
      dependencies: { 'to-regex-range': '^5.0.1' },
    },
    'node_modules/to-regex-range': {
      name: 'to-regex-range',
      version: '5.0.1',
      dev: true,
      dependencies: { 'is-number': '^7.0.0' },
    },
    'node_modules/is-number': { name: 'is-number', version: '7.0.0', dev: true },
  },
}
const fixtureLockBytes = Buffer.from(JSON.stringify(fixtureLock))
const dependencyRequire = createRequire(import.meta.url)
const rawReport = {
  auditReportVersion: 2,
  vulnerabilities: {
    braces: {
      name: 'braces',
      severity: 'high',
      isDirect: true,
      via: [clone(KNOWN_ADVISORY)],
      effects: [],
      range: '<=3.0.3',
      nodes: ['node_modules/braces'],
      fixAvailable: false,
    },
  },
  metadata: {
    vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0, total: 1 },
    dependencies: { prod: 1, dev: 4, optional: 0, peer: 0, peerOptional: 0, total: 5 },
  },
}
const runtimeReport = {
  auditReportVersion: 2,
  vulnerabilities: {},
  metadata: {
    vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
    dependencies: { prod: 1, dev: 0, optional: 0, peer: 0, peerOptional: 0, total: 1 },
  },
}
const processResult = (value, code = 0) => ({
  stdout: Buffer.from(JSON.stringify(value)),
  stderr: Buffer.from(''),
  code,
  signal: null,
  timedOut: false,
  overflow: false,
  spawnError: null,
})
const transport = () => ({
  npmCommand: async (_root, args) =>
    args[0] === 'ls'
      ? processResult({ name: 'braces-integration-test-fixture' }, 1)
      : args.includes('--omit=dev')
        ? processResult(runtimeReport)
        : processResult(rawReport, 1),
  fetchAdvisory: async () => ({ bytes: advisoryBytes, retrievedAt: new Date().toISOString() }),
  fetchLatestRelease: async () => ({
    bytes: Buffer.from(
      JSON.stringify({
        name: TRUST.name,
        version: TRUST.version,
        dist: { integrity: TRUST.integrity, tarball: TRUST.resolved },
      }),
    ),
    retrievedAt: new Date().toISOString(),
  }),
})

async function fixture(t, { omitDev = false } = {}) {
  const directory = await fs.mkdtemp(path.join(TEMP, 'case-'))
  t.after(async () => {
    const target = path.resolve(directory)
    assert.equal(path.dirname(target), path.resolve(TEMP))
    assert.ok(path.basename(target).startsWith('case-'))
    assert.equal(await fs.realpath(target), target)
    assert.equal((await fs.lstat(target)).isSymbolicLink(), false)
    await fs.rm(target, { recursive: true })
  })
  const root = path.join(directory, 'project')
  await fs.mkdir(root)
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(packageJson))
  await fs.writeFile(path.join(root, 'package-lock.json'), fixtureLockBytes)
  for (const filename of omitDev ? [] : Object.keys(manifest.files)) {
    const target = path.join(root, 'node_modules/braces', filename)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.copyFile(path.join(BASE, 'test-fixtures/registry', filename + '.txt'), target)
  }
  for (const name of omitDev ? [] : ['fill-range', 'to-regex-range', 'is-number']) {
    let source
    try {
      source = path.dirname(dependencyRequire.resolve(name + '/package.json'))
    } catch {
      source = path.join(BASE, '.live-fixture/node_modules', name)
    } // isolated experiment only; not required after npm ci in Desk
    const pkg = JSON.parse(await fs.readFile(path.join(source, 'package.json')))
    assert.equal(pkg.version, fixtureLock.packages['node_modules/' + name].version)
    await fs.cp(source, path.join(root, 'node_modules', name), {
      recursive: true,
      filter: (entry) => !path.relative(source, entry).split(path.sep).includes('node_modules'),
    })
  }
  const config = {
    schemaVersion: 1,
    // Only a newly built test fixture uses this captured fixture hash. Production
    // CLI has no write/accept-current-hashes function and never uses this factory.
    reviewedLockSha256: hash(fixtureLockBytes),
    manifestSha256: TRUST.manifestSha256,
    patchSha256: manifest.patch.sha256,
    baseTreeSha256: '5c8c510001901c3df48d6f694200b95aba9d6c6330f3abba52510a0b954335e5',
    patchedTreeSha256: '9ecd6e810fba3088d57ae73871a46e990a30b04ff1ea6b7b6b2f3e299dc40d52',
    behaviorSuiteSha256: hash(await fs.readFile(path.join(BASE, 'regression-child.cjs'))),
    advisoryRecordSha256: 'fe513fadc18e971870140546323cb7410dc58d475ff0dbffc034fc89996120a3',
    decision: {
      id: 'TEST-ONLY-NOT-DESK-ACCEPTANCE',
      owner: 'isolated fixture',
      acceptedAt: new Date(Date.now() - 60000).toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    },
  }
  const configFile = path.join(directory, 'test-policy.json')
  const save = () => fs.writeFile(configFile, JSON.stringify(config))
  await save()
  return { root, configFile, config, save, artifactDir: path.join(directory, 'artifacts') }
}
async function patched(t) {
  const f = await fixture(t)
  await applyOrVerify({ ...f, command: 'apply' })
  return f
}
async function rejectsRun(f, io, message) {
  const result = await runAuditGate(f, io)
  assert.equal(result.ok, false)
  assert.match(result.diagnostics.map((d) => d.message).join('\n'), message)
  return result
}

test('real package patch application is idempotent; CLI gate does not auto-apply', async (t) => {
  const f = await fixture(t)
  await rejectsRun(f, transport(), /UNPATCHED/)
  const first = await applyOrVerify({ ...f, command: 'apply' })
  assert.deepEqual(first.changed, ['node_modules/braces'])
  assert.deepEqual((await applyOrVerify({ ...f, command: 'apply' })).changed, [])
  assert.equal((await applyOrVerify({ ...f, command: 'verify' })).status, 'verified')
})

test('end-to-end physical verification and actual module regressions construct evidence', async (t) => {
  const f = await patched(t),
    io = transport()
  const calls = []
  const original = io.npmCommand
  io.npmCommand = async (...args) => {
    calls.push(args[1])
    return original(...args)
  }
  const result = await runAuditGate(f, io)
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics))
  assert.equal(result.decision, 'PASS_WITH_VERIFIED_BACKPORT')
  assert.equal(result.rawCounts.high, 1)
  assert.equal(result.mitigatedCount, 1)
  assert.equal(result.regressionResults[0].assertions, 104)
  assert.ok(
    calls[0].includes('--include=dev') &&
      calls[0].includes('--include=optional') &&
      calls[0].includes('--include=peer'),
  )
  assert.ok(calls[1].includes('--omit=dev'))
  assert.ok(calls.every((args) => args.includes('--workspaces=false')))
  assert.ok(calls[2].includes('braces') && calls[2].includes('--package-lock-only'))
  assert.deepEqual(
    await fs.readFile(path.join(result.artifactDirectory, 'full-audit.stdout')),
    processResult(rawReport, 1).stdout,
  )
  const proof = JSON.parse(await fs.readFile(path.join(result.artifactDirectory, 'verified-evidence.json')))
  assert.equal(proof.runtime.bracesInProductionGraph, false)
  assert.equal(proof.inventory.instances[0].verified, true)
})

for (const [label, mutate, match] of [
  ['lock drift', async (f) => fs.appendFile(path.join(f.root, 'package-lock.json'), '\n'), /Lock differs/],
  [
    'expired decision',
    async (f) => {
      f.config.decision.expiresAt = new Date(Date.now() - 1000).toISOString()
      await f.save()
    },
    /expired/,
  ],
  [
    'wrong reviewed tree',
    async (f) => {
      f.config.patchedTreeSha256 = 'a'.repeat(64)
      await f.save()
    },
    /reviewed hashes/,
  ],
  [
    'wrong reviewed suite',
    async (f) => {
      f.config.behaviorSuiteSha256 = 'b'.repeat(64)
      await f.save()
    },
    /suite differs/,
  ],
  [
    'wrong reviewed advisory',
    async (f) => {
      f.config.advisoryRecordSha256 = 'c'.repeat(64)
      await f.save()
    },
    /advisory changed/,
  ],
  [
    'tampered actual module',
    async (f) => fs.appendFile(path.join(f.root, 'node_modules/braces/lib/expand.js'), '\n'),
    /FILE_HASH/,
  ],
])
  test(label, async (t) => {
    const f = await patched(t)
    await mutate(f)
    await rejectsRun(f, transport(), match)
  })

test('tampering between initial and final verification fails even when behavior is unchanged', async (t) => {
  const f = await patched(t),
    io = transport()
  io.fetchAdvisory = async () => {
    await fs.appendFile(path.join(f.root, 'node_modules/braces/README.md'), '\n')
    return { bytes: advisoryBytes, retrievedAt: new Date().toISOString() }
  }
  await rejectsRun(f, io, /FILE_HASH/)
})

for (const [label, result, match] of [
  ['audit timeout', { ...processResult(rawReport, 1), timedOut: true }, /timed out/],
  ['audit non-json', { ...processResult(rawReport, 1), stdout: Buffer.from('not-json') }, /Invalid JSON/],
  ['audit error object', processResult({ error: { code: 'EAI_AGAIN' } }, 1), /REPORT_SCHEMA/],
  ['audit wrong exit', processResult(rawReport, 0), /exit does not match/],
  ['audit unexpected exit', processResult(rawReport, 2), /operational exit/],
])
  test(label + ' retains original raw output', async (t) => {
    const f = await patched(t),
      io = transport()
    io.npmCommand = async () => result
    const failure = await rejectsRun(f, io, match)
    assert.deepEqual(await fs.readFile(path.join(failure.artifactDirectory, 'full-audit.stdout')), result.stdout)
    const process = JSON.parse(await fs.readFile(path.join(failure.artifactDirectory, 'full-audit.process.json')))
    assert.equal(process.code, result.code)
  })

test('new advisory leaf is never mitigated', async (t) => {
  const f = await patched(t),
    io = transport(),
    changed = clone(rawReport)
  changed.vulnerabilities.braces.via[0].title += ' new finding'
  io.npmCommand = async () => processResult(changed, 1)
  await rejectsRun(f, io, /UNMITIGATED_CAUSE/)
})

test('runtime high finding fails', async (t) => {
  const f = await patched(t),
    io = transport()
  io.npmCommand = async () => processResult(rawReport, 1)
  await rejectsRun(f, io, /Runtime audit/)
})

test('runtime graph braces alias fails', async (t) => {
  const f = await patched(t),
    io = transport(),
    original = io.npmCommand
  io.npmCommand = async (root, args) =>
    args[0] === 'ls'
      ? processResult({ name: 'test', dependencies: { alias: { name: 'braces' } } })
      : original(root, args)
  await rejectsRun(f, io, /production lookup/)
})

test('npm ls error is not silently ignored', async (t) => {
  const f = await patched(t),
    io = transport(),
    original = io.npmCommand
  io.npmCommand = async (root, args) =>
    args[0] === 'ls' ? processResult({ name: 'test', error: { code: 'ELSPROBLEMS' } }, 1) : original(root, args)
  await rejectsRun(f, io, /production graph/)
})

test('advisory network failure closes the gate', async (t) => {
  const f = await patched(t),
    io = transport()
  io.fetchAdvisory = async () => {
    throw new Error('HTTP 429')
  }
  await rejectsRun(f, io, /HTTP 429/)
})

test('advisory fingerprint excludes EPSS but detects security changes', () => {
  const expected = canonical(projectAdvisory(advisoryRecord))
  assert.equal(hash(expected), 'fe513fadc18e971870140546323cb7410dc58d475ff0dbffc034fc89996120a3')
  assert.equal(
    canonical(projectAdvisory({ ...advisoryRecord, epss: { percentage: 0.9 }, html_url: 'metadata' })),
    expected,
  )
  assert.notEqual(canonical(projectAdvisory({ ...advisoryRecord, updated_at: '2026-10-11T00:00:00Z' })), expected)
  assert.throws(() => projectAdvisory({ ...advisoryRecord, cvss: null }), /CVSS/)
})

test('child process timeout is bounded', async () => {
  const result = await runProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeout: 150 })
  assert.equal(result.timedOut, true)
  assert.notEqual(result.code, 0)
})

test('runtime graph malformed/missing names and problem arrays fail', () => {
  assert.throws(() => assertProductionGraph({ name: 'test', dependencies: { alias: {} } }), /production graph/)
  assert.throws(() => assertProductionGraph({ name: 'test', problems: ['missing'] }), /Incomplete/)
  assert.equal(assertProductionGraph({ name: 'test', dependencies: { valid: { name: 'valid' } } }), 2)
})

test('only exact targeted clean no-match exit is accepted', () => {
  assert.equal(assertNoProductionMatches(processResult({ name: 'test' }, 1), 'test'), true)
  assert.throws(() => assertNoProductionMatches(processResult({ name: 'test' }, 0), 'test'), /exact clean/)
  assert.throws(() => assertNoProductionMatches(processResult({ name: 'test', problems: [] }, 1), 'test'), /metadata/)
  assert.throws(
    () => assertNoProductionMatches(processResult({ name: 'test', error: { code: 'ELSPROBLEMS' } }, 1), 'test'),
    /Invalid/,
  )
  assert.throws(
    () =>
      assertNoProductionMatches({ ...processResult({ name: 'test' }, 1), stderr: Buffer.from('npm error') }, 'test'),
    /exact clean/,
  )
})

test('workspace selection environment is removed from child processes', async () => {
  const keys = [
    'npm_config_workspace',
    'NPM_CONFIG_WORKSPACES',
    'npm_config_include_workspace_root',
    'npm_config_omit',
    'npm_config_prefix',
  ]
  const env = { ...process.env, ...Object.fromEntries(keys.map((key) => [key, 'test-injected-value'])) }
  const result = await runProcess(
    process.execPath,
    ['-e', `process.stdout.write(JSON.stringify(${JSON.stringify(keys)}.map(key=>process.env[key]??null)))`],
    { env },
  )
  assert.equal(result.code, 0)
  assert.deepEqual(
    JSON.parse(result.stdout),
    keys.map(() => null),
  )
})

test('root workspace narrowing against reviewed lock fails before any audit', async (t) => {
  const f = await patched(t)
  const file = path.join(f.root, 'package.json')
  const pkg = JSON.parse(await fs.readFile(file))
  pkg.workspaces = ['hidden-selection']
  await fs.writeFile(file, JSON.stringify(pkg))
  await rejectsRun(f, transport(), /workspace selection/)
})

test('postinstall auto mode respects explicit include before omit and NODE_ENV', () => {
  assert.equal(
    installationMode('auto', { npm_config_include: 'dev\noptional', npm_config_omit: 'dev', NODE_ENV: 'production' }),
    'full',
  )
  assert.equal(installationMode('auto', { npm_config_omit: 'dev' }), 'omit-dev')
  assert.equal(installationMode('auto', { NODE_ENV: 'production' }), 'omit-dev')
  assert.equal(installationMode('full', { NODE_ENV: 'production' }), 'full')
  assert.equal(installationMode('auto', {}), 'full')
})

test('new registry release requires review even when advisory is unchanged', async (t) => {
  const f = await patched(t),
    io = transport()
  io.fetchLatestRelease = async () => ({
    bytes: Buffer.from(
      JSON.stringify({
        name: TRUST.name,
        version: '3.0.4',
        dist: { integrity: TRUST.integrity, tarball: TRUST.resolved },
      }),
    ),
    retrievedAt: new Date().toISOString(),
  })
  await rejectsRun(f, io, /latest release changed/)
})

test('registry lookup operational failure closes the gate', async (t) => {
  const f = await patched(t),
    io = transport()
  io.fetchLatestRelease = async () => {
    throw new Error('Registry timeout')
  }
  await rejectsRun(f, io, /Registry timeout/)
})

test('explicit reviewed workspace CLI array overrides a narrowed local npmrc (real npm, no network)', async (t) => {
  assert.ok(process.env.npm_execpath, 'Run tests with npm run so the real npm CLI is identified')
  const f = await fixture(t),
    pkg = { ...packageJson, workspaces: ['apps/*'], devDependencies: {} }
  const lock = clone(fixtureLock)
  lock.packages[''] = pkg
  for (const suffix of ['a', 'b']) {
    const relative = `apps/${suffix}`
    const manifest = {
      name: `@fixture/${suffix}`,
      version: '1.0.0',
      ...(suffix === 'b' ? { devDependencies: { braces: '3.0.3' } } : {}),
    }
    lock.packages[relative] = manifest
    lock.packages[`node_modules/@fixture/${suffix}`] = { resolved: relative, link: true }
    await fs.mkdir(path.join(f.root, relative), { recursive: true })
    await fs.writeFile(path.join(f.root, relative, 'package.json'), JSON.stringify(manifest))
  }
  await fs.writeFile(path.join(f.root, 'package.json'), JSON.stringify(pkg))
  await fs.writeFile(path.join(f.root, 'package-lock.json'), JSON.stringify(lock))
  await fs.writeFile(path.join(f.root, '.npmrc'), 'workspace=apps/a\n')
  const base = [
    process.env.npm_execpath,
    'ls',
    'braces',
    '--json',
    '--all',
    '--long',
    '--package-lock-only',
    '--include=dev',
    `--prefix=${f.root}`,
  ]
  const partial = await runProcess(process.execPath, [...base, '--workspaces', '--include-workspace-root'], {
    cwd: f.root,
  })
  assert.equal(partial.code, 1)
  assert.equal(JSON.parse(partial.stdout).dependencies, undefined)
  const complete = await runProcess(process.execPath, [...base, ...workspaceScope(pkg, lock)], { cwd: f.root })
  assert.equal(complete.code, 0, complete.stderr.toString())
  const graph = JSON.parse(complete.stdout)
  assert.equal(graph.dependencies['@fixture/b'].dependencies.braces.name, 'braces')
})

test('production-only apply/verify skip absent dev copies without claiming full proof', async (t) => {
  const f = await fixture(t, { omitDev: true })
  assert.deepEqual((await applyOrVerify({ ...f, command: 'apply', mode: 'omit-dev' })).changed, [])
  assert.equal(
    (await applyOrVerify({ ...f, command: 'verify', mode: 'omit-dev' })).status,
    'verified-no-installed-development-copies',
  )
  await assert.rejects(() => applyOrVerify({ ...f, command: 'verify', mode: 'full' }), /MISSING_COPY/)
  await rejectsRun(f, transport(), /MISSING_COPY/)
})

test('registry identity, integrity and schema mismatches require review', () => {
  const record = {
    name: TRUST.name,
    version: TRUST.version,
    dist: { integrity: TRUST.integrity, tarball: TRUST.resolved },
  }
  assert.doesNotThrow(() => assertReviewedLatest(record))
  assert.throws(() => assertReviewedLatest({ ...record, name: 'renamed' }), /release changed/)
  assert.throws(
    () => assertReviewedLatest({ ...record, dist: { ...record.dist, integrity: 'sha512-other' } }),
    /release changed/,
  )
  assert.throws(() => assertReviewedLatest({ error: 'network' }), /release changed/)
})
