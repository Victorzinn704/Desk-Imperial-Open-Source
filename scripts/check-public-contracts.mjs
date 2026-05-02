#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const oracleRoot = findLatestOracleSnapshot()
const failures = []

console.log('Public contract check')

if (!oracleRoot) {
  console.log('- oracle snapshot: not found, skipping Oracle comparison')
  process.exit(0)
}

console.log(`- oracle snapshot: ${path.relative(root, oracleRoot)}`)

compareNamedExports('apps/web/lib/api.ts')
compareControllerRoutes()
compareClassPublicMembers('apps/api/src/modules/operations/comanda.service.ts')
compareClassPublicMembers('apps/api/src/modules/operations/operations-helpers.service.ts')
compareClassPublicMembers('apps/api/src/modules/products/products.service.ts')

if (failures.length > 0) {
  console.error('\n[FAIL] Contratos publicos perdidos:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('\n[PASS] Nenhum contrato publico esperado foi perdido.')

function findLatestOracleSnapshot() {
  const cacheDir = path.join(root, '.cache')
  if (!fs.existsSync(cacheDir)) {
    return null
  }

  return (
    fs
      .readdirSync(cacheDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('oracle-source-'))
      .map((entry) => path.join(cacheDir, entry.name))
      .filter((dir) => fs.existsSync(path.join(dir, 'apps')))
      .sort()
      .at(-1) ?? null
  )
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function compareNamedExports(relativeFile) {
  const oracleFile = path.join(oracleRoot, relativeFile)
  const localFile = path.join(root, relativeFile)

  if (!fs.existsSync(oracleFile) || !fs.existsSync(localFile)) {
    failures.push(`${relativeFile}: arquivo de contrato ausente`)
    return
  }

  const missing = diffSets(extractNamedExports(readText(oracleFile)), extractNamedExports(readText(localFile)))
  if (missing.length === 0) {
    console.log(`- ${relativeFile}: exports OK`)
    return
  }

  failures.push(`${relativeFile}: exports faltando: ${missing.join(', ')}`)
}

function extractNamedExports(text) {
  const names = new Set()
  const regex =
    /export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z0-9_]+)|export\s+(?:type\s*)?\{([^}]+)\}/g

  for (const match of text.matchAll(regex)) {
    if (match[1]) {
      names.add(match[1])
      continue
    }

    for (const rawPart of match[2].split(',')) {
      const name = rawPart
        .replace(/\s+as\s+.*$/u, '')
        .replace(/^\s*type\s+/u, '')
        .trim()
      if (name) {
        names.add(name)
      }
    }
  }

  return names
}

function compareControllerRoutes() {
  const oracleRoutes = extractControllerRoutes(path.join(oracleRoot, 'apps/api/src'))
  const localRoutes = extractControllerRoutes(path.join(root, 'apps/api/src'))
  const missing = diffSets(oracleRoutes, localRoutes)

  if (missing.length === 0) {
    console.log('- apps/api/src controllers: routes OK')
    return
  }

  failures.push(`controllers: rotas faltando: ${missing.join('; ')}`)
}

function extractControllerRoutes(baseDir) {
  const routes = new Set()
  for (const file of walkFiles(baseDir, (candidate) => candidate.endsWith('.controller.ts'))) {
    const text = readText(file)
    const classRoute = text.match(/@Controller\(([^)]*)\)/u)?.[1]?.replaceAll(/['"`\s]/gu, '') ?? ''
    for (const route of extractControllerFileRoutes(text)) {
      routes.add(`${classRoute} ${route.verb} ${route.path} -> ${route.handler}`)
    }
  }
  return routes
}

function extractControllerFileRoutes(text) {
  const routes = []
  let pendingRoute = null

  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim()
    const routeMatch = trimmed.match(/^@(Get|Post|Patch|Put|Delete)\(([^)]*)\)/u)
    if (routeMatch) {
      pendingRoute = {
        verb: routeMatch[1],
        path: routeMatch[2].replaceAll(/['"`\s]/gu, ''),
      }
      continue
    }

    if (!pendingRoute) {
      continue
    }

    if (trimmed === '' || trimmed.startsWith('@')) {
      continue
    }

    const handlerMatch = trimmed.match(/^(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/u)
    if (handlerMatch) {
      routes.push({
        ...pendingRoute,
        handler: handlerMatch[1],
      })
    }
    pendingRoute = null
  }

  return routes
}

function compareClassPublicMembers(relativeFile) {
  const oracleFile = path.join(oracleRoot, relativeFile)
  const localFile = path.join(root, relativeFile)

  if (!fs.existsSync(oracleFile) || !fs.existsSync(localFile)) {
    failures.push(`${relativeFile}: arquivo de classe ausente`)
    return
  }

  const missing = diffSets(
    extractClassPublicMembers(readText(oracleFile)),
    extractClassPublicMembers(readText(localFile)),
  )
  if (missing.length === 0) {
    console.log(`- ${relativeFile}: public members OK`)
    return
  }

  failures.push(`${relativeFile}: membros publicos faltando: ${missing.join(', ')}`)
}

function extractClassPublicMembers(text) {
  const names = new Set()
  const methodRegex = /^\s{2}(?:(private|protected|public)\s+)?(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm
  const propertyRegex = /^\s{2}(?:(private|protected|public)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm

  for (const regex of [methodRegex, propertyRegex]) {
    for (const match of text.matchAll(regex)) {
      const visibility = match[1] || 'public'
      const name = match[2]
      if (visibility !== 'private' && !['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
        names.add(name)
      }
    }
  }

  return names
}

function diffSets(expected, actual) {
  return [...expected].filter((entry) => !actual.has(entry)).sort()
}

function walkFiles(dir, predicate) {
  if (!fs.existsSync(dir)) {
    return []
  }

  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, predicate))
    } else if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath)
    }
  }
  return files
}
