import { execFileSync } from 'node:child_process'
import process from 'node:process'

const containerName = process.env.OBS_LOCAL_POSTGRES_CONTAINER ?? 'partner-portal-postgres'
const appUser = process.env.OBS_LOCAL_DB_USER ?? 'desk_imperial'
const appPassword = process.env.OBS_LOCAL_DB_PASSWORD ?? 'desk_imperial_change_me'
const appDatabase = process.env.OBS_LOCAL_DB_NAME ?? 'partner_portal_observability'

assertSqlIdentifier(appUser, 'OBS_LOCAL_DB_USER')
assertSqlIdentifier(appDatabase, 'OBS_LOCAL_DB_NAME')

const containerEnv = readContainerEnv(containerName)
const adminUser = containerEnv.POSTGRES_USER ?? 'postgres'
const adminPassword = containerEnv.POSTGRES_PASSWORD ?? 'postgres'

if (adminUser !== appUser) {
  runPsql(containerName, adminUser, adminPassword, 'postgres', [
    `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${appUser}') THEN
    CREATE ROLE ${appUser} LOGIN PASSWORD '${escapeSqlLiteral(appPassword)}';
  ELSE
    ALTER ROLE ${appUser} WITH LOGIN PASSWORD '${escapeSqlLiteral(appPassword)}';
  END IF;
END $$;
    `,
  ])
}

const databaseExists = runDockerCommand(containerName, [
  'psql',
  '-U',
  adminUser,
  '-d',
  'postgres',
  '-tAc',
  `SELECT 1 FROM pg_database WHERE datname='${appDatabase}'`,
], adminPassword).trim() === '1'

if (!databaseExists) {
  runDockerCommand(
    containerName,
    ['psql', '-U', adminUser, '-d', 'postgres', '-c', `CREATE DATABASE ${appDatabase} OWNER ${appUser};`],
    adminPassword,
  )
}

runPsql(containerName, adminUser, adminPassword, appDatabase, [
  `ALTER DATABASE ${appDatabase} OWNER TO ${appUser};`,
  `ALTER SCHEMA public OWNER TO ${appUser};`,
  `GRANT ALL PRIVILEGES ON DATABASE ${appDatabase} TO ${appUser};`,
  `GRANT ALL PRIVILEGES ON SCHEMA public TO ${appUser};`,
  `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${appUser};`,
  `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${appUser};`,
  `GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${appUser};`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${appUser};`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${appUser};`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO ${appUser};`,
], adminPassword)

console.log(
  JSON.stringify(
    {
      containerName,
      adminUser,
      appUser,
      appDatabase,
      databaseUrl: `postgresql://${appUser}:***@localhost:5432/${appDatabase}`,
    },
    null,
    2,
  ),
)

function readContainerEnv(name) {
  const raw = execFileSync(
    'docker',
    ['inspect', name, '--format', '{{range .Config.Env}}{{println .}}{{end}}'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf('=')
        return [entry.slice(0, separator), entry.slice(separator + 1)]
      }),
  )
}

function runPsql(containerName, adminUser, adminPassword, databaseName, statements) {
  for (const statement of statements) {
    runDockerCommand(
      containerName,
      ['psql', '-v', 'ON_ERROR_STOP=1', '-U', adminUser, '-d', databaseName, '-c', statement.trim()],
      adminPassword,
    )
  }
}

function runDockerCommand(containerName, args, adminPassword) {
  return execFileSync('docker', ['exec', '-e', `PGPASSWORD=${adminPassword}`, containerName, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function assertSqlIdentifier(value, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${label} precisa ser um identificador SQL simples e seguro.`)
  }
}

function escapeSqlLiteral(value) {
  return value.replace(/'/g, "''")
}
