import fs from 'node:fs'
import path from 'node:path'

function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

function normalizeSourcePath(sourcePath, workspaceRoot, repoRoot) {
  const normalizedSourcePath = sourcePath.replace(/\\/g, '/')
  const resolvedPath = path.isAbsolute(normalizedSourcePath)
    ? normalizedSourcePath
    : path.resolve(workspaceRoot, normalizedSourcePath)

  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    return null
  }

  return toPosixPath(path.relative(repoRoot, resolvedPath))
}

function normalizeReport(reportPath, workspaceRoot, repoRoot) {
  if (!fs.existsSync(reportPath)) {
    return { changed: false, removedRecords: 0, keptRecords: 0 }
  }

  const input = fs.readFileSync(reportPath, 'utf8')
  const records = input.split('end_of_record')
  const normalizedRecords = []
  let removedRecords = 0
  let keptRecords = 0

  for (const rawRecord of records) {
    const trimmedRecord = rawRecord.trim()
    if (!trimmedRecord) {
      continue
    }

    const lines = trimmedRecord.split(/\r?\n/)
    const sourceLineIndex = lines.findIndex((line) => line.startsWith('SF:'))
    if (sourceLineIndex === -1) {
      normalizedRecords.push(`${trimmedRecord}\nend_of_record`)
      continue
    }

    const originalSourcePath = lines[sourceLineIndex].slice(3)
    const normalizedSourcePath = normalizeSourcePath(originalSourcePath, workspaceRoot, repoRoot)
    if (!normalizedSourcePath) {
      removedRecords += 1
      continue
    }

    lines[sourceLineIndex] = `SF:${normalizedSourcePath}`
    normalizedRecords.push(`${lines.join('\n')}\nend_of_record`)
    keptRecords += 1
  }

  const output = normalizedRecords.join('\n') + (normalizedRecords.length ? '\n' : '')
  const changed = output !== input
  if (changed) {
    fs.writeFileSync(reportPath, output, 'utf8')
  }

  return { changed, removedRecords, keptRecords }
}

function main() {
  const [, , reportArg, workspaceArg] = process.argv
  if (!reportArg || !workspaceArg) {
    throw new Error('Uso: node scripts/normalize-lcov-report.mjs <reportPath> <workspaceRoot>')
  }

  const repoRoot = process.cwd()
  const reportPath = path.resolve(repoRoot, reportArg)
  const workspaceRoot = path.resolve(repoRoot, workspaceArg)
  const result = normalizeReport(reportPath, workspaceRoot, repoRoot)

  if (!fs.existsSync(reportPath)) {
    console.log(`[lcov] sem relatório em ${reportArg}; nada a normalizar`)
    return
  }

  console.log(
    `[lcov] ${reportArg}: mantidos=${result.keptRecords} removidos=${result.removedRecords} alterado=${result.changed}`,
  )
}

main()
