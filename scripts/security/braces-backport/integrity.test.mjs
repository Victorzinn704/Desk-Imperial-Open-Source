import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  TRUST,
  DEFAULT_MANIFEST,
  IntegrityError,
  inspectBracesInstallation,
  applyBracesPatch,
  verifyBracesPatch,
  hashPackageTree,
} from './integrity.mjs'

const experiment = fileURLToPath(new URL('.', import.meta.url))
const temporary = path.join(experiment, '.test-tmp')
const baseline = path.join(experiment, 'test-fixtures', 'registry')
const manifest = JSON.parse(await fs.readFile(DEFAULT_MANIFEST, 'utf8'))
await fs.mkdir(temporary, { recursive: true })
assert.equal(await fs.realpath(temporary), path.resolve(temporary))

async function safeCleanup(root) {
  // Deliberately validate the exact absolute temporary target before recursive rm.
  const target = path.resolve(root)
  assert.equal(path.dirname(target), path.resolve(temporary))
  assert.ok(path.basename(target).startsWith('case-'))
  const info = await fs.lstat(target)
  assert.ok(info.isDirectory() && !info.isSymbolicLink())
  assert.equal(await fs.realpath(target), target)
  await fs.rm(target, { recursive: true, force: false })
}

async function writeJson(filename, value) {
  await fs.mkdir(path.dirname(filename), { recursive: true })
  await fs.writeFile(filename, `${JSON.stringify(value, null, 2)}\n`)
}

async function fixture(t, { copies = ['node_modules/braces'], dev = true } = {}) {
  const root = await fs.mkdtemp(path.join(temporary, 'case-'))
  t.after(() => safeCleanup(root))
  const lock = {
    name: 'integrity-fixture',
    lockfileVersion: 3,
    packages: { '': { name: 'integrity-fixture', version: '1.0.0' } },
  }
  await writeJson(path.join(root, 'package.json'), { name: 'integrity-fixture', version: '1.0.0', private: true })
  async function ordinaryPackage(relative, name = path.posix.basename(relative), metadata = {}) {
    lock.packages[relative] = { name, version: '1.0.0', ...metadata }
    await writeJson(path.join(root, relative, 'package.json'), { name, version: '1.0.0' })
  }
  async function install(relative, { registered = true, development = dev } = {}) {
    for (const filename of Object.keys(manifest.files)) {
      const target = path.join(root, relative, filename)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.copyFile(path.join(baseline, `${filename}.txt`), target)
    }
    if (registered)
      lock.packages[relative] = {
        name: TRUST.name,
        version: TRUST.version,
        resolved: TRUST.resolved,
        integrity: TRUST.integrity,
        ...(development ? { dev: true } : {}),
      }
  }
  const save = () => writeJson(path.join(root, 'package-lock.json'), lock)
  for (const relative of copies) await install(relative)
  await save()
  return { root, lock, install, ordinaryPackage, save }
}

const rejects = (action, ...codes) =>
  assert.rejects(
    action,
    (error) => error instanceof IntegrityError && (codes.length === 0 || codes.includes(error.code)),
  )
const read = (root, filename) => fs.readFile(path.join(root, filename))

test('exact registry bytes: inspect, apply, verify and repeated apply; package identity unchanged', async (t) => {
  const { root } = await fixture(t)
  const originalPackage = await read(root, 'node_modules/braces/package.json')
  assert.equal((await inspectBracesInstallation({ root })).copies[0].state, 'base')
  await rejects(() => verifyBracesPatch({ root }), 'UNPATCHED')
  const first = await applyBracesPatch({ root })
  assert.deepEqual(first.changed, ['node_modules/braces'])
  assert.equal(first.copies[0].state, 'patched')
  assert.equal(Object.keys(first.copies[0].hashes).length, 10)
  assert.equal(first.copies[0].treeSha256, '9ecd6e810fba3088d57ae73871a46e990a30b04ff1ea6b7b6b2f3e299dc40d52')
  assert.equal(first.expectedTrees.baseSha256, '5c8c510001901c3df48d6f694200b95aba9d6c6330f3abba52510a0b954335e5')
  assert.equal((await verifyBracesPatch({ root })).status, 'verified')
  const second = await applyBracesPatch({ root })
  assert.deepEqual(second.changed, [])
  assert.deepEqual(first.copies[0].hashes, second.copies[0].hashes)
  assert.deepEqual(await read(root, 'node_modules/braces/package.json'), originalPackage)
})

test('inventories hoisted, nested and npm alias copies', async (t) => {
  const fixture_ = await fixture(t, {
    copies: ['node_modules/braces', 'node_modules/alias-braces', 'node_modules/consumer/node_modules/braces'],
  })
  await fixture_.ordinaryPackage('node_modules/consumer', 'consumer', { dependencies: { braces: '^3.0.3' } })
  fixture_.lock.packages[''].devDependencies = { braces: '3.0.3', 'alias-braces': 'npm:braces@3.0.3' }
  await fixture_.save()
  const report = await applyBracesPatch({ root: fixture_.root })
  assert.equal(report.copies.length, 3)
  assert.equal(report.changed.length, 3)
  assert.ok(report.copies.every((copy) => copy.state === 'patched'))
})

test('finds registry identity even when alias lock entry omits name', async (t) => {
  const fixture_ = await fixture(t, { copies: ['node_modules/alias'] })
  delete fixture_.lock.packages['node_modules/alias'].name
  fixture_.lock.packages[''].dependencies = { alias: 'npm:braces@3.0.3' }
  await fixture_.save()
  assert.equal((await applyBracesPatch({ root: fixture_.root })).copies[0].path, 'node_modules/alias')
})

test('workspace packages and registered internal workspace links are traversed once', async (t) => {
  const fixture_ = await fixture(t, { copies: ['apps/web/node_modules/braces'] })
  await fixture_.ordinaryPackage('apps/web', '@fixture/web', { dependencies: { braces: '^3.0.3' } })
  fixture_.lock.packages['node_modules/@fixture/web'] = { resolved: 'apps/web', link: true }
  await fs.mkdir(path.join(fixture_.root, 'node_modules/@fixture'), { recursive: true })
  await fs.symlink(
    path.join(fixture_.root, 'apps/web'),
    path.join(fixture_.root, 'node_modules/@fixture/web'),
    'junction',
  )
  await fixture_.save()
  const report = await applyBracesPatch({ root: fixture_.root })
  assert.equal(report.copies.length, 1)
  assert.deepEqual(report.workspaceLinks, [{ path: 'node_modules/@fixture/web', target: 'apps/web' }])
})

test('legitimate nested dependency directory is inventoried separately from package files', async (t) => {
  const fixture_ = await fixture(t)
  await fixture_.ordinaryPackage('node_modules/braces/node_modules/fill-range', 'fill-range')
  await fixture_.save()
  assert.equal((await applyBracesPatch({ root: fixture_.root })).copies.length, 1)
})

test('rejects an unregistered package hidden in nested dependencies', async (t) => {
  const fixture_ = await fixture(t)
  await fixture_.ordinaryPackage('node_modules/braces/node_modules/fill-range', 'fill-range')
  await writeJson(path.join(fixture_.root, 'node_modules/braces/node_modules/extra/package.json'), {
    name: 'extra',
    version: '1.0.0',
  })
  await fixture_.save()
  await rejects(() => applyBracesPatch({ root: fixture_.root }), 'EXTRA_PACKAGE')
})

test('rejects a loose JavaScript file shadowing a legitimate nested dependency', async (t) => {
  const fixture_ = await fixture(t)
  await fixture_.ordinaryPackage('node_modules/braces/node_modules/fill-range', 'fill-range')
  await fs.writeFile(
    path.join(fixture_.root, 'node_modules/braces/node_modules/fill-range.js'),
    'throw new Error("never executed")',
  )
  await fixture_.save()
  await rejects(() => applyBracesPatch({ root: fixture_.root }), 'EXTRA_PACKAGE')
})

test('canonical package tree hash is stable across property order and binds paths', () => {
  const one = { 'index.js': 'a'.repeat(64), 'lib/x.js': 'b'.repeat(64) }
  const two = { 'lib/x.js': 'b'.repeat(64), 'index.js': 'a'.repeat(64) }
  assert.equal(hashPackageTree(one), hashPackageTree(two))
  assert.notEqual(hashPackageTree(one), hashPackageTree({ ...two, 'lib/y.js': 'b'.repeat(64) }))
  assert.throws(() => hashPackageTree({ '../bad': 'a'.repeat(64) }), IntegrityError)
})

test('real resolve test fixture without package.json is not an independent npm installation', async (t) => {
  const fixture_ = await fixture(t)
  await fixture_.ordinaryPackage('node_modules/resolve', 'resolve')
  const fixtureRoot = 'node_modules/resolve/test/shadowed_core/node_modules'
  await fs.mkdir(path.join(fixture_.root, fixtureRoot, 'util'), { recursive: true })
  await fs.writeFile(path.join(fixture_.root, fixtureRoot, 'util/index.js'), 'module.exports = {};')
  await fs.writeFile(path.join(fixture_.root, fixtureRoot, 'util.js'), 'module.exports = {};')
  await fixture_.save()
  const report = await applyBracesPatch({ root: fixture_.root })
  assert.equal(report.copies.length, 1)
  assert.ok(report.nonInstallNodeModules.includes(fixtureRoot))
  assert.ok(report.nonInstallManifests.some((entry) => entry.path === `${fixtureRoot}/util/package.json`))
})

test('bundled malformed unrelated manifest is classified but does not hide a nested braces copy', async (t) => {
  const fixture_ = await fixture(t)
  await fixture_.ordinaryPackage('node_modules/resolve', 'resolve')
  const location = 'node_modules/resolve/test/resolver/node_modules/foo'
  await fs.mkdir(path.join(fixture_.root, location), { recursive: true })
  await fs.writeFile(path.join(fixture_.root, location, 'package.json'), '{broken fixture')
  await fixture_.save()
  assert.equal((await inspectBracesInstallation({ root: fixture_.root })).nonInstallManifests.length, 1)
  await fixture_.install(`${location}/node_modules/hidden-alias`, { registered: false })
  await rejects(() => inspectBracesInstallation({ root: fixture_.root }), 'EXTRA_COPY')
})

test('derived standalone tree is classified and an extra generated braces copy still fails', async (t) => {
  const fixture_ = await fixture(t)
  const derived = 'apps/web/.next/standalone/node_modules'
  await writeJson(path.join(fixture_.root, derived, 'unrelated/package.json'), { name: 'unrelated', version: '1.0.0' })
  const report = await inspectBracesInstallation({ root: fixture_.root })
  assert.ok(report.nonInstallNodeModules.includes(derived))
  await fixture_.install(`${derived}/generated-alias`, { registered: false })
  await rejects(() => inspectBracesInstallation({ root: fixture_.root }), 'EXTRA_COPY')
})

test('internal generated Next link is classified; target is traversed independently', async (t) => {
  const fixture_ = await fixture(t)
  await fixture_.ordinaryPackage('node_modules/import-in-the-middle', 'import-in-the-middle')
  const generated = 'apps/web/.next/node_modules/import-in-the-middle-hash'
  await fs.mkdir(path.dirname(path.join(fixture_.root, generated)), { recursive: true })
  await fs.symlink(
    path.join(fixture_.root, 'node_modules/import-in-the-middle'),
    path.join(fixture_.root, generated),
    'junction',
  )
  await fixture_.save()
  const report = await inspectBracesInstallation({ root: fixture_.root })
  assert.deepEqual(report.derivedLinks, [{ path: generated, target: 'node_modules/import-in-the-middle' }])
})

test('derived link to braces is never silently treated as an unrelated generated link', async (t) => {
  const { root } = await fixture(t)
  const generated = path.join(root, 'apps/web/.next/node_modules/alias')
  await fs.mkdir(path.dirname(generated), { recursive: true })
  await fs.symlink(path.join(root, 'node_modules/braces'), generated, 'junction')
  await rejects(() => inspectBracesInstallation({ root }), 'SYMLINK')
})

for (const [label, mutate] of [
  [
    'different version',
    (entry) => {
      entry.version = '3.0.4'
    },
  ],
  [
    'different SRI',
    (entry) => {
      entry.integrity = 'sha512-invalid'
    },
  ],
  [
    'Git URL',
    (entry) => {
      entry.resolved = 'git+https://github.com/micromatch/braces.git'
    },
  ],
  [
    'registry mirror',
    (entry) => {
      entry.resolved = 'https://mirror.invalid/braces-3.0.3.tgz'
    },
  ],
  [
    'different declared name',
    (entry) => {
      entry.name = 'not-braces'
    },
  ],
]) {
  test(`rejects lock pin mismatch: ${label}`, async (t) => {
    const fixture_ = await fixture(t)
    mutate(fixture_.lock.packages['node_modules/braces'])
    await fixture_.save()
    await rejects(() => applyBracesPatch({ root: fixture_.root }), 'LOCK_PIN')
  })
}

test('rejects aliases renamed to another package despite npm:braces dependency specification', async (t) => {
  const fixture_ = await fixture(t, { copies: ['node_modules/alias'] })
  fixture_.lock.packages[''].dependencies = { alias: 'npm:braces@3.0.3' }
  fixture_.lock.packages['node_modules/alias'] = {
    name: 'fake',
    version: '1.0.0',
    resolved: 'https://registry.npmjs.org/fake/-/fake-1.0.0.tgz',
    integrity: 'fake',
  }
  await fixture_.save()
  await rejects(() => inspectBracesInstallation({ root: fixture_.root }), 'LOCK_PIN')
})

test('rejects a missing lock target for a braces dependency', async (t) => {
  const fixture_ = await fixture(t, { copies: [] })
  fixture_.lock.packages[''].dependencies = { braces: '3.0.3' }
  await fixture_.save()
  await rejects(() => inspectBracesInstallation({ root: fixture_.root }), 'LOCK')
})

for (const relative of ['node_modules/unregistered-alias', 'node_modules/braces-extra']) {
  test(`rejects extra installed braces identity at ${relative}`, async (t) => {
    const fixture_ = await fixture(t)
    await fixture_.install(relative, { registered: false })
    await rejects(() => applyBracesPatch({ root: fixture_.root }), 'EXTRA_COPY')
  })
}

test('rejects tamper in unchanged utils.js before changing any other copy', async (t) => {
  const fixture_ = await fixture(t, { copies: ['node_modules/braces', 'node_modules/second'] })
  const before = await read(fixture_.root, 'node_modules/braces/lib/parse.js')
  await fs.appendFile(path.join(fixture_.root, 'node_modules/second/lib/utils.js'), '\n// tamper\n')
  await rejects(() => applyBracesPatch({ root: fixture_.root }), 'FILE_HASH')
  assert.deepEqual(await read(fixture_.root, 'node_modules/braces/lib/parse.js'), before)
})

for (const filename of ['LICENSE', 'README.md', 'index.js']) {
  test(`rejects tamper in original tarball file ${filename}`, async (t) => {
    const { root } = await fixture(t)
    await fs.appendFile(path.join(root, 'node_modules/braces', filename), '\ntamper')
    await rejects(() => applyBracesPatch({ root }), 'FILE_HASH')
  })
}

test('rejects package metadata changes even with original name/version', async (t) => {
  const { root } = await fixture(t)
  const filename = path.join(root, 'node_modules/braces/package.json')
  const value = JSON.parse(await fs.readFile(filename, 'utf8'))
  value.description += ' changed'
  await writeJson(filename, value)
  await rejects(() => applyBracesPatch({ root }), 'FILE_HASH')
})

test('rejects changed installed package name/version', async (t) => {
  const { root } = await fixture(t)
  await writeJson(path.join(root, 'node_modules/braces/package.json'), { name: 'braces', version: '9.0.0' })
  await rejects(() => applyBracesPatch({ root }), 'IDENTITY')
})

test('rejects unreadable installed manifest', async (t) => {
  const { root } = await fixture(t)
  await fs.writeFile(path.join(root, 'node_modules/braces/package.json'), '{bad JSON')
  await rejects(() => applyBracesPatch({ root }), 'JSON')
})

test('rejects a missing original tarball file', async (t) => {
  const { root } = await fixture(t)
  await fs.unlink(path.join(root, 'node_modules/braces/LICENSE'))
  await rejects(() => applyBracesPatch({ root }), 'FILE_SET')
})

test('rejects extra executable file', async (t) => {
  const { root } = await fixture(t)
  await fs.writeFile(path.join(root, 'node_modules/braces/lib/extra.js'), 'throw new Error("not executed")')
  await rejects(() => applyBracesPatch({ root }), 'FILE_SET')
})

test('rejects extra empty directory', async (t) => {
  const { root } = await fixture(t)
  await fs.mkdir(path.join(root, 'node_modules/braces/unexpected'))
  await rejects(() => applyBracesPatch({ root }), 'FILE_SET')
})

test('rejects a partially applied patch instead of treating it as idempotent', async (t) => {
  const { root } = await fixture(t)
  await fs.copyFile(
    path.join(path.dirname(DEFAULT_MANIFEST), manifest.payload['lib/parse.js']),
    path.join(root, 'node_modules/braces/lib/parse.js'),
  )
  await rejects(() => applyBracesPatch({ root }), 'FILE_HASH')
})

test('rejects line-ending tamper in installed bytes', async (t) => {
  const { root } = await fixture(t)
  const filename = path.join(root, 'node_modules/braces/lib/parse.js')
  await fs.writeFile(filename, (await fs.readFile(filename, 'utf8')).replaceAll('\n', '\r\n'))
  await rejects(() => applyBracesPatch({ root }), 'FILE_HASH')
})

test('rejects patched-copy tampering during a subsequent verification', async (t) => {
  const { root } = await fixture(t)
  await applyBracesPatch({ root })
  await fs.appendFile(path.join(root, 'node_modules/braces/lib/parse.js'), '// later tamper')
  await rejects(() => verifyBracesPatch({ root }), 'FILE_HASH')
})

test('rejects hard-linked installed file', async (t) => {
  const { root } = await fixture(t)
  const filename = path.join(root, 'node_modules/braces/LICENSE')
  const other = path.join(root, 'linked-license')
  await fs.link(filename, other)
  await rejects(() => applyBracesPatch({ root }), 'HARDLINK')
})

test('rejects package junction escaping the installation root', async (t) => {
  const outside = await fixture(t)
  const fixture_ = await fixture(t, { copies: [] })
  fixture_.lock.packages['node_modules/braces'] = {
    name: TRUST.name,
    version: TRUST.version,
    resolved: TRUST.resolved,
    integrity: TRUST.integrity,
  }
  await fs.mkdir(path.join(fixture_.root, 'node_modules'))
  await fs.symlink(
    path.join(outside.root, 'node_modules/braces'),
    path.join(fixture_.root, 'node_modules/braces'),
    'junction',
  )
  await fixture_.save()
  await rejects(() => applyBracesPatch({ root: fixture_.root }), 'SYMLINK_ESCAPE')
})

test('rejects symlink directory inside braces even when it remains inside root', async (t) => {
  const { root } = await fixture(t)
  await fs.mkdir(path.join(root, 'other'))
  await fs.symlink(path.join(root, 'other'), path.join(root, 'node_modules/braces/redirect'), 'junction')
  await rejects(() => applyBracesPatch({ root }), 'SYMLINK')
})

test('rejects a workspace link that points to a different internal directory', async (t) => {
  const fixture_ = await fixture(t)
  await fixture_.ordinaryPackage('apps/one', 'one')
  await fixture_.ordinaryPackage('apps/two', 'two')
  fixture_.lock.packages['node_modules/one'] = { link: true, resolved: 'apps/one' }
  await fs.symlink(path.join(fixture_.root, 'apps/two'), path.join(fixture_.root, 'node_modules/one'), 'junction')
  await fixture_.save()
  await rejects(() => applyBracesPatch({ root: fixture_.root }), 'SYMLINK')
})

test('rejects a root directory that is itself a junction', async (t) => {
  const fixture_ = await fixture(t)
  const holder = await fixture(t, { copies: [] })
  const link = path.join(holder.root, 'linked-root')
  await fs.symlink(fixture_.root, link, 'junction')
  await rejects(() => inspectBracesInstallation({ root: link }), 'ROOT')
})

for (const [label, mutate, expected] of [
  ['unreadable', async (location) => fs.writeFile(location, '{broken'), 'MANIFEST_HASH'],
  [
    'changed identity',
    async (location) => {
      const value = JSON.parse(await fs.readFile(location, 'utf8'))
      value.package.version = '3.0.4'
      await writeJson(location, value)
    },
    'MANIFEST_HASH',
  ],
  [
    'payload changed',
    async (location) =>
      fs.appendFile(path.join(path.dirname(location), manifest.payload['lib/compile.js']), '\nchanged'),
    'PAYLOAD_HASH',
  ],
  [
    'provenance patch changed',
    async (location) => fs.appendFile(path.join(path.dirname(location), manifest.patch.path), '\nchanged'),
    'PATCH_HASH',
  ],
]) {
  test(`rejects asset bundle: ${label}`, async (t) => {
    const { root } = await fixture(t)
    const copied = path.join(root, 'bundle')
    await fs.cp(path.dirname(DEFAULT_MANIFEST), copied, { recursive: true })
    const manifestPath = path.join(copied, 'patch-manifest.json')
    await mutate(manifestPath)
    await rejects(() => applyBracesPatch({ root, manifestPath }), expected)
  })
}

test('rejects a missing manifest', async (t) => {
  const { root } = await fixture(t)
  await rejects(() => inspectBracesInstallation({ root, manifestPath: path.join(root, 'missing.json') }), 'MISSING')
})

test('full verification rejects an empty installation even without audit input', async (t) => {
  const { root } = await fixture(t, { copies: [] })
  await rejects(() => verifyBracesPatch({ root }), 'EMPTY_EVIDENCE')
})

test('full installation rejects locked copies missing from disk', async (t) => {
  const fixture_ = await fixture(t, { copies: [] })
  fixture_.lock.packages['node_modules/braces'] = {
    name: TRUST.name,
    version: TRUST.version,
    resolved: TRUST.resolved,
    integrity: TRUST.integrity,
    dev: true,
  }
  await fixture_.save()
  await rejects(() => applyBracesPatch({ root: fixture_.root }), 'MISSING_COPY')
})

test('omit-dev skips zero installed copies only if all missing copies are dev', async (t) => {
  const fixture_ = await fixture(t, { copies: [] })
  fixture_.lock.packages['node_modules/braces'] = {
    name: TRUST.name,
    version: TRUST.version,
    resolved: TRUST.resolved,
    integrity: TRUST.integrity,
    dev: true,
  }
  await fixture_.save()
  const report = await applyBracesPatch({ root: fixture_.root, mode: 'omit-dev' })
  assert.equal(report.status, 'skipped-no-installed-copies')
  assert.deepEqual(report.changed, [])
  assert.deepEqual(report.missingDevCopies, ['node_modules/braces'])
  delete fixture_.lock.packages['node_modules/braces'].dev
  await fixture_.save()
  await rejects(() => applyBracesPatch({ root: fixture_.root, mode: 'omit-dev' }), 'MISSING_COPY')
})

test('omit-dev patches remaining runtime copy while permitting missing dev alias', async (t) => {
  const fixture_ = await fixture(t, { dev: false })
  fixture_.lock.packages['node_modules/dev-alias'] = {
    name: TRUST.name,
    version: TRUST.version,
    resolved: TRUST.resolved,
    integrity: TRUST.integrity,
    dev: true,
  }
  await fixture_.save()
  const report = await applyBracesPatch({ root: fixture_.root, mode: 'omit-dev' })
  assert.equal(report.copies[0].state, 'patched')
  assert.deepEqual(report.missingDevCopies, ['node_modules/dev-alias'])
})

test('audit chain never accepts empty omit-dev proof', async (t) => {
  const { root } = await fixture(t, { copies: [] })
  const auditReport = { vulnerabilities: { micromatch: { name: 'micromatch', via: ['braces'], nodes: [] } } }
  await rejects(() => inspectBracesInstallation({ root, mode: 'omit-dev', auditReport }), 'EMPTY_EVIDENCE')
})

test('correlates audit nodes with physical verified copies', async (t) => {
  const { root } = await fixture(t)
  await applyBracesPatch({ root })
  const auditReport = { vulnerabilities: { braces: { name: 'braces', via: [], nodes: ['node_modules/braces'] } } }
  const report = await verifyBracesPatch({ root, auditReport })
  assert.equal(report.audit.requiresBraces, true)
  auditReport.vulnerabilities.braces.nodes.push('node_modules/missing')
  await rejects(() => verifyBracesPatch({ root, auditReport }), 'AUDIT_NODE')
})

test('rejects malformed audit document', async (t) => {
  const { root } = await fixture(t)
  await rejects(() => inspectBracesInstallation({ root, auditReport: {} }), 'AUDIT')
})

test('rejects lock path traversal', async (t) => {
  const fixture_ = await fixture(t)
  fixture_.lock.packages['../outside/node_modules/braces'] = fixture_.lock.packages['node_modules/braces']
  await fixture_.save()
  await rejects(() => inspectBracesInstallation({ root: fixture_.root }), 'PATH')
})

test('rejects unsupported lock v1', async (t) => {
  const fixture_ = await fixture(t)
  fixture_.lock.lockfileVersion = 1
  await fixture_.save()
  await rejects(() => inspectBracesInstallation({ root: fixture_.root }), 'LOCK')
})

test('rejects unreadable package-lock.json', async (t) => {
  const { root } = await fixture(t)
  await fs.writeFile(path.join(root, 'package-lock.json'), 'broken')
  await rejects(() => inspectBracesInstallation({ root }), 'JSON')
})

test('rejects npm-shrinkwrap precedence instead of inspecting the wrong lock', async (t) => {
  const { root } = await fixture(t)
  await writeJson(path.join(root, 'npm-shrinkwrap.json'), {})
  await rejects(() => inspectBracesInstallation({ root }), 'LOCK')
})
