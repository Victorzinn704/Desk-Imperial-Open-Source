import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()

if (process.platform !== 'linux' || process.arch !== 'x64') {
  console.log(`Skipping CI native bindings on ${process.platform}/${process.arch}.`)
  process.exit(0)
}

const realRoot = fs.realpathSync(rootDir)
const lock = JSON.parse(fs.readFileSync(path.join(realRoot, 'package-lock.json'), 'utf8'))

function readLockedPackage(packagePath) {
  const realPackagePath = fs.realpathSync(packagePath)
  const relative = path.relative(realRoot, path.dirname(realPackagePath))
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Resolved native package outside repository: ${packagePath}`)
  }
  const entry = lock.packages?.[relative.split(path.sep).join('/')]
  const metadata = JSON.parse(fs.readFileSync(realPackagePath, 'utf8'))
  if (!entry || entry.version !== metadata.version || (entry.name && entry.name !== metadata.name)) {
    throw new Error(`Native package differs from lockfile: ${relative}`)
  }
  return metadata
}

// npm ci already installs these lockfile entries. A second npm install can
// hoist a different optional version and move packages outside the reviewed tree.
const packages = [
  { parent: 'rolldown', binding: '@rolldown/binding-linux-x64-gnu' },
  { parent: '@tailwindcss/oxide', binding: '@tailwindcss/oxide-linux-x64-gnu' },
]

for (const { parent, binding } of packages) {
  try {
    const parentPath = path.join(rootDir, 'node_modules', parent, 'package.json')
    const parentPackage = readLockedPackage(parentPath)
    const expectedVersion = parentPackage.optionalDependencies?.[binding]
    if (typeof expectedVersion !== 'string') throw new Error(`Missing declared optional binding for ${parent}`)
    const fromParent = createRequire(parentPath)
    const bindingPath = fromParent.resolve(`${binding}/package.json`)
    const bindingPackage = readLockedPackage(bindingPath)
    if (bindingPackage.name !== binding || bindingPackage.version !== expectedVersion) {
      throw new Error(`Expected ${binding}@${expectedVersion}; resolved ${bindingPackage.version}`)
    }
    const bindingDirectory = path.dirname(fs.realpathSync(bindingPath))
    const entry = path.relative(bindingDirectory, fs.realpathSync(fromParent.resolve(binding)))
    if (entry === '..' || entry.startsWith(`..${path.sep}`) || path.isAbsolute(entry)) {
      throw new Error(`Native binding entry escapes its locked package: ${binding}`)
    }
    fromParent(binding)
    console.log(`Verified and loaded ${binding}@${expectedVersion} from ${parent}.`)
  } catch (error) {
    throw new Error(
      `Native binding verification failed for ${parent}. Run npm ci --include=optional and review the lockfile if it still fails; this check does not modify the installation.`,
      { cause: error },
    )
  }
}
