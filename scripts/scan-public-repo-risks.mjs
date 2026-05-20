import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()

const trackedFiles = execFileSync('git', ['ls-files'], {
  cwd,
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .map((entry) => entry.trim())
  .filter(Boolean)

const findings = []

const exactFindings = [
  {
    description: 'placeholder fraco de COOKIE_SECRET',
    pattern: 'COOKIE_SECRET=change-me',
  },
  {
    description: 'placeholder fraco de CSRF_SECRET',
    pattern: 'CSRF_SECRET=change-me',
  },
  {
    description: 'placeholder fraco de ENCRYPTION_KEY',
    pattern: 'ENCRYPTION_KEY=change-me',
  },
  {
    description: 'credencial fraca de Grafana em arquivo versionado',
    pattern: 'GRAFANA_ADMIN_PASSWORD=admin',
  },
  {
    description: 'credencial fraca de Postgres em arquivo versionado',
    pattern: 'POSTGRES_PASSWORD=postgres',
  },
]

const regexFindings = [
  {
    description: 'OpenRouter key exposta',
    regex: /\bsk-or-v1-[A-Za-z0-9]{20,}\b/g,
  },
  {
    description: 'Gemini key exposta',
    regex: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  },
  {
    description: 'Brevo key exposta',
    regex: /\bxkeysib-[A-Za-z0-9_-]{20,}\b/g,
    ignoreMatch: (match) =>
      match.includes('your-') ||
      match.includes('real-key') ||
      match.includes('actual-api-key') ||
      match.includes('abc123'),
  },
]

const connectionStringKeys = new Set([
  'DATABASE_URL',
  'DIRECT_URL',
  'REDIS_URL',
  'REDIS_PRIVATE_URL',
  'REDIS_PUBLIC_URL',
])

for (const relativeFile of trackedFiles) {
  if (relativeFile === 'scripts/scan-public-repo-risks.mjs') {
    continue
  }

  const absoluteFile = path.join(cwd, relativeFile)
  let content = ''

  try {
    content = readFileSync(absoluteFile, 'utf8')
  } catch {
    continue
  }

  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    const envEntry = line.match(/^\s*([A-Z0-9_]+)=(.+)\s*$/)
    if (envEntry) {
      const [, key, rawValue] = envEntry
      if (connectionStringKeys.has(key)) {
        const value = rawValue.trim()
        if (value && !isAllowedLocalConnectionString(value)) {
          findings.push({
            file: relativeFile,
            line: index + 1,
            description: `connection string remota ou sensível em ${key}`,
          })
        }
      }
    }

    exactFindings.forEach((finding) => {
      if (line.includes(finding.pattern)) {
        findings.push({
          file: relativeFile,
          line: index + 1,
          description: finding.description,
        })
      }
    })

    regexFindings.forEach((finding) => {
      const matches = line.matchAll(finding.regex)
      for (const match of matches) {
        const value = match[0]
        if (finding.ignoreMatch?.(value)) {
          continue
        }

        findings.push({
          file: relativeFile,
          line: index + 1,
          description: finding.description,
        })
      }
    })
  })
}

if (findings.length > 0) {
  console.error('Public repo safety scan encontrou riscos em arquivos versionados:')
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} — ${finding.description}`)
  }
  process.exit(1)
}

console.log(`Public repo safety scan OK — ${trackedFiles.length} arquivos versionados verificados.`)

function isAllowedLocalConnectionString(value) {
  if (value.includes('<') || value.includes('>') || value.includes('${')) {
    return true
  }

  if (!/^postgres(?:ql)?:\/\//.test(value) && !/^redis:\/\//.test(value)) {
    return true
  }

  try {
    const url = new URL(value)
    return ['localhost', '127.0.0.1', 'host.docker.internal'].includes(url.hostname)
  } catch {
    return false
  }
}
