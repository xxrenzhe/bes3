import path from 'node:path'
import fs from 'node:fs'
import type { DatabaseAdapter } from '@/lib/types'
import { PostgresAdapter } from '@/lib/db/postgres'
import { ensureSchema } from '@/lib/db/schema'
import { SQLiteAdapter } from '@/lib/db/sqlite'
import { splitSqlStatements } from '@/lib/sql-splitter'

let dbPromise: Promise<DatabaseAdapter> | null = null
let schemaReady = false
let migrationsRan = false
let schemaPromise: Promise<void> | null = null

function createDatabase(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    return new PostgresAdapter(databaseUrl)
  }

  const databasePath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'bes3.db')
  return new SQLiteAdapter(databasePath)
}

async function ensureMigrationHistory(db: DatabaseAdapter): Promise<void> {
  if (db.type === 'sqlite') {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  } else {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }
}

async function getAppliedMigrations(db: DatabaseAdapter): Promise<Set<string>> {
  const rows = await db.query<{ migration_name: string }>('SELECT migration_name FROM migration_history')
  return new Set(rows.map(r => r.migration_name))
}

async function runMigrations(db: DatabaseAdapter): Promise<number> {
  const isPostgres = db.type === 'postgres'
  const migrationsDir = isPostgres
    ? path.join(process.cwd(), 'pg-migrations')
    : path.join(process.cwd(), 'migrations')

  if (!fs.existsSync(migrationsDir)) {
    return 0
  }

  await ensureMigrationHistory(db)
  const applied = await getAppliedMigrations(db)

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && (isPostgres ? f.endsWith('.pg.sql') : !f.endsWith('.pg.sql')))
    .sort()

  let executed = 0
  for (const file of files) {
    if (applied.has(file)) continue

    const rawContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    const statements = splitSqlStatements(rawContent)

    await db.transaction(async () => {
      for (const stmt of statements) {
        const trimmed = stmt.trim()
        if (!trimmed) continue
        try {
          await db.exec(trimmed)
        } catch (error: any) {
          const msg = error?.message ? String(error.message) : String(error)
          if (msg.includes('duplicate column name') || msg.includes('already exists')) continue
          if (
            msg.includes('unique constraint failed: prompt_versions') &&
            /insert\s+into\s+prompt_versions\b/i.test(trimmed)
          ) continue
          throw error
        }
      }
      await db.exec('INSERT INTO migration_history (migration_name) VALUES (?)', [file])
    })

    console.log(`[migration] ✅ ${file}`)
    executed++
  }

  return executed
}

export async function getDatabase(): Promise<DatabaseAdapter> {
  if (!dbPromise) {
    dbPromise = Promise.resolve(createDatabase())
  }

  const db = await dbPromise
  if (!schemaReady) {
    if (!schemaPromise) {
      schemaPromise = ensureSchema(db)
        .then(async () => {
          schemaReady = true
          if (!migrationsRan) {
            const count = await runMigrations(db)
            if (count > 0) {
              console.log(`[migration] 共执行 ${count} 个迁移`)
            }
            migrationsRan = true
          }
        })
        .catch((error) => {
          schemaPromise = null
          throw error
        })
    }
    await schemaPromise
  }
  return db
}
