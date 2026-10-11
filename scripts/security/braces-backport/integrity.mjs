import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Trust anchors, deliberately independent of the supplied manifest and lockfile.
export const TRUST = Object.freeze({
  manifestSha256: '9fae38b0c4d4598949abd57d18a1f26476ee74553c0b5ac3b8ef6820903e8c94',
  name: 'braces',
  version: '3.0.3',
  resolved: 'https://registry.npmjs.org/braces/-/braces-3.0.3.tgz',
  integrity: 'sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==',
  upstreamSha: 'd44b9b1ee12e7804d4232d5a47a4a0c61d2fbefe',
})

export const DEFAULT_MANIFEST = fileURLToPath(new URL('./bundle/patch-manifest.json', import.meta.url))
const own = (object, key) => Object.hasOwn(object, key)
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const normalized = (value) => (process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value))
const samePath = (left, right) => normalized(left) === normalized(right)
const inside = (root, target) => {
  const relative = path.relative(root, target)
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
}

/** Canonical hash of package-owned files and their implied directories.
 * Nested node_modules is separate installation layout, inventoried via the lock.
 */
export function hashPackageTree(hashes) {
  const directories = new Set()
  for (const filename of Object.keys(hashes)) {
    relativePath(filename)
    requireThat(/^[a-f0-9]{64}$/.test(hashes[filename]), 'TREE_HASH', `Invalid file digest: ${filename}`)
    let directory = path.posix.dirname(filename)
    while (directory !== '.') {
      directories.add(directory)
      directory = path.posix.dirname(directory)
    }
  }
  const entries = [
    ...[...directories].map((filename) => ({ path: filename, type: 'directory', sha256: null })),
    ...Object.entries(hashes).map(([filename, digest]) => ({ path: filename, type: 'file', sha256: digest })),
  ].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))
  return sha256(JSON.stringify(entries))
}

export class IntegrityError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`)
    this.name = 'IntegrityError'
    this.code = code
  }
}

const fail = (code, message) => {
  throw new IntegrityError(code, message)
}
const requireThat = (condition, code, message) => {
  if (!condition) fail(code, message)
}

function relativePath(value, { empty = false } = {}) {
  requireThat(typeof value === 'string' && (empty || value.length > 0), 'PATH', 'Expected a nonempty relative path')
  requireThat(
    !value.includes('\\') && !value.includes(':') && !value.includes('\0') && !value.startsWith('/'),
    'PATH',
    `Unsafe path: ${value}`,
  )
  if (value === '' && empty) return value
  requireThat(
    value.split('/').every((part) => part !== '' && part !== '.' && part !== '..'),
    'PATH',
    `Unsafe path: ${value}`,
  )
  return value
}

async function statMaybe(filename) {
  try {
    return await fs.lstat(filename)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function safeRoot(value) {
  requireThat(typeof value === 'string' && value.length > 0, 'ROOT', 'A project root is required')
  const root = path.resolve(value)
  const info = await fs.lstat(root)
  requireThat(info.isDirectory() && !info.isSymbolicLink(), 'ROOT', 'Project root must be a real directory')
  requireThat(samePath(await fs.realpath(root), root), 'SYMLINK', 'Project root traverses a symlink/junction')
  return root
}

async function ordinaryPath(root, relative, { directory = false, missing = false } = {}) {
  relativePath(relative)
  const segments = relative.split('/')
  let current = root
  for (let index = 0; index < segments.length; index++) {
    current = path.join(current, segments[index])
    const info = await statMaybe(current)
    if (!info && missing && index === segments.length - 1) return null
    requireThat(info, 'MISSING', `Missing path: ${relative}`)
    requireThat(!info.isSymbolicLink(), 'SYMLINK', `Symlink/junction forbidden: ${relative}`)
    if (index < segments.length - 1 || directory)
      requireThat(info.isDirectory(), 'TYPE', `Expected directory: ${relative}`)
    else {
      requireThat(info.isFile(), 'TYPE', `Expected regular file: ${relative}`)
      requireThat(info.nlink === 1, 'HARDLINK', `Hard-linked file forbidden: ${relative}`)
    }
  }
  requireThat(inside(root, await fs.realpath(current)), 'SYMLINK', `Path escapes root: ${relative}`)
  return current
}

async function readOrdinary(root, relative) {
  const filename = await ordinaryPath(root, relative)
  return fs.readFile(filename)
}

function json(bytes, label) {
  try {
    return JSON.parse(bytes.toString('utf8'))
  } catch {
    fail('JSON', `Unreadable JSON: ${label}`)
  }
}

async function loadBundle(manifestPath) {
  const manifestAbsolute = path.resolve(manifestPath)
  const bundleRoot = await safeRoot(path.dirname(manifestAbsolute))
  const bytes = await readOrdinary(bundleRoot, path.basename(manifestAbsolute))
  requireThat(
    sha256(bytes) === TRUST.manifestSha256,
    'MANIFEST_HASH',
    'Manifest bytes do not match the fixed trust anchor',
  )
  const manifest = json(bytes, 'patch manifest')
  requireThat(manifest.schemaVersion === 1, 'MANIFEST', 'Unsupported manifest schema')
  for (const key of ['name', 'version', 'resolved', 'integrity']) {
    requireThat(manifest.package?.[key] === TRUST[key], 'MANIFEST', `Unexpected package ${key}`)
  }
  requireThat(manifest.upstream?.sha === TRUST.upstreamSha, 'MANIFEST', 'Unexpected upstream commit')
  const files = Object.keys(manifest.files ?? {}).sort()
  requireThat(files.length > 0 && files.includes('package.json'), 'MANIFEST', 'Empty/incomplete file inventory')
  for (const filename of files) {
    relativePath(filename)
    const entry = manifest.files[filename]
    requireThat(
      /^[a-f0-9]{64}$/.test(entry.baseSha256) && /^[a-f0-9]{64}$/.test(entry.patchedSha256),
      'MANIFEST',
      `Invalid digest: ${filename}`,
    )
  }
  const changed = files.filter(
    (filename) => manifest.files[filename].baseSha256 !== manifest.files[filename].patchedSha256,
  )
  const payloadNames = Object.keys(manifest.payload ?? {}).sort()
  requireThat(
    JSON.stringify(changed) === JSON.stringify(payloadNames),
    'MANIFEST',
    'Payload must exactly cover changed files',
  )
  const payload = new Map()
  for (const filename of changed) {
    const value = await readOrdinary(bundleRoot, relativePath(manifest.payload[filename]))
    requireThat(
      sha256(value) === manifest.files[filename].patchedSha256,
      'PAYLOAD_HASH',
      `Payload changed: ${filename}`,
    )
    payload.set(filename, value)
  }
  const patchBytes = await readOrdinary(bundleRoot, relativePath(manifest.patch.path))
  requireThat(sha256(patchBytes) === manifest.patch.sha256, 'PATCH_HASH', 'Provenance patch changed')
  return { manifest, payload, files }
}

function packageLocation(relative) {
  const parts = relative.split('/')
  const index = parts.lastIndexOf('node_modules')
  if (index < 0) return false
  const tail = parts.slice(index + 1)
  return tail.length === 1
    ? tail[0] && !tail[0].startsWith('.') && !tail[0].startsWith('@')
    : tail.length === 2 && tail[0].startsWith('@') && !tail[1].startsWith('.')
}

function packageBasename(relative) {
  const parts = relative.split('/')
  const last = parts.at(-1)
  return parts.at(-2)?.startsWith('@') ? `${parts.at(-2)}/${last}` : last
}

function lockedModuleOwner(relative, packages) {
  const parts = relative.split('/')
  const index = parts.lastIndexOf('node_modules')
  if (index < 0) return false
  const owner = parts.slice(0, index).join('/')
  return owner === '' || (own(packages, owner) && packages[owner].link !== true)
}

function resolveLockedDependency(packages, from, dependency) {
  requireThat(/^(?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+$/.test(dependency), 'LOCK', 'Unsafe dependency name')
  let cursor = from
  while (true) {
    if (path.posix.basename(cursor) !== 'node_modules') {
      const candidate = cursor ? `${cursor}/node_modules/${dependency}` : `node_modules/${dependency}`
      if (own(packages, candidate)) return candidate
    }
    if (cursor === '') return null
    const next = path.posix.dirname(cursor)
    cursor = next === '.' ? '' : next
  }
}

function lockTargets(lock) {
  requireThat(
    [2, 3].includes(lock.lockfileVersion) &&
      lock.packages &&
      typeof lock.packages === 'object' &&
      !Array.isArray(lock.packages),
    'LOCK',
    'Only npm lockfile v2/v3 packages maps are supported',
  )
  const packages = lock.packages
  requireThat(own(packages, ''), 'LOCK', 'Missing root lock entry')
  const seen = new Set()
  const targets = new Set()
  for (const [relative, entry] of Object.entries(packages)) {
    relativePath(relative, { empty: true })
    const folded = process.platform === 'win32' ? relative.toLowerCase() : relative
    requireThat(!seen.has(folded), 'LOCK', `Case-colliding lock paths: ${relative}`)
    seen.add(folded)
    requireThat(entry && typeof entry === 'object' && !Array.isArray(entry), 'LOCK', `Invalid entry: ${relative}`)
    if (
      relative &&
      (packageBasename(relative) === TRUST.name || entry.name === TRUST.name || entry.resolved === TRUST.resolved)
    )
      targets.add(relative)
    if (entry.link) {
      relativePath(entry.resolved)
      requireThat(
        entry.resolved !== '.git' && !entry.resolved.startsWith('.git/'),
        'LOCK',
        'Workspace cannot point into .git',
      )
    }
    for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, spec] of Object.entries(entry[kind] ?? {})) {
        if (name !== TRUST.name && !(typeof spec === 'string' && /^npm:braces(?:@|$)/.test(spec))) continue
        const target = resolveLockedDependency(packages, relative, name)
        requireThat(target, 'LOCK', `No locked target for ${name} declared by ${relative || '<root>'}`)
        targets.add(target)
      }
    }
  }
  for (const relative of targets) {
    const entry = packages[relative]
    requireThat(!entry.link, 'LOCK_PIN', `Local/workspace replacement of braces forbidden: ${relative}`)
    requireThat(
      entry.version === TRUST.version &&
        entry.resolved === TRUST.resolved &&
        entry.integrity === TRUST.integrity &&
        (!own(entry, 'name') || entry.name === TRUST.name),
      'LOCK_PIN',
      `Registry/version/SRI identity changed: ${relative}`,
    )
  }
  return targets
}

async function discover(root, lock, targets) {
  const copies = new Map()
  const links = []
  const derivedLinks = []
  const nonInstallNodeModules = new Set()
  const nonInstallManifests = []
  const packages = lock.packages
  const stack = ['']
  while (stack.length > 0) {
    const relative = stack.pop()
    const directory = path.join(root, relative)
    if (path.posix.basename(relative) === 'node_modules' && !lockedModuleOwner(relative, packages))
      nonInstallNodeModules.add(relative)
    const isPackage =
      relative !== '' && (packageLocation(relative) || (own(packages, relative) && !packages[relative].link))
    if (isPackage) {
      const manifestRelative = `${relative}/package.json`
      const effective = lockedModuleOwner(relative, packages) || own(packages, relative)
      const required = effective || packageBasename(relative) === TRUST.name || targets.has(relative)
      let value
      if (required || (await statMaybe(path.join(root, manifestRelative)))) {
        try {
          value = json(await readOrdinary(root, manifestRelative), manifestRelative)
          requireThat(
            value && typeof value === 'object' && !Array.isArray(value),
            'JSON',
            `Invalid package manifest: ${manifestRelative}`,
          )
        } catch (error) {
          if (required || error.code !== 'JSON') throw error
          nonInstallManifests.push({ path: manifestRelative, reason: 'unrelated-bundled-manifest-not-valid-json' })
        }
      } else
        nonInstallManifests.push({ path: manifestRelative, reason: 'unrelated-bundled-directory-without-manifest' })
      if (value?.name === TRUST.name || packageBasename(relative) === TRUST.name || targets.has(relative)) {
        requireThat(
          value.name === TRUST.name && value.version === TRUST.version,
          'IDENTITY',
          `Installed name/version mismatch: ${relative}`,
        )
        requireThat(targets.has(relative), 'EXTRA_COPY', `Unregistered braces installation: ${relative}`)
        copies.set(relative, { path: relative, name: value.name, version: value.version })
      }
      if (effective)
        requireThat(own(packages, relative), 'EXTRA_PACKAGE', `Installed package absent from lock: ${relative}`)
    }
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.name === '.git') continue
      const next = relative ? `${relative}/${entry.name}` : entry.name
      const filename = path.join(root, next)
      const parts = relative.split('/')
      const moduleContainer =
        parts.at(-1) === 'node_modules' || (parts.at(-2) === 'node_modules' && parts.at(-1).startsWith('@'))
      if (moduleContainer && lockedModuleOwner(relative, packages) && entry.isFile()) {
        requireThat(
          parts.at(-1) === 'node_modules' && entry.name === '.package-lock.json',
          'EXTRA_PACKAGE',
          `Unexpected loose file in package resolution directory: ${next}`,
        )
      }
      if (entry.isSymbolicLink()) {
        const target = await fs.realpath(filename)
        requireThat(inside(root, target), 'SYMLINK_ESCAPE', `Symlink/junction escapes project: ${next}`)
        const info = await fs.stat(filename)
        if (info.isDirectory()) {
          const locked = packages[next]
          const effective = own(packages, next) || (packageLocation(next) && lockedModuleOwner(next, packages))
          if (effective) {
            requireThat(locked?.link === true, 'SYMLINK', `Unregistered installation directory symlink: ${next}`)
            requireThat(
              samePath(target, path.resolve(root, locked.resolved)),
              'SYMLINK',
              `Workspace target differs from lock: ${next}`,
            )
            requireThat(
              own(packages, locked.resolved) && !packages[locked.resolved].link,
              'LOCK',
              `Workspace target missing from lock: ${next}`,
            )
            const linkedManifest = json(
              await readOrdinary(root, `${locked.resolved}/package.json`),
              `${locked.resolved}/package.json`,
            )
            requireThat(
              linkedManifest.name !== TRUST.name && !targets.has(next),
              'SYMLINK',
              `Linked braces installation forbidden: ${next}`,
            )
            links.push({ path: next, target: locked.resolved })
          } else {
            const targetRelative = path.relative(root, target).split(path.sep).join('/')
            requireThat(
              !targetRelative.split('/').includes('.git'),
              'SYMLINK',
              `Derived link targets excluded Git metadata: ${next}`,
            )
            const targetManifest = path.join(target, 'package.json')
            let identity
            if (await statMaybe(targetManifest)) {
              identity = json(
                await readOrdinary(root, targetRelative ? `${targetRelative}/package.json` : 'package.json'),
                targetManifest,
              )
            }
            requireThat(
              identity?.name !== TRUST.name && packageBasename(next) !== TRUST.name && !targets.has(next),
              'SYMLINK',
              `Derived braces link requires separate proof: ${next}`,
            )
            derivedLinks.push({ path: next, target: targetRelative })
          }
          // Ordinary source directories are walked from root; never follow a link again.
        } else {
          requireThat(info.isFile(), 'TYPE', `Unsupported symlink target: ${next}`)
          // npm's internal .bin file links are allowed, never followed as packages.
          requireThat(next.split('/').includes('.bin'), 'SYMLINK', `File symlink outside npm .bin: ${next}`)
        }
      } else if (entry.isDirectory()) stack.push(next)
      else requireThat(entry.isFile(), 'TYPE', `Unsupported filesystem object: ${next}`)
    }
  }
  return { copies, links, derivedLinks, nonInstallNodeModules: [...nonInstallNodeModules].sort(), nonInstallManifests }
}

async function verifyCopy(root, relative, bundle, lock) {
  await ordinaryPath(root, relative, { directory: true })
  const actual = []
  const stack = ['']
  while (stack.length > 0) {
    const insidePackage = stack.pop()
    for (const entry of await fs.readdir(path.join(root, relative, insidePackage), { withFileTypes: true })) {
      const name = insidePackage ? `${insidePackage}/${entry.name}` : entry.name
      const fullRelative = `${relative}/${name}`
      requireThat(!entry.isSymbolicLink(), 'SYMLINK', `Symlink inside braces: ${fullRelative}`)
      if (name === 'node_modules' && entry.isDirectory()) {
        const prefix = `${fullRelative}/`
        requireThat(
          Object.keys(lock.packages).some((key) => key.startsWith(prefix)),
          'EXTRA_FILE',
          `Unregistered nested dependencies: ${fullRelative}`,
        )
        continue
      }
      if (entry.isDirectory()) {
        requireThat(
          bundle.files.some((filename) => filename.startsWith(`${name}/`)),
          'FILE_SET',
          `Extra package directory: ${fullRelative}`,
        )
        stack.push(name)
      } else {
        requireThat(entry.isFile(), 'TYPE', `Nonregular package content: ${fullRelative}`)
        actual.push(name)
      }
    }
  }
  actual.sort()
  requireThat(
    JSON.stringify(actual) === JSON.stringify(bundle.files),
    'FILE_SET',
    `Missing or extra package files: ${relative}`,
  )
  const hashes = {}
  for (const filename of actual) hashes[filename] = sha256(await readOrdinary(root, `${relative}/${filename}`))
  const base = actual.every((filename) => hashes[filename] === bundle.manifest.files[filename].baseSha256)
  const patched = actual.every((filename) => hashes[filename] === bundle.manifest.files[filename].patchedSha256)
  requireThat(base || patched, 'FILE_HASH', `Tampered or partially patched package: ${relative}`)
  return {
    state: patched ? 'patched' : 'base',
    hashes,
    treeSha256: hashPackageTree(hashes),
    integrity: lock.packages[relative].integrity,
  }
}

function checkAudit(audit, copies, mode) {
  if (audit === undefined) return { supplied: false, requiresBraces: false, nodes: [] }
  requireThat(
    audit &&
      typeof audit === 'object' &&
      audit.vulnerabilities &&
      typeof audit.vulnerabilities === 'object' &&
      !Array.isArray(audit.vulnerabilities),
    'AUDIT',
    'Expected npm audit JSON with vulnerabilities map',
  )
  const relevant = Object.entries(audit.vulnerabilities).filter(
    ([name, value]) =>
      name === TRUST.name ||
      value?.name === TRUST.name ||
      value?.via?.some((item) => item === TRUST.name || item?.name === TRUST.name),
  )
  const required = relevant.length > 0
  const direct = Object.entries(audit.vulnerabilities).filter(
    ([name, value]) => name === TRUST.name || value?.name === TRUST.name,
  )
  const nodes = [...new Set(direct.flatMap(([, value]) => value.nodes ?? []))].sort()
  if (required)
    requireThat(
      mode === 'full' && copies.size > 0,
      'EMPTY_EVIDENCE',
      'An audit chain for braces requires nonempty full-install evidence',
    )
  for (const node of nodes) {
    relativePath(node)
    requireThat(copies.has(node), 'AUDIT_NODE', `Audit installation absent from verified inventory: ${node}`)
  }
  return { supplied: true, requiresBraces: required, nodes }
}

async function preflight({ root: rootArgument, manifestPath = DEFAULT_MANIFEST, mode = 'full', auditReport } = {}) {
  requireThat(
    Number(process.versions.node.split('.')[0]) === 22,
    'NODE',
    'This experiment is validated only on Node 22',
  )
  requireThat(mode === 'full' || mode === 'omit-dev', 'MODE', 'Expected full or omit-dev mode')
  const root = await safeRoot(rootArgument)
  const bundle = await loadBundle(manifestPath)
  const lockBytes = await readOrdinary(root, 'package-lock.json')
  const lock = json(lockBytes, 'package-lock.json')
  // Refuse npm shrinkwrap precedence: this verifier intentionally supports one lock source.
  requireThat(
    !(await statMaybe(path.join(root, 'npm-shrinkwrap.json'))),
    'LOCK',
    'npm-shrinkwrap.json is unsupported; it would supersede package-lock.json',
  )
  const targets = lockTargets(lock)
  const { copies, links, derivedLinks, nonInstallNodeModules, nonInstallManifests } = await discover(
    root,
    lock,
    targets,
  )
  const missing = [...targets].filter((relative) => !copies.has(relative)).sort()
  for (const relative of missing) {
    requireThat(
      mode === 'omit-dev' && lock.packages[relative].dev === true,
      'MISSING_COPY',
      `Required locked installation missing: ${relative}`,
    )
  }
  if (mode === 'full')
    requireThat(copies.size > 0, 'EMPTY_EVIDENCE', 'Full verification requires at least one braces installation')
  const audit = checkAudit(auditReport, copies, mode)
  for (const [relative, copy] of copies) Object.assign(copy, await verifyCopy(root, relative, bundle, lock))
  return {
    root,
    bundle,
    lock,
    report: {
      schemaVersion: 1,
      node: process.versions.node,
      mode,
      manifestSha256: TRUST.manifestSha256,
      lockfileSha256: sha256(lockBytes),
      package: { name: TRUST.name, version: TRUST.version, resolved: TRUST.resolved, integrity: TRUST.integrity },
      upstreamSha: TRUST.upstreamSha,
      expectedTrees: {
        baseSha256: hashPackageTree(
          Object.fromEntries(bundle.files.map((filename) => [filename, bundle.manifest.files[filename].baseSha256])),
        ),
        patchedSha256: hashPackageTree(
          Object.fromEntries(bundle.files.map((filename) => [filename, bundle.manifest.files[filename].patchedSha256])),
        ),
      },
      copies: [...copies.values()].sort((a, b) => a.path.localeCompare(b.path)),
      missingDevCopies: missing,
      workspaceLinks: links.sort((a, b) => a.path.localeCompare(b.path)),
      nonInstallNodeModules,
      nonInstallManifests,
      derivedLinks,
      audit,
      status: copies.size === 0 ? 'skipped-no-installed-copies' : 'inventoried',
    },
  }
}

/** Read-only inspection accepts exact base OR exact patched installations. */
export async function inspectBracesInstallation(options) {
  return (await preflight(options)).report
}

/** Full policy proof: every discovered/locked copy must already be patched. */
export async function verifyBracesPatch(options) {
  const { report } = await preflight({ ...options, mode: 'full' })
  requireThat(
    report.copies.every((copy) => copy.state === 'patched'),
    'UNPATCHED',
    'At least one installation still has registry base bytes',
  )
  return { ...report, status: 'verified' }
}

/** Postinstall: preflight ALL copies before changing ANY; repeat is idempotent. */
export async function applyBracesPatch(options) {
  const { root, bundle, lock, report } = await preflight(options)
  const changed = []
  for (const copy of report.copies) {
    if (copy.state === 'patched') continue
    // Revalidate immediately before writing; callers must prevent concurrent writers.
    const current = await verifyCopy(root, copy.path, bundle, lock)
    requireThat(current.state === 'base', 'RACE', `Installation changed after preflight: ${copy.path}`)
    for (const [relative, bytes] of bundle.payload) {
      const filename = await ordinaryPath(root, `${copy.path}/${relative}`)
      const temp = `${filename}.braces-patch-${process.pid}-${changed.length}.tmp`
      let handle
      let created = false
      try {
        handle = await fs.open(temp, 'wx', 0o644)
        created = true
        await handle.writeFile(bytes)
        await handle.sync()
        await handle.close()
        handle = undefined
        await ordinaryPath(root, `${copy.path}/${relative}`)
        await fs.rename(temp, filename)
      } finally {
        await handle?.close()
        if (created)
          await fs.unlink(temp).catch((error) => {
            if (error.code !== 'ENOENT') throw error
          })
      }
    }
    changed.push(copy.path)
  }
  const after = (await preflight(options)).report
  requireThat(after.lockfileSha256 === report.lockfileSha256, 'RACE', 'Lockfile changed while patching')
  requireThat(
    after.copies.every((copy) => copy.state === 'patched'),
    'UNPATCHED',
    'Final verification found an unpatched copy',
  )
  return { ...after, status: after.copies.length ? 'patched-and-verified' : after.status, changed }
}

async function cli() {
  const [command, ...arguments_] = process.argv.slice(2)
  requireThat(
    ['inspect', 'apply', 'verify'].includes(command),
    'CLI',
    'Usage: node integrity.mjs inspect|apply|verify --root PATH [--mode full|omit-dev] [--audit FILE]',
  )
  const options = {}
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index]
    const value = arguments_[index + 1]
    requireThat(
      ['--root', '--mode', '--audit'].includes(key) && value && !value.startsWith('--'),
      'CLI',
      'Invalid arguments',
    )
    requireThat(!own(options, key), 'CLI', `Repeated option: ${key}`)
    options[key] = value
  }
  const settings = { root: options['--root'], mode: options['--mode'] ?? 'full' }
  if (options['--audit']) settings.auditReport = json(await fs.readFile(options['--audit']), 'audit report')
  if (command === 'verify')
    requireThat(settings.mode === 'full', 'MODE', 'Policy verification always requires full installation')
  const action = { inspect: inspectBracesInstallation, apply: applyBracesPatch, verify: verifyBracesPatch }[command]
  process.stdout.write(`${JSON.stringify(await action(settings), null, 2)}\n`)
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  cli().catch((error) => {
    process.stderr.write(`${error.name}: ${error.message}\n`)
    process.exitCode = 1
  })
}
