import './load-env'
import postgres from 'postgres'
import { bootstrapApplication } from '../src/lib/bootstrap'

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseDatabaseUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  const dbName = decodeURIComponent(url.pathname.replace(/^\/+/, '').split('/')[0] || 'postgres')
  url.pathname = '/postgres'
  return {
    dbName,
    adminUrl: url.toString()
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

async function waitForPostgresServer(sql: postgres.Sql, retries: number) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await sql`SELECT 1`
      console.log(`[db:init] PostgreSQL server is reachable (attempt=${attempt}/${retries})`)
      return
    } catch (error) {
      if (attempt >= retries) throw error
      console.log(`[db:init] waiting for PostgreSQL server... (attempt=${attempt}/${retries})`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}

async function ensurePostgresDatabaseExists() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return

  const { dbName, adminUrl } = parseDatabaseUrl(databaseUrl)
  const retries = parsePositiveInt(process.env.STARTUP_DATABASE_RETRY_COUNT, 30)
  const adminSql = postgres(adminUrl, {
    max: 1,
    connect_timeout: parsePositiveInt(process.env.STARTUP_DATABASE_CONNECT_TIMEOUT_SECONDS, 10),
    idle_timeout: 5
  })

  try {
    console.log(`[db:init] Checking PostgreSQL database "${dbName}"`)
    await waitForPostgresServer(adminSql, retries)
    const rows = await adminSql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ${dbName}) AS exists
    `
    if (rows[0]?.exists) {
      console.log(`[db:init] PostgreSQL database "${dbName}" already exists`)
      return
    }

    console.log(`[db:init] PostgreSQL database "${dbName}" does not exist, creating it`)
    await adminSql.unsafe(`CREATE DATABASE ${quoteIdentifier(dbName)}`)
    console.log(`[db:init] PostgreSQL database "${dbName}" created`)
  } finally {
    await adminSql.end({ timeout: 5 }).catch(() => undefined)
  }
}

async function main() {
  console.log('========================================')
  console.log('[db:init] Bes3 database initialization')
  console.log('========================================')

  await ensurePostgresDatabaseExists()
  await bootstrapApplication()
  console.log('Bes3 database initialized successfully.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to initialize Bes3 database:', error)
    process.exit(1)
  })
